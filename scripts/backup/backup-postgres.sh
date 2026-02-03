#!/bin/bash
# ===========================================
# Doctify PostgreSQL Backup Script
# ===========================================
# Secure backup with compression and encryption
# Follows 3-2-1 backup rule best practices
#
# Usage: ./backup-postgres.sh [--full|--schema-only]
#
# Features:
#   - Compressed backup with gzip
#   - Optional GPG encryption (AES256)
#   - SHA256 checksum verification
#   - Retention policy enforcement
#   - Offsite sync support
#   - Notification on success/failure

set -euo pipefail

# ===========================================
# Configuration
# ===========================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.backup"

# Load configuration
if [[ -f "$ENV_FILE" ]]; then
    # shellcheck source=/dev/null
    source "$ENV_FILE"
else
    echo "ERROR: Configuration file not found: $ENV_FILE"
    echo "Please copy .env.backup.example to .env.backup and configure it."
    exit 1
fi

# Defaults (if not set in env)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/doctify}"
BACKUP_TEMP_DIR="${BACKUP_TEMP_DIR:-/tmp/doctify-backup}"
COMPRESSION_LEVEL="${COMPRESSION_LEVEL:-6}"
PARALLEL_JOBS="${PARALLEL_JOBS:-0}"
BACKUP_ENCRYPTION_ENABLED="${BACKUP_ENCRYPTION_ENABLED:-false}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"
LOG_FILE="${LOG_FILE:-/var/log/doctify/backup.log}"

# Timestamp for backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

# Backup type (daily, weekly, monthly)
if [[ "$DAY_OF_MONTH" == "01" ]]; then
    BACKUP_TYPE="monthly"
elif [[ "$DAY_OF_WEEK" == "7" ]]; then
    BACKUP_TYPE="weekly"
else
    BACKUP_TYPE="daily"
fi

# ===========================================
# Logging Functions
# ===========================================
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    # Log to file if configured
    if [[ -n "${LOG_FILE:-}" ]]; then
        mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE" 2>/dev/null || true
    fi

    # Log to stdout
    case "$level" in
        ERROR) echo "❌ ERROR: $message" >&2 ;;
        WARN)  echo "⚠️  WARN: $message" ;;
        INFO)  echo "ℹ️  INFO: $message" ;;
        DEBUG) [[ "$LOG_LEVEL" == "DEBUG" ]] && echo "🔍 DEBUG: $message" ;;
    esac
}

# ===========================================
# Notification Functions
# ===========================================
send_notification() {
    local status="$1"
    local message="$2"
    local details="${3:-}"

    # Email notification
    if [[ "${NOTIFY_EMAIL_ENABLED:-false}" == "true" ]]; then
        log "DEBUG" "Sending email notification to ${NOTIFY_EMAIL_TO}"
        echo -e "Subject: [Doctify Backup] $status\n\n$message\n\n$details" | \
            sendmail -f "${NOTIFY_EMAIL_FROM}" "${NOTIFY_EMAIL_TO}" 2>/dev/null || \
            log "WARN" "Failed to send email notification"
    fi

    # Slack notification
    if [[ "${NOTIFY_SLACK_ENABLED:-false}" == "true" && -n "${NOTIFY_SLACK_WEBHOOK:-}" ]]; then
        log "DEBUG" "Sending Slack notification"
        local color
        [[ "$status" == "SUCCESS" ]] && color="good" || color="danger"
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"Doctify Backup: $status\",\"text\":\"$message\n$details\"}]}" \
            "$NOTIFY_SLACK_WEBHOOK" > /dev/null 2>&1 || \
            log "WARN" "Failed to send Slack notification"
    fi
}

# ===========================================
# Cleanup Function
# ===========================================
cleanup() {
    local exit_code=$?

    # Remove temp files
    if [[ -d "$BACKUP_TEMP_DIR" ]]; then
        rm -rf "${BACKUP_TEMP_DIR:?}"/* 2>/dev/null || true
    fi

    # Send notification on failure
    if [[ $exit_code -ne 0 ]]; then
        send_notification "FAILED" "PostgreSQL backup failed" "Exit code: $exit_code"
    fi

    exit $exit_code
}

trap cleanup EXIT

# ===========================================
# Validation Functions
# ===========================================
validate_environment() {
    log "INFO" "Validating environment..."

    # Check required tools
    local required_tools=("pg_dump" "gzip" "sha256sum")
    if [[ "$BACKUP_ENCRYPTION_ENABLED" == "true" ]]; then
        required_tools+=("gpg")
    fi

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log "ERROR" "Required tool not found: $tool"
            exit 1
        fi
    done

    # Validate PostgreSQL connection
    if [[ -z "${POSTGRES_HOST:-}" || -z "${POSTGRES_DB:-}" || -z "${POSTGRES_USER:-}" ]]; then
        log "ERROR" "PostgreSQL connection details not configured"
        exit 1
    fi

    # Create directories
    mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}
    mkdir -p "$BACKUP_TEMP_DIR"

    # Set secure permissions
    chmod 700 "$BACKUP_DIR"
    chmod 700 "$BACKUP_TEMP_DIR"

    log "INFO" "Environment validation passed"
}

# ===========================================
# Backup Functions
# ===========================================
perform_backup() {
    local backup_mode="${1:-full}"
    local backup_name="doctify_postgres_${TIMESTAMP}"
    local temp_file="${BACKUP_TEMP_DIR}/${backup_name}.sql"
    local compressed_file="${temp_file}.gz"
    local final_file="${BACKUP_DIR}/${BACKUP_TYPE}/${backup_name}.sql.gz"

    log "INFO" "Starting PostgreSQL backup (mode: $backup_mode, type: $BACKUP_TYPE)"

    # Build pg_dump command
    local pg_dump_opts=("-h" "$POSTGRES_HOST" "-p" "${POSTGRES_PORT:-5432}" "-U" "$POSTGRES_USER" "-d" "$POSTGRES_DB")

    # Add parallel jobs if specified
    if [[ "$PARALLEL_JOBS" -gt 0 ]]; then
        pg_dump_opts+=("-j" "$PARALLEL_JOBS")
    fi

    # Add schema-only flag if requested
    if [[ "$backup_mode" == "schema-only" ]]; then
        pg_dump_opts+=("--schema-only")
        backup_name="${backup_name}_schema"
    fi

    # Export password for pg_dump
    export PGPASSWORD="${POSTGRES_PASSWORD:-}"

    # Perform backup
    log "INFO" "Running pg_dump..."
    if ! pg_dump "${pg_dump_opts[@]}" > "$temp_file" 2>&1; then
        log "ERROR" "pg_dump failed"
        cat "$temp_file" >&2 || true
        exit 1
    fi

    # Get uncompressed size
    local raw_size
    raw_size=$(du -h "$temp_file" | cut -f1)
    log "INFO" "Raw backup size: $raw_size"

    # Compress
    log "INFO" "Compressing backup (level $COMPRESSION_LEVEL)..."
    gzip -"$COMPRESSION_LEVEL" -c "$temp_file" > "$compressed_file"
    rm -f "$temp_file"

    # Get compressed size
    local compressed_size
    compressed_size=$(du -h "$compressed_file" | cut -f1)
    log "INFO" "Compressed size: $compressed_size"

    # Encrypt if enabled
    if [[ "$BACKUP_ENCRYPTION_ENABLED" == "true" ]]; then
        log "INFO" "Encrypting backup..."
        encrypt_backup "$compressed_file" "${final_file}.gpg"
        final_file="${final_file}.gpg"
        rm -f "$compressed_file"
    else
        mv "$compressed_file" "$final_file"
    fi

    # Set secure permissions
    chmod 600 "$final_file"

    # Generate checksum
    log "INFO" "Generating SHA256 checksum..."
    sha256sum "$final_file" > "${final_file}.sha256"
    chmod 600 "${final_file}.sha256"

    # Get final size
    local final_size
    final_size=$(du -h "$final_file" | cut -f1)

    log "INFO" "Backup completed: $final_file ($final_size)"

    echo "$final_file"
}

encrypt_backup() {
    local input_file="$1"
    local output_file="$2"

    if [[ -n "${GPG_RECIPIENT:-}" ]]; then
        # Asymmetric encryption with recipient's public key
        gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" \
            --output "$output_file" "$input_file"
    else
        # Symmetric encryption with passphrase
        if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            log "ERROR" "Encryption enabled but no key/recipient configured"
            exit 1
        fi
        echo "$BACKUP_ENCRYPTION_KEY" | gpg --batch --yes --passphrase-fd 0 \
            --symmetric --cipher-algo AES256 \
            --output "$output_file" "$input_file"
    fi
}

# ===========================================
# Retention Management
# ===========================================
apply_retention_policy() {
    log "INFO" "Applying retention policy..."

    local retention_daily="${RETENTION_DAILY:-7}"
    local retention_weekly="${RETENTION_WEEKLY:-4}"
    local retention_monthly="${RETENTION_MONTHLY:-3}"

    # Clean up daily backups (keep last N)
    cleanup_old_backups "$BACKUP_DIR/daily" "$retention_daily"

    # Clean up weekly backups (keep last N)
    cleanup_old_backups "$BACKUP_DIR/weekly" "$retention_weekly"

    # Clean up monthly backups (keep last N)
    cleanup_old_backups "$BACKUP_DIR/monthly" "$retention_monthly"

    log "INFO" "Retention policy applied"
}

cleanup_old_backups() {
    local dir="$1"
    local keep="$2"

    if [[ -d "$dir" ]]; then
        # Count backups (both .gz and .gpg files)
        local count
        count=$(find "$dir" -maxdepth 1 -type f \( -name "*.gz" -o -name "*.gpg" \) | wc -l)

        if [[ $count -gt $keep ]]; then
            local to_delete=$((count - keep))
            log "INFO" "Removing $to_delete old backups from $dir"

            # Remove oldest files (and their checksums)
            find "$dir" -maxdepth 1 -type f \( -name "*.gz" -o -name "*.gpg" \) -printf '%T+ %p\n' | \
                sort | head -n "$to_delete" | cut -d' ' -f2- | \
                while read -r file; do
                    rm -f "$file" "${file}.sha256"
                    log "DEBUG" "Removed: $file"
                done
        fi
    fi
}

# ===========================================
# Offsite Sync
# ===========================================
sync_offsite() {
    if [[ "${OFFSITE_ENABLED:-false}" != "true" ]]; then
        log "DEBUG" "Offsite sync disabled"
        return 0
    fi

    log "INFO" "Syncing to offsite storage..."

    local ssh_opts=()
    if [[ -n "${OFFSITE_SSH_KEY:-}" ]]; then
        ssh_opts+=("-e" "ssh -i $OFFSITE_SSH_KEY")
    fi

    if rsync -avz --delete "${ssh_opts[@]}" \
        "$BACKUP_DIR/" "${OFFSITE_SSH_HOST}:${OFFSITE_SSH_PATH}/"; then
        log "INFO" "Offsite sync completed"
    else
        log "WARN" "Offsite sync failed"
    fi
}

# ===========================================
# Main
# ===========================================
main() {
    local backup_mode="full"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --full)
                backup_mode="full"
                shift
                ;;
            --schema-only)
                backup_mode="schema-only"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [--full|--schema-only]"
                echo ""
                echo "Options:"
                echo "  --full         Full database backup (default)"
                echo "  --schema-only  Schema only backup (no data)"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "INFO" "=== Doctify PostgreSQL Backup Starting ==="
    log "INFO" "Timestamp: $TIMESTAMP"
    log "INFO" "Backup type: $BACKUP_TYPE"

    # Validate environment
    validate_environment

    # Perform backup
    local backup_file
    backup_file=$(perform_backup "$backup_mode")

    # Apply retention policy
    apply_retention_policy

    # Sync to offsite
    sync_offsite

    # Success notification
    local final_size
    final_size=$(du -h "$backup_file" | cut -f1)
    send_notification "SUCCESS" "PostgreSQL backup completed" \
        "File: $backup_file\nSize: $final_size\nType: $BACKUP_TYPE"

    log "INFO" "=== Backup Completed Successfully ==="
}

main "$@"

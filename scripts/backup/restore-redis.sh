#!/bin/bash
# ===========================================
# Doctify Redis Restore Script
# ===========================================
# Restore Redis from RDB backup
#
# Usage: ./restore-redis.sh <backup-file> [--test|--dry-run]
#
# WARNING: This will stop Redis, replace the RDB file, and restart.
# Make sure you have a recent backup before proceeding!

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
    exit 1
fi

# Defaults
BACKUP_TEMP_DIR="${BACKUP_TEMP_DIR:-/tmp/doctify-backup}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"
LOG_FILE="${LOG_FILE:-/var/log/doctify/backup.log}"

# Redis defaults
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# ===========================================
# Logging Functions
# ===========================================
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    if [[ -n "${LOG_FILE:-}" ]]; then
        mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
        echo "[$timestamp] [$level] [redis-restore] $message" >> "$LOG_FILE" 2>/dev/null || true
    fi

    case "$level" in
        ERROR) echo "❌ ERROR: $message" >&2 ;;
        WARN)  echo "⚠️  WARN: $message" ;;
        INFO)  echo "ℹ️  INFO: $message" ;;
        DEBUG) [[ "$LOG_LEVEL" == "DEBUG" ]] && echo "🔍 DEBUG: $message" ;;
    esac
}

# ===========================================
# Redis CLI Helper
# ===========================================
redis_cli() {
    local cmd_args=("-h" "$REDIS_HOST" "-p" "$REDIS_PORT")

    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
        cmd_args+=("-a" "$REDIS_PASSWORD")
    fi

    redis-cli "${cmd_args[@]}" "$@" 2>/dev/null
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

    exit $exit_code
}

trap cleanup EXIT

# ===========================================
# Validation Functions
# ===========================================
validate_backup_file() {
    local backup_file="$1"

    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not found: $backup_file"
        exit 1
    fi

    # Check checksum if available
    local checksum_file="${backup_file}.sha256"
    if [[ -f "$checksum_file" ]]; then
        log "INFO" "Verifying checksum..."
        if sha256sum -c "$checksum_file" > /dev/null 2>&1; then
            log "INFO" "Checksum verification passed ✓"
        else
            log "ERROR" "Checksum verification FAILED!"
            exit 1
        fi
    else
        log "WARN" "No checksum file found, skipping verification"
    fi
}

# ===========================================
# Decryption Functions
# ===========================================
decrypt_backup() {
    local encrypted_file="$1"
    local output_file="$2"

    log "INFO" "Decrypting backup..."

    if [[ -n "${GPG_RECIPIENT:-}" ]]; then
        gpg --batch --yes --decrypt --output "$output_file" "$encrypted_file"
    else
        if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            log "ERROR" "Encryption key not configured"
            exit 1
        fi
        echo "${BACKUP_ENCRYPTION_KEY}" | gpg --batch --yes --passphrase-fd 0 \
            --decrypt --output "$output_file" "$encrypted_file"
    fi

    log "INFO" "Decryption completed"
}

# ===========================================
# Restore Functions
# ===========================================
get_rdb_path() {
    local dir
    dir=$(redis_cli CONFIG GET dir | tail -1)
    local dbfilename
    dbfilename=$(redis_cli CONFIG GET dbfilename | tail -1)

    if [[ -z "$dir" || -z "$dbfilename" ]]; then
        log "ERROR" "Cannot determine RDB file path"
        exit 1
    fi

    echo "${dir}/${dbfilename}"
}

prepare_rdb_file() {
    local backup_file="$1"
    local rdb_file="${BACKUP_TEMP_DIR}/restore.rdb"

    mkdir -p "$BACKUP_TEMP_DIR"

    # Handle encrypted files
    if [[ "$backup_file" == *.gpg ]]; then
        local decrypted="${BACKUP_TEMP_DIR}/decrypted.rdb.gz"
        decrypt_backup "$backup_file" "$decrypted"
        backup_file="$decrypted"
    fi

    # Handle compressed files
    if [[ "$backup_file" == *.gz ]]; then
        log "INFO" "Decompressing backup..."
        gunzip -c "$backup_file" > "$rdb_file"
    else
        cp "$backup_file" "$rdb_file"
    fi

    echo "$rdb_file"
}

perform_restore() {
    local rdb_file="$1"
    local dry_run="${2:-false}"

    log "INFO" "Preparing to restore Redis..."

    # Get current RDB path
    local current_rdb
    current_rdb=$(get_rdb_path)
    log "INFO" "Current RDB location: $current_rdb"

    if [[ "$dry_run" == "true" ]]; then
        log "INFO" "DRY RUN: Would restore to $current_rdb"
        log "INFO" "RDB file size: $(du -h "$rdb_file" | cut -f1)"
        log "INFO" "Backup RDB info:"
        file "$rdb_file"
        return 0
    fi

    # Confirmation for non-test operations
    log "WARN" "⚠️  WARNING: This will replace the current Redis data!"
    log "WARN" "Current RDB: $current_rdb"
    log "WARN" "Press Ctrl+C within 5 seconds to cancel..."
    sleep 5

    # Create backup of current RDB
    local backup_current="${current_rdb}.backup.$(date +%Y%m%d%H%M%S)"
    if [[ -f "$current_rdb" ]]; then
        log "INFO" "Backing up current RDB to: $backup_current"
        cp "$current_rdb" "$backup_current"
    fi

    # Stop Redis (for data consistency)
    log "INFO" "Stopping Redis..."

    # Check if using Docker
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "redis"; then
        log "INFO" "Detected Docker Redis container"
        docker stop doctify-redis || true
        cp "$rdb_file" "$current_rdb"
        docker start doctify-redis
    elif systemctl is-active --quiet redis; then
        log "INFO" "Detected systemd Redis service"
        sudo systemctl stop redis
        cp "$rdb_file" "$current_rdb"
        sudo chown redis:redis "$current_rdb" 2>/dev/null || true
        sudo systemctl start redis
    else
        log "WARN" "Could not determine Redis service management method"
        log "WARN" "Please stop Redis manually, then run:"
        log "WARN" "  cp '$rdb_file' '$current_rdb'"
        log "WARN" "  Then restart Redis"
        exit 1
    fi

    # Wait for Redis to be ready
    log "INFO" "Waiting for Redis to be ready..."
    local max_wait=30
    local waited=0

    while [[ $waited -lt $max_wait ]]; do
        if redis_cli ping 2>/dev/null | grep -q "PONG"; then
            break
        fi
        sleep 1
        waited=$((waited + 1))
    done

    if [[ $waited -ge $max_wait ]]; then
        log "ERROR" "Redis did not become ready after restore"
        exit 1
    fi

    # Verify
    log "INFO" "Verifying restore..."
    local db_size
    db_size=$(redis_cli DBSIZE | grep -oE '[0-9]+')
    log "INFO" "Keys in restored database: $db_size"

    log "INFO" "Restore completed successfully"
}

# ===========================================
# Main
# ===========================================
main() {
    local backup_file=""
    local dry_run=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --test)
                log "WARN" "Redis --test mode not supported (no isolated restore like PostgreSQL)"
                log "WARN" "Use --dry-run to validate the backup first"
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 <backup-file> [--dry-run]"
                echo ""
                echo "Arguments:"
                echo "  backup-file  Path to backup file (.rdb, .rdb.gz, or .rdb.gz.gpg)"
                echo ""
                echo "Options:"
                echo "  --dry-run    Validate backup without restoring"
                echo "  --help       Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0 /backups/doctify_redis_20260118.rdb.gz.gpg --dry-run"
                echo "  $0 /backups/doctify_redis_20260118.rdb.gz"
                echo ""
                echo "WARNING: This will replace all current Redis data!"
                exit 0
                ;;
            -*)
                log "ERROR" "Unknown option: $1"
                exit 1
                ;;
            *)
                backup_file="$1"
                shift
                ;;
        esac
    done

    if [[ -z "$backup_file" ]]; then
        log "ERROR" "Backup file not specified"
        echo "Usage: $0 <backup-file> [--dry-run]"
        exit 1
    fi

    log "INFO" "=== Doctify Redis Restore Starting ==="
    log "INFO" "Backup file: $backup_file"
    log "INFO" "Dry run: $dry_run"

    # Validate backup file
    validate_backup_file "$backup_file"

    # Prepare RDB file
    local rdb_file
    rdb_file=$(prepare_rdb_file "$backup_file")
    log "INFO" "RDB file prepared: $(du -h "$rdb_file" | cut -f1)"

    # Perform restore
    perform_restore "$rdb_file" "$dry_run"

    log "INFO" "=== Redis Restore Complete ==="
}

main "$@"

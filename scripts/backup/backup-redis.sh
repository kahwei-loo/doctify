#!/bin/bash
# ===========================================
# Doctify Redis Backup Script
# ===========================================
# Backup Redis RDB snapshot with optional encryption
#
# Usage: ./backup-redis.sh [--bgsave|--rdb-only]
#
# Features:
#   - Triggers BGSAVE and waits for completion
#   - Copies RDB file with encryption
#   - SHA256 checksum verification
#   - Retention policy enforcement

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
BACKUP_DIR="${BACKUP_DIR:-/var/backups/doctify}"
BACKUP_ENCRYPTION_ENABLED="${BACKUP_ENCRYPTION_ENABLED:-false}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"
LOG_FILE="${LOG_FILE:-/var/log/doctify/backup.log}"

# Redis defaults
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)
DAY_OF_WEEK=$(date +%u)
DAY_OF_MONTH=$(date +%d)

# Backup type
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

    if [[ -n "${LOG_FILE:-}" ]]; then
        mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
        echo "[$timestamp] [$level] [redis] $message" >> "$LOG_FILE" 2>/dev/null || true
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
    if [[ $exit_code -ne 0 ]]; then
        log "ERROR" "Redis backup failed with exit code: $exit_code"
    fi
    exit $exit_code
}

trap cleanup EXIT

# ===========================================
# Validation
# ===========================================
validate_environment() {
    log "INFO" "Validating environment..."

    # Check required tools
    if ! command -v redis-cli &> /dev/null; then
        log "ERROR" "redis-cli not found"
        exit 1
    fi

    # Test Redis connection
    if ! redis_cli ping | grep -q "PONG"; then
        log "ERROR" "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
        exit 1
    fi

    # Create backup directories
    mkdir -p "$BACKUP_DIR/redis"/{daily,weekly,monthly}
    chmod 700 "$BACKUP_DIR/redis"

    log "INFO" "Environment validation passed"
}

# ===========================================
# Backup Functions
# ===========================================
trigger_bgsave() {
    log "INFO" "Triggering BGSAVE..."

    # Get last save timestamp before BGSAVE
    local last_save_before
    last_save_before=$(redis_cli LASTSAVE)

    # Trigger background save
    redis_cli BGSAVE > /dev/null

    # Wait for BGSAVE to complete (max 5 minutes)
    local max_wait=300
    local waited=0
    local interval=5

    while [[ $waited -lt $max_wait ]]; do
        sleep $interval
        waited=$((waited + interval))

        local last_save_after
        last_save_after=$(redis_cli LASTSAVE)

        if [[ "$last_save_after" != "$last_save_before" ]]; then
            log "INFO" "BGSAVE completed in ${waited}s"
            return 0
        fi

        # Check if BGSAVE is still running
        local bgsave_status
        bgsave_status=$(redis_cli INFO persistence | grep rdb_bgsave_in_progress | cut -d: -f2 | tr -d '\r')

        if [[ "$bgsave_status" == "0" ]]; then
            # BGSAVE finished but timestamp didn't change (no changes to save)
            log "INFO" "BGSAVE completed (no changes)"
            return 0
        fi

        log "DEBUG" "Waiting for BGSAVE... (${waited}s)"
    done

    log "ERROR" "BGSAVE timed out after ${max_wait}s"
    return 1
}

get_rdb_path() {
    # Get RDB file path from Redis config
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

perform_backup() {
    local backup_name="doctify_redis_${TIMESTAMP}"
    local final_dir="${BACKUP_DIR}/redis/${BACKUP_TYPE}"
    local final_file="${final_dir}/${backup_name}.rdb"

    log "INFO" "Starting Redis backup (type: $BACKUP_TYPE)"

    # Get RDB path
    local rdb_path
    rdb_path=$(get_rdb_path)
    log "INFO" "RDB file: $rdb_path"

    if [[ ! -f "$rdb_path" ]]; then
        log "ERROR" "RDB file not found: $rdb_path"
        exit 1
    fi

    # Copy RDB file
    cp "$rdb_path" "$final_file"

    # Get size
    local raw_size
    raw_size=$(du -h "$final_file" | cut -f1)
    log "INFO" "RDB size: $raw_size"

    # Compress
    log "INFO" "Compressing backup..."
    gzip -6 "$final_file"
    final_file="${final_file}.gz"

    # Get compressed size
    local compressed_size
    compressed_size=$(du -h "$final_file" | cut -f1)
    log "INFO" "Compressed size: $compressed_size"

    # Encrypt if enabled
    if [[ "$BACKUP_ENCRYPTION_ENABLED" == "true" ]]; then
        log "INFO" "Encrypting backup..."

        if [[ -n "${GPG_RECIPIENT:-}" ]]; then
            gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" \
                --output "${final_file}.gpg" "$final_file"
        else
            echo "${BACKUP_ENCRYPTION_KEY:-}" | gpg --batch --yes --passphrase-fd 0 \
                --symmetric --cipher-algo AES256 \
                --output "${final_file}.gpg" "$final_file"
        fi

        rm -f "$final_file"
        final_file="${final_file}.gpg"
    fi

    # Set secure permissions
    chmod 600 "$final_file"

    # Generate checksum
    sha256sum "$final_file" > "${final_file}.sha256"
    chmod 600 "${final_file}.sha256"

    log "INFO" "Redis backup completed: $final_file"
    echo "$final_file"
}

# ===========================================
# Retention Management
# ===========================================
apply_retention_policy() {
    log "INFO" "Applying Redis retention policy..."

    local retention_daily="${RETENTION_DAILY:-7}"
    local retention_weekly="${RETENTION_WEEKLY:-4}"
    local retention_monthly="${RETENTION_MONTHLY:-3}"

    for type in daily weekly monthly; do
        local dir="${BACKUP_DIR}/redis/${type}"
        local keep
        case "$type" in
            daily)   keep="$retention_daily" ;;
            weekly)  keep="$retention_weekly" ;;
            monthly) keep="$retention_monthly" ;;
        esac

        if [[ -d "$dir" ]]; then
            local count
            count=$(find "$dir" -maxdepth 1 -type f \( -name "*.gz" -o -name "*.gpg" \) 2>/dev/null | wc -l)

            if [[ $count -gt $keep ]]; then
                local to_delete=$((count - keep))
                log "INFO" "Removing $to_delete old Redis backups from $dir"

                find "$dir" -maxdepth 1 -type f \( -name "*.gz" -o -name "*.gpg" \) -printf '%T+ %p\n' | \
                    sort | head -n "$to_delete" | cut -d' ' -f2- | \
                    while read -r file; do
                        rm -f "$file" "${file}.sha256"
                        log "DEBUG" "Removed: $file"
                    done
            fi
        fi
    done

    log "INFO" "Redis retention policy applied"
}

# ===========================================
# Main
# ===========================================
main() {
    local skip_bgsave=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --bgsave)
                skip_bgsave=false
                shift
                ;;
            --rdb-only)
                skip_bgsave=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [--bgsave|--rdb-only]"
                echo ""
                echo "Options:"
                echo "  --bgsave    Trigger BGSAVE before backup (default)"
                echo "  --rdb-only  Copy existing RDB without triggering BGSAVE"
                echo "  --help      Show this help message"
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "INFO" "=== Doctify Redis Backup Starting ==="
    log "INFO" "Timestamp: $TIMESTAMP"
    log "INFO" "Backup type: $BACKUP_TYPE"

    # Validate environment
    validate_environment

    # Trigger BGSAVE unless skipped
    if [[ "$skip_bgsave" == "false" ]]; then
        trigger_bgsave
    fi

    # Perform backup
    perform_backup

    # Apply retention policy
    apply_retention_policy

    log "INFO" "=== Redis Backup Completed Successfully ==="
}

main "$@"

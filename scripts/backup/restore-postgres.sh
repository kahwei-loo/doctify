#!/bin/bash
# ===========================================
# Doctify PostgreSQL Restore Script
# ===========================================
# Restore PostgreSQL database from backup
#
# Usage: ./restore-postgres.sh <backup-file> [--test|--dry-run]
#
# Features:
#   - Supports encrypted (.gpg) and compressed (.gz) backups
#   - Checksum verification before restore
#   - Dry-run mode for validation
#   - Test mode to restore to temporary database

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
        echo "[$timestamp] [$level] [restore] $message" >> "$LOG_FILE" 2>/dev/null || true
    fi

    case "$level" in
        ERROR) echo "❌ ERROR: $message" >&2 ;;
        WARN)  echo "⚠️  WARN: $message" ;;
        INFO)  echo "ℹ️  INFO: $message" ;;
        DEBUG) [[ "$LOG_LEVEL" == "DEBUG" ]] && echo "🔍 DEBUG: $message" ;;
    esac
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
            log "ERROR" "The backup file may be corrupted."
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
        # Asymmetric decryption
        gpg --batch --yes --decrypt --output "$output_file" "$encrypted_file"
    else
        # Symmetric decryption
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
prepare_sql_file() {
    local backup_file="$1"
    local sql_file="${BACKUP_TEMP_DIR}/restore.sql"

    mkdir -p "$BACKUP_TEMP_DIR"

    # Handle encrypted files
    if [[ "$backup_file" == *.gpg ]]; then
        local decrypted="${BACKUP_TEMP_DIR}/decrypted.sql.gz"
        decrypt_backup "$backup_file" "$decrypted"
        backup_file="$decrypted"
    fi

    # Handle compressed files
    if [[ "$backup_file" == *.gz ]]; then
        log "INFO" "Decompressing backup..."
        gunzip -c "$backup_file" > "$sql_file"
    else
        cp "$backup_file" "$sql_file"
    fi

    echo "$sql_file"
}

perform_restore() {
    local sql_file="$1"
    local target_db="$2"
    local dry_run="${3:-false}"

    log "INFO" "Restoring to database: $target_db"

    # Export password
    export PGPASSWORD="${POSTGRES_PASSWORD:-}"

    # Build psql options
    local psql_opts=("-h" "$POSTGRES_HOST" "-p" "${POSTGRES_PORT:-5432}" "-U" "$POSTGRES_USER")

    if [[ "$dry_run" == "true" ]]; then
        log "INFO" "DRY RUN: Would execute SQL on $target_db"
        log "INFO" "SQL file size: $(du -h "$sql_file" | cut -f1)"
        log "INFO" "First 20 lines of SQL:"
        head -n 20 "$sql_file"
        return 0
    fi

    # Check if target database exists
    if psql "${psql_opts[@]}" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$target_db'" | grep -q 1; then
        log "WARN" "Database '$target_db' exists"

        if [[ "$target_db" != *"_test"* && "$target_db" != *"_restore"* ]]; then
            log "ERROR" "Refusing to overwrite production database without explicit confirmation"
            log "ERROR" "Use --test flag to restore to a test database first"
            exit 1
        fi

        log "INFO" "Dropping existing database..."
        psql "${psql_opts[@]}" -d postgres -c "DROP DATABASE IF EXISTS \"$target_db\";"
    fi

    # Create database
    log "INFO" "Creating database: $target_db"
    psql "${psql_opts[@]}" -d postgres -c "CREATE DATABASE \"$target_db\";"

    # Restore
    log "INFO" "Restoring data..."
    if psql "${psql_opts[@]}" -d "$target_db" < "$sql_file" > /dev/null 2>&1; then
        log "INFO" "Restore completed successfully"
    else
        log "ERROR" "Restore failed"
        exit 1
    fi

    # Verify
    log "INFO" "Verifying restore..."
    local table_count
    table_count=$(psql "${psql_opts[@]}" -d "$target_db" -tAc \
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    log "INFO" "Tables in restored database: $table_count"
}

# ===========================================
# Main
# ===========================================
main() {
    local backup_file=""
    local test_mode=false
    local dry_run=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --test)
                test_mode=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 <backup-file> [--test|--dry-run]"
                echo ""
                echo "Arguments:"
                echo "  backup-file  Path to backup file (.sql, .sql.gz, or .sql.gz.gpg)"
                echo ""
                echo "Options:"
                echo "  --test       Restore to a test database (dbname_restore_YYYYMMDD)"
                echo "  --dry-run    Validate backup without restoring"
                echo "  --help       Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0 /backups/doctify_postgres_20260118.sql.gz.gpg --test"
                echo "  $0 /backups/doctify_postgres_20260118.sql.gz --dry-run"
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
        echo "Usage: $0 <backup-file> [--test|--dry-run]"
        exit 1
    fi

    log "INFO" "=== Doctify PostgreSQL Restore Starting ==="
    log "INFO" "Backup file: $backup_file"
    log "INFO" "Test mode: $test_mode"
    log "INFO" "Dry run: $dry_run"

    # Validate backup file
    validate_backup_file "$backup_file"

    # Prepare SQL file
    local sql_file
    sql_file=$(prepare_sql_file "$backup_file")
    log "INFO" "SQL file prepared: $(du -h "$sql_file" | cut -f1)"

    # Determine target database
    local target_db="${POSTGRES_DB:-doctify}"
    if [[ "$test_mode" == "true" ]]; then
        target_db="${target_db}_restore_$(date +%Y%m%d)"
        log "INFO" "Test mode: will restore to $target_db"
    fi

    # Perform restore
    perform_restore "$sql_file" "$target_db" "$dry_run"

    if [[ "$dry_run" == "false" ]]; then
        log "INFO" "=== Restore Completed Successfully ==="
        log "INFO" "Database: $target_db"

        if [[ "$test_mode" == "true" ]]; then
            log "INFO" ""
            log "INFO" "Test database created. To verify:"
            log "INFO" "  psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $target_db"
            log "INFO" ""
            log "INFO" "To clean up test database:"
            log "INFO" "  DROP DATABASE \"$target_db\";"
        fi
    fi
}

main "$@"

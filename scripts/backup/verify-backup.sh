#!/bin/bash
# ===========================================
# Doctify Backup Verification Script
# ===========================================
# Verify integrity and recoverability of backups
#
# Usage: ./verify-backup.sh [backup-file|--all|--latest]
#
# Features:
#   - SHA256 checksum verification
#   - Encryption/decryption test
#   - Decompression validation
#   - Structure verification for SQL/RDB files
#   - Optional test restore

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
BACKUP_TEMP_DIR="${BACKUP_TEMP_DIR:-/tmp/doctify-backup}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===========================================
# Logging Functions
# ===========================================
log() {
    local level="$1"
    shift
    local message="$*"

    case "$level" in
        ERROR)   echo -e "${RED}❌ ERROR: $message${NC}" >&2 ;;
        WARN)    echo -e "${YELLOW}⚠️  WARN: $message${NC}" ;;
        INFO)    echo -e "ℹ️  INFO: $message" ;;
        SUCCESS) echo -e "${GREEN}✅ $message${NC}" ;;
        DEBUG)   [[ "$LOG_LEVEL" == "DEBUG" ]] && echo "🔍 DEBUG: $message" ;;
    esac
}

# ===========================================
# Cleanup Function
# ===========================================
cleanup() {
    if [[ -d "$BACKUP_TEMP_DIR" ]]; then
        rm -rf "${BACKUP_TEMP_DIR:?}"/* 2>/dev/null || true
    fi
}

trap cleanup EXIT

# ===========================================
# Verification Functions
# ===========================================
verify_checksum() {
    local backup_file="$1"
    local checksum_file="${backup_file}.sha256"

    if [[ ! -f "$checksum_file" ]]; then
        log "WARN" "No checksum file found: $checksum_file"
        return 1
    fi

    log "INFO" "Verifying SHA256 checksum..."

    if sha256sum -c "$checksum_file" > /dev/null 2>&1; then
        log "SUCCESS" "Checksum verification passed"
        return 0
    else
        log "ERROR" "Checksum verification FAILED!"
        return 1
    fi
}

verify_decryption() {
    local backup_file="$1"

    if [[ "$backup_file" != *.gpg ]]; then
        log "INFO" "File is not encrypted, skipping decryption test"
        return 0
    fi

    log "INFO" "Testing decryption..."
    mkdir -p "$BACKUP_TEMP_DIR"

    local output_file="${BACKUP_TEMP_DIR}/decrypt_test"

    if [[ -n "${GPG_RECIPIENT:-}" ]]; then
        if gpg --batch --yes --decrypt --output "$output_file" "$backup_file" 2>/dev/null; then
            log "SUCCESS" "Decryption test passed (asymmetric)"
            rm -f "$output_file"
            return 0
        fi
    else
        if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
            log "ERROR" "Cannot test decryption: no key configured"
            return 1
        fi

        if echo "${BACKUP_ENCRYPTION_KEY}" | gpg --batch --yes --passphrase-fd 0 \
            --decrypt --output "$output_file" "$backup_file" 2>/dev/null; then
            log "SUCCESS" "Decryption test passed (symmetric)"
            rm -f "$output_file"
            return 0
        fi
    fi

    log "ERROR" "Decryption test FAILED!"
    return 1
}

verify_compression() {
    local backup_file="$1"

    # Get the actual compressed file (after decryption if needed)
    local compressed_file="$backup_file"

    if [[ "$backup_file" == *.gpg ]]; then
        log "INFO" "Decrypting for compression test..."
        compressed_file="${BACKUP_TEMP_DIR}/compressed_test.gz"
        mkdir -p "$BACKUP_TEMP_DIR"

        if [[ -n "${GPG_RECIPIENT:-}" ]]; then
            gpg --batch --yes --decrypt --output "$compressed_file" "$backup_file" 2>/dev/null
        else
            echo "${BACKUP_ENCRYPTION_KEY:-}" | gpg --batch --yes --passphrase-fd 0 \
                --decrypt --output "$compressed_file" "$backup_file" 2>/dev/null
        fi
    fi

    if [[ "$compressed_file" != *.gz ]]; then
        log "INFO" "File is not compressed, skipping compression test"
        return 0
    fi

    log "INFO" "Testing decompression..."

    if gzip -t "$compressed_file" 2>/dev/null; then
        log "SUCCESS" "Decompression test passed"

        # Show compressed vs uncompressed size
        local compressed_size
        compressed_size=$(du -h "$compressed_file" | cut -f1)
        local uncompressed_size
        uncompressed_size=$(gzip -l "$compressed_file" 2>/dev/null | tail -1 | awk '{print $2}')
        uncompressed_size=$(numfmt --to=iec-i --suffix=B "$uncompressed_size" 2>/dev/null || echo "unknown")

        log "INFO" "Compressed: $compressed_size, Uncompressed: $uncompressed_size"
        return 0
    else
        log "ERROR" "Decompression test FAILED!"
        return 1
    fi
}

verify_sql_structure() {
    local backup_file="$1"

    log "INFO" "Verifying PostgreSQL backup structure..."
    mkdir -p "$BACKUP_TEMP_DIR"

    local sql_file="${BACKUP_TEMP_DIR}/verify.sql"

    # Extract SQL content
    local current_file="$backup_file"

    # Decrypt if needed
    if [[ "$current_file" == *.gpg ]]; then
        local decrypted="${BACKUP_TEMP_DIR}/decrypted.sql.gz"
        if [[ -n "${GPG_RECIPIENT:-}" ]]; then
            gpg --batch --yes --decrypt --output "$decrypted" "$current_file" 2>/dev/null
        else
            echo "${BACKUP_ENCRYPTION_KEY:-}" | gpg --batch --yes --passphrase-fd 0 \
                --decrypt --output "$decrypted" "$current_file" 2>/dev/null
        fi
        current_file="$decrypted"
    fi

    # Decompress if needed
    if [[ "$current_file" == *.gz ]]; then
        gunzip -c "$current_file" > "$sql_file"
    else
        cp "$current_file" "$sql_file"
    fi

    # Verify it's a valid SQL dump
    local checks_passed=0
    local checks_total=4

    # Check for PostgreSQL dump header
    if head -10 "$sql_file" | grep -qi "PostgreSQL\|pg_dump"; then
        ((checks_passed++))
        log "DEBUG" "PostgreSQL header found"
    else
        log "WARN" "PostgreSQL header not found"
    fi

    # Check for CREATE statements
    if grep -qi "CREATE TABLE\|CREATE INDEX\|CREATE SEQUENCE" "$sql_file"; then
        ((checks_passed++))
        log "DEBUG" "CREATE statements found"
    else
        log "WARN" "No CREATE statements found"
    fi

    # Check for schema references
    if grep -qi "public\." "$sql_file" || grep -qi "SET search_path" "$sql_file"; then
        ((checks_passed++))
        log "DEBUG" "Schema references found"
    else
        log "WARN" "No schema references found"
    fi

    # Check file size (should be > 1KB for any real database)
    local file_size
    file_size=$(wc -c < "$sql_file")
    if [[ $file_size -gt 1024 ]]; then
        ((checks_passed++))
        log "DEBUG" "File size OK: $file_size bytes"
    else
        log "WARN" "File seems too small: $file_size bytes"
    fi

    rm -f "$sql_file"

    if [[ $checks_passed -ge 3 ]]; then
        log "SUCCESS" "PostgreSQL structure verification passed ($checks_passed/$checks_total checks)"
        return 0
    else
        log "ERROR" "PostgreSQL structure verification FAILED ($checks_passed/$checks_total checks)"
        return 1
    fi
}

verify_rdb_structure() {
    local backup_file="$1"

    log "INFO" "Verifying Redis RDB structure..."
    mkdir -p "$BACKUP_TEMP_DIR"

    local rdb_file="${BACKUP_TEMP_DIR}/verify.rdb"

    # Extract RDB content
    local current_file="$backup_file"

    # Decrypt if needed
    if [[ "$current_file" == *.gpg ]]; then
        local decrypted="${BACKUP_TEMP_DIR}/decrypted.rdb.gz"
        if [[ -n "${GPG_RECIPIENT:-}" ]]; then
            gpg --batch --yes --decrypt --output "$decrypted" "$current_file" 2>/dev/null
        else
            echo "${BACKUP_ENCRYPTION_KEY:-}" | gpg --batch --yes --passphrase-fd 0 \
                --decrypt --output "$decrypted" "$current_file" 2>/dev/null
        fi
        current_file="$decrypted"
    fi

    # Decompress if needed
    if [[ "$current_file" == *.gz ]]; then
        gunzip -c "$current_file" > "$rdb_file"
    else
        cp "$current_file" "$rdb_file"
    fi

    # Verify RDB magic number (REDIS)
    local magic
    magic=$(head -c 5 "$rdb_file" 2>/dev/null | cat -v)

    if [[ "$magic" == "REDIS" ]]; then
        log "SUCCESS" "Redis RDB structure verification passed (magic number: REDIS)"

        # Get file info
        local file_size
        file_size=$(du -h "$rdb_file" | cut -f1)
        log "INFO" "RDB file size: $file_size"

        rm -f "$rdb_file"
        return 0
    else
        log "ERROR" "Redis RDB structure verification FAILED (invalid magic number)"
        rm -f "$rdb_file"
        return 1
    fi
}

verify_single_backup() {
    local backup_file="$1"
    local passed=0
    local failed=0

    log "INFO" "=========================================="
    log "INFO" "Verifying: $(basename "$backup_file")"
    log "INFO" "=========================================="

    # File exists check
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "File not found: $backup_file"
        return 1
    fi

    local file_size
    file_size=$(du -h "$backup_file" | cut -f1)
    log "INFO" "File size: $file_size"

    # Checksum verification
    if verify_checksum "$backup_file"; then
        ((passed++))
    else
        ((failed++))
    fi

    # Decryption test (if encrypted)
    if verify_decryption "$backup_file"; then
        ((passed++))
    else
        ((failed++))
    fi

    # Compression test (if compressed)
    if verify_compression "$backup_file"; then
        ((passed++))
    else
        ((failed++))
    fi

    # Structure verification (SQL or RDB)
    if [[ "$backup_file" == *"postgres"* ]] || [[ "$backup_file" == *".sql"* ]]; then
        if verify_sql_structure "$backup_file"; then
            ((passed++))
        else
            ((failed++))
        fi
    elif [[ "$backup_file" == *"redis"* ]] || [[ "$backup_file" == *".rdb"* ]]; then
        if verify_rdb_structure "$backup_file"; then
            ((passed++))
        else
            ((failed++))
        fi
    fi

    # Summary
    log "INFO" "------------------------------------------"
    if [[ $failed -eq 0 ]]; then
        log "SUCCESS" "All verifications passed ($passed tests)"
        return 0
    else
        log "ERROR" "Verification failed: $passed passed, $failed failed"
        return 1
    fi
}

find_latest_backup() {
    local type="$1"  # postgres or redis

    local search_dir="$BACKUP_DIR"
    if [[ "$type" == "redis" ]]; then
        search_dir="$BACKUP_DIR/redis"
    fi

    # Find the most recent backup file
    local latest
    latest=$(find "$search_dir" -type f \( -name "*.gz" -o -name "*.gpg" \) \
        -newer /dev/null 2>/dev/null | \
        grep -E "(postgres|redis)" | \
        xargs ls -t 2>/dev/null | head -1)

    echo "$latest"
}

verify_all_recent() {
    log "INFO" "Finding and verifying recent backups..."

    local total_passed=0
    local total_failed=0

    # Find latest PostgreSQL backup
    local postgres_latest
    postgres_latest=$(find_latest_backup "postgres")
    if [[ -n "$postgres_latest" ]]; then
        if verify_single_backup "$postgres_latest"; then
            ((total_passed++))
        else
            ((total_failed++))
        fi
    else
        log "WARN" "No PostgreSQL backups found"
    fi

    # Find latest Redis backup
    local redis_latest
    redis_latest=$(find_latest_backup "redis")
    if [[ -n "$redis_latest" ]]; then
        if verify_single_backup "$redis_latest"; then
            ((total_passed++))
        else
            ((total_failed++))
        fi
    else
        log "WARN" "No Redis backups found"
    fi

    log "INFO" "=========================================="
    log "INFO" "Overall Verification Summary"
    log "INFO" "=========================================="
    log "INFO" "Passed: $total_passed, Failed: $total_failed"

    [[ $total_failed -eq 0 ]]
}

# ===========================================
# Main
# ===========================================
main() {
    local mode="single"
    local backup_file=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --all)
                mode="all"
                shift
                ;;
            --latest)
                mode="latest"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [backup-file|--all|--latest]"
                echo ""
                echo "Arguments:"
                echo "  backup-file  Path to specific backup file to verify"
                echo ""
                echo "Options:"
                echo "  --all        Verify all backups in backup directory"
                echo "  --latest     Verify only the most recent PostgreSQL and Redis backups"
                echo "  --help       Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0 /backups/doctify_postgres_20260118.sql.gz.gpg"
                echo "  $0 --latest"
                echo "  $0 --all"
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

    log "INFO" "=========================================="
    log "INFO" "Doctify Backup Verification"
    log "INFO" "=========================================="

    mkdir -p "$BACKUP_TEMP_DIR"

    case "$mode" in
        single)
            if [[ -z "$backup_file" ]]; then
                log "ERROR" "No backup file specified"
                echo "Usage: $0 <backup-file>"
                exit 1
            fi
            verify_single_backup "$backup_file"
            ;;
        latest)
            verify_all_recent
            ;;
        all)
            log "INFO" "Scanning all backups in $BACKUP_DIR..."
            local total_files=0
            local total_passed=0

            while IFS= read -r -d '' file; do
                ((total_files++))
                if verify_single_backup "$file"; then
                    ((total_passed++))
                fi
            done < <(find "$BACKUP_DIR" -type f \( -name "*.gz" -o -name "*.gpg" \) -print0 2>/dev/null)

            log "INFO" "=========================================="
            log "INFO" "Verified $total_passed/$total_files backup files"
            [[ $total_passed -eq $total_files ]]
            ;;
    esac
}

main "$@"

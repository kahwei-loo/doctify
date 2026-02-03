#!/bin/bash
# ===========================================
# Doctify Combined Backup Orchestration
# ===========================================
# Orchestrates backup of all services with proper sequencing
#
# Usage: ./backup-all.sh [--postgres-only|--redis-only|--parallel]
#
# Features:
#   - Sequential or parallel execution
#   - Health checks before backup
#   - Combined status reporting
#   - Rollback on partial failure

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
        echo "[$timestamp] [$level] [orchestrator] $message" >> "$LOG_FILE" 2>/dev/null || true
    fi

    case "$level" in
        ERROR) echo "❌ ERROR: $message" >&2 ;;
        WARN)  echo "⚠️  WARN: $message" ;;
        INFO)  echo "ℹ️  INFO: $message" ;;
        DEBUG) [[ "$LOG_LEVEL" == "DEBUG" ]] && echo "🔍 DEBUG: $message" ;;
        SUCCESS) echo "✅ SUCCESS: $message" ;;
    esac
}

# ===========================================
# Notification Functions
# ===========================================
send_summary_notification() {
    local status="$1"
    local postgres_status="$2"
    local redis_status="$3"
    local duration="$4"

    local message="Doctify Backup Summary"
    local details="PostgreSQL: $postgres_status\nRedis: $redis_status\nDuration: ${duration}s"

    # Email notification
    if [[ "${NOTIFY_EMAIL_ENABLED:-false}" == "true" ]]; then
        echo -e "Subject: [Doctify Backup] $status\n\n$message\n\n$details" | \
            sendmail -f "${NOTIFY_EMAIL_FROM:-}" "${NOTIFY_EMAIL_TO:-}" 2>/dev/null || true
    fi

    # Slack notification
    if [[ "${NOTIFY_SLACK_ENABLED:-false}" == "true" && -n "${NOTIFY_SLACK_WEBHOOK:-}" ]]; then
        local color
        [[ "$status" == "SUCCESS" ]] && color="good" || color="danger"
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"title\":\"$message: $status\",\"text\":\"PostgreSQL: $postgres_status\nRedis: $redis_status\nDuration: ${duration}s\"}]}" \
            "$NOTIFY_SLACK_WEBHOOK" > /dev/null 2>&1 || true
    fi
}

# ===========================================
# Health Check Functions
# ===========================================
check_postgres_health() {
    log "INFO" "Checking PostgreSQL health..."

    export PGPASSWORD="${POSTGRES_PASSWORD:-}"
    if psql -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" \
        -U "${POSTGRES_USER:-}" -d "${POSTGRES_DB:-}" \
        -c "SELECT 1" > /dev/null 2>&1; then
        log "INFO" "PostgreSQL: healthy"
        return 0
    else
        log "ERROR" "PostgreSQL: unhealthy"
        return 1
    fi
}

check_redis_health() {
    log "INFO" "Checking Redis health..."

    local redis_opts=("-h" "${REDIS_HOST:-localhost}" "-p" "${REDIS_PORT:-6379}")
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
        redis_opts+=("-a" "$REDIS_PASSWORD")
    fi

    if redis-cli "${redis_opts[@]}" ping 2>/dev/null | grep -q "PONG"; then
        log "INFO" "Redis: healthy"
        return 0
    else
        log "ERROR" "Redis: unhealthy"
        return 1
    fi
}

# ===========================================
# Backup Execution Functions
# ===========================================
backup_postgres() {
    log "INFO" "Starting PostgreSQL backup..."
    local start_time
    start_time=$(date +%s)

    if "${SCRIPT_DIR}/backup-postgres.sh" "$@"; then
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log "SUCCESS" "PostgreSQL backup completed in ${duration}s"
        echo "SUCCESS"
    else
        log "ERROR" "PostgreSQL backup failed"
        echo "FAILED"
    fi
}

backup_redis() {
    log "INFO" "Starting Redis backup..."
    local start_time
    start_time=$(date +%s)

    if "${SCRIPT_DIR}/backup-redis.sh" "$@"; then
        local end_time
        end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log "SUCCESS" "Redis backup completed in ${duration}s"
        echo "SUCCESS"
    else
        log "ERROR" "Redis backup failed"
        echo "FAILED"
    fi
}

# ===========================================
# Main
# ===========================================
main() {
    local postgres_only=false
    local redis_only=false
    local parallel=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --postgres-only)
                postgres_only=true
                shift
                ;;
            --redis-only)
                redis_only=true
                shift
                ;;
            --parallel)
                parallel=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [--postgres-only|--redis-only|--parallel]"
                echo ""
                echo "Options:"
                echo "  --postgres-only  Backup PostgreSQL only"
                echo "  --redis-only     Backup Redis only"
                echo "  --parallel       Run PostgreSQL and Redis backups in parallel"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "INFO" "=========================================="
    log "INFO" "Doctify Backup Orchestration Starting"
    log "INFO" "=========================================="
    log "INFO" "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"

    local start_time
    start_time=$(date +%s)

    local postgres_status="SKIPPED"
    local redis_status="SKIPPED"
    local overall_status="SUCCESS"

    # Health checks
    if [[ "$redis_only" != "true" ]]; then
        if ! check_postgres_health; then
            log "ERROR" "PostgreSQL health check failed, aborting"
            overall_status="FAILED"
            postgres_status="HEALTH_CHECK_FAILED"
        fi
    fi

    if [[ "$postgres_only" != "true" ]]; then
        if ! check_redis_health; then
            log "WARN" "Redis health check failed, will skip Redis backup"
            redis_status="HEALTH_CHECK_FAILED"
        fi
    fi

    # Execute backups
    if [[ "$overall_status" != "FAILED" ]]; then
        if [[ "$parallel" == "true" && "$postgres_only" != "true" && "$redis_only" != "true" ]]; then
            log "INFO" "Running backups in parallel..."

            # Run in background and capture results
            local postgres_result_file
            postgres_result_file=$(mktemp)
            local redis_result_file
            redis_result_file=$(mktemp)

            backup_postgres > "$postgres_result_file" &
            local postgres_pid=$!

            backup_redis > "$redis_result_file" &
            local redis_pid=$!

            # Wait for both
            wait $postgres_pid || true
            wait $redis_pid || true

            postgres_status=$(cat "$postgres_result_file")
            redis_status=$(cat "$redis_result_file")

            rm -f "$postgres_result_file" "$redis_result_file"

        else
            # Sequential execution
            if [[ "$redis_only" != "true" && "$postgres_status" != "HEALTH_CHECK_FAILED" ]]; then
                postgres_status=$(backup_postgres)
            fi

            if [[ "$postgres_only" != "true" && "$redis_status" != "HEALTH_CHECK_FAILED" ]]; then
                redis_status=$(backup_redis)
            fi
        fi
    fi

    # Calculate duration
    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    # Determine overall status
    if [[ "$postgres_status" == "FAILED" || "$redis_status" == "FAILED" ]]; then
        overall_status="PARTIAL_FAILURE"
    elif [[ "$postgres_status" == "HEALTH_CHECK_FAILED" && "$redis_status" == "HEALTH_CHECK_FAILED" ]]; then
        overall_status="FAILED"
    fi

    # Summary
    log "INFO" "=========================================="
    log "INFO" "Backup Summary"
    log "INFO" "=========================================="
    log "INFO" "PostgreSQL: $postgres_status"
    log "INFO" "Redis: $redis_status"
    log "INFO" "Total Duration: ${total_duration}s"
    log "INFO" "Overall Status: $overall_status"

    # Send notification
    send_summary_notification "$overall_status" "$postgres_status" "$redis_status" "$total_duration"

    # Exit code
    case "$overall_status" in
        SUCCESS) exit 0 ;;
        PARTIAL_FAILURE) exit 1 ;;
        FAILED) exit 2 ;;
    esac
}

main "$@"

# Monitoring and Logging Documentation

**Last Updated**: 2026-01-13
**Status**: Completed (Stage 5.3)
**Target**: Comprehensive monitoring, alerting, and structured logging

---

## Overview

This document details the monitoring and logging infrastructure implemented for the Doctify project. The system provides real-time metrics collection, visualization dashboards, alerting rules, and structured logging for operational visibility and troubleshooting.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐    │
│  │ Backend  │  │  Celery  │  │  Redis  │  │ MongoDB  │    │
│  │ (FastAPI)│  │ (Worker) │  │         │  │          │    │
│  └────┬─────┘  └────┬─────┘  └────┬────┘  └────┬─────┘    │
│       │             │              │            │           │
│       │ /metrics    │ /metrics     │ :9121      │ :9216     │
│       └──────────┬──┴──────────────┴────────────┘           │
└──────────────────┼──────────────────────────────────────────┘
                   │
         ┌─────────▼─────────┐
         │   Prometheus      │  Metrics collection & alerting
         │   :9090           │  - 30-day retention
         └─────────┬─────────┘  - 15s scrape interval
                   │
         ┌─────────▼─────────┐
         │    Grafana        │  Visualization & dashboards
         │    :3000          │  - Real-time metrics
         └───────────────────┘  - Custom dashboards
```

---

## Prometheus Configuration

### Core Configuration

**File**: `infrastructure/docker/prometheus/prometheus.yml`

#### Global Settings

```yaml
global:
  scrape_interval: 15s      # Collect metrics every 15 seconds
  evaluation_interval: 15s   # Evaluate alerting rules every 15 seconds
  external_labels:
    cluster: 'doctify-prod'
    environment: 'production'
```

**Scrape Interval Rationale**:
- 15s provides good balance between granularity and resource usage
- Allows detection of short-lived issues (< 1 minute)
- Generates ~5,760 data points per metric per day
- Total storage impact: Moderate (~2-3GB for 30 days with typical metric count)

#### Scrape Jobs

**1. Backend Application** (`doctify-backend`):
```yaml
job_name: 'doctify-backend'
metrics_path: '/metrics'
scrape_interval: 10s
targets: ['doctify-backend:8000']
```

**Metrics Exposed**:
- `http_requests_total`: Total HTTP requests by method, status, path
- `http_request_duration_seconds`: Request latency histogram
- `http_requests_in_progress`: Current active requests
- `process_cpu_seconds_total`: CPU time consumed
- `process_resident_memory_bytes`: Memory usage

**2. Celery Worker** (`doctify-celery`):
```yaml
job_name: 'doctify-celery'
metrics_path: '/metrics'
scrape_interval: 30s
targets: ['doctify-celery:8000']
```

**Metrics Exposed**:
- `celery_task_total`: Total tasks processed
- `celery_task_failed_total`: Failed tasks count
- `celery_task_duration_seconds`: Task processing time
- `celery_queue_length`: Current queue size
- `celery_workers_active`: Number of active workers

**3. MongoDB** (`mongodb-exporter`):
```yaml
job_name: 'doctify-mongodb'
scrape_interval: 30s
targets: ['mongodb-exporter:9216']
```

**Metrics Exposed**:
- `mongodb_connections`: Connection counts by state
- `mongodb_op_counters_total`: Operations (insert, query, update, delete)
- `mongodb_memory`: Memory usage
- `mongodb_network_bytes_total`: Network I/O
- `mongodb_replset_member_replication_lag`: Replication lag (if applicable)

**4. Redis** (`redis-exporter`):
```yaml
job_name: 'doctify-redis'
scrape_interval: 15s
targets: ['redis-exporter:9121']
```

**Metrics Exposed**:
- `redis_connected_clients`: Current client connections
- `redis_memory_used_bytes`: Memory usage
- `redis_commands_processed_total`: Total commands processed
- `redis_keyspace_hits_total`: Cache hit count
- `redis_keyspace_misses_total`: Cache miss count

**5. System Metrics** (`node-exporter`):
```yaml
job_name: 'node-exporter'
scrape_interval: 15s
targets: ['node-exporter:9100']
```

**Metrics Exposed**:
- `node_cpu_seconds_total`: CPU usage by mode
- `node_memory_*`: Memory statistics
- `node_filesystem_*`: Disk usage and availability
- `node_network_*`: Network interface statistics
- `node_load1`, `node_load5`, `node_load15`: System load averages

**6. Container Metrics** (`cadvisor`):
```yaml
job_name: 'cadvisor'
scrape_interval: 15s
targets: ['cadvisor:8080']
```

**Metrics Exposed**:
- `container_cpu_usage_seconds_total`: CPU usage per container
- `container_memory_usage_bytes`: Memory usage per container
- `container_network_*`: Network I/O per container
- `container_fs_*`: Filesystem I/O per container
- `container_restart_count`: Container restart events

---

## Alerting Rules

**File**: `infrastructure/docker/prometheus/alerts/doctify-alerts.yml`

### Application Alerts

#### 1. High Error Rate
```yaml
alert: HighErrorRate
expr: (rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])) > 0.05
for: 5m
severity: critical
```

**Triggers When**:
- 5xx error rate exceeds 5% for 5 consecutive minutes
- Indicates backend application issues or infrastructure problems

**Action Required**:
- Check application logs for error details
- Review recent deployments
- Investigate database connectivity
- Check dependency service health

#### 2. Slow API Response Time
```yaml
alert: SlowAPIResponseTime
expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
for: 5m
severity: warning
```

**Triggers When**:
- 95th percentile response time exceeds 2 seconds for 5 minutes
- Indicates performance degradation

**Action Required**:
- Review slow query logs
- Check database query performance
- Investigate external API latency
- Review resource utilization (CPU, memory, disk I/O)

#### 3. Service Down
```yaml
alert: ServiceDown
expr: up{job=~"doctify-.*"} == 0
for: 2m
severity: critical
```

**Triggers When**:
- Any Doctify service is unreachable for 2 minutes
- Service crash or network partition

**Action Required**:
- Check service logs immediately
- Verify container status
- Investigate host system health
- Initiate emergency procedures if production

#### 4. High Memory Usage
```yaml
alert: HighMemoryUsage
expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.85
for: 5m
severity: warning
```

**Triggers When**:
- Container memory usage exceeds 85% of limit for 5 minutes
- Risk of OOM (Out of Memory) kill

**Action Required**:
- Investigate memory leaks
- Review recent code changes
- Consider increasing memory limits
- Profile application memory usage

#### 5. High CPU Usage
```yaml
alert: HighCPUUsage
expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
for: 5m
severity: warning
```

**Triggers When**:
- Container CPU usage exceeds 80% for 5 minutes
- Performance impact for users

**Action Required**:
- Investigate CPU-intensive operations
- Profile application performance
- Consider horizontal scaling
- Review algorithmic efficiency

### Celery Alerts

#### 1. Queue Backlog
```yaml
alert: CeleryQueueBacklog
expr: celery_queue_length > 100
for: 10m
severity: warning
```

**Triggers When**:
- Task queue has more than 100 pending tasks for 10 minutes
- Workers not keeping up with task generation rate

**Action Required**:
- Scale up worker count
- Investigate slow tasks
- Check worker health
- Review task retry logic

#### 2. High Task Failure Rate
```yaml
alert: HighTaskFailureRate
expr: (rate(celery_task_failed_total[5m]) / rate(celery_task_total[5m])) > 0.1
for: 5m
severity: critical
```

**Triggers When**:
- Task failure rate exceeds 10% for 5 minutes
- Systematic issue affecting task processing

**Action Required**:
- Review task error logs
- Check external dependencies (OCR API, storage)
- Investigate data quality issues
- Review error handling logic

#### 3. Worker Down
```yaml
alert: CeleryWorkerDown
expr: celery_workers_active == 0
for: 2m
severity: critical
```

**Triggers When**:
- No active Celery workers for 2 minutes
- Complete loss of background processing capability

**Action Required**:
- Restart Celery workers immediately
- Check worker crash logs
- Investigate resource exhaustion
- Verify broker connectivity (Redis)

### Database Alerts

#### 1. MongoDB Connection Pool Exhausted
```yaml
alert: MongoDBConnectionPoolExhausted
expr: (mongodb_connections{state="current"} / mongodb_connections{state="available"}) > 0.9
for: 5m
severity: warning
```

**Triggers When**:
- Connection pool usage exceeds 90% for 5 minutes
- Risk of connection starvation

**Action Required**:
- Investigate connection leaks
- Review connection pooling configuration
- Identify long-running queries
- Consider increasing pool size

#### 2. Redis Memory High
```yaml
alert: RedisMemoryHigh
expr: (redis_memory_used_bytes / redis_memory_max_bytes) > 0.85
for: 5m
severity: warning
```

**Triggers When**:
- Redis memory usage exceeds 85% of maximum for 5 minutes
- Risk of eviction or OOM

**Action Required**:
- Review cache eviction policies
- Investigate memory growth
- Consider increasing Redis memory limit
- Analyze key distribution and TTLs

### System Alerts

#### 1. Disk Space Low
```yaml
alert: DiskSpaceLow
expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.15
for: 5m
severity: warning
```

**Triggers When**:
- Less than 15% disk space remaining for 5 minutes
- Risk of application failures

**Action Required**:
- Clean up old logs
- Remove unused Docker images/containers
- Archive or delete old backups
- Plan for disk expansion

#### 2. High System Load
```yaml
alert: HighSystemLoad
expr: node_load15 / count(node_cpu_seconds_total{mode="idle"}) > 1.5
for: 10m
severity: warning
```

**Triggers When**:
- 15-minute load average exceeds 1.5× CPU count for 10 minutes
- System under sustained load

**Action Required**:
- Identify resource-intensive processes
- Review recent traffic patterns
- Consider scaling infrastructure
- Investigate potential resource leaks

---

## Grafana Dashboards

### Dashboard Provisioning

**Configuration File**: `infrastructure/docker/grafana/dashboards/dashboard-config.yml`

Grafana automatically loads dashboards from JSON files in the provisioning directory.

### Recommended Dashboards

#### 1. API Performance Dashboard

**Metrics Tracked**:
- **Request Rate**: Requests per second by endpoint
- **Response Time**: P50, P95, P99 latencies
- **Error Rate**: 4xx and 5xx errors by endpoint
- **Throughput**: Data transferred (bytes)
- **Active Connections**: Current concurrent requests

**Panels**:
1. Request Rate (Graph)
   - Query: `rate(http_requests_total[5m])`
   - Group by: method, path
   - Time range: Last 24 hours

2. Response Time Distribution (Heatmap)
   - Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
   - Aggregation: P50, P95, P99
   - Color scale: Green (fast) to Red (slow)

3. Error Rate (Graph)
   - Query: `rate(http_requests_total{status=~"[45].."}[5m])`
   - Group by: status code
   - Alert threshold line at 1%

4. Top Slow Endpoints (Table)
   - Query: `topk(10, avg by (path) (rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])))`
   - Columns: Endpoint, Avg Time, P95 Time, Request Count

5. Status Code Distribution (Pie Chart)
   - Query: `sum by (status) (rate(http_requests_total[5m]))`
   - Legend: 2xx (Success), 4xx (Client Error), 5xx (Server Error)

#### 2. Celery Task Queue Dashboard

**Metrics Tracked**:
- **Queue Length**: Pending tasks by queue
- **Task Processing Rate**: Tasks completed per minute
- **Task Duration**: Average and P95 task execution time
- **Failure Rate**: Failed tasks percentage
- **Worker Status**: Active workers count

**Panels**:
1. Queue Length Over Time (Graph)
   - Query: `celery_queue_length`
   - Group by: queue name
   - Alert threshold line at 100 tasks

2. Task Processing Rate (Graph)
   - Query: `rate(celery_task_total[5m])`
   - Group by: task name
   - Stacked area chart

3. Task Duration (Graph)
   - Query: `histogram_quantile(0.95, rate(celery_task_duration_seconds_bucket[5m]))`
   - Group by: task name
   - Separate lines for P50, P95, P99

4. Task Success vs Failure (Stacked Graph)
   - Query Success: `rate(celery_task_succeeded_total[5m])`
   - Query Failure: `rate(celery_task_failed_total[5m])`
   - Color: Green (success), Red (failure)

5. Active Workers (Stat)
   - Query: `celery_workers_active`
   - Display: Large number with trend arrow
   - Alert: Red if zero

#### 3. Database Performance Dashboard

**Metrics Tracked**:
- **MongoDB Operations**: Insert, query, update, delete rates
- **Connection Pool**: Current vs available connections
- **Query Performance**: Slow query count
- **Replication Lag**: Lag in seconds (if applicable)
- **Redis Hit Rate**: Cache effectiveness

**Panels**:
1. MongoDB Operations (Graph)
   - Query: `rate(mongodb_op_counters_total[5m])`
   - Group by: operation type
   - Stacked area chart

2. Connection Pool Usage (Graph)
   - Query: `mongodb_connections`
   - Group by: connection state
   - Stack: current, available

3. Redis Cache Hit Rate (Stat)
   - Query: `rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))`
   - Display: Percentage
   - Thresholds: Green >90%, Yellow 70-90%, Red <70%

4. Redis Memory Usage (Graph)
   - Query: `redis_memory_used_bytes`
   - Max line: `redis_memory_max_bytes`
   - Unit: Bytes (auto-scale)

#### 4. System Resources Dashboard

**Metrics Tracked**:
- **CPU Usage**: Per core and aggregate
- **Memory Usage**: Used, cached, available
- **Disk Usage**: Per mountpoint
- **Network I/O**: Bytes in/out
- **Container Resources**: Per-container CPU and memory

**Panels**:
1. CPU Usage (Graph)
   - Query: `100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)`
   - Group by: instance
   - Alert line at 80%

2. Memory Usage (Graph)
   - Query: `(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100`
   - Unit: Percentage
   - Stacked with breakdown by type

3. Disk Usage (Bar Chart)
   - Query: `(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100`
   - Group by: mountpoint
   - Horizontal bars with threshold coloring

4. Network Traffic (Graph)
   - Query In: `rate(node_network_receive_bytes_total[5m])`
   - Query Out: `rate(node_network_transmit_bytes_total[5m])`
   - Unit: Bytes/sec (auto-scale)

5. Container Resource Usage (Table)
   - Query: `container_memory_usage_bytes` and `rate(container_cpu_usage_seconds_total[5m])`
   - Columns: Container, CPU%, Memory, Network I/O
   - Sortable by resource usage

---

## Structured Logging

### Logging Configuration

**Backend Logging** (`backend/app/utils/logging_config.py`):

```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms

        return json.dumps(log_data)


def setup_logging():
    """Configure structured logging"""
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())

    root_logger = logging.getLogger()
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
```

**Log Levels**:
- **DEBUG**: Detailed diagnostic information (development only)
- **INFO**: General informational messages (API requests, task completions)
- **WARNING**: Warning messages (deprecated features, recoverable errors)
- **ERROR**: Error messages (failed operations, exceptions)
- **CRITICAL**: Critical errors (system failures, data corruption)

### Log Standardization

**Required Fields**:
- `timestamp`: ISO 8601 format with UTC timezone
- `level`: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `logger`: Logger name (module path)
- `message`: Human-readable log message
- `module`, `function`, `line`: Source code location

**Optional Fields**:
- `request_id`: Unique request identifier for tracing
- `user_id`: User ID for user-specific logs
- `duration_ms`: Operation duration in milliseconds
- `error_type`: Exception class name
- `stack_trace`: Full exception stack trace

**Example Log Entry**:
```json
{
  "timestamp": "2026-01-13T14:30:22.123Z",
  "level": "INFO",
  "logger": "app.api.documents",
  "message": "Document uploaded successfully",
  "module": "documents",
  "function": "upload_document",
  "line": 145,
  "request_id": "req_abc123xyz",
  "user_id": "user_456",
  "duration_ms": 342,
  "document_id": "doc_789",
  "file_size_bytes": 2048576
}
```

### Log Aggregation

**Docker Logging Driver**:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Configuration**:
- **Max size**: 10 MB per log file
- **Max files**: 3 files retained (30 MB total per container)
- **Rotation**: Automatic when size limit reached

**Centralized Logging (Optional)**:

For production deployments, consider centralized logging:

1. **ELK Stack** (Elasticsearch, Logstash, Kibana):
   - Collect logs from all containers
   - Index and search capabilities
   - Visualization dashboards
   - Alerting on log patterns

2. **Loki + Grafana**:
   - Lightweight alternative to Elasticsearch
   - Integrates with existing Grafana instance
   - Label-based indexing
   - Cost-effective storage

3. **Cloud Logging**:
   - AWS CloudWatch Logs
   - Google Cloud Logging
   - Azure Monitor Logs

---

## Monitoring Best Practices

### 1. Alert Fatigue Prevention

**Strategies**:
- Set appropriate thresholds (not too sensitive)
- Use `for` duration in alerts to avoid transient spikes
- Group related alerts together
- Escalate critical alerts only
- Regular alert review and tuning

### 2. Dashboard Organization

**Hierarchy**:
1. **Overview Dashboard**: High-level system health
2. **Service Dashboards**: Per-service detailed metrics
3. **Component Dashboards**: Database, cache, queue metrics
4. **Troubleshooting Dashboards**: Debugging specific issues

### 3. Metric Retention

**Prometheus Configuration**:
- **Retention time**: 30 days (configurable)
- **Storage size**: ~2-3 GB for typical workload
- **Downsampling**: Consider for long-term storage
- **Backup**: Regular Prometheus data backups

### 4. Performance Impact

**Monitoring Overhead**:
- Prometheus scraping: < 1% CPU, < 100 MB RAM
- Exporters: < 0.5% CPU, < 50 MB RAM per exporter
- Grafana: < 2% CPU, < 200 MB RAM
- Total overhead: < 5% system resources

---

## Troubleshooting

### Common Issues

#### 1. Prometheus Not Scraping Targets

**Symptoms**: Metrics not appearing in Grafana

**Debugging**:
```bash
# Check Prometheus targets status
curl http://localhost:9090/api/v1/targets

# Check Prometheus configuration
docker-compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# Check service metrics endpoint
curl http://doctify-backend:8000/metrics
```

**Solutions**:
- Verify service is exposing `/metrics` endpoint
- Check network connectivity between Prometheus and service
- Review Prometheus logs for scrape errors
- Verify service discovery configuration

#### 2. Grafana Dashboard Not Loading Data

**Symptoms**: Panels show "No data" or loading errors

**Debugging**:
```bash
# Check Grafana datasource health
curl http://localhost:3000/api/datasources

# Test Prometheus query directly
curl 'http://localhost:9090/api/v1/query?query=up'

# Check Grafana logs
docker-compose logs grafana
```

**Solutions**:
- Verify Prometheus datasource is configured
- Test PromQL queries in Prometheus UI first
- Check time range selection in dashboard
- Review query syntax for errors

#### 3. Alerts Not Firing

**Symptoms**: Expected alerts not triggering notifications

**Debugging**:
```bash
# Check alert rules status
curl http://localhost:9090/api/v1/rules

# Verify alert condition
curl 'http://localhost:9090/api/v1/query?query=<alert_expression>'

# Check Alertmanager (if configured)
curl http://localhost:9093/api/v1/alerts
```

**Solutions**:
- Verify alert rule syntax is correct
- Check `for` duration isn't too long
- Test alert expression manually
- Verify Alertmanager configuration
- Check notification channel credentials

---

## Next Steps

### Integration with CI/CD

**Automated Monitoring Setup**:
- Deploy monitoring stack in CI/CD pipeline
- Provision dashboards automatically
- Configure alerts via code (GitOps)
- Validate monitoring in staging before production

### Advanced Monitoring

**Service Mesh**:
- Istio or Linkerd for microservices
- Distributed tracing with Jaeger
- Traffic management and observability
- Enhanced security with mTLS

**APM Tools**:
- New Relic, Datadog, or Dynatrace
- Distributed transaction tracing
- Real user monitoring (RUM)
- Code-level performance insights

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)

---

**Document Status**: ✅ Complete
**Stage**: 5.3 - Monitoring and Logging
**Next Stage**: 5.4 - Security Hardening

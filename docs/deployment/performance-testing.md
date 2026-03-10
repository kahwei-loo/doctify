# Performance Testing Guide

**Document Status**: ✅ Complete
**Stage**: 5.5 - Performance Testing
**Next Stage**: Deployment complete!

## Table of Contents

- [Overview](#overview)
- [Performance Targets](#performance-targets)
- [Testing Tools](#testing-tools)
- [Test Scenarios](#test-scenarios)
- [Running Tests](#running-tests)
- [Analyzing Results](#analyzing-results)
- [Performance Optimization](#performance-optimization)
- [Capacity Planning](#capacity-planning)
- [Troubleshooting](#troubleshooting)

---

## Overview

Performance testing ensures the Doctify application meets response time, throughput, and stability requirements under various load conditions.

### Testing Objectives

1. **Validate Performance Targets**: Ensure API meets defined SLAs
2. **Identify Bottlenecks**: Find performance limitations before production
3. **Capacity Planning**: Determine infrastructure requirements
4. **Regression Prevention**: Catch performance degradation early
5. **Scalability Assessment**: Verify horizontal/vertical scaling effectiveness

### Test Types

```
┌─────────────────────────────────────────────┐
│  Smoke Test (1 VU, 1 min)                 │
│  → Verify basic functionality              │
├─────────────────────────────────────────────┤
│  Load Test (100 VUs, 10 min)              │
│  → Validate normal traffic patterns        │
├─────────────────────────────────────────────┤
│  Stress Test (Progressive 10→200 VUs)     │
│  → Find breaking points                    │
├─────────────────────────────────────────────┤
│  Spike Test (10→200→10 VUs)               │
│  → Test sudden traffic increases           │
├─────────────────────────────────────────────┤
│  Soak Test (50 VUs, 2+ hours)             │
│  → Identify memory leaks and stability     │
└─────────────────────────────────────────────┘
```

---

## Performance Targets

### Response Time Targets

| Endpoint Category | Average | P95 | P99 | Max |
|-------------------|---------|-----|-----|-----|
| Health/Status | < 50ms | < 100ms | < 150ms | < 200ms |
| Document List | < 100ms | < 200ms | < 500ms | < 1000ms |
| Document Get | < 100ms | < 200ms | < 500ms | < 1000ms |
| Document Search | < 150ms | < 300ms | < 800ms | < 1500ms |
| Document Upload | < 2000ms | < 5000ms | < 10000ms | < 15000ms |
| Document Processing | < 5000ms | < 15000ms | < 30000ms | < 60000ms |
| Authentication | < 200ms | < 500ms | < 1000ms | < 2000ms |

### Throughput Targets

- **Minimum**: 100 requests/second
- **Target**: 500 requests/second
- **Optimal**: 1000+ requests/second

### Error Rate Targets

- **Maximum Acceptable**: 0.1% (1 error per 1000 requests)
- **Target**: 0.01% (1 error per 10,000 requests)
- **Optimal**: 0.001% (1 error per 100,000 requests)

### Resource Utilization Targets

| Resource | Warning Threshold | Critical Threshold |
|----------|------------------|--------------------|
| CPU | 70% | 90% |
| Memory | 80% | 95% |
| Disk I/O | 70% | 90% |
| Network | 70% | 90% |
| Database Connections | 80% | 95% |

---

## Testing Tools

### Locust (Python-based)

**Advantages**:
- Python-based (easy to extend)
- Web UI for real-time monitoring
- Distributed testing support
- Easy to write complex user scenarios

**Disadvantages**:
- Lower maximum throughput than k6
- Higher resource usage per user

**Best For**:
- Complex user behavior simulation
- API testing with Python integration
- Teams familiar with Python

### k6 (JavaScript-based)

**Advantages**:
- High performance (Go-based)
- Lower resource usage
- Better for high-concurrency testing
- Native TypeScript support

**Disadvantages**:
- More complex scenario scripting
- Limited browser automation

**Best For**:
- High-volume load testing
- Performance benchmarking
- CI/CD integration
- Cloud-scale testing

---

## Test Scenarios

### 1. Smoke Test

**Purpose**: Verify basic functionality before comprehensive testing

**Configuration**:
```bash
# Locust
./scripts/run-performance-tests.sh --tool locust --type smoke

# k6
./scripts/run-performance-tests.sh --tool k6 --type smoke
```

**Parameters**:
- Users/VUs: 1
- Duration: 1 minute
- Endpoints: Health, root, authentication

**Success Criteria**:
- All requests return 200 status
- No errors
- Average response time < 500ms

### 2. Load Test

**Purpose**: Validate performance under normal traffic conditions

**Configuration**:
```bash
# Locust (100 users, 10 minutes)
./scripts/run-performance-tests.sh \
    --tool locust \
    --type load \
    --users 100 \
    --duration 10m \
    --rate 10

# k6 (100 VUs, 10 minutes)
./scripts/run-performance-tests.sh \
    --tool k6 \
    --type load \
    --users 100 \
    --duration 10m
```

**Parameters**:
- Users/VUs: 100
- Duration: 10 minutes
- Ramp-up: 10 users/second
- User mix: 60% readers, 30% active users, 10% power users

**Success Criteria**:
- P95 response time < 500ms
- P99 response time < 2000ms
- Error rate < 0.1%
- Throughput > 100 req/s

### 3. Stress Test

**Purpose**: Find system breaking points and identify bottlenecks

**Configuration**:
```bash
# Locust (progressive load increase)
./scripts/run-performance-tests.sh --tool locust --type stress

# k6 (staged load increase)
./scripts/run-performance-tests.sh --tool k6 --type stress
```

**Parameters**:
- Stage 1: 10 users for 2 minutes
- Stage 2: 50 users for 5 minutes
- Stage 3: 100 users for 2 minutes
- Stage 4: 150 users for 5 minutes
- Stage 5: Ramp down to 0

**Success Criteria**:
- System remains stable up to 150 users
- Error rate stays below 1% at all stages
- Graceful degradation under extreme load
- No memory leaks or crashes

### 4. Spike Test

**Purpose**: Test resilience to sudden traffic increases

**Configuration**:
```bash
# Locust
./scripts/run-performance-tests.sh --tool locust --type spike

# k6
./scripts/run-performance-tests.sh --tool k6 --type spike
```

**Parameters**:
- Baseline: 10 users
- Spike 1: Instant increase to 200 users (1 minute)
- Recovery: Back to 10 users
- Spike 2: Instant increase to 300 users (1 minute)
- Recovery: Back to 10 users

**Success Criteria**:
- System recovers after spikes
- No permanent errors or data corruption
- Response time returns to normal after spike
- Auto-scaling triggers (if configured)

### 5. Soak Test (Endurance)

**Purpose**: Identify memory leaks and long-term stability issues

**Configuration**:
```bash
# Locust (50 users, 2 hours)
./scripts/run-performance-tests.sh \
    --tool locust \
    --type load \
    --users 50 \
    --duration 2h

# k6 (50 VUs, 2 hours)
./scripts/run-performance-tests.sh \
    --tool k6 \
    --type load \
    --users 50 \
    --duration 2h
```

**Parameters**:
- Users/VUs: 50 (moderate load)
- Duration: 2+ hours
- Consistent traffic pattern

**Success Criteria**:
- Memory usage remains stable (no upward trend)
- No increase in error rate over time
- Response times remain consistent
- Database connection pool stable
- No resource leaks

---

## Running Tests

### Prerequisites

1. **Application Running**:
```bash
# Start application with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Verify health
curl http://localhost:8000/health
```

2. **Test Data Setup**:
```bash
# Create test users (run once)
python scripts/setup-test-data.py

# Verify test users exist
curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test_user_1@example.com","password":"TestPassword123!"}'
```

3. **Install Testing Tools**:

**Locust**:
```bash
pip install locust
locust --version
```

**k6**:
```bash
# Windows
choco install k6

# macOS
brew install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Quick Start

**Smoke Test** (verify everything works):
```bash
./scripts/run-performance-tests.sh --type smoke
```

**Load Test** (10 minutes, 100 users):
```bash
./scripts/run-performance-tests.sh --type load
```

**Stress Test** (find breaking point):
```bash
./scripts/run-performance-tests.sh --type stress
```

**Custom Configuration**:
```bash
./scripts/run-performance-tests.sh \
    --tool k6 \
    --type load \
    --users 200 \
    --duration 15m \
    --base-url http://your-server:8000
```

### CI/CD Integration

**GitHub Actions**:
```yaml
performance-test:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Start application
      run: docker-compose up -d

    - name: Wait for health
      run: |
        timeout 60 bash -c 'until curl -f http://localhost:8000/health; do sleep 2; done'

    - name: Run smoke test
      run: |
        chmod +x scripts/run-performance-tests.sh
        ./scripts/run-performance-tests.sh --type smoke

    - name: Upload results
      uses: actions/upload-artifact@v3
      with:
        name: performance-reports
        path: performance-reports/
```

---

## Analyzing Results

### Locust Results

**Web UI** (real-time monitoring):
```bash
# Start Locust with Web UI
locust -f scripts/performance/locustfile.py --host http://localhost:8000

# Open browser to http://localhost:8089
```

**HTML Report**:
```
performance-reports/locust-report-TIMESTAMP.html
```

**Key Metrics**:
- Total requests
- Requests/second
- Response time distribution (avg, min, max, P50, P95, P99)
- Failure rate
- Error distribution

**CSV Stats**:
```
performance-reports/locust-stats-TIMESTAMP_stats.csv
performance-reports/locust-stats-TIMESTAMP_failures.csv
```

### k6 Results

**Console Output**:
- Real-time metrics during test
- Final summary with all thresholds

**JSON Summary**:
```
performance-reports/k6-report-TIMESTAMP.json
```

**HTML Report**:
```
performance-reports/k6-report-TIMESTAMP.html
```

**Key Metrics**:
- `http_req_duration`: Response time metrics
- `http_req_failed`: Failed requests percentage
- `http_reqs`: Total requests and throughput
- `vus`: Virtual users over time
- `iteration_duration`: Complete iteration time

### Performance Analysis Checklist

- [ ] **Response Times**: Are P95/P99 within targets?
- [ ] **Error Rate**: Is it below 0.1%?
- [ ] **Throughput**: Meeting minimum req/s target?
- [ ] **Resource Usage**: CPU/Memory within acceptable range?
- [ ] **Stability**: Consistent performance throughout test?
- [ ] **Bottlenecks**: Any obvious slow endpoints?

### Comparison Matrix

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| P95 Response Time | < 500ms | ? | ✅/❌ |
| P99 Response Time | < 2000ms | ? | ✅/❌ |
| Error Rate | < 0.1% | ? | ✅/❌ |
| Throughput | > 100 req/s | ? | ✅/❌ |
| Peak CPU | < 70% | ? | ✅/❌ |
| Peak Memory | < 80% | ? | ✅/❌ |

---

## Performance Optimization

### Bottleneck Identification

**1. Slow Database Queries**

**Symptoms**:
- High P99 response times on read endpoints
- Database CPU usage high
- Slow query logs show long-running queries

**Solutions**:
```python
# Add database indexes
db.documents.create_index([("user_id", 1), ("created_at", -1)])
db.documents.create_index([("category", 1), ("status", 1)])

# Use aggregation pipeline optimization
pipeline = [
    {"$match": {"user_id": user_id}},
    {"$sort": {"created_at": -1}},
    {"$limit": 20},
    {"$project": {"_id": 1, "title": 1, "created_at": 1}}  # Only needed fields
]
```

**2. N+1 Query Problems**

**Symptoms**:
- Response time increases linearly with result count
- Many small database queries per request

**Solutions**:
```python
# Use aggregation to fetch related data in one query
pipeline = [
    {"$match": {"user_id": user_id}},
    {
        "$lookup": {
            "from": "projects",
            "localField": "project_id",
            "foreignField": "_id",
            "as": "project"
        }
    }
]
```

**3. Inefficient Serialization**

**Symptoms**:
- High CPU usage during response generation
- Large response sizes

**Solutions**:
```python
# Use Pydantic model with limited fields
class DocumentListResponse(BaseModel):
    id: str
    title: str
    created_at: datetime

    class Config:
        # Only serialize specified fields
        fields = {"id", "title", "created_at"}
```

**4. Missing Caching**

**Symptoms**:
- Repeated identical queries
- High database load for read-heavy endpoints

**Solutions**:
```python
from functools import lru_cache
import redis

# In-memory caching for frequently accessed data
@lru_cache(maxsize=1000)
def get_user_permissions(user_id: str):
    return db.permissions.find_one({"user_id": user_id})

# Redis caching for distributed systems
async def get_document(doc_id: str):
    # Try cache first
    cached = await redis_client.get(f"doc:{doc_id}")
    if cached:
        return json.loads(cached)

    # Fetch from database
    doc = await db.documents.find_one({"_id": doc_id})

    # Store in cache (10 minute TTL)
    await redis_client.setex(f"doc:{doc_id}", 600, json.dumps(doc))

    return doc
```

**5. Synchronous I/O Blocking**

**Symptoms**:
- Low CPU usage but slow response times
- Thread/connection pool exhaustion

**Solutions**:
```python
# Use async/await for I/O operations
async def process_document(doc_id: str):
    # Bad: Blocking I/O
    # result = requests.get(external_api_url)

    # Good: Async I/O
    async with httpx.AsyncClient() as client:
        result = await client.get(external_api_url)

    return result
```

**6. Large Payloads**

**Symptoms**:
- Slow response times for list endpoints
- High network bandwidth usage

**Solutions**:
```python
# Implement pagination
@router.get("/documents")
async def list_documents(
    page: int = 1,
    limit: int = 20,  # Default 20, max 100
):
    skip = (page - 1) * limit
    documents = await db.documents.find().skip(skip).limit(limit).to_list()
    return {"documents": documents, "page": page, "limit": limit}

# Use field filtering
@router.get("/documents/{id}")
async def get_document(
    doc_id: str,
    fields: Optional[str] = None,  # Comma-separated field names
):
    projection = {}
    if fields:
        projection = {field: 1 for field in fields.split(",")}

    doc = await db.documents.find_one({"_id": doc_id}, projection)
    return doc
```

### Optimization Checklist

- [ ] **Database**: Indexes created for common queries
- [ ] **Caching**: Redis caching for frequently accessed data
- [ ] **Queries**: N+1 problems eliminated
- [ ] **Async I/O**: All I/O operations are async
- [ ] **Pagination**: Implemented for list endpoints
- [ ] **Serialization**: Using efficient serializers
- [ ] **Connection Pooling**: Proper pool sizes configured
- [ ] **Compression**: GZip enabled for responses
- [ ] **CDN**: Static assets served from CDN
- [ ] **Background Jobs**: Heavy processing moved to Celery

---

## Capacity Planning

### Current Capacity Assessment

Based on performance test results, calculate current capacity:

**Formula**:
```
Max Concurrent Users = (Target RPS × Average Session Duration) / Average Requests per User
```

**Example**:
```
If system handles 500 req/s with P95 < 500ms:
- Target throughput: 500 req/s
- Average session: 5 minutes
- Requests per user session: 10 requests

Max Concurrent Users = (500 × 300) / 10 = 15,000 users
```

### Scaling Strategies

**Horizontal Scaling** (add more instances):

**Advantages**:
- Better fault tolerance
- Easier to scale dynamically
- Cost-effective for variable load

**Configuration**:
```yaml
# docker-compose.prod.yml
services:
  backend:
    image: doctify-backend:latest
    deploy:
      replicas: 4  # Scale to 4 instances
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
```

**Load Balancing**:
```nginx
# nginx.conf
upstream backend {
    least_conn;  # Distribute to least busy server
    server backend1:8000 max_fails=3 fail_timeout=30s;
    server backend2:8000 max_fails=3 fail_timeout=30s;
    server backend3:8000 max_fails=3 fail_timeout=30s;
    server backend4:8000 max_fails=3 fail_timeout=30s;
}
```

**Vertical Scaling** (larger instances):

**Advantages**:
- Simpler architecture
- Better for CPU-bound workloads
- Lower latency (no network hops)

**Configuration**:
```yaml
# Increase resources per instance
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '2.0'
          memory: 4G
```

### Infrastructure Recommendations

**For 100 concurrent users** (baseline):
- Backend: 2 instances × 1 vCPU, 1GB RAM
- Database: 1 instance × 2 vCPU, 4GB RAM
- Redis: 1 instance × 1 vCPU, 1GB RAM
- Total: ~$150/month

**For 1,000 concurrent users**:
- Backend: 4 instances × 2 vCPU, 2GB RAM
- Database: 1 instance × 4 vCPU, 8GB RAM
- Redis: 1 instance × 2 vCPU, 2GB RAM
- Total: ~$600/month

**For 10,000 concurrent users**:
- Backend: 10 instances × 4 vCPU, 4GB RAM
- Database: 3 instances (replica set) × 8 vCPU, 16GB RAM
- Redis: 2 instances (master-replica) × 4 vCPU, 4GB RAM
- Load Balancer: Managed service
- Total: ~$3,000/month

---

## Troubleshooting

### Issue: High P99 Response Times

**Symptom**: P95 is acceptable but P99 is very high

**Likely Causes**:
1. Garbage collection pauses
2. Background tasks blocking main thread
3. Occasional slow database queries
4. Cold cache misses

**Solutions**:
1. Tune garbage collection settings
2. Move background work to Celery
3. Add database query timeouts
4. Implement cache warming

### Issue: Memory Leaks

**Symptom**: Memory usage increases over time during soak test

**Diagnosis**:
```python
# Use memory_profiler
from memory_profiler import profile

@profile
def process_document(doc):
    # Function implementation
```

**Common Causes**:
- Circular references preventing GC
- Unbounded caches
- Database connection leaks
- File handles not closed

**Solutions**:
```python
# Use context managers
async with get_db() as db:
    # Operations

# Limit cache sizes
@lru_cache(maxsize=1000)  # Not unlimited

# Close connections properly
try:
    result = await process()
finally:
    await db.close()
```

### Issue: Database Connection Pool Exhaustion

**Symptom**: "Too many connections" errors during high load

**Diagnosis**:
```bash
# Check MongoDB connections
db.serverStatus().connections

# Check application pool stats
# (add logging in connection pool)
```

**Solutions**:
```python
# Increase pool size
MONGODB_MAX_POOL_SIZE = 200  # Up from 100

# Add connection timeout
MONGODB_CONNECT_TIMEOUT_MS = 5000

# Use connection retry logic
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def get_document(doc_id):
    return await db.documents.find_one({"_id": doc_id})
```

### Issue: Slow CI/CD Performance Tests

**Symptom**: Tests time out or take too long in CI/CD

**Solutions**:
```yaml
# Use shorter smoke tests for CI
- name: Quick smoke test
  run: ./scripts/run-performance-tests.sh --type smoke --duration 30s

# Run full tests on schedule
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily
```

---

## Performance Testing Checklist

### Pre-Test

- [ ] Application is running and healthy
- [ ] Test data is seeded (test users, sample documents)
- [ ] Monitoring is active (Prometheus + Grafana)
- [ ] Resource limits are set correctly
- [ ] Testing tool is installed and configured

### During Test

- [ ] Monitor resource usage (CPU, memory, disk, network)
- [ ] Watch for errors in application logs
- [ ] Check database performance metrics
- [ ] Monitor cache hit rates
- [ ] Track queue lengths (Celery, Redis)

### Post-Test

- [ ] Analyze test results against targets
- [ ] Identify performance bottlenecks
- [ ] Document findings and recommendations
- [ ] Create optimization tasks if needed
- [ ] Archive reports for historical comparison
- [ ] Update capacity planning estimates

---

## Additional Resources

### Tools

- **Locust**: https://locust.io/
- **k6**: https://k6.io/
- **Apache JMeter**: https://jmeter.apache.org/
- **Gatling**: https://gatling.io/
- **Artillery**: https://artillery.io/

### Learning Resources

- **Performance Testing Guide**: https://www.guru99.com/performance-testing.html
- **k6 Documentation**: https://k6.io/docs/
- **Locust Documentation**: https://docs.locust.io/

### Monitoring Integration

- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Jaeger**: Distributed tracing
- **New Relic**: APM and monitoring

---

**Last Updated**: 2026-01-14
**Review Schedule**: After major releases
**Owner**: DevOps & QA Team

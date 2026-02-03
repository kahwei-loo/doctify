# CI/CD Pipeline Documentation

**Last Updated**: 2026-01-13
**Status**: Completed (Stage 5.2)
**Target**: Automated deployment with zero-downtime and rollback capability

---

## Overview

This document details the CI/CD (Continuous Integration/Continuous Deployment) pipeline implemented for the Doctify project. The pipeline provides automated testing, security scanning, Docker image building, and deployment to staging and production environments with automatic rollback capabilities.

## Pipeline Architecture

### Workflow Triggers

The deployment pipeline (``.github/workflows/deploy.yml``) is triggered by:

1. **Automatic Triggers**:
   - Push to `main` or `master` branch → Deploys to staging
   - Pull request creation/update → Runs tests and security scans only

2. **Manual Triggers** (`workflow_dispatch`):
   - Deploy to **staging**: Manual workflow dispatch with environment selection
   - Deploy to **production**: Manual workflow dispatch (requires staging success)

### Pipeline Stages

The CI/CD pipeline consists of 6 jobs executed in sequence:

```
┌─────────────┐
│  1. Test    │  Run backend and frontend test suites
└──────┬──────┘
       │
       v
┌─────────────┐
│ 2. Security │  Trivy vulnerability scanning (dependencies + images)
└──────┬──────┘
       │
       v
┌─────────────┐
│  3. Build   │  Docker image building and pushing to registry
└──────┬──────┘
       │
       v
┌─────────────┐
│ 4. Staging  │  Deploy to staging environment with health checks
└──────┬──────┘
       │
       v
┌─────────────┐
│5. Production│  Deploy to production (manual trigger only)
└──────┬──────┘
       │
       v
┌─────────────┐
│ 6. Rollback │  Automatic rollback on production deployment failure
└─────────────┘
```

---

## Job 1: Test Suite

**Purpose**: Run comprehensive test suites for backend and frontend

**Strategy**: Matrix strategy runs backend and frontend tests in parallel

### Backend Tests

```yaml
- Setup Python 3.11 environment
- Install test dependencies (requirements/test.txt)
- Run pytest with coverage:
  - Unit tests
  - Integration tests
  - Code coverage ≥ 80%
- Upload coverage to Codecov
```

**Success Criteria**:
- All tests pass
- Coverage ≥ 80% for backend

### Frontend Tests

```yaml
- Setup Node.js 18 environment
- Install dependencies (npm ci)
- Run unit tests with coverage:
  - Component tests
  - Hook tests
  - Utility tests
  - Code coverage ≥ 70%
- Upload coverage to Codecov
```

**Success Criteria**:
- All tests pass
- Coverage ≥ 70% for frontend

---

## Job 2: Security Scanning

**Purpose**: Identify security vulnerabilities in dependencies and code

**Dependencies**: Requires successful test completion

### Dependency Scanning

Uses **Trivy** for vulnerability scanning:

1. **Backend Dependencies** (`./backend`):
   - Scans Python dependencies in requirements files
   - Severity threshold: CRITICAL, HIGH
   - Generates SARIF report
   - Uploads to GitHub Security tab

2. **Frontend Dependencies** (`./frontend`):
   - Scans npm dependencies in package.json
   - Severity threshold: CRITICAL, HIGH
   - Generates SARIF report
   - Uploads to GitHub Security tab

**Success Criteria**:
- Zero CRITICAL vulnerabilities
- Maximum 5 HIGH vulnerabilities (warning threshold)

---

## Job 3: Build and Push Docker Images

**Purpose**: Build optimized Docker images and push to container registry

**Dependencies**: Requires successful test and security scan completion

### Build Process

1. **Setup Docker Buildx**:
   - Multi-platform build support
   - Build cache optimization

2. **Container Registry Login**:
   - Registry: GitHub Container Registry (ghcr.io)
   - Authentication: GitHub token

3. **Image Metadata Extraction**:
   - Branch-based tags
   - SHA-based tags
   - Latest tag for default branch

4. **Build Backend Image**:
   ```
   - Context: ./backend
   - Dockerfile: backend/Dockerfile
   - Tags: ghcr.io/{org}/{repo}/backend:{sha}
   - Cache: GitHub Actions cache
   ```

5. **Build Frontend Image**:
   ```
   - Context: ./frontend
   - Dockerfile: frontend/Dockerfile
   - Tags: ghcr.io/{org}/{repo}/frontend:{sha}
   - Cache: GitHub Actions cache
   ```

6. **Image Security Scanning**:
   - Trivy scans built images
   - Detects vulnerabilities in OS packages
   - Generates SARIF reports
   - Uploads to GitHub Security tab

**Success Criteria**:
- Images build successfully
- Images pushed to registry
- No CRITICAL vulnerabilities in images

### Build Cache Strategy

The pipeline uses GitHub Actions cache for Docker builds:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

**Benefits**:
- 40-60% faster builds on cache hits
- Reduced GitHub Actions minutes consumption
- Consistent build environment

---

## Job 4: Deploy to Staging

**Purpose**: Deploy to staging environment with health checks

**Trigger**: Automatic on push to main, or manual workflow dispatch

**Environment**: staging (https://staging.doctify.example.com)

### Deployment Process

1. **SSH Configuration**:
   ```bash
   - Setup SSH key from secrets
   - Add host to known_hosts
   - Configure key permissions (600)
   ```

2. **Pre-Deployment Backup**:
   ```bash
   # Capture current deployment state
   docker-compose ps -q | xargs docker inspect | \
     jq '[.[] | {name: .Name, image: .Config.Image}]' > \
     deployment_backup_$(date +%Y%m%d_%H%M%S).json
   ```

3. **Zero-Downtime Deployment**:
   ```bash
   # Pull new images
   docker-compose -f docker-compose.prod.yml pull

   # Deploy backend first
   docker-compose up -d --no-deps backend
   sleep 10

   # Health check backend
   curl -f http://localhost:8000/health

   # Deploy frontend
   docker-compose up -d --no-deps frontend
   sleep 5

   # Health check frontend
   curl -f http://localhost:80/health

   # Deploy remaining services
   docker-compose up -d
   ```

4. **Health Verification**:
   ```bash
   # Backend health
   curl -f $STAGING_URL/health

   # Frontend health
   curl -f $STAGING_URL
   ```

5. **Automatic Rollback on Failure**:
   - If health checks fail, previous images are redeployed
   - Deployment marked as failed
   - Slack notification sent

### Required Secrets

```yaml
STAGING_SSH_KEY:      Private SSH key for staging server
STAGING_HOST:         Staging server hostname
STAGING_USER:         SSH username for staging
STAGING_URL:          Full staging URL for health checks
SLACK_WEBHOOK:        Slack webhook URL for notifications
```

**Success Criteria**:
- All services deployed
- Health checks pass
- No errors in logs

---

## Job 5: Deploy to Production

**Purpose**: Deploy to production with rolling update strategy

**Trigger**: Manual workflow dispatch only (requires staging success)

**Environment**: production (https://doctify.example.com)

### Enhanced Deployment Process

1. **Pre-Deployment Backup**:
   ```bash
   # Create timestamped backup directory
   BACKUP_DIR=~/doctify-backups/$(date +%Y%m%d_%H%M%S)
   mkdir -p $BACKUP_DIR

   # Backup container states
   docker-compose ps -q | xargs docker inspect | \
     jq '[.[] | {name, image, created}]' > $BACKUP_DIR/containers.json

   # Backup volumes (data persistence)
   docker volume ls -q | grep doctify | \
     xargs -I {} docker run --rm -v {}:/data -v $BACKUP_DIR:/backup \
       alpine tar czf /backup/{}.tar.gz -C /data .
   ```

2. **Rolling Update Strategy** (Backend):
   ```bash
   # Scale up to 2 instances (new + old)
   docker-compose up -d --no-deps --scale backend=2 backend
   sleep 20

   # Health check new instances
   curl -f http://localhost:8000/health

   # Scale down to 1 instance (remove old)
   docker-compose up -d --no-deps --scale backend=1 backend
   ```

   **Benefits**:
   - Zero downtime for users
   - Gradual traffic migration
   - Quick rollback if new instance fails

3. **Frontend Deployment**:
   ```bash
   docker-compose up -d --no-deps frontend
   sleep 10
   curl -f http://localhost:80/health
   ```

4. **Smoke Tests**:
   ```bash
   # Backend health
   curl -f $PRODUCTION_URL/health

   # Frontend health
   curl -f $PRODUCTION_URL

   # API health
   curl -f $PRODUCTION_URL/api/v1/health
   ```

5. **Post-Deployment Validation**:
   - Wait 60 seconds for stabilization
   - Run comprehensive smoke tests
   - Monitor error rates

### Required Secrets

```yaml
PRODUCTION_SSH_KEY:   Private SSH key for production server
PRODUCTION_HOST:      Production server hostname
PRODUCTION_USER:      SSH username for production
PRODUCTION_URL:       Full production URL for health checks
SLACK_WEBHOOK:        Slack webhook URL for notifications
```

**Success Criteria**:
- Rolling update completes successfully
- All health checks pass
- Smoke tests pass
- Error rate < 0.1%

---

## Job 6: Automatic Rollback

**Purpose**: Automatically rollback failed production deployments

**Trigger**: Production deployment failure

### Rollback Process

1. **Identify Latest Backup**:
   ```bash
   BACKUP_DIR=$(ls -td ~/doctify-backups/* | head -1)
   ```

2. **Extract Previous Images**:
   ```bash
   # Parse containers.json for image tags
   cat $BACKUP_DIR/containers.json | jq -r '.[] | "\(.name) \(.image)"'
   ```

3. **Pull Previous Images**:
   ```bash
   # Pull each previous image
   docker pull <previous-image-tag>
   ```

4. **Restart Services**:
   ```bash
   # Stop current services
   docker-compose down

   # Start with previous images
   docker-compose up -d
   ```

5. **Verify Rollback**:
   ```bash
   # Wait for stabilization
   sleep 30

   # Health check
   curl -f $PRODUCTION_URL/health
   ```

**Success Criteria**:
- Previous images deployed successfully
- Health checks pass
- Service restored to previous working state

---

## Manual Rollback

For manual rollback operations, use the provided rollback script.

### Script Usage

**File**: `scripts/rollback.sh`

**Interactive Mode**:
```bash
./scripts/rollback.sh
```

This will:
1. List all available backups
2. Show backup timestamps and container counts
3. Prompt for backup selection
4. Verify backup integrity
5. Perform rollback with health checks

**Direct Mode** (with timestamp):
```bash
./scripts/rollback.sh 20260113_143022
```

### Rollback Script Features

1. **Backup Listing**:
   - Shows all available backups in `~/doctify-backups/`
   - Displays timestamp and number of containers
   - Marks incomplete backups

2. **Backup Verification**:
   - Validates `containers.json` format
   - Checks for required image information
   - Displays backup contents

3. **Pre-Rollback Safety**:
   - Creates backup of current state before rollback
   - Stored as `pre-rollback-{timestamp}`
   - Allows recovery if rollback fails

4. **Rollback Execution**:
   - Pulls previous images
   - Stops current services
   - Starts services with backup images
   - Runs health checks

5. **Health Verification**:
   - Backend health check
   - Frontend health check
   - Database health check
   - Displays rollback status

### Rollback Example

```bash
$ ./scripts/rollback.sh

===========================================
Doctify Deployment Rollback
===========================================

Available backups:

  1. 20260113_143022 (8 containers)
  2. 20260113_120045 (8 containers)
  3. 20260112_180033 (7 containers)

Select backup to rollback to (number or press Enter to cancel): 1

Selected backup: 20260113_143022

Verifying backup integrity...

✅ Backup contains 8 containers

Backup contents:
  - /doctify-backend-prod → ghcr.io/user/doctify/backend:abc123
  - /doctify-frontend-prod → ghcr.io/user/doctify/frontend:abc123
  - /doctify-mongo-prod → mongo:5.0
  - /doctify-redis-prod → redis:7-alpine
  ...

⚠️  WARNING: This will stop all current services and restart with backup images

Are you sure you want to proceed? (yes/no): yes

Step 1: Creating pre-rollback backup...
✅ Pre-rollback backup created

Step 2: Pulling previous images from backup...
  Pulling: ghcr.io/user/doctify/backend:abc123
  Pulling: ghcr.io/user/doctify/frontend:abc123
  ...

Step 3: Stopping current services...

Step 4: Starting services with backup images...

Step 5: Health checks...
  Checking backend health...
  ✅ Backend is healthy
  Checking frontend health...
  ✅ Frontend is healthy
  Checking database health...
  ✅ Database is healthy

Step 6: Verifying rollback...

Currently running images:
  - ghcr.io/user/doctify/backend:abc123
  - ghcr.io/user/doctify/frontend:abc123
  ...

✅ Rollback completed successfully!

Pre-rollback backup saved to: ~/doctify-backups/pre-rollback-20260113_144500
```

---

## Deployment Best Practices

### 1. Pre-Deployment Checklist

Before deploying to production:

- [ ] Staging deployment successful
- [ ] All tests passing (backend ≥ 80%, frontend ≥ 70% coverage)
- [ ] No CRITICAL security vulnerabilities
- [ ] Manual testing completed on staging
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables verified
- [ ] Backup system functional
- [ ] Monitoring dashboards accessible

### 2. Deployment Timing

**Recommended Windows**:
- **Staging**: Anytime during business hours
- **Production**: Off-peak hours (e.g., late evening, early morning)
- **Emergency Hotfixes**: Anytime, with increased monitoring

**Avoid**:
- Peak traffic hours (typically 9 AM - 5 PM local time)
- Friday afternoons (limited time for issue resolution)
- Before long weekends or holidays

### 3. Monitoring During Deployment

Monitor these metrics during and after deployment:

1. **Application Metrics**:
   - API response times (target: < 200ms avg)
   - Error rates (target: < 0.1%)
   - Request throughput
   - Active connections

2. **System Metrics**:
   - CPU usage (target: < 70%)
   - Memory usage (target: < 80%)
   - Disk I/O
   - Network bandwidth

3. **Business Metrics**:
   - User registrations
   - Document uploads
   - Processing success rate
   - Export completions

**Alert Thresholds**:
- **Critical**: Error rate > 1%, Response time > 2s
- **Warning**: Error rate > 0.5%, Response time > 500ms

### 4. Post-Deployment Validation

**Immediate (0-5 minutes)**:
- Health check endpoints responding
- No 5xx errors in logs
- Services started successfully
- Database connections established

**Short-term (5-30 minutes)**:
- User workflows functioning
- Background jobs processing
- WebSocket connections stable
- Monitoring dashboards showing normal metrics

**Long-term (30+ minutes)**:
- No memory leaks detected
- No unusual error patterns
- Performance within baseline
- User satisfaction maintained

---

## Troubleshooting

### Common Deployment Issues

#### 1. Health Check Failures

**Symptoms**: Health check endpoints return errors

**Debugging**:
```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs backend

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Test health endpoint directly
docker-compose exec backend curl http://localhost:8000/health
```

**Solutions**:
- Verify environment variables are set correctly
- Check database connectivity
- Ensure Redis is accessible
- Review application logs for startup errors

#### 2. Image Pull Failures

**Symptoms**: Cannot pull Docker images from registry

**Debugging**:
```bash
# Check registry authentication
docker login ghcr.io

# Manually pull image
docker pull ghcr.io/{org}/{repo}/backend:{tag}

# Check network connectivity
ping ghcr.io
```

**Solutions**:
- Verify GitHub token permissions
- Check network connectivity
- Ensure images were pushed successfully in build job
- Retry pull with increased timeout

#### 3. SSH Connection Issues

**Symptoms**: Cannot connect to deployment server

**Debugging**:
```bash
# Test SSH connection
ssh -i ~/.ssh/production_key user@host

# Check SSH key permissions
ls -la ~/.ssh/production_key

# Verify host key
ssh-keyscan -H $SSH_HOST
```

**Solutions**:
- Verify SSH key in GitHub Secrets
- Check key permissions (should be 600)
- Ensure host is reachable
- Verify firewall rules allow SSH

#### 4. Rollback Failures

**Symptoms**: Rollback script fails to restore services

**Debugging**:
```bash
# Check backup directory exists
ls -la ~/doctify-backups/

# Verify backup integrity
cat ~/doctify-backups/latest/containers.json

# Check available disk space
df -h
```

**Solutions**:
- Ensure backup exists and is complete
- Verify Docker images are pullable
- Check disk space availability
- Review rollback script logs
- Manual restoration if needed

#### 5. Zero-Downtime Deployment Failures

**Symptoms**: Users experience downtime during deployment

**Debugging**:
```bash
# Check service overlap
docker-compose ps

# Monitor container transitions
docker events

# Check load balancer status (if applicable)
curl -I http://load-balancer/health
```

**Solutions**:
- Increase sleep durations between deployment steps
- Verify health checks are working correctly
- Check load balancer configuration
- Review container startup times

---

## Security Considerations

### 1. Secret Management

**Required Secrets**:
- `STAGING_SSH_KEY`: SSH private key for staging deployment
- `PRODUCTION_SSH_KEY`: SSH private key for production deployment
- `STAGING_HOST`: Staging server hostname
- `PRODUCTION_HOST`: Production server hostname
- `STAGING_USER`: SSH username for staging
- `PRODUCTION_USER`: SSH username for production
- `STAGING_URL`: Full staging URL
- `PRODUCTION_URL`: Full production URL
- `SLACK_WEBHOOK`: Slack webhook for notifications

**Secret Storage**:
- Store in GitHub repository secrets
- Never commit secrets to repository
- Rotate secrets regularly (quarterly)
- Use separate keys for staging and production

### 2. Access Control

**Deployment Permissions**:
- Only approved team members can trigger production deploys
- Use GitHub environment protection rules
- Require reviews for production deployments
- Maintain audit log of all deployments

**Server Access**:
- Use SSH keys only (no password authentication)
- Restrict SSH access by IP (if possible)
- Use jump hosts for production access
- Implement sudo logging

### 3. Container Security

**Base Images**:
- Use official images only
- Keep base images up to date
- Scan for vulnerabilities regularly
- Use minimal images (slim, alpine)

**Runtime Security**:
- Run containers as non-root users
- Use read-only filesystems where possible
- Limit container capabilities
- Implement network segmentation

---

## Performance Optimization

### 1. Build Optimization

**Current Performance**:
- Backend build: 2-3 minutes (with cache)
- Frontend build: 1-2 minutes (with cache)
- Total pipeline: 8-12 minutes (staging)

**Optimization Strategies**:
- GitHub Actions cache for Docker layers
- Parallel test execution
- Incremental builds
- Layer caching optimization

### 2. Deployment Optimization

**Zero-Downtime Strategies**:
- Rolling updates for backend
- Health check validation
- Gradual traffic shifting
- Connection draining

**Rollback Speed**:
- Target: < 2 minutes for automatic rollback
- Pre-pulled images speed up rollback
- Volume backups enable data restoration

---

## Monitoring and Alerting

### 1. Pipeline Monitoring

**Key Metrics**:
- Pipeline success rate (target: > 95%)
- Average pipeline duration (target: < 15 minutes)
- Deployment frequency (track trends)
- Rollback frequency (target: < 5%)

**Alerts**:
- Pipeline failure → Slack notification
- Security vulnerability → GitHub Security alert
- Deployment failure → Slack + Email

### 2. Application Monitoring

Post-deployment monitoring is covered in Stage 5.3 (Monitoring and Logging).

**Integration with CI/CD**:
- Health checks validate deployment success
- Metrics tracked in Prometheus
- Dashboards available in Grafana
- Alerts configured for anomalies

---

## Future Enhancements

### 1. Advanced Deployment Strategies

- **Blue-Green Deployments**: Parallel environments for instant rollback
- **Canary Releases**: Gradual traffic migration to new version
- **Feature Flags**: Toggle features without redeployment
- **A/B Testing**: Test variations in production

### 2. Enhanced Automation

- **Automatic Rollback Triggers**: Based on error rate thresholds
- **Progressive Delivery**: Automated gradual rollout
- **Chaos Engineering**: Automated resilience testing
- **Performance Regression Detection**: Automated performance comparison

### 3. Multi-Region Deployment

- Deploy to multiple geographical regions
- Automated failover between regions
- Global load balancing
- Data replication and consistency

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Trivy Security Scanner](https://aquasecurity.github.io/trivy/)
- [Zero-Downtime Deployment Strategies](https://docs.docker.com/engine/swarm/rolling-updates/)
- [Rollback Best Practices](https://cloud.google.com/architecture/devops/devops-tech-deployment-automation)

---

**Document Status**: ✅ Complete
**Stage**: 5.2 - CI/CD Completion
**Next Stage**: 5.3 - Monitoring and Logging

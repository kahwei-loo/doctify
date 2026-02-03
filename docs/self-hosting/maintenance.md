# Maintenance Guide

Operational procedures for maintaining your Doctify deployment.

## Routine Maintenance

### Daily Tasks

| Task | Command | Purpose |
|------|---------|---------|
| Check service health | `docker compose ps` | Verify all services running |
| Review logs | `docker compose logs --tail=100` | Check for errors |
| Monitor disk space | `df -h` | Prevent disk full issues |
| Verify backups | Check backup timestamps | Ensure backups completed |

### Weekly Tasks

| Task | Command | Purpose |
|------|---------|---------|
| Security updates | `sudo apt update && apt list --upgradable` | Review available updates |
| Log rotation check | `ls -la /var/log/` | Verify logs are rotating |
| Database vacuum | See below | Optimize PostgreSQL |
| Verify backup integrity | `./scripts/backup/verify-backup.sh --all` | Ensure backups are valid |

### Monthly Tasks

| Task | Command | Purpose |
|------|---------|---------|
| Full system update | `sudo apt upgrade` | Apply security patches |
| Recovery test | See backup-recovery.md | Verify restore capability |
| SSL certificate check | `openssl s_client ...` | Verify certificate validity |
| Security audit | `sudo lynis audit system` | Check security posture |
| Review access logs | Analyze Traefik logs | Detect anomalies |

## Service Management

### Starting Services

```bash
# Start all services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Start specific service
docker compose -f docker-compose.prod.yml up -d backend
```

### Stopping Services

```bash
# Stop all services (preserves data)
docker compose -f docker-compose.prod.yml stop

# Stop and remove containers (data preserved in volumes)
docker compose -f docker-compose.prod.yml down
```

### Restarting Services

```bash
# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# Graceful restart with zero downtime
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Since specific time
docker compose -f docker-compose.prod.yml logs --since="2024-01-15T10:00:00" backend
```

## Database Maintenance

### PostgreSQL Vacuum

Regular vacuuming optimizes database performance:

```bash
# Connect to database
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -d doctify_production

# Analyze tables (updates statistics)
ANALYZE;

# Vacuum (reclaims space)
VACUUM;

# Full vacuum (more thorough, locks tables)
VACUUM FULL;

# Check table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### PostgreSQL Reindex

Rebuild indexes for performance:

```bash
# Reindex specific table
REINDEX TABLE documents;

# Reindex entire database (may take time)
REINDEX DATABASE doctify_production;
```

### Check Database Health

```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('doctify_production'));

# Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'doctify_production';

# Check slow queries (if pg_stat_statements enabled)
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Redis Maintenance

```bash
# Check memory usage
docker compose -f docker-compose.prod.yml exec redis redis-cli INFO memory

# Check keyspace
docker compose -f docker-compose.prod.yml exec redis redis-cli INFO keyspace

# Flush cache (if needed)
docker compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB
```

## Updates and Upgrades

### Application Updates

```bash
# 1. Create backup before update
./scripts/backup/backup-all.sh

# 2. Pull latest changes
cd /opt/doctify
git fetch origin
git log HEAD..origin/main --oneline  # Review changes

# 3. Pull and update
git pull origin main

# 4. Pull new images
docker compose -f docker-compose.prod.yml pull

# 5. Apply database migrations (if any)
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

# 6. Restart services
docker compose -f docker-compose.prod.yml up -d

# 7. Verify health
curl https://api.your-domain.com/health
docker compose -f docker-compose.prod.yml logs --tail=50
```

### Docker Updates

```bash
# Update Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# Restart Docker
sudo systemctl restart docker

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

### System Updates

```bash
# Review available updates
sudo apt update
apt list --upgradable

# Install security updates only
sudo unattended-upgrade

# Full system upgrade
sudo apt upgrade

# Reboot if kernel updated
sudo reboot
```

## Monitoring

### Health Checks

```bash
# API health
curl https://api.your-domain.com/health

# Container health status
docker compose -f docker-compose.prod.yml ps

# Check all container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Resource Monitoring

```bash
# Container resource usage
docker stats

# System resources
htop  # or top

# Disk usage
df -h
du -sh /opt/doctify/data/*

# Network connections
ss -tulpn
```

### Log Monitoring

```bash
# Application errors
docker compose -f docker-compose.prod.yml logs backend 2>&1 | grep -i error

# Authentication failures
docker compose -f docker-compose.prod.yml logs backend 2>&1 | grep -i "authentication\|unauthorized"

# Traefik access logs
tail -f /opt/doctify/logs/traefik/access.log | jq '.'
```

### Setting Up Prometheus + Grafana (Optional)

```bash
# Create monitoring compose file
# docker-compose.monitoring.yml includes:
# - Prometheus for metrics collection
# - Grafana for dashboards
# - Node exporter for system metrics

docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

### Basic Alerting Script

```bash
#!/bin/bash
# /opt/doctify/scripts/health-check.sh

ENDPOINT="https://api.your-domain.com/health"
ALERT_EMAIL="admin@your-domain.com"

response=$(curl -s -o /dev/null -w "%{http_code}" "$ENDPOINT")

if [ "$response" != "200" ]; then
    echo "ALERT: Health check failed with status $response" | \
    mail -s "Doctify Health Alert" "$ALERT_EMAIL"
fi
```

Add to cron:

```bash
# Check every 5 minutes
*/5 * * * * /opt/doctify/scripts/health-check.sh
```

## Scaling

### Horizontal Scaling (Multiple Workers)

```bash
# Scale Celery workers
docker compose -f docker-compose.prod.yml up -d --scale celery-worker=3
```

### Vertical Scaling (Resource Limits)

Edit `docker-compose.prod.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
      reservations:
        cpus: '0.5'
        memory: 512M
```

## Troubleshooting Common Issues

### High CPU Usage

```bash
# Identify process
docker stats
top -c

# Check for runaway queries
docker compose exec postgres psql -U doctify -c "
SELECT pid, query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY backend_start DESC;"
```

### High Memory Usage

```bash
# Check container memory
docker stats --no-stream

# Check system memory
free -h

# Clear Docker build cache
docker builder prune -f

# Remove unused images
docker image prune -a
```

### Disk Space Issues

```bash
# Check disk usage
df -h
du -sh /opt/doctify/data/*
du -sh /var/lib/docker/*

# Clean Docker resources
docker system prune -a

# Clean old logs
journalctl --vacuum-time=7d
```

### Service Not Starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend --tail=100

# Check container status
docker compose -f docker-compose.prod.yml ps -a

# Restart failed service
docker compose -f docker-compose.prod.yml restart backend

# Recreate container
docker compose -f docker-compose.prod.yml up -d --force-recreate backend
```

## Emergency Procedures

### Emergency Stop

```bash
# Stop all services immediately
docker compose -f docker-compose.prod.yml stop

# Or kill if stop doesn't work
docker compose -f docker-compose.prod.yml kill
```

### Emergency Rollback

```bash
# Rollback to previous version
git checkout v1.0.0  # Previous version tag

# Or specific commit
git checkout abc123

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

### Database Emergency Recovery

```bash
# Stop application
docker compose -f docker-compose.prod.yml stop backend celery-worker

# Restore from backup
./scripts/backup/restore-postgres.sh /path/to/backup.sql.gz.gpg

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

## Maintenance Windows

### Planning Maintenance

1. **Announce** maintenance window in advance
2. **Backup** before any changes
3. **Test** changes in staging first
4. **Execute** during low-traffic period
5. **Verify** functionality after changes
6. **Document** any issues or changes

### Zero-Downtime Updates

For critical updates without downtime:

```bash
# Pull new image
docker compose -f docker-compose.prod.yml pull backend

# Rolling restart
docker compose -f docker-compose.prod.yml up -d --no-deps backend
```

## Documentation

### Keeping Runbooks Updated

Document all procedures in `/opt/doctify/docs/runbooks/`:

- Incident response procedures
- Recovery steps for common issues
- Contact information for escalation
- Post-incident review template

### Change Log

Maintain a change log for all maintenance activities:

```bash
# /opt/doctify/maintenance-log.md
## 2024-01-15
- Applied security updates
- Upgraded PostgreSQL to 16.1
- Performed database vacuum

## 2024-01-08
- Monthly backup test (successful)
- Rotated application secrets
```

## Next Steps

1. [Set up disaster recovery](disaster-recovery.md)
2. [Configure backup monitoring](backup-recovery.md#monitoring)
3. [Review troubleshooting guide](troubleshooting.md)

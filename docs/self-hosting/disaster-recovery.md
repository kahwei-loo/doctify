# Disaster Recovery Guide

Business continuity planning and disaster recovery procedures for Doctify.

## Recovery Objectives

### RTO (Recovery Time Objective)

**Target: < 4 hours**

Maximum acceptable time to restore service after a disaster.

| Scenario | Target RTO |
|----------|------------|
| Minor outage (service restart) | 15 minutes |
| Database corruption | 1 hour |
| Server failure | 2 hours |
| Complete infrastructure loss | 4 hours |

### RPO (Recovery Point Objective)

**Target: < 24 hours**

Maximum acceptable data loss measured in time.

| Backup Frequency | RPO |
|------------------|-----|
| Real-time replication | ~0 (seconds) |
| Hourly backups | 1 hour |
| Daily backups | 24 hours |
| Weekly backups | 7 days |

**Default configuration**: Daily backups = 24-hour RPO

## Disaster Categories

### Category 1: Application Failure

**Symptoms**: Service errors, API unavailable, slow response

**Impact**: Service degradation or outage

**Recovery**:
1. Check logs: `docker compose logs backend`
2. Restart service: `docker compose restart backend`
3. Check dependencies (database, Redis)
4. Review recent changes

**RTO**: 15-30 minutes

### Category 2: Database Failure

**Symptoms**: Connection errors, data corruption, queries failing

**Impact**: Complete service outage

**Recovery**:
1. Stop application services
2. Assess damage (corruption vs. connection issue)
3. Restore from backup if corrupted
4. Restart services
5. Verify data integrity

**RTO**: 1-2 hours

### Category 3: Server Failure

**Symptoms**: Server unreachable, hardware failure

**Impact**: Complete service outage

**Recovery**:
1. Provision new server
2. Deploy fresh installation
3. Restore from offsite backup
4. Update DNS records
5. Verify functionality

**RTO**: 2-4 hours

### Category 4: Infrastructure Loss

**Symptoms**: Datacenter outage, provider failure

**Impact**: Complete service outage, potential data loss

**Recovery**:
1. Activate alternate provider/region
2. Provision new infrastructure
3. Restore from offsite backup
4. Update DNS records
5. Verify all systems

**RTO**: 4-8 hours

### Category 5: Security Incident

**Symptoms**: Unauthorized access, data breach, ransomware

**Impact**: Data compromise, service outage

**Recovery**:
1. Isolate affected systems
2. Assess scope of breach
3. Preserve evidence
4. Restore from clean backup
5. Rotate all credentials
6. Investigate and remediate

**RTO**: Variable (depends on scope)

## Recovery Procedures

### Procedure 1: Application Service Recovery

```bash
# 1. Check service status
docker compose -f docker-compose.prod.yml ps

# 2. Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail=200 backend

# 3. Restart failed service
docker compose -f docker-compose.prod.yml restart backend

# 4. If still failing, recreate container
docker compose -f docker-compose.prod.yml up -d --force-recreate backend

# 5. If persistent, check dependencies
docker compose -f docker-compose.prod.yml exec postgres pg_isready
docker compose -f docker-compose.prod.yml exec redis redis-cli ping

# 6. Verify recovery
curl https://api.your-domain.com/health
```

### Procedure 2: Database Recovery

```bash
# 1. Stop application services (prevent further corruption)
docker compose -f docker-compose.prod.yml stop backend celery-worker

# 2. Check database status
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# 3. If database is responding, check for corruption
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -d doctify_production -c "
SELECT datname, count(*) as errors
FROM pg_stat_database_conflicts
GROUP BY datname;"

# 4. If corruption detected, restore from backup
./scripts/backup/restore-postgres.sh /path/to/latest/backup.sql.gz.gpg

# 5. Restart services
docker compose -f docker-compose.prod.yml up -d

# 6. Verify data integrity
docker compose -f docker-compose.prod.yml exec backend python -c "
# Run data integrity checks
print('Data integrity verification...')
"
```

### Procedure 3: Full Server Recovery

```bash
# On NEW server:

# 1. Install prerequisites
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin git

# 2. Clone repository
sudo mkdir -p /opt/doctify
sudo chown $USER:$USER /opt/doctify
cd /opt/doctify
git clone https://github.com/your-org/doctify.git .

# 3. Restore configuration
# Copy .env.prod from backup or recreate

# 4. Create Docker secrets
docker swarm init
echo "your-postgres-password" | docker secret create postgres_password -
echo "your-redis-password" | docker secret create redis_password -
echo "your-secret-key" | docker secret create secret_key -
echo "your-openai-key" | docker secret create openai_api_key -

# 5. Create data directories
mkdir -p /opt/doctify/data/{postgres,redis,uploads,letsencrypt}
mkdir -p /opt/doctify/logs/traefik

# 6. Restore database from offsite backup
# Download backup from offsite storage first
./scripts/backup/restore-postgres.sh /path/to/backup.sql.gz.gpg

# 7. Restore Redis data
./scripts/backup/restore-redis.sh /path/to/backup.rdb.gz.gpg

# 8. Restore uploads (if applicable)
# Download and extract from offsite storage

# 9. Start services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 10. Update DNS (if IP changed)
# Update A records to point to new server IP

# 11. Verify recovery
curl https://api.your-domain.com/health
```

### Procedure 4: Security Incident Response

```bash
# PHASE 1: CONTAIN
# 1. Isolate the server
sudo ufw default deny incoming
# Or disconnect from network if severe

# 2. Preserve evidence
sudo tar -czvf /tmp/evidence-$(date +%Y%m%d).tar.gz \
  /var/log \
  /opt/doctify/logs \
  ~/.bash_history

# PHASE 2: ASSESS
# 3. Check for unauthorized access
sudo lastlog
sudo aureport -au
sudo cat /var/log/auth.log | grep -i failed

# 4. Check for modified files
sudo find /opt/doctify -type f -mtime -1 -ls

# 5. Check running processes
ps aux | grep -v "^root\|^www"

# PHASE 3: REMEDIATE
# 6. Rotate all credentials
# Generate new passwords for database, Redis, etc.
# Regenerate API keys

# 7. Restore from CLEAN backup (before compromise)
# Identify last known good backup
# Restore database and configuration

# 8. Apply security patches
sudo apt update && sudo apt upgrade -y

# 9. Review and update firewall rules
sudo ufw status
sudo ufw allow from <trusted-ip> to any port 22

# PHASE 4: RECOVER
# 10. Restart services with new credentials
docker compose -f docker-compose.prod.yml down
# Update .env.prod with new credentials
# Recreate Docker secrets
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# PHASE 5: POST-INCIDENT
# 11. Document incident
# 12. Notify affected parties if data breach
# 13. Conduct post-mortem
# 14. Implement preventive measures
```

## Backup Verification

### Monthly DR Test

Conduct monthly disaster recovery tests:

```bash
# 1. Document current state
date > /tmp/dr-test-$(date +%Y%m).log
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -c "
SELECT COUNT(*) as document_count FROM documents;" >> /tmp/dr-test-$(date +%Y%m).log

# 2. Restore to test environment
./scripts/backup/restore-postgres.sh --test /path/to/backup.sql.gz.gpg

# 3. Verify data in test database
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -d doctify_test -c "
SELECT COUNT(*) as restored_count FROM documents;"

# 4. Compare counts
# Should match production count from step 1

# 5. Clean up test database
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -c "
DROP DATABASE IF EXISTS doctify_test;"

# 6. Document results
echo "DR Test: $(date) - PASSED" >> /var/log/dr-tests.log
```

### DR Test Checklist

```
[ ] Latest backup exists and is accessible
[ ] Backup can be decrypted successfully
[ ] Database can be restored completely
[ ] All tables and data are present
[ ] Application can start with restored data
[ ] Users can log in
[ ] Document processing works
[ ] Test completed within RTO target
[ ] Results documented
```

## Communication Plan

### Escalation Matrix

| Severity | Response Time | Notification |
|----------|---------------|--------------|
| Critical (service down) | Immediate | All stakeholders |
| High (degraded service) | 15 minutes | Technical team |
| Medium (potential issue) | 1 hour | Operations team |
| Low (informational) | Next business day | Logged only |

### Contact List Template

```
Primary On-Call: [Name] - [Phone] - [Email]
Secondary On-Call: [Name] - [Phone] - [Email]
Infrastructure Provider: [Support URL] - [Phone]
Domain Registrar: [Support URL]
SSL Provider: Let's Encrypt (automated)
```

### Status Page Updates

During incidents, communicate status:

1. **Investigating**: We are aware of an issue and investigating
2. **Identified**: We have identified the issue and are working on a fix
3. **Monitoring**: Fix has been deployed, monitoring for stability
4. **Resolved**: The issue has been resolved

## Post-Incident Review

### Incident Report Template

```markdown
## Incident Report: [Title]

**Date**: YYYY-MM-DD
**Duration**: X hours Y minutes
**Impact**: [Service affected, users impacted]

### Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Service restored

### Root Cause
[Description of what caused the incident]

### Resolution
[Steps taken to resolve the issue]

### Lessons Learned
1. [What we learned]
2. [What we could do better]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
```

## Preventive Measures

### Redundancy Recommendations

| Component | Current | Recommended |
|-----------|---------|-------------|
| Database | Single instance | Primary + replica |
| Application | Single container | Multiple containers |
| Storage | Single disk | RAID or distributed |
| Datacenter | Single location | Multi-region |

### Monitoring Alerts

Set up alerts for:

- [ ] Service health check failures
- [ ] High CPU/memory usage (>80%)
- [ ] Disk space low (<20% free)
- [ ] Database connection failures
- [ ] SSL certificate expiring (<30 days)
- [ ] Backup job failures
- [ ] Unusual traffic patterns

### Regular Reviews

| Review | Frequency | Purpose |
|--------|-----------|---------|
| Backup integrity | Weekly | Verify backups are valid |
| DR test | Monthly | Verify recovery procedures |
| Security audit | Quarterly | Review security posture |
| DR plan review | Annually | Update procedures |

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                 EMERGENCY CONTACTS                       │
├─────────────────────────────────────────────────────────┤
│ On-Call: [Phone Number]                                 │
│ Infrastructure: [Support Number]                        │
│ Status Page: [URL]                                      │
├─────────────────────────────────────────────────────────┤
│                 QUICK COMMANDS                          │
├─────────────────────────────────────────────────────────┤
│ Check status:  docker compose ps                        │
│ View logs:     docker compose logs -f [service]         │
│ Restart:       docker compose restart [service]         │
│ Stop all:      docker compose stop                      │
│ Restore DB:    ./scripts/backup/restore-postgres.sh     │
├─────────────────────────────────────────────────────────┤
│                 RECOVERY TARGETS                        │
├─────────────────────────────────────────────────────────┤
│ RTO: < 4 hours                                          │
│ RPO: < 24 hours                                         │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

1. [Review backup procedures](backup-recovery.md)
2. [Set up monitoring](maintenance.md#monitoring)
3. [Review troubleshooting guide](troubleshooting.md)

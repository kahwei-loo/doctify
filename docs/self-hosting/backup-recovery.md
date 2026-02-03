# Backup & Recovery Guide

Data protection procedures following the 3-2-1 backup rule.

## Overview

Doctify includes comprehensive backup scripts that implement:

- **Encrypted backups**: GPG/AES256 encryption for data at rest
- **3-2-1 Rule**: 3 copies, 2 media types, 1 offsite
- **Integrity verification**: SHA256 checksums
- **Retention policies**: Automated cleanup of old backups
- **Notifications**: Email/Slack alerts for backup status

## The 3-2-1 Backup Rule

```
3 Copies          2 Media Types       1 Offsite
────────          ─────────────       ─────────
Primary data      Local SSD           Remote storage
Local backup      USB/NAS             Cloud (S3, B2, etc.)
Offsite backup
```

## Backup Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Backup Flow                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PostgreSQL ──┬── pg_dump ──► gzip ──► GPG encrypt ──► Local │
│               │                                      │       │
│               │                                      ▼       │
│               │                                 Checksum     │
│               │                                      │       │
│               │                                      ▼       │
│  Redis ───────┴── RDB copy ──► gzip ──► GPG encrypt ──► Sync │
│                                                      │       │
│                                                      ▼       │
│                                              Offsite Storage │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Configure Backup Settings

```bash
# Copy configuration template
cp scripts/backup/.env.backup.example scripts/backup/.env.backup

# Edit settings
nano scripts/backup/.env.backup
```

### 2. Essential Configuration

```bash
# Database connection
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=doctify
POSTGRES_DB=doctify_production
POSTGRES_PASSWORD=your-password

# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Backup directory
BACKUP_DIR=/opt/doctify/backups

# Enable encryption (recommended)
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_ENCRYPTION_KEY=your-256-bit-encryption-key
```

### 3. Run First Backup

```bash
# Run combined backup
./scripts/backup/backup-all.sh

# Verify backup
./scripts/backup/verify-backup.sh --latest
```

## Backup Scripts

### backup-postgres.sh

Full PostgreSQL backup with encryption:

```bash
# Usage
./scripts/backup/backup-postgres.sh

# Features:
# - pg_dump with custom format
# - gzip compression
# - Optional GPG encryption
# - SHA256 checksum generation
# - Retention policy enforcement
```

### backup-redis.sh

Redis RDB snapshot backup:

```bash
# Usage
./scripts/backup/backup-redis.sh

# Features:
# - Triggers BGSAVE for consistent snapshot
# - Copies RDB file
# - Optional encryption
# - Checksum verification
```

### backup-all.sh

Combined orchestration script:

```bash
# Usage
./scripts/backup/backup-all.sh

# Features:
# - Runs PostgreSQL and Redis backups
# - Health checks before backup
# - Combined status reporting
# - Email/Slack notifications
```

### verify-backup.sh

Integrity verification:

```bash
# Verify latest backup
./scripts/backup/verify-backup.sh --latest

# Verify specific backup
./scripts/backup/verify-backup.sh /path/to/backup.sql.gz.gpg

# Verify all backups
./scripts/backup/verify-backup.sh --all
```

## Automated Backups

### Cron Configuration

```bash
# Edit crontab
crontab -e

# Add backup schedule:
# Daily backup at 2:00 AM
0 2 * * * /opt/doctify/scripts/backup/backup-all.sh >> /var/log/doctify-backup.log 2>&1

# Weekly verification at 3:00 AM on Sundays
0 3 * * 0 /opt/doctify/scripts/backup/verify-backup.sh --all >> /var/log/doctify-verify.log 2>&1
```

### Retention Policy

Default retention (configurable in `.env.backup`):

| Backup Type | Retention | Count |
|-------------|-----------|-------|
| Daily | 7 days | 7 |
| Weekly | 4 weeks | 4 |
| Monthly | 12 months | 12 |

Total: ~23 backup files maintained automatically.

## Encryption

### Using Symmetric Encryption (AES256)

```bash
# Generate encryption key
openssl rand -base64 32 > /secure/location/backup.key
chmod 600 /secure/location/backup.key

# Configure in .env.backup
BACKUP_ENCRYPTION_ENABLED=true
BACKUP_ENCRYPTION_KEY=$(cat /secure/location/backup.key)
```

### Using GPG (Asymmetric)

```bash
# Generate GPG key
gpg --full-generate-key

# List keys
gpg --list-keys

# Configure in .env.backup
BACKUP_ENCRYPTION_ENABLED=true
GPG_RECIPIENT=your-gpg-key-id
```

### Verifying Encrypted Backups

```bash
# The verify script handles decryption automatically
./scripts/backup/verify-backup.sh --latest

# Manual decryption (AES)
openssl enc -aes-256-cbc -d -in backup.sql.gz.enc -out backup.sql.gz

# Manual decryption (GPG)
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

## Offsite Backup

### Using rsync over SSH

```bash
# Configure in .env.backup
OFFSITE_ENABLED=true
OFFSITE_HOST=backup-server.example.com
OFFSITE_USER=backup
OFFSITE_PATH=/backups/doctify
OFFSITE_SSH_KEY=/home/doctify/.ssh/backup_key
```

### Using AWS S3

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure credentials
aws configure

# Add to cron after local backup
0 4 * * * aws s3 sync /opt/doctify/backups/ s3://your-bucket/doctify-backups/
```

### Using Backblaze B2

```bash
# Install b2 CLI
pip install b2

# Authorize
b2 authorize-account <keyID> <applicationKey>

# Sync backups
b2 sync /opt/doctify/backups/ b2://your-bucket/doctify-backups/
```

## Recovery Procedures

### PostgreSQL Recovery

```bash
# List available backups
ls -la /opt/doctify/backups/postgres/

# Test restore (creates test database)
./scripts/backup/restore-postgres.sh --test /path/to/backup.sql.gz.gpg

# Production restore
./scripts/backup/restore-postgres.sh /path/to/backup.sql.gz.gpg

# Manual restore
docker compose exec -T postgres psql -U doctify -d doctify_production < backup.sql
```

### Redis Recovery

```bash
# Stop Redis
docker compose stop redis

# Restore RDB file
./scripts/backup/restore-redis.sh /path/to/backup.rdb.gz.gpg

# Start Redis
docker compose start redis
```

### Full System Recovery

1. **Provision new server** following [installation guide](installation.md)
2. **Restore PostgreSQL** from latest backup
3. **Restore Redis** from latest backup
4. **Restore uploads** from file backup
5. **Verify application** functionality

```bash
# Full recovery script
./scripts/restore-full.sh --backup-date 2024-01-15
```

## Monitoring

### Backup Status Checks

```bash
# Check latest backup age
find /opt/doctify/backups -name "*.gpg" -mtime +1 | wc -l
# Should be 0 if daily backups are working

# Check backup sizes
du -sh /opt/doctify/backups/*
```

### Alert Configuration

```bash
# .env.backup notification settings
NOTIFY_EMAIL=admin@your-domain.com
NOTIFY_ON_SUCCESS=false
NOTIFY_ON_FAILURE=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Backup Monitoring Script

```bash
#!/bin/bash
# /opt/doctify/scripts/check-backup-health.sh

BACKUP_DIR="/opt/doctify/backups"
MAX_AGE_HOURS=26  # Alert if backup older than 26 hours

latest_backup=$(find "$BACKUP_DIR" -name "*.gpg" -type f -mmin -$((MAX_AGE_HOURS * 60)) | head -1)

if [ -z "$latest_backup" ]; then
    echo "CRITICAL: No backup found within last $MAX_AGE_HOURS hours"
    exit 2
fi

echo "OK: Latest backup found: $latest_backup"
exit 0
```

## Testing Recovery

### Monthly Recovery Test

Perform monthly restore tests to ensure backups are valid:

```bash
# 1. Restore to test environment
./scripts/backup/restore-postgres.sh --test /opt/doctify/backups/postgres/latest.sql.gz.gpg

# 2. Verify data integrity
docker compose exec postgres psql -U doctify -d doctify_test -c "SELECT COUNT(*) FROM documents;"

# 3. Document test results
echo "$(date): Recovery test successful" >> /var/log/recovery-tests.log

# 4. Clean up test database
docker compose exec postgres psql -U doctify -c "DROP DATABASE IF EXISTS doctify_test;"
```

### Recovery Checklist

```
[ ] Latest backup exists and is recent
[ ] Backup can be decrypted
[ ] Backup can be decompressed
[ ] Database can be restored
[ ] Application starts successfully
[ ] User data is accessible
[ ] Document processing works
```

## Disaster Scenarios

### Scenario 1: Database Corruption

1. Stop application services
2. Identify last known good backup
3. Restore database from backup
4. Verify data integrity
5. Resume services

### Scenario 2: Server Failure

1. Provision new server
2. Install Docker and dependencies
3. Restore from offsite backup
4. Update DNS records
5. Verify functionality

### Scenario 3: Ransomware Attack

1. Isolate affected systems
2. Assess damage scope
3. Restore from offline/immutable backup
4. Rotate all credentials
5. Investigate attack vector

## Best Practices

1. **Test restores regularly** - Monthly at minimum
2. **Monitor backup jobs** - Alert on failures
3. **Encrypt all backups** - Especially offsite copies
4. **Verify checksums** - Before and after transfer
5. **Document procedures** - Keep runbooks updated
6. **Rotate encryption keys** - Annually or after incidents
7. **Maintain backup history** - Keep logs of all backups
8. **Separate backup credentials** - Don't use production credentials

## Next Steps

1. [Set up disaster recovery plan](disaster-recovery.md)
2. [Configure monitoring](maintenance.md#monitoring)
3. [Review maintenance procedures](maintenance.md)

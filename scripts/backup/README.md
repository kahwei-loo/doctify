# Doctify Backup Scripts

Secure backup and restore scripts for PostgreSQL and Redis with encryption, checksum verification, and retention management.

## Features

- 🔐 **GPG Encryption** - AES256 encryption for all backups
- ✅ **SHA256 Checksums** - Integrity verification
- 📅 **Retention Policy** - Automatic cleanup of old backups
- 🌐 **Offsite Sync** - SSH-based remote backup support
- 📧 **Notifications** - Email and Slack alerts
- 🔄 **3-2-1 Rule** - Best practice backup strategy support

## Quick Start

### 1. Configuration

```bash
# Copy the example configuration
cp .env.backup.example .env.backup

# Edit with your settings
nano .env.backup
```

**Important**: Never commit `.env.backup` to version control!

### 2. Make Scripts Executable

```bash
chmod +x *.sh
```

### 3. Run Your First Backup

```bash
# Full backup of everything
./backup-all.sh

# Or individual backups
./backup-postgres.sh
./backup-redis.sh
```

## Scripts Overview

| Script | Description |
|--------|-------------|
| `backup-postgres.sh` | PostgreSQL backup with pg_dump |
| `backup-redis.sh` | Redis RDB snapshot backup |
| `restore-postgres.sh` | Restore PostgreSQL from backup |
| `restore-redis.sh` | Restore Redis from RDB backup |
| `backup-all.sh` | Orchestrate all backups |
| `verify-backup.sh` | Verify backup integrity |

## Usage Examples

### PostgreSQL Backup

```bash
# Full backup (default)
./backup-postgres.sh

# Schema-only backup
./backup-postgres.sh --schema-only
```

### Redis Backup

```bash
# Trigger BGSAVE and backup
./backup-redis.sh

# Backup existing RDB without BGSAVE
./backup-redis.sh --rdb-only
```

### Restore

```bash
# Restore PostgreSQL to test database (safe)
./restore-postgres.sh /backups/doctify_postgres_20260118.sql.gz.gpg --test

# Verify backup without restoring
./restore-postgres.sh /backups/doctify_postgres_20260118.sql.gz.gpg --dry-run

# Restore Redis (WARNING: replaces all data)
./restore-redis.sh /backups/doctify_redis_20260118.rdb.gz.gpg
```

### Verification

```bash
# Verify specific backup
./verify-backup.sh /backups/doctify_postgres_20260118.sql.gz.gpg

# Verify latest backups
./verify-backup.sh --latest

# Verify all backups
./verify-backup.sh --all
```

## Backup Storage Structure

```
/var/backups/doctify/
├── daily/                     # Daily backups (keep 7)
│   ├── doctify_postgres_20260118_120000.sql.gz.gpg
│   └── doctify_postgres_20260118_120000.sql.gz.gpg.sha256
├── weekly/                    # Weekly backups (keep 4)
│   └── doctify_postgres_20260114_000000.sql.gz.gpg
├── monthly/                   # Monthly backups (keep 3)
│   └── doctify_postgres_20260101_000000.sql.gz.gpg
└── redis/
    ├── daily/
    ├── weekly/
    └── monthly/
```

## Encryption Setup

### Symmetric Encryption (Password-based)

1. Generate a strong encryption key:
   ```bash
   openssl rand -base64 32
   ```

2. Add to `.env.backup`:
   ```bash
   BACKUP_ENCRYPTION_ENABLED=true
   BACKUP_ENCRYPTION_KEY=your_generated_key_here
   ```

### Asymmetric Encryption (GPG Key)

1. Generate a GPG key pair:
   ```bash
   gpg --full-generate-key
   ```

2. Add to `.env.backup`:
   ```bash
   BACKUP_ENCRYPTION_ENABLED=true
   GPG_RECIPIENT=your-email@example.com
   ```

## 3-2-1 Backup Strategy

This setup supports the 3-2-1 backup rule:

- **3 copies**: Local + Offsite + (optional) Cloud
- **2 media types**: SSD + Remote server
- **1 offsite**: SSH-based remote sync

### Enable Offsite Sync

```bash
# In .env.backup
OFFSITE_ENABLED=true
OFFSITE_SSH_HOST=user@backup-server.example.com
OFFSITE_SSH_PATH=/backups/doctify
OFFSITE_SSH_KEY=/path/to/ssh/key  # Optional
```

## Cron Setup

### Daily Backups at 2 AM

```bash
# Edit crontab
crontab -e

# Add this line
0 2 * * * /path/to/scripts/backup/backup-all.sh >> /var/log/doctify/backup-cron.log 2>&1
```

### Weekly Verification

```bash
# Add to crontab (Sundays at 3 AM)
0 3 * * 0 /path/to/scripts/backup/verify-backup.sh --latest >> /var/log/doctify/verify-cron.log 2>&1
```

## Notifications

### Email Setup

```bash
# In .env.backup
NOTIFY_EMAIL_ENABLED=true
NOTIFY_EMAIL_TO=admin@example.com
NOTIFY_EMAIL_FROM=backup@doctify.local
SMTP_HOST=localhost
SMTP_PORT=25
```

### Slack Setup

```bash
# In .env.backup
NOTIFY_SLACK_ENABLED=true
NOTIFY_SLACK_WEBHOOK=https://hooks.slack.com/services/xxx/yyy/zzz
```

## Troubleshooting

### Backup fails with permission error

```bash
# Ensure backup directory exists and is writable
sudo mkdir -p /var/backups/doctify
sudo chown $USER:$USER /var/backups/doctify
chmod 700 /var/backups/doctify
```

### GPG decryption fails

```bash
# Check if key is available
gpg --list-keys

# For symmetric encryption, verify key is correct
echo "test" | gpg --batch --passphrase "$BACKUP_ENCRYPTION_KEY" -c | gpg --batch --passphrase "$BACKUP_ENCRYPTION_KEY" -d
```

### PostgreSQL connection fails

```bash
# Test connection manually
PGPASSWORD=$POSTGRES_PASSWORD psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1"
```

### Redis connection fails

```bash
# Test connection manually
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping
```

## Security Best Practices

1. **Never commit `.env.backup`** - Contains sensitive credentials
2. **Use `chmod 600`** - Restrict backup file permissions
3. **Rotate encryption keys** - Change keys periodically
4. **Test restores monthly** - Verify backups are recoverable
5. **Monitor backup logs** - Set up alerts for failures
6. **Use SSH keys for offsite** - Never use passwords for remote sync

## Disaster Recovery

For full disaster recovery procedures, see:
- `docs/self-hosting/disaster-recovery.md`
- `docs/self-hosting/backup-recovery.md`

## License

MIT License - See LICENSE file in project root.

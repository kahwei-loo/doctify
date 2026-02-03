# Troubleshooting Guide

Common issues and solutions for self-hosted Doctify deployments.

## Quick Diagnostics

Run this diagnostic script to identify common issues:

```bash
#!/bin/bash
echo "=== Doctify Diagnostics ==="

echo -e "\n--- Docker Status ---"
docker compose -f docker-compose.prod.yml ps

echo -e "\n--- Container Health ---"
docker ps --format "table {{.Names}}\t{{.Status}}"

echo -e "\n--- Disk Usage ---"
df -h | grep -E "^/|Filesystem"

echo -e "\n--- Memory Usage ---"
free -h

echo -e "\n--- Recent Errors (last 10) ---"
docker compose -f docker-compose.prod.yml logs --tail=50 2>&1 | grep -i error | tail -10

echo -e "\n--- API Health ---"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://api.your-domain.com/health
```

## Container Issues

### Container Won't Start

**Symptoms**: Container exits immediately or keeps restarting

**Diagnosis**:
```bash
# Check container status
docker compose -f docker-compose.prod.yml ps -a

# Check exit code and logs
docker compose -f docker-compose.prod.yml logs backend --tail=100
```

**Common Causes & Solutions**:

| Cause | Solution |
|-------|----------|
| Missing environment variables | Check `.env.prod` is complete |
| Port already in use | `sudo lsof -i :8000` to find conflict |
| Insufficient memory | Increase server RAM or reduce limits |
| Permission issues | Check file permissions on volumes |
| Image not found | `docker compose pull` to fetch images |

**Fix**:
```bash
# Recreate container
docker compose -f docker-compose.prod.yml up -d --force-recreate backend

# If persistent, rebuild
docker compose -f docker-compose.prod.yml up -d --build backend
```

### Container Keeps Restarting

**Symptoms**: Container restarts every few seconds

**Diagnosis**:
```bash
# Watch container status
watch docker compose -f docker-compose.prod.yml ps

# Check restart count
docker inspect --format='{{.RestartCount}}' doctify-backend
```

**Solutions**:
1. Check logs for crash reason
2. Verify all dependencies are running
3. Check resource limits aren't too restrictive
4. Verify configuration is correct

### Out of Memory

**Symptoms**: Containers killed by OOM killer

**Diagnosis**:
```bash
# Check system logs
dmesg | grep -i "oom\|killed"

# Check container memory
docker stats --no-stream
```

**Solutions**:
```bash
# Increase memory limits in docker-compose.prod.yml
deploy:
  resources:
    limits:
      memory: 2G  # Increase as needed

# Or add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Database Issues

### PostgreSQL Connection Refused

**Symptoms**: `connection refused` or `could not connect to server`

**Diagnosis**:
```bash
# Check PostgreSQL is running
docker compose -f docker-compose.prod.yml ps postgres

# Check PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres --tail=50

# Test connection from backend container
docker compose -f docker-compose.prod.yml exec backend python -c "
import asyncpg, asyncio
async def test():
    try:
        conn = await asyncpg.connect('postgresql://doctify:password@postgres:5432/doctify_production')
        print('Connection successful')
        await conn.close()
    except Exception as e:
        print(f'Connection failed: {e}')
asyncio.run(test())
"
```

**Solutions**:

| Issue | Solution |
|-------|----------|
| Container not running | `docker compose up -d postgres` |
| Wrong password | Check `POSTGRES_PASSWORD` in `.env.prod` |
| Database not initialized | Check init script ran successfully |
| Network issue | Ensure containers on same network |

### PostgreSQL "Too Many Connections"

**Symptoms**: `too many connections for role`

**Diagnosis**:
```bash
# Check current connections
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -c "
SELECT count(*) FROM pg_stat_activity WHERE datname = 'doctify_production';"
```

**Solution**:
```bash
# Increase max connections in postgresql.conf
# Or terminate idle connections
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'doctify_production'
AND state = 'idle'
AND state_change < now() - interval '10 minutes';"
```

### PostgreSQL Slow Queries

**Symptoms**: API responses slow, high database CPU

**Diagnosis**:
```bash
# Find slow queries
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -c "
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';"
```

**Solutions**:
```bash
# Run VACUUM ANALYZE
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -d doctify_production -c "VACUUM ANALYZE;"

# Reindex if needed
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -d doctify_production -c "REINDEX DATABASE doctify_production;"
```

## Redis Issues

### Redis Connection Failed

**Symptoms**: `Redis connection error` or `Connection refused`

**Diagnosis**:
```bash
# Check Redis status
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Should return: PONG

# Check Redis logs
docker compose -f docker-compose.prod.yml logs redis --tail=50
```

**Solutions**:
```bash
# Restart Redis
docker compose -f docker-compose.prod.yml restart redis

# Check password configuration
docker compose -f docker-compose.prod.yml exec redis redis-cli -a your-password ping
```

### Redis Memory Full

**Symptoms**: `OOM command not allowed when used memory > 'maxmemory'`

**Diagnosis**:
```bash
# Check memory usage
docker compose -f docker-compose.prod.yml exec redis redis-cli INFO memory
```

**Solution**:
```bash
# Flush cache (if acceptable data loss)
docker compose -f docker-compose.prod.yml exec redis redis-cli -a password FLUSHDB

# Or increase maxmemory in configuration
# Add to docker-compose.prod.yml:
command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## Network Issues

### SSL Certificate Not Generated

**Symptoms**: HTTPS not working, certificate errors

**Diagnosis**:
```bash
# Check Traefik logs
docker compose -f docker-compose.prod.yml logs traefik | grep -i "certificate\|acme\|error"

# Check certificate storage
docker compose -f docker-compose.prod.yml exec traefik cat /letsencrypt/acme.json | jq '.letsencrypt.Certificates'
```

**Common Causes**:

| Cause | Solution |
|-------|----------|
| DNS not pointing to server | Verify `dig your-domain.com` returns server IP |
| Port 80 blocked | Ensure firewall allows HTTP for ACME challenge |
| Rate limited | Use staging server, wait for reset |
| Invalid email | Check `ACME_EMAIL` is valid |

**Solutions**:
```bash
# Reset certificates and retry
docker compose -f docker-compose.prod.yml stop traefik
sudo rm /opt/doctify/data/letsencrypt/acme.json
docker compose -f docker-compose.prod.yml up -d traefik

# Check Traefik logs for new attempt
docker compose -f docker-compose.prod.yml logs -f traefik
```

### CORS Errors

**Symptoms**: `Access-Control-Allow-Origin` errors in browser console

**Diagnosis**:
```bash
# Test CORS headers
curl -I -X OPTIONS \
  -H "Origin: https://your-frontend-domain.com" \
  -H "Access-Control-Request-Method: GET" \
  https://api.your-domain.com/health
```

**Solutions**:
1. Verify `CORS_ORIGINS` in `.env.prod` includes your frontend URL
2. Ensure no trailing slashes in CORS origins
3. Check Traefik middleware isn't stripping headers

```bash
# .env.prod
CORS_ORIGINS=https://doctify.your-domain.com,https://your-domain.com
```

### 502 Bad Gateway

**Symptoms**: Traefik returns 502 errors

**Diagnosis**:
```bash
# Check backend is running and healthy
docker compose -f docker-compose.prod.yml ps backend
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Check Traefik can reach backend
docker compose -f docker-compose.prod.yml exec traefik wget -q -O- http://backend:8000/health
```

**Solutions**:
1. Ensure backend container is healthy
2. Check backend is listening on correct port
3. Verify network connectivity between containers

## Application Issues

### API Returns 500 Errors

**Symptoms**: Internal server errors on API calls

**Diagnosis**:
```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail=100 | grep -i error

# Check specific request
curl -v https://api.your-domain.com/api/v1/health
```

**Common Causes**:

| Error | Cause | Solution |
|-------|-------|----------|
| Database error | Connection issue | Check PostgreSQL |
| Redis error | Cache unavailable | Check Redis |
| AI provider error | API key issue | Verify OpenAI key |
| Configuration error | Missing env var | Check environment |

### File Upload Failures

**Symptoms**: Document uploads fail or timeout

**Diagnosis**:
```bash
# Check upload directory permissions
docker compose -f docker-compose.prod.yml exec backend ls -la /app/uploads

# Check disk space
df -h

# Check request size limits
grep -i "max.*size" docker-compose.prod.yml
```

**Solutions**:
```bash
# Fix permissions
docker compose -f docker-compose.prod.yml exec backend chown -R 1000:1000 /app/uploads

# Increase upload limit in Traefik middleware
# middlewares.yml:
request-size:
  buffering:
    maxRequestBodyBytes: 104857600  # 100MB
```

### OCR Processing Fails

**Symptoms**: Document processing stuck or failing

**Diagnosis**:
```bash
# Check Celery worker logs
docker compose -f docker-compose.prod.yml logs celery-worker --tail=100

# Check task queue
docker compose -f docker-compose.prod.yml exec redis redis-cli -a password LLEN celery
```

**Common Causes**:

| Cause | Solution |
|-------|----------|
| AI API rate limit | Reduce concurrent processing |
| Invalid API key | Check `OPENAI_API_KEY` |
| Network timeout | Increase timeout settings |
| Worker crashed | Restart worker |

```bash
# Restart Celery worker
docker compose -f docker-compose.prod.yml restart celery-worker
```

## Performance Issues

### Slow API Response Times

**Diagnosis**:
```bash
# Time API response
time curl -s https://api.your-domain.com/health > /dev/null

# Check container resources
docker stats --no-stream
```

**Solutions**:
1. Check database query performance
2. Review Redis cache hit ratio
3. Scale workers if CPU-bound
4. Add more memory if swapping

### High Memory Usage

**Diagnosis**:
```bash
# Check system memory
free -h

# Check per-container memory
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"
```

**Solutions**:
```bash
# Optimize PostgreSQL memory
# In init.sql or postgresql.conf:
shared_buffers = 256MB  # Reduce if needed
work_mem = 2MB

# Optimize Redis
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Disk Space Running Low

**Diagnosis**:
```bash
# Check disk usage
df -h

# Find large files
du -sh /opt/doctify/data/*
du -sh /var/lib/docker/*
```

**Solutions**:
```bash
# Clean Docker resources
docker system prune -a --volumes

# Clean old logs
journalctl --vacuum-time=7d

# Clean old backups
find /opt/doctify/backups -mtime +30 -delete
```

## Authentication Issues

### JWT Token Invalid

**Symptoms**: `Invalid token` or `Token expired` errors

**Diagnosis**:
```bash
# Check SECRET_KEY is set
docker compose -f docker-compose.prod.yml exec backend env | grep SECRET_KEY
```

**Solutions**:
1. Verify `SECRET_KEY` is set and consistent
2. Check token expiration settings
3. Ensure client and server clocks are synchronized

### Login Fails

**Symptoms**: Unable to authenticate

**Diagnosis**:
```bash
# Check auth logs
docker compose -f docker-compose.prod.yml logs backend | grep -i "auth\|login\|password"
```

**Solutions**:
1. Verify user exists in database
2. Check password hashing is working
3. Verify CORS allows login endpoint

## Backup Issues

### Backup Script Fails

**Symptoms**: Backup jobs fail or produce empty files

**Diagnosis**:
```bash
# Run backup manually with verbose output
./scripts/backup/backup-postgres.sh 2>&1

# Check backup configuration
cat scripts/backup/.env.backup
```

**Common Causes**:

| Error | Solution |
|-------|----------|
| Permission denied | Fix directory permissions |
| pg_dump not found | Check PostgreSQL client installed |
| Connection refused | Verify database is accessible |
| Disk full | Free up space |

### Restore Fails

**Symptoms**: Unable to restore from backup

**Diagnosis**:
```bash
# Test backup file integrity
./scripts/backup/verify-backup.sh /path/to/backup.sql.gz.gpg
```

**Solutions**:
1. Verify backup file isn't corrupted (check checksum)
2. Ensure encryption key is correct
3. Check sufficient disk space for restore
4. Verify database connection

## Getting Help

### Information to Gather

When seeking help, collect:

1. **System Information**:
   ```bash
   uname -a
   docker --version
   docker compose version
   ```

2. **Container Status**:
   ```bash
   docker compose -f docker-compose.prod.yml ps -a
   ```

3. **Recent Logs**:
   ```bash
   docker compose -f docker-compose.prod.yml logs --tail=200 > logs.txt
   ```

4. **Configuration** (sanitize secrets):
   ```bash
   cat .env.prod | sed 's/=.*/=REDACTED/'
   ```

### Support Resources

- **Documentation**: This guide and other docs in `/docs/self-hosting/`
- **GitHub Issues**: Report bugs and request features
- **Community**: Discord/Slack channels (if available)

### Escalation Path

1. Check this troubleshooting guide
2. Search existing GitHub issues
3. Review application logs
4. Create new GitHub issue with gathered information

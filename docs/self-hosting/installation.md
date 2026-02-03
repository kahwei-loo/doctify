# Installation Guide

Step-by-step guide for deploying Doctify on your VPS.

## Prerequisites

Before starting, ensure you have:
- [ ] VPS meeting [system requirements](requirements.md)
- [ ] [VPS hardening](vps-hardening.md) completed
- [ ] Domain name with DNS pointing to your server
- [ ] OpenAI API key

## Step 1: Install Docker

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or log out and back in)
newgrp docker

# Verify installation
docker --version
docker compose version
```

## Step 2: Clone the Repository

```bash
# Create application directory
sudo mkdir -p /opt/doctify
sudo chown $USER:$USER /opt/doctify
cd /opt/doctify

# Clone the repository
git clone https://github.com/your-org/doctify.git .

# Or download release tarball
# wget https://github.com/your-org/doctify/releases/latest/download/doctify.tar.gz
# tar -xzf doctify.tar.gz
```

## Step 3: Configure Environment

```bash
# Copy environment template
cp .env.prod.example .env.prod

# Edit configuration
nano .env.prod
```

### Required Configuration

Edit `.env.prod` with your values:

```bash
# Domain configuration
DOMAIN=your-domain.com
ACME_EMAIL=admin@your-domain.com

# Database credentials (also create as Docker secrets)
POSTGRES_USER=doctify
POSTGRES_DB=doctify_production
POSTGRES_PASSWORD=<generate-strong-password>

# Redis password
REDIS_PASSWORD=<generate-strong-password>

# Application secret key
SECRET_KEY=<generate-with-openssl-rand-hex-32>

# CORS origins (your frontend domain)
CORS_ORIGINS=https://doctify.your-domain.com

# AI Provider
OPENAI_API_KEY=sk-your-openai-key

# Traefik dashboard (generate with: htpasswd -nb admin your-password)
TRAEFIK_DASHBOARD_USER=admin:$apr1$...
```

### Generate Strong Passwords

```bash
# Generate random password
openssl rand -base64 32

# Generate secret key
openssl rand -hex 32

# Generate htpasswd for Traefik dashboard
# Install apache2-utils if needed: sudo apt install apache2-utils
htpasswd -nb admin your-secure-password
```

## Step 4: Create Docker Secrets

Docker secrets provide secure storage for sensitive credentials:

```bash
# Initialize Docker Swarm (required for secrets)
docker swarm init

# Create secrets
echo "your-postgres-password" | docker secret create postgres_password -
echo "your-redis-password" | docker secret create redis_password -
echo "$(openssl rand -hex 32)" | docker secret create secret_key -
echo "sk-your-openai-key" | docker secret create openai_api_key -

# Verify secrets created
docker secret ls
```

## Step 5: Create Required Directories

```bash
# Create directories for persistent data
mkdir -p /opt/doctify/data/postgres
mkdir -p /opt/doctify/data/redis
mkdir -p /opt/doctify/data/uploads
mkdir -p /opt/doctify/data/letsencrypt
mkdir -p /opt/doctify/logs/traefik

# Set permissions
chmod 700 /opt/doctify/data/postgres
chmod 700 /opt/doctify/data/redis
chmod 755 /opt/doctify/data/uploads
chmod 700 /opt/doctify/data/letsencrypt
```

## Step 6: Deploy the Stack

```bash
# Pull images
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

## Step 7: Verify Deployment

### Check Service Health

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Expected output:
# NAME                STATUS              PORTS
# doctify-backend     Up (healthy)        8000/tcp
# doctify-celery      Up
# doctify-postgres    Up (healthy)        5432/tcp
# doctify-redis       Up (healthy)        6379/tcp
# doctify-traefik     Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Test API Health

```bash
# Test health endpoint (wait for SSL certificate)
curl -k https://api.your-domain.com/health

# Expected response:
# {"status": "healthy", "timestamp": "..."}
```

### Check SSL Certificate

```bash
# Verify SSL certificate
curl -vI https://api.your-domain.com 2>&1 | grep -A5 "Server certificate"
```

## Step 8: Initialize Database

The database schema is automatically initialized on first run. Verify:

```bash
# Connect to database
docker compose -f docker-compose.prod.yml exec postgres psql -U doctify -d doctify_production

# Check tables
\dt

# Exit
\q
```

## Step 9: Create Admin User (Optional)

```bash
# Run admin creation script
docker compose -f docker-compose.prod.yml exec backend python -c "
from app.db.repositories.user import UserRepository
from app.db.mongodb import get_database
import asyncio

async def create_admin():
    db = await get_database()
    repo = UserRepository(db)
    # Add your admin creation logic here
    print('Admin user created')

asyncio.run(create_admin())
"
```

## Post-Installation

### Configure Backups

```bash
# Copy backup configuration
cp scripts/backup/.env.backup.example scripts/backup/.env.backup

# Edit backup settings
nano scripts/backup/.env.backup

# Test backup
./scripts/backup/backup-all.sh

# Set up cron job for daily backups
crontab -e
# Add: 0 2 * * * /opt/doctify/scripts/backup/backup-all.sh >> /var/log/doctify-backup.log 2>&1
```

### Configure Monitoring (Optional)

```bash
# If using Grafana/Prometheus
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d
```

## Updating Doctify

```bash
# Pull latest changes
cd /opt/doctify
git pull origin main

# Pull new images
docker compose -f docker-compose.prod.yml pull

# Restart services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Check logs for issues
docker compose -f docker-compose.prod.yml logs -f --tail=100
```

## Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs postgres

# Check resource usage
docker stats
```

### SSL Certificate Issues

```bash
# Check Traefik logs
docker compose -f docker-compose.prod.yml logs traefik

# Verify DNS
dig api.your-domain.com

# Check Let's Encrypt rate limits
# https://letsencrypt.org/docs/rate-limits/
```

### Database Connection Issues

```bash
# Check PostgreSQL status
docker compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection from backend
docker compose -f docker-compose.prod.yml exec backend python -c "
import asyncpg
import asyncio
asyncio.run(asyncpg.connect('postgresql://doctify:password@postgres:5432/doctify_production'))
print('Connection successful')
"
```

## Next Steps

1. [Configure backups](backup-recovery.md)
2. [Set up monitoring](maintenance.md#monitoring)
3. [Review disaster recovery plan](disaster-recovery.md)

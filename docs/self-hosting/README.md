# Doctify Self-Hosting Guide

Complete guide for deploying Doctify on your own infrastructure.

## Table of Contents

1. [Requirements](requirements.md) - Hardware and software prerequisites
2. [Installation](installation.md) - Step-by-step deployment guide
3. [VPS Hardening](vps-hardening.md) - Server security configuration
4. [SSL Setup](ssl-setup.md) - HTTPS with Let's Encrypt
5. [Backup & Recovery](backup-recovery.md) - Data protection procedures
6. [Maintenance](maintenance.md) - Updates and operations
7. [Disaster Recovery](disaster-recovery.md) - Business continuity planning
8. [Troubleshooting](troubleshooting.md) - Common issues and solutions

## Quick Start

### Prerequisites

- VPS with 4GB+ RAM, 2+ vCPUs, 50GB+ storage
- Ubuntu 22.04 or 24.04 LTS
- Domain name with DNS access
- Docker and Docker Compose installed

### 15-Minute Deployment

```bash
# 1. Clone the repository
git clone https://github.com/your-org/doctify.git
cd doctify

# 2. Copy and configure environment
cp .env.prod.example .env.prod
nano .env.prod  # Edit with your values

# 3. Create Docker secrets
echo "your-postgres-password" | docker secret create postgres_password -
echo "your-redis-password" | docker secret create redis_password -
echo "$(openssl rand -hex 32)" | docker secret create secret_key -
echo "your-openai-key" | docker secret create openai_api_key -

# 4. Deploy
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 5. Verify deployment
curl https://api.your-domain.com/health
```

## Architecture Overview

```
                    Internet
                       │
                       ▼
              ┌────────────────┐
              │    Traefik     │ ◄─── Let's Encrypt SSL
              │  (Port 80/443) │
              └───────┬────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────┐
│   Frontend   │ │ Backend  │ │  Celery  │
│   (React)    │ │ (FastAPI)│ │ Workers  │
└──────────────┘ └────┬─────┘ └────┬─────┘
                      │            │
              ┌───────┴────────────┴───────┐
              │     Internal Network       │
              │  (Not exposed to internet) │
              └───────┬────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼                           ▼
┌──────────────┐              ┌──────────────┐
│  PostgreSQL  │              │    Redis     │
│  (pgvector)  │              │   (Cache)    │
└──────────────┘              └──────────────┘
```

## Security Features

- **Docker Secrets**: Credentials stored securely, not in environment variables
- **Network Isolation**: Databases only accessible from internal network
- **Non-root Containers**: All application containers run as non-root user
- **Read-only Filesystems**: Containers have read-only root filesystems
- **TLS 1.2/1.3**: Modern encryption with strong cipher suites
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Rate Limiting**: Protection against abuse and DDoS
- **Encrypted Backups**: GPG encryption for all backup files

## Resource Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 vCPUs | 4 vCPUs |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| Bandwidth | 2 TB/month | 5 TB/month |

## Estimated Costs

| Provider | Minimum Spec | Monthly Cost |
|----------|--------------|--------------|
| DigitalOcean | 4GB Droplet | ~$24/month |
| Linode | Linode 4GB | ~$24/month |
| Vultr | 4GB Cloud | ~$24/month |
| Hetzner | CX31 | ~$10/month |
| RackNerd | 6GB KVM | ~$4/month (annual) |

## Support

- **Documentation Issues**: Open a GitHub issue
- **Security Vulnerabilities**: Email security@your-domain.com
- **Community**: Join our Discord/Slack

## License

This self-hosting guide is part of the Doctify project.
See the main [LICENSE](../../LICENSE) file for details.

# System Requirements

Hardware and software requirements for self-hosting Doctify.

## Hardware Requirements

### Minimum Specifications

| Resource | Requirement | Notes |
|----------|-------------|-------|
| **CPU** | 2 vCPUs | x86_64 architecture |
| **RAM** | 4 GB | 6 GB recommended for comfortable operation |
| **Storage** | 50 GB SSD | NVMe preferred for better I/O |
| **Bandwidth** | 2 TB/month | Depends on document processing volume |

### Recommended Specifications

| Resource | Requirement | Notes |
|----------|-------------|-------|
| **CPU** | 4 vCPUs | Handles concurrent OCR processing better |
| **RAM** | 8 GB | Room for caching and peak loads |
| **Storage** | 100 GB SSD | More space for documents and backups |
| **Bandwidth** | 5 TB/month | Comfortable margin for growth |

### Resource Allocation by Service

```
Service Distribution (4GB RAM):
├── PostgreSQL: 1 GB
├── Redis: 256 MB
├── Backend: 512 MB
├── Celery Worker: 512 MB
├── Traefik: 128 MB
├── Frontend: 256 MB
└── OS/Buffer: ~1.3 GB
```

## Software Requirements

### Operating System

| OS | Version | Support Level |
|----|---------|---------------|
| Ubuntu | 22.04 LTS | Fully supported |
| Ubuntu | 24.04 LTS | Fully supported |
| Debian | 12 (Bookworm) | Supported |
| CentOS/Rocky | 9 | Community supported |

**Recommended**: Ubuntu 24.04 LTS for security patches until 2034.

### Required Software

| Software | Minimum Version | Installation |
|----------|-----------------|--------------|
| Docker | 24.0+ | [Install Docker](https://docs.docker.com/engine/install/) |
| Docker Compose | 2.20+ | Included with Docker |
| Git | 2.30+ | `apt install git` |
| curl | Any | Usually pre-installed |

### Verify Installation

```bash
# Check Docker version
docker --version
# Expected: Docker version 24.x or higher

# Check Docker Compose version
docker compose version
# Expected: Docker Compose version v2.20.x or higher

# Check Git version
git --version
# Expected: git version 2.30+
```

## Network Requirements

### Required Ports

| Port | Protocol | Purpose | Exposure |
|------|----------|---------|----------|
| 22 | TCP | SSH | Optional (can change) |
| 80 | TCP | HTTP (redirects to HTTPS) | Public |
| 443 | TCP | HTTPS | Public |

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### DNS Requirements

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| `api.example.com` | A | Your server IP | Backend API |
| `doctify.example.com` | A | Your server IP | Frontend (or CNAME to Vercel) |

**TTL Recommendation**: Start with 300 seconds (5 minutes) for easier debugging, increase to 3600 after confirmed working.

## AI Provider Requirements

### Required API Keys

| Provider | Purpose | Required |
|----------|---------|----------|
| OpenAI | GPT-4 for OCR and document analysis | Yes |
| Anthropic | Claude fallback (L25 orchestration) | Optional |
| Google AI | Gemini fallback (L25 orchestration) | Optional |

### API Rate Limits

Ensure your API plan supports your expected usage:

| Usage Level | Documents/Day | Recommended Plan |
|-------------|---------------|------------------|
| Light | < 100 | OpenAI Pay-as-you-go |
| Medium | 100-1000 | OpenAI Tier 2+ |
| Heavy | > 1000 | OpenAI Tier 3+ or Enterprise |

## Storage Considerations

### Document Storage

Documents are stored locally by default. Plan storage based on expected usage:

| Documents | Average Size | Total Storage |
|-----------|--------------|---------------|
| 10,000 | 500 KB | ~5 GB |
| 100,000 | 500 KB | ~50 GB |
| 1,000,000 | 500 KB | ~500 GB |

### Database Storage

PostgreSQL storage grows with:
- Document metadata
- User data
- Vector embeddings (pgvector)

**Estimate**: ~1 KB per document for metadata, ~4 KB per document for embeddings.

### Backup Storage

Following the 3-2-1 backup rule, plan for:
- Local backups: 7 daily + 4 weekly + 12 monthly ≈ 23 backups
- With compression: ~10% of database size per backup
- Total: ~2.3x database size for local backup storage

## Performance Tuning

### PostgreSQL Settings (Recommended for 4GB RAM)

```sql
-- Already configured in init.sql
shared_buffers = 512MB
effective_cache_size = 1536MB
maintenance_work_mem = 128MB
work_mem = 4MB
```

### Redis Settings

```conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Celery Workers

| RAM Available | Worker Count | Concurrency |
|---------------|--------------|-------------|
| 4 GB | 1 | 2 |
| 8 GB | 2 | 4 |
| 16 GB | 4 | 8 |

## Compatibility Matrix

### Browser Support (Frontend)

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

### API Clients

| Client | Support |
|--------|---------|
| REST API | Full support |
| WebSocket | Full support |
| SDK | Python, JavaScript (future) |

## Pre-Deployment Checklist

```
[ ] VPS meets minimum requirements (4GB RAM, 2 vCPU, 50GB SSD)
[ ] Ubuntu 22.04 or 24.04 LTS installed
[ ] Docker 24.0+ installed
[ ] Docker Compose 2.20+ installed
[ ] Domain name registered and DNS access available
[ ] OpenAI API key obtained
[ ] SSH key-based authentication configured
[ ] Firewall allows ports 80, 443, SSH
```

## Next Steps

After verifying requirements:
1. [Harden your VPS](vps-hardening.md)
2. [Install Doctify](installation.md)
3. [Configure SSL](ssl-setup.md)

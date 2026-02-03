# Deployment Diagram

## Overview
Shows Doctify's Docker containerized deployment architecture, including development and production environment configurations.

---

## Development Environment Deployment Architecture

```mermaid
flowchart TB
    subgraph Developer["🧑‍💻 Developer Machine"]
        Browser["🌐 Browser<br/>localhost:3003"]
        VSCode["💻 VS Code"]
    end

    subgraph DockerCompose["🐳 Docker Compose (docker-compose.yml)"]
        subgraph Frontend["frontend container"]
            Vite["⚡ Vite Dev Server<br/>Port: 3003<br/>Hot Reload"]
        end

        subgraph Backend["backend container"]
            FastAPI["🚀 FastAPI + Uvicorn<br/>Port: 8008<br/>Auto Reload"]
        end

        subgraph Worker["celery-worker container"]
            Celery["⚙️ Celery Worker<br/>Concurrency: 4"]
        end

        subgraph Database["postgres container"]
            PG["🐘 PostgreSQL 15<br/>Port: 5432<br/>+ pgvector"]
        end

        subgraph Cache["redis container"]
            Redis["📮 Redis 7<br/>Port: 6379"]
        end
    end

    Browser --> Vite
    Vite --> FastAPI
    FastAPI --> PG
    FastAPI --> Redis
    Celery --> PG
    Celery --> Redis
    VSCode -.-> DockerCompose

    style Frontend fill:#e8f5e9
    style Backend fill:#e3f2fd
    style Worker fill:#fff3e0
    style Database fill:#fce4ec
    style Cache fill:#f3e5f5
```

### Development Environment Port Mapping

| Service | Container Port | Host Port | Description |
|---------|----------------|-----------|-------------|
| Frontend | 3003 | 3003 | Vite dev server |
| Backend | 8008 | 8008 | FastAPI service |
| PostgreSQL | 5432 | 5432 | Database |
| Redis | 6379 | 6379 | Cache/Queue |

---

## Production Environment Deployment Architecture

```mermaid
flowchart TB
    subgraph Internet["🌐 Internet"]
        Users["👥 Users"]
        CDN["☁️ CDN<br/>(CloudFlare/AWS)"]
    end

    subgraph LoadBalancer["⚖️ Load Balancer Layer"]
        Traefik["🔀 Traefik<br/>SSL Termination<br/>Auto Certificate"]
    end

    subgraph AppLayer["📦 Application Layer (Docker Swarm/K8s)"]
        subgraph FrontendCluster["Frontend Cluster"]
            FE1["🖥️ Nginx<br/>Static Files"]
            FE2["🖥️ Nginx<br/>Static Files"]
        end

        subgraph BackendCluster["Backend Cluster"]
            BE1["🚀 FastAPI<br/>Gunicorn"]
            BE2["🚀 FastAPI<br/>Gunicorn"]
            BE3["🚀 FastAPI<br/>Gunicorn"]
        end

        subgraph WorkerCluster["Worker Cluster"]
            W1["⚙️ Celery<br/>Worker"]
            W2["⚙️ Celery<br/>Worker"]
        end

        subgraph Scheduler["Scheduler"]
            Beat["⏰ Celery Beat<br/>Scheduled Tasks"]
        end
    end

    subgraph DataLayer["💾 Data Layer"]
        subgraph PGCluster["PostgreSQL High Availability"]
            PG_Primary["🐘 Primary<br/>Read/Write"]
            PG_Replica["🐘 Replica<br/>Read Only"]
        end

        subgraph RedisCluster["Redis Cluster"]
            Redis_Master["📮 Master"]
            Redis_Replica["📮 Replica"]
        end

        S3["📁 S3/MinIO<br/>File Storage"]
    end

    subgraph Monitoring["📊 Monitoring Layer"]
        Prometheus["📈 Prometheus"]
        Grafana["📊 Grafana"]
        Loki["📝 Loki"]
    end

    subgraph External["🔗 External Services"]
        OpenAI["🤖 OpenAI API"]
        Anthropic["🤖 Anthropic API"]
        Google["🤖 Google AI API"]
    end

    Users --> CDN
    CDN --> Traefik
    Traefik --> FrontendCluster
    Traefik --> BackendCluster

    BackendCluster --> PGCluster
    BackendCluster --> RedisCluster
    BackendCluster --> S3
    BackendCluster --> External

    WorkerCluster --> PGCluster
    WorkerCluster --> RedisCluster
    WorkerCluster --> S3
    WorkerCluster --> External

    Beat --> RedisCluster

    PG_Primary --> PG_Replica
    Redis_Master --> Redis_Replica

    BackendCluster --> Prometheus
    WorkerCluster --> Prometheus
    Prometheus --> Grafana
    BackendCluster --> Loki
```

---

## Docker Compose Configuration Overview

### Development Environment (docker-compose.yml)

```mermaid
flowchart LR
    subgraph Services["Service Definitions"]
        frontend["frontend<br/>build: ./frontend<br/>ports: 3003:3003<br/>volumes: ./frontend:/app"]
        backend["backend<br/>build: ./backend<br/>ports: 8008:8008<br/>depends_on: postgres, redis"]
        celery["celery-worker<br/>build: ./backend<br/>command: celery worker<br/>depends_on: backend"]
        postgres["postgres<br/>image: pgvector/pgvector<br/>ports: 5432:5432<br/>volumes: pg_data"]
        redis["redis<br/>image: redis:7-alpine<br/>ports: 6379:6379"]
    end

    backend --> postgres
    backend --> redis
    celery --> postgres
    celery --> redis
    frontend --> backend
```

### Production Environment (docker-compose.prod.yml)

```mermaid
flowchart LR
    subgraph ProdServices["Production Services"]
        traefik["traefik<br/>image: traefik:v2.10<br/>ports: 80, 443<br/>SSL auto-config"]
        frontend_prod["frontend<br/>image: nginx:alpine<br/>Static file serving"]
        backend_prod["backend<br/>image: doctify-backend<br/>gunicorn + uvicorn<br/>replicas: 3"]
        celery_prod["celery-worker<br/>replicas: 2<br/>autoscale: 4,8"]
        celery_beat["celery-beat<br/>Scheduled task scheduling"]
    end

    traefik --> frontend_prod
    traefik --> backend_prod
```

---

## Network Architecture

```mermaid
flowchart TB
    subgraph Networks["Docker Networks"]
        subgraph FrontendNet["frontend-network"]
            FE["Frontend"]
            Traefik["Traefik"]
        end

        subgraph BackendNet["backend-network"]
            BE["Backend"]
            Worker["Worker"]
        end

        subgraph DataNet["data-network"]
            PG["PostgreSQL"]
            Redis["Redis"]
        end
    end

    FE --> BE
    BE --> PG
    BE --> Redis
    Worker --> PG
    Worker --> Redis

    Traefik --> FE
    Traefik --> BE
```

---

## Container Resource Configuration

### Development Environment

| Service | CPU | Memory | Notes |
|---------|-----|--------|-------|
| frontend | - | - | No limits |
| backend | - | - | No limits |
| celery-worker | - | - | No limits |
| postgres | - | - | No limits |
| redis | - | - | No limits |

### Production Environment

| Service | CPU (limit) | Memory (limit) | Replicas |
|---------|-------------|----------------|----------|
| frontend | 0.5 | 256MB | 2 |
| backend | 2.0 | 2GB | 3 |
| celery-worker | 1.0 | 1GB | 2-4 (autoscale) |
| celery-beat | 0.25 | 256MB | 1 |
| postgres | 4.0 | 8GB | 1 primary + 1 replica |
| redis | 1.0 | 1GB | 1 master + 1 replica |

---

## Data Persistence

```mermaid
flowchart TB
    subgraph Volumes["Docker Volumes"]
        pg_data["📦 pg_data<br/>PostgreSQL data"]
        redis_data["📦 redis_data<br/>Redis persistence"]
        uploads["📦 uploads<br/>Uploaded files"]
        logs["📦 logs<br/>Application logs"]
    end

    subgraph Containers["Containers"]
        PG["PostgreSQL"]
        Redis["Redis"]
        Backend["Backend"]
    end

    PG --> pg_data
    Redis --> redis_data
    Backend --> uploads
    Backend --> logs
```

### Production Environment Storage

```mermaid
flowchart LR
    subgraph Storage["Storage Solutions"]
        EBS["AWS EBS<br/>PostgreSQL data"]
        EFS["AWS EFS<br/>Shared files"]
        S3["AWS S3<br/>Uploaded files<br/>Backups"]
    end

    subgraph Backup["Backup Strategy"]
        Daily["📅 Daily Backup<br/>PostgreSQL"]
        Weekly["📅 Weekly Backup<br/>Full snapshot"]
        Retention["🗄️ 30-day retention"]
    end

    EBS --> Daily
    Daily --> S3
    Weekly --> S3
    S3 --> Retention
```

---

## CI/CD Deployment Flow

```mermaid
flowchart LR
    subgraph Dev["Development"]
        Code["💻 Code Commit"]
        PR["📝 Pull Request"]
    end

    subgraph CI["CI (GitHub Actions)"]
        Lint["🔍 Lint"]
        Test["🧪 Test"]
        Build["🏗️ Build"]
        Scan["🛡️ Security Scan"]
    end

    subgraph CD["CD"]
        Stage["🎭 Staging"]
        Prod["🚀 Production"]
    end

    Code --> PR
    PR --> Lint
    Lint --> Test
    Test --> Build
    Build --> Scan
    Scan --> Stage
    Stage -->|Manual Approval| Prod
```

---

## Health Check Configuration

```mermaid
flowchart TB
    subgraph HealthChecks["Health Check Endpoints"]
        BE_Health["/api/v1/health<br/>Backend health check"]
        BE_Ready["/api/v1/ready<br/>Readiness check"]
        PG_Health["pg_isready<br/>PostgreSQL check"]
        Redis_Health["redis-cli ping<br/>Redis check"]
    end

    subgraph Traefik["Traefik Health Routing"]
        LB["Load Balancer<br/>Auto-remove unhealthy instances"]
    end

    BE_Health --> LB
    BE_Ready --> LB
```

### Health Check Configuration Example

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8008/api/v1/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## Environment Variable Management

```mermaid
flowchart TB
    subgraph EnvManagement["Environment Variable Management"]
        Dev_Env[".env<br/>Development<br/>Local file"]
        Stage_Env["Secrets Manager<br/>Staging<br/>AWS/Vault"]
        Prod_Env["Secrets Manager<br/>Production<br/>AWS/Vault"]
    end

    subgraph Secrets["Sensitive Information"]
        DB_Pass["DATABASE_URL"]
        API_Keys["AI API Keys"]
        JWT_Secret["JWT_SECRET"]
    end

    Dev_Env --> Secrets
    Stage_Env --> Secrets
    Prod_Env --> Secrets
```

---

## Monitoring and Alerting Architecture

```mermaid
flowchart TB
    subgraph Apps["Application Services"]
        BE["Backend<br/>metrics endpoint"]
        Worker["Celery<br/>flower"]
    end

    subgraph Monitoring["Monitoring Stack"]
        Prometheus["📈 Prometheus<br/>Metrics collection"]
        Grafana["📊 Grafana<br/>Visualization"]
        AlertManager["🔔 AlertManager<br/>Alert management"]
    end

    subgraph Logging["Logging Stack"]
        Loki["📝 Loki<br/>Log aggregation"]
        Promtail["📤 Promtail<br/>Log collection"]
    end

    subgraph Alerts["Alert Channels"]
        Slack["💬 Slack"]
        Email["📧 Email"]
        PagerDuty["📟 PagerDuty"]
    end

    BE --> Prometheus
    Worker --> Prometheus
    Prometheus --> Grafana
    Prometheus --> AlertManager
    AlertManager --> Alerts

    BE --> Promtail
    Worker --> Promtail
    Promtail --> Loki
    Loki --> Grafana
```

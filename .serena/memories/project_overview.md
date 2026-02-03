## Doctify Project Overview

**Project Type**: AI-Powered Document Intelligence SaaS Platform
**Status**: Active Development
**Purpose**: Portfolio project + Experimental lab for modern architecture patterns

### Tech Stack Summary

**Backend (Port 8008)**:
- FastAPI (Python 3.11+) with AsyncIO
- PostgreSQL 15 + pgvector (RAG capabilities)
- Redis 7 (cache/broker)
- Celery (async task queue)
- AI Providers: OpenAI, Anthropic, Google AI (L25 orchestration)

**Frontend (Port 3003)**:
- React 18 + TypeScript
- Vite build tool
- Redux Toolkit + RTK Query (state management)
- TailwindCSS + Radix UI (styling)

**Infrastructure**:
- Docker + Docker Compose
- GitHub Actions (CI/CD)
- Prometheus + Grafana (monitoring)

### Key Features
1. AI-Powered OCR with multi-provider fallback
2. RAG Q&A System (pgvector-based)
3. Real-time processing (WebSocket)
4. Structured data extraction (JSON/CSV/XLSX)
5. Document version control
6. JWT authentication + API keys

### Architecture Patterns
- Repository Pattern (data access)
- Domain-Driven Design (business logic)
- Dependency Injection (FastAPI deps)
- Feature-Based Organization (frontend)
- Async-First (all I/O operations)

### Directory Structure
```
doctify/
├── backend/
│   ├── app/
│   │   ├── api/v1/              # REST endpoints
│   │   ├── core/                # Config, security
│   │   ├── db/                  # Database, repositories
│   │   ├── domain/              # Business entities
│   │   ├── services/            # Business logic
│   │   ├── tasks/               # Celery tasks
│   │   └── middleware/          # Request/response middleware
│   └── tests/                   # Unit, integration, e2e tests
├── frontend/
│   └── src/
│       ├── features/            # Feature modules
│       ├── shared/              # Shared components, hooks
│       ├── store/               # Redux store
│       └── services/            # API service layer
└── docs/
    ├── architecture/
    ├── deployment/
    └── api/
```

### Current Session Context
- Date: 2026-01-26
- Working Directory: C:\Users\KahWei\Projects\ai-works\kahwei-loo\doctify
- Serena Project: Activated
- Primary Language: TypeScript (detected by Serena)
- Git Status: Untracked files (initial setup phase)

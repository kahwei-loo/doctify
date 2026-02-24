# Doctify Project Plan Archive

This file preserves detailed task descriptions and acceptance criteria for completed phases, serving as a historical reference.
For a brief changelog, see [PLAN_CHANGELOG.md](./PLAN_CHANGELOG.md).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture Decisions](#architecture-decisions)
- [Phase 0: Database Migration](#phase-0-database-migration)
- [Phase 1: Preparation and Infrastructure](#phase-1-preparation-and-infrastructure)
- [Phase 2: Backend Refactoring](#phase-2-backend-refactoring)
- [Phase 3: Frontend Refactoring](#phase-3-frontend-refactoring)
- [Phase 4: Test Improvements](#phase-4-test-improvements)
- [Phase 5: Deployment and Monitoring](#phase-5-deployment-and-monitoring)
- [Security Audit Findings](#security-audit-findings)
- [Directory Structure Design](#directory-structure-design)

---

## Project Overview

**Project Path**: `C:\Users\KahWei\Projects\ai-works\kahwei-loo\doctify`
**Project Type**: AI Document Intelligence SaaS Platform
**Tech Stack**: FastAPI + React TypeScript + PostgreSQL + Redis + Celery

### Refactoring Goals

- ✅ Code quality improvement - Clear architecture, naming conventions, thorough comments
- ✅ Performance optimization - Database query optimization, frontend load speed improvement
- ✅ Architecture modernization - Repository Pattern, dependency injection, modular design
- ✅ Test coverage - Backend ≥ 80%, Frontend ≥ 70%
- ✅ Deployment automation - CI/CD, monitoring, logging system

### Implementation Strategy

- **Approach**: Complete all 5 phases at once
- **Migration strategy**: Migrate and optimize simultaneously (refactoring migration)
- **Estimated time**: 25-37 days (5-7 weeks)

---

## Architecture Decisions

**Confirmed**: 2026-01-15

### Deployment Priority
1. 🥇 Local development/deployment (one-command `docker-compose up`)
2. 🥈 Cloud deployment (VPS as portfolio showcase)
3. 🥉 Kubernetes (optional, future)

### Technology Choices
- **Architecture pattern**: Modular Monolith
- **Database**: PostgreSQL + pgvector (replacing MongoDB)
- **AI strategy**: External API calls (OpenAI/Claude), no local models
- **Portfolio VPS**: Racknerd KVM VPS (6GB RAM, 5 vCPU, 100GB SSD, Ubuntu 24.04)

### Modular Architecture
```
backend/app/modules/
├── auth/       # Authentication & authorization
├── documents/  # Document management
├── ocr/        # OCR processing
├── rag/        # RAG retrieval
├── chat/       # AI conversations
└── reports/    # Report generation
```

### PostgreSQL Security Configuration

| Security Item | Configuration | File |
|---------------|---------------|------|
| Connection string | Environment variables | `.env`, `config.py` |
| SSL/TLS | Enforced in production | `config.py` |
| Least privilege | App user granted CRUD only | `docs/deployment.md` |
| Connection pool limit | Prevent resource exhaustion | `config.py` |

---

## Phase 0: Database Migration

**Status**: ✅ Complete (2026-01-15)
**Goal**: Fully migrate to PostgreSQL

### Completion Status
- ✅ PostgreSQL + pgvector database running properly
- ✅ SQLAlchemy 2.0 async models created
- ✅ Alembic migrations configured
- ✅ Repository layer updated
- ✅ Backend API health check passing
- ✅ Redis running properly
- ✅ Celery Worker running

### Task List

| Task | File | Description |
|------|------|-------------|
| 0.1 Update dependencies | requirements/base.txt | Remove motor/pymongo, add asyncpg/sqlalchemy/alembic |
| 0.2 Update config | app/core/config.py | PostgreSQL config replacing MongoDB |
| 0.3 Database module | app/db/database.py | SQLAlchemy 2.0 async engine |
| 0.4 Data models | app/db/models/ | user.py, document.py, project.py, api_key.py |
| 0.5 Alembic migration | alembic/ | Initialize migration config |
| 0.6 Repository layer | app/db/repositories/ | Update to SQLAlchemy queries |
| 0.7 Services layer | app/services/auth/ | Remove MongoDB-specific operations |
| 0.8 API routes | app/main.py | Enable auth/documents/projects routes |
| 0.9 Docker config | docker-compose.yml | PostgreSQL service + pgvector |
| 0.10 Environment vars | .env.example | PostgreSQL variable template |
| 0.11 Local verification | - | docker-compose up + health check |

---

## Phase 1: Preparation and Infrastructure

**Status**: ✅ Complete (2026-01-15)
**Estimated time**: 3-5 days
**Goal**: Establish new project structure and migration foundation

### Completion Status
- ✅ Directory structure complete
- ✅ Pydantic Settings v2 configuration
- ✅ Dependency management reorganization (requirements/base.txt, dev.txt, prod.txt)
- ✅ Docker multi-stage build optimization
- ✅ CI/CD workflow configuration

### Core Tasks

1. **Create directory structure**
   - Full directory tree creation
   - .gitignore, .editorconfig and other config files
   - Git repository initialization

2. **Configuration management optimization**
   - Pydantic Settings v2 refactoring of config.py
   - Unified environment variable management
   - Separate development/production configurations

3. **Dependency management reorganization**
   - requirements split (base.txt, dev.txt, prod.txt)
   - pyproject.toml creation
   - Version pinning

4. **Docker configuration optimization**
   - Multi-stage builds
   - Redis port configuration fix
   - Frontend Dockerfile correction

5. **CI/CD foundation setup**
   - GitHub Actions workflows
   - Testing pipeline
   - Code quality checks

### Key Files Created

```
backend/requirements/base.txt
backend/requirements/dev.txt
backend/requirements/prod.txt
backend/pyproject.toml
backend/pytest.ini
frontend/.eslintrc.js
frontend/.prettierrc
.github/workflows/backend-ci.yml
.github/workflows/frontend-ci.yml
CONTRIBUTING.md
```

### Acceptance Criteria

- ✅ Directory structure fully created
- ✅ Configuration files loading correctly
- ✅ Dependencies install without errors
- ✅ Docker Compose local startup successful
- ✅ Basic CI pipeline passing

---

## Phase 2: Backend Refactoring

**Status**: ✅ Mostly complete (~99%)
**Estimated time**: 7-10 days
**Goal**: Backend code quality improvement and architecture optimization

### Completion Status

| Sub-phase | Progress | Status |
|-----------|----------|--------|
| 2.1 Core layer refactoring | 100% | ✅ Complete |
| 2.2 Service layer refactoring | 95% | ✅ Mostly complete |
| 2.3 API layer optimization | 100% | ✅ Complete |
| 2.4 Async task optimization | 100% | ✅ Complete |

### Completed Key Components

- ✅ Repository Pattern (base.py, document.py, project.py, user.py)
- ✅ Domain Layer (entities/, value_objects/)
- ✅ Pydantic Settings v2 configuration
- ✅ API dependency injection (deps.py)
- ✅ Celery tasks (ocr.py, export.py)
- ✅ OCR orchestrator (orchestrator.py)
- ✅ Document services (upload.py, processing.py, export.py)
- ✅ Storage services (base.py, local.py, s3.py)

### Sub-phase 2.1: Core Layer Refactoring

**Repository Pattern files**:
```
backend/app/db/repositories/
├── base.py        # Base Repository (CRUD)
├── document.py    # Document repository
├── project.py     # Project repository
├── user.py        # User repository
└── api_key.py     # API Key repository
```

**Domain Layer files**:
```
backend/app/domain/
├── entities/
│   ├── document.py
│   ├── project.py
│   └── user.py
└── value_objects/
    ├── document_status.py
    └── token_usage.py
```

**Configuration refactoring files**:
```
backend/app/core/
├── config.py       # Pydantic Settings v2
├── security.py     # Unified security utilities
├── exceptions.py   # Custom exception classes
└── dependencies.py # Global dependencies
```

### Sub-phase 2.2: Service Layer Refactoring

**Document service module**:
```
backend/app/services/document/
├── upload.py
├── processing.py
├── export.py
└── views.py
```

**OCR service module**:
```
backend/app/services/ocr/
├── orchestrator.py  # L25 orchestration engine
├── provider.py      # AI provider abstraction (embedded in orchestrator)
├── retry.py         # Retry strategy (embedded in orchestrator)
└── validation.py    # Result validation (embedded in orchestrator)
```

**Authentication and storage services**:
```
backend/app/services/auth/
├── jwt.py
└── api_key.py

backend/app/services/storage/
├── base.py
├── local.py
└── s3.py
```

### Sub-phase 2.3: API Layer Optimization

**Dependency injection**: `backend/app/api/v1/deps.py`
- Repository and Service factory functions
- Authentication dependencies (get_current_user, verify_api_key)
- Database connection dependencies

**Endpoint refactoring**:
```
backend/app/api/v1/endpoints/
├── documents.py
├── projects.py
├── auth.py      # Consolidated users
├── websocket.py # Merged all WS endpoints
└── api_keys.py
```

### Sub-phase 2.4: Async Task Optimization

**Celery tasks**:
```
backend/app/tasks/
├── celery_app.py     # Celery configuration
├── document/
│   ├── ocr.py        # OCR tasks
│   └── export.py     # Export tasks
└── cleanup/          # Cleanup tasks
```

**Queue configuration**: ocr_queue, export_queue, cleanup_queue

### Acceptance Criteria

- ✅ Unit test coverage ≥ 80%
- ✅ Integration test pass rate 100%
- ✅ API documentation auto-generated completely
- ✅ Code quality checks passing (Flake8, MyPy, Black)

---

## Phase 3: Frontend Refactoring

**Status**: ✅ Mostly complete (~94%)
**Estimated time**: 7-10 days
**Goal**: Frontend code organization and performance optimization

### Completion Status

| Sub-phase | Progress | Status |
|-----------|----------|--------|
| 3.1 Feature modularization | 75% | ⚠️ projects/dashboard empty |
| 3.2 State management optimization | 100% | ✅ Complete |
| 3.3 Service layer and API | 100% | ✅ Complete |
| 3.4 Performance optimization | 100% | ✅ Complete |

### Completed Key Components

- ✅ Features directory structure (auth/, documents/)
- ✅ Shared components (ui/, common/)
- ✅ Redux Store + RTK Query + Selectors
- ✅ API Client + Interceptors
- ✅ WebSocket Client + Manager
- ✅ Vite code splitting, compression, lazy loading

### Sub-phase 3.1: Feature Modularization

**Features directory structure**:
```
frontend/src/features/
├── auth/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── types/
├── documents/
│   ├── components/
│   │   ├── DocumentTable/
│   │   ├── DocumentDetail/
│   │   ├── DocumentUpload/
│   │   └── DocumentFilters/
│   ├── hooks/
│   ├── services/
│   └── store/
├── projects/     # To be implemented
└── dashboard/    # To be implemented
```

**Shared components**:
```
frontend/src/shared/
├── components/
│   ├── ui/       # Button, Input, Modal, Table
│   ├── layout/   # Header, Sidebar, Layout
│   └── common/   # ErrorBoundary, Loading
├── hooks/
├── utils/
├── types/
└── constants/
```

### Sub-phase 3.2: State Management Optimization

**Redux Store**:
```
frontend/src/store/
├── index.ts
├── rootReducer.ts
└── api/            # RTK Query
```

### Sub-phase 3.3: Service Layer and API

**API Client**:
```
frontend/src/services/
├── api/
│   ├── client.ts       # Axios instance
│   ├── interceptors.ts # Interceptors
│   └── endpoints/      # API endpoint definitions
└── websocket/
    ├── client.ts
    └── handlers.ts
```

### Sub-phase 3.4: Performance Optimization

**Vite optimization** (`vite.config.ts`):
- Code splitting and lazy loading
- React.memo optimization
- Manual code chunking (vendor chunks)
- Gzip/Brotli compression

### Acceptance Criteria

- ✅ Component unit test coverage ≥ 70%
- ✅ E2E test pass rate 100%
- ✅ Lighthouse performance score ≥ 90
- ✅ ESLint/Prettier checks passing

---

## Phase 4: Test Improvements

**Status**: ✅ Mostly complete (~90%)
**Estimated time**: 5-7 days
**Goal**: Establish a comprehensive testing framework

### Completion Status

- ✅ Backend: conftest.py + unit/ + integration/ + e2e/
- ✅ Frontend: setup.ts + unit/ + e2e/
- ✅ pytest configuration + coverage ≥80%
- ✅ vitest + playwright configuration
- ✅ CI/CD automated testing + coverage reporting
- ✅ fixtures/ completed (mocks.py, files.py, api_keys.py)

### Backend Test Framework

```
requirements/dev.txt:
pytest==8.0.0
pytest-asyncio==0.23.0
pytest-cov==4.1.0
pytest-mock==3.12.0
httpx==0.27.0
faker==22.0.0
```

### Test File Structure

```
backend/tests/
├── conftest.py
├── fixtures/
│   ├── mocks.py      # Mock objects (521 lines)
│   ├── files.py      # Test file generation (303 lines)
│   └── api_keys.py   # API key test data (203 lines)
├── unit/
│   ├── test_repositories/
│   ├── test_services/
│   └── test_utils/
├── integration/
│   └── test_api/
└── e2e/
```

### Frontend Test Framework

```json
{
  "@testing-library/react": "^14.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "vitest": "^1.0.0",
  "playwright": "^1.40.0"
}
```

### Acceptance Criteria

- ✅ Backend test coverage ≥ 80%
- ✅ Frontend test coverage ≥ 70%
- ✅ All test pass rate 100%
- ✅ CI automated testing running properly

---

## Phase 5: Deployment and Monitoring

**Status**: ✅ Mostly complete (~85%)
**Estimated time**: 3-5 days
**Goal**: Production-ready deployment and monitoring

### Completion Status

- ✅ Docker: Multi-stage builds (backend + frontend)
- ✅ Non-root user + security hardening
- ✅ CI/CD: backend-ci.yml, frontend-ci.yml, deploy.yml
- ✅ Zero-downtime deployment + rollback capability
- ✅ Security scanning: Bandit, Safety, Trivy, npm audit
- ✅ Prometheus monitoring (7 exporters + 21 alert rules)
- ✅ Grafana dashboards (application, celery, system)

### Docker Optimization

**Multi-stage builds**:
```dockerfile
FROM python:3.11-slim as builder
# Build dependencies

FROM python:3.11-slim
# Minimal runtime
```

**Image size targets**:
- Backend: < 500MB
- Frontend: < 100MB

### CI/CD Configuration

```
.github/workflows/
├── backend-ci.yml    # Backend testing + build
├── frontend-ci.yml   # Frontend testing + build
└── deploy.yml        # Deployment pipeline
```

### Monitoring Configuration

**Prometheus** (`infrastructure/docker/prometheus/`):
- prometheus.yml
- alert_rules.yml (21 rules)

**Grafana Dashboards** (`infrastructure/docker/grafana/dashboards/`):
- doctify-application.json - Application performance
- doctify-celery.json - Task queue
- doctify-system.json - System resources

### Not Implemented (Low Priority)

- ❌ Kubernetes manifests
- ❌ Terraform IaC
- ❌ ELK/Loki log aggregation
- ❌ AlertManager (commented out)

### Acceptance Criteria

- ✅ Deployment automation complete
- ✅ Monitoring system running properly
- ✅ Security checks passing
- ✅ Production environment ready

---

## Security Audit Findings

**Audit date**: 2026-01-15

### ✅ Implemented Security Measures

- Rate limiting (Redis sliding window)
- Multi-layer input validation (Pydantic + DB layer)
- JWT authentication + account lockout + API Key
- OWASP security headers (CSP, HSTS, X-Frame-Options)
- Parameterized queries to prevent SQL injection
- Audit logging system

### ❌ Critical Gaps

- No automated database backups
- No file upload backup strategy
- No disaster recovery plan
- No RTO/RPO definitions

### ⚠️ Recommended Improvements

- Centralized logging system (ELK/CloudWatch)
- Secrets management service (Vault/AWS Secrets Manager)
- MFA two-factor authentication
- Explicit RBAC permission system

### Security Hardening Plan Priority

| Issue | Priority | Estimated Time |
|-------|----------|----------------|
| Email verification fix | P0 | 2-3h |
| Input validation hardening | P0 | 4-6h |
| Account lockout implementation | P0 | 3-4h |
| JWT token revocation | P0 | 4-6h |
| Rate limiting implementation | P0 | 6-8h |
| File upload security | P0 | 4-5h |
| MongoDB injection prevention | P0 | 3-4h |
| Password policy enforcement | P0 | 2-3h |
| Audit logging system | P0 | 3-4h |

---

## Directory Structure Design

### Backend Core Structure

```
backend/
├── app/
│   ├── api/v1/           # API routing layer
│   │   ├── deps.py       # Dependency injection config
│   │   └── endpoints/    # Endpoint modules
│   ├── core/             # Core configuration
│   ├── db/               # Database layer
│   │   ├── database.py
│   │   ├── redis.py
│   │   └── repositories/
│   ├── domain/           # Domain layer
│   │   ├── entities/
│   │   └── value_objects/
│   ├── models/           # Pydantic models
│   ├── services/         # Business logic layer
│   ├── tasks/            # Celery async tasks
│   ├── middleware/       # Middleware
│   ├── utils/            # Utility functions
│   └── main.py           # Application entry point
├── tests/
├── requirements/
└── config/
```

### Frontend Core Structure

```
frontend/
├── src/
│   ├── app/              # Application configuration
│   ├── features/         # Feature modules
│   ├── shared/           # Shared resources
│   ├── pages/            # Page components
│   ├── store/            # Redux Store
│   ├── services/         # API service layer
│   └── main.tsx          # Application entry point
├── tests/
└── public/
```

### Project Root Structure

```
kahwei-loo/doctify/
├── backend/
├── frontend/
├── infrastructure/
│   └── docker/
├── docs/
│   ├── planning/         # Plan archive
│   ├── architecture/
│   ├── api/
│   └── deployment/
├── scripts/
├── .github/workflows/
├── docker-compose.yml
└── README.md
```

---

*Archived: 2026-01-16*
*This file is for historical reference only. For current active tasks, see the main plan file.*

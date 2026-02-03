# Doctify - AI-Powered Document Intelligence Platform

## Project Overview

Doctify is an AI-powered SaaS platform for intelligent document processing, OCR, and management. The system uses a multi-AI provider architecture with automatic fallback to ensure high availability and accuracy.

**Tech Stack**:
- **Backend**: FastAPI (Python 3.11+), AsyncIO
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Database**: PostgreSQL 15 + pgvector (primary), Redis 7 (cache/broker)
- **Task Queue**: Celery with Redis broker
- **AI Providers**: OpenAI, Anthropic, Google AI (L25 orchestration)
- **Deployment**: Docker, Docker Compose, GitHub Actions

## Architecture Overview

### High-Level Architecture

```
┌─────────────────┐
│  React Frontend │ (Port 3003)
│   TypeScript    │
└────────┬────────┘
         │ REST API
         ↓
┌─────────────────┐
│  FastAPI Backend│ (Port 8008)
│   + WebSocket   │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┬──────────────┐
    ↓         ↓             ↓              ↓
┌──────────┐ ┌─────┐  ┌──────────┐  ┌──────────────┐
│PostgreSQL│ │Redis│  │  Celery  │  │ AI Providers │
│ +pgvector│ │  7  │  │  Workers │  │   (L25)      │
└──────────┘ └─────┘  └──────────┘  └──────────────┘
```

### Backend Architecture (Repository Pattern + DDD)

```
backend/app/
├── api/v1/              # API Layer (Routes & Endpoints)
│   ├── deps.py          # Dependency injection
│   └── endpoints/       # REST endpoints by domain
├── core/                # Core Configuration
│   ├── config.py        # Pydantic Settings
│   ├── security.py      # JWT, password hashing
│   └── exceptions.py    # Custom exceptions
├── db/                  # Data Access Layer
│   ├── database.py      # PostgreSQL connection (SQLAlchemy 2.0)
│   ├── redis.py         # Redis connection
│   └── repositories/    # Repository Pattern (CRUD abstraction)
├── domain/              # Domain Layer (Business Entities)
│   ├── entities/        # Domain models
│   └── value_objects/   # Value objects
├── models/              # Pydantic Models (Request/Response)
├── services/            # Business Logic Layer
│   ├── document/        # Document processing services
│   ├── ocr/             # OCR orchestration (L25)
│   ├── auth/            # Authentication services
│   └── storage/         # File storage services
├── tasks/               # Celery Async Tasks
├── middleware/          # Request/Response Middleware
│   └── security.py      # Security headers, CORS
└── main.py              # Application entry point
```

**Key Patterns**:
- **Repository Pattern**: All database access through repositories (`db/repositories/`)
- **Domain-Driven Design**: Business logic in `domain/` and `services/`
- **Dependency Injection**: FastAPI dependencies in `api/v1/deps.py`
- **Middleware Pattern**: Security, CORS, compression in `middleware/`
- **Async-First**: All I/O operations use async/await

### Frontend Architecture (Feature-Based)

```
frontend/src/
├── app/                 # App Configuration
│   ├── App.tsx          # Root component
│   └── Router.tsx       # React Router setup
├── features/            # Feature Modules (by business domain)
│   ├── auth/            # Authentication feature
│   ├── documents/       # Document management
│   ├── projects/        # Project management
│   └── dashboard/       # Dashboard feature
├── shared/              # Shared Resources
│   ├── components/      # Reusable UI components
│   │   ├── ui/          # Base UI components
│   │   ├── layout/      # Layout components
│   │   └── common/      # Common components
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   └── constants/       # Constants
├── pages/               # Page components (route mapping)
├── store/               # Redux store
├── services/            # API service layer
└── main.tsx             # Application entry point
```

**Key Patterns**:
- **Feature-Based Organization**: Code organized by business domain
- **Container/Presenter**: Smart containers, dumb presenters
- **Custom Hooks**: Reusable logic in `shared/hooks/`
- **Centralized State**: Redux for global state, React Query for server state

### L25 OCR Orchestration (Multi-AI Provider)

The OCR service uses a sophisticated L25 orchestration engine that:

1. **Provider Selection**: Automatically selects best AI provider based on:
   - Document type and complexity
   - Provider availability and health
   - Cost optimization
   - Historical accuracy metrics

2. **Automatic Fallback Chain**:
   ```
   Primary (OpenAI GPT-4V)
   ↓ (if fails)
   Fallback 1 (Anthropic Claude)
   ↓ (if fails)
   Fallback 2 (Google AI)
   ```

3. **Retry Strategy**: Exponential backoff with jitter
4. **Result Validation**: Quality checks before returning results

**Location**: `backend/app/services/ocr/orchestrator.py`

## Development Commands

### Backend Development

```bash
# Install dependencies
cd backend
pip install -r requirements/dev.txt

# Run development server (with auto-reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8008

# Run all tests
pytest

# Run specific test markers
pytest -m unit           # Unit tests only
pytest -m integration    # Integration tests only
pytest -m e2e            # End-to-end tests only
pytest -m "not slow"     # Skip slow tests

# Run single test file
pytest tests/unit/test_repositories/test_document_repository.py

# Run single test function
pytest tests/unit/test_repositories/test_document_repository.py::test_create_document

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term

# Code formatting
black app/ tests/
isort app/ tests/

# Linting
flake8 app/ tests/
mypy app/
ruff check app/ tests/

# Security scanning
bandit -r app/
safety check
pip-audit

# Run everything (format + lint + test)
black app/ tests/ && isort app/ tests/ && flake8 app/ tests/ && mypy app/ && pytest
```

### Frontend Development

```bash
# Install dependencies
cd frontend
npm install

# Run development server (port 3003)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e              # Headless mode
npm run test:e2e:ui           # UI mode

# Linting
npm run lint                  # Check for errors
npm run lint:fix              # Auto-fix errors

# Code formatting
npm run format                # Format all files
npm run format:check          # Check formatting

# Type checking
npm run type-check

# Run everything (type-check + lint + test)
npm run validate
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend    # Backend only
docker-compose logs -f frontend   # Frontend only

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up -d --build

# Access running containers
docker-compose exec backend bash
docker-compose exec frontend sh

# Database access
docker-compose exec postgres psql -U postgres -d doctify

# Redis CLI
docker-compose exec redis redis-cli
```

### Performance Testing

```bash
# Setup test data (creates 10 test users and sample documents)
python scripts/setup-test-data.py

# Locust smoke test (1 user, 1 minute)
./scripts/run-performance-tests.sh --tool locust --type smoke

# Locust load test (100 users, 5 minutes)
./scripts/run-performance-tests.sh --tool locust --type load --users 100 --duration 5m

# k6 stress test
./scripts/run-performance-tests.sh --tool k6 --type stress

# k6 comprehensive test suite
./scripts/run-performance-tests.sh --tool k6 --type comprehensive

# Custom configuration
./scripts/run-performance-tests.sh --tool locust --type load \
  --users 200 --duration 10m --rate 20 --base-url http://localhost:8000
```

**Performance Targets**:
- API P95 Response Time: < 500ms
- API P99 Response Time: < 2000ms
- Error Rate: < 1%
- Throughput: > 100 req/s

### Security Auditing

```bash
# Run comprehensive security audit
./scripts/security-audit.sh

# Backend dependency scanning
cd backend
safety check
pip-audit

# Frontend dependency scanning
cd frontend
npm audit
npm audit fix

# Docker image scanning
docker run --rm aquasec/trivy image doctify-backend:latest
docker run --rm aquasec/trivy image doctify-frontend:latest

# Secrets detection
docker run --rm -v $(pwd):/path zricethezav/gitleaks:latest detect --source /path
```

## Environment Setup

### Required Environment Variables

**Backend** (`.env`):
```bash
# Application
PROJECT_NAME=Doctify
ENVIRONMENT=development  # development | staging | production
DEBUG=True
SECRET_KEY=your-secret-key-here

# Database (PostgreSQL + pgvector)
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/doctify

# Redis
REDIS_URL=redis://localhost:6379/0

# AI Providers (L25 Orchestration)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3003", "http://localhost:3000"]

# JWT
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Storage
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760  # 10MB in bytes
```

**Frontend** (`.env`):
```bash
VITE_API_URL=http://localhost:8008
VITE_WS_URL=ws://localhost:8008
```

## Testing Strategy

### Backend Testing (80% Coverage Target)

**Test Organization**:
```
tests/
├── conftest.py              # Global fixtures
├── fixtures/                # Shared test fixtures
│   ├── database.py
│   ├── users.py
│   └── documents.py
├── unit/                    # Unit tests (fast, isolated)
│   ├── test_repositories/
│   ├── test_services/
│   └── test_utils/
├── integration/             # Integration tests (with real DB/Redis)
│   ├── test_api/
│   └── test_tasks/
└── e2e/                     # End-to-end tests (full workflows)
    ├── test_document_workflow.py
    └── test_auth_workflow.py
```

**Key Testing Patterns**:
- **Fixtures**: Reusable test data in `conftest.py` and `fixtures/`
- **Mocking**: Use `pytest-mock` for external dependencies
- **Async Testing**: Use `pytest-asyncio` for async functions
- **Database Isolation**: Each test gets clean database state
- **Markers**: Use pytest markers to categorize tests (`@pytest.mark.unit`)

### Frontend Testing (70% Coverage Target)

**Test Organization**:
```
tests/
├── setup.ts                 # Vitest configuration
├── unit/                    # Component & utility tests
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/             # Feature integration tests
│   └── features/
└── e2e/                     # Playwright E2E tests
    └── workflows/
```

## Key Architectural Decisions

### 1. Repository Pattern for Data Access
**Why**: Decouples business logic from database implementation. Enables easy database switching and testing.

**Example**:
```python
# Instead of direct SQLAlchemy queries in services
result = await session.execute(select(Document).where(Document.id == doc_id))
document = result.scalar_one_or_none()

# Use repository pattern
document_repo = DocumentRepository(session)
document = await document_repo.get_by_id(doc_id)
```

### 2. L25 Multi-AI Provider Orchestration
**Why**: Ensures high availability and accuracy by using multiple AI providers with automatic fallback.

**Flow**: Request → Provider Selection → Primary Provider → (if fails) Fallback Provider → (if fails) Next Fallback → Result Validation

### 3. Async-First Architecture
**Why**: Handle high concurrency efficiently. PostgreSQL (via SQLAlchemy 2.0 async) and Redis operations are async, Celery for long-running tasks.

**Pattern**: All I/O operations (DB, Redis, HTTP, file operations) use `async`/`await`.

### 4. Feature-Based Frontend Organization
**Why**: Better scalability and maintainability. Each feature is self-contained with its components, hooks, and services.

### 5. Environment-Aware Security Middleware
**Why**: Different security requirements for development vs production. HSTS only in production, relaxed CSP in development.

**Implementation**: `backend/app/middleware/security.py` with `settings.is_production` checks.

## Important File Locations

### Configuration Files
- **Backend Config**: `backend/app/core/config.py` - Pydantic Settings with environment variable validation
- **Frontend Config**: `frontend/vite.config.ts` - Vite build configuration
- **Docker Compose**: `docker-compose.yml` - Local development stack
- **Production Compose**: `docker-compose.prod.yml` - Production deployment stack

### Entry Points
- **Backend**: `backend/app/main.py` - FastAPI application factory
- **Frontend**: `frontend/src/main.tsx` - React application bootstrap
- **Celery**: `backend/app/tasks/celery_app.py` - Celery application

### Critical Business Logic
- **OCR Orchestration**: `backend/app/services/ocr/orchestrator.py` - L25 multi-provider engine
- **Document Processing**: `backend/app/services/document/processing.py` - Document lifecycle
- **Authentication**: `backend/app/services/auth/jwt.py` - JWT token management
- **File Storage**: `backend/app/services/storage/` - File upload/download handling

### Database
- **Repositories**: `backend/app/db/repositories/` - Data access layer
- **PostgreSQL Setup**: `backend/app/db/database.py` - SQLAlchemy async engine and session
- **Redis Setup**: `backend/app/db/redis.py` - Cache and broker connection

### Middleware & Security
- **Security Middleware**: `backend/app/middleware/security.py` - Headers, CORS, rate limiting
- **Security Audit**: `scripts/security-audit.sh` - Comprehensive security scanning

### Documentation
- **API Docs**: Automatic at `http://localhost:8008/docs` (development only)
- **Architecture**: `docs/architecture/` - System design documents
- **Deployment**: `docs/deployment/` - Deployment guides
- **Security**: `docs/deployment/security-hardening.md` - Security implementation guide
- **Performance**: `docs/deployment/performance-testing.md` - Performance testing guide

## Common Development Workflows

### Adding a New API Endpoint

1. **Define Pydantic models** in `backend/app/models/`
2. **Create repository method** in `backend/app/db/repositories/`
3. **Implement service logic** in `backend/app/services/`
4. **Add endpoint** in `backend/app/api/v1/endpoints/`
5. **Write tests** in `backend/tests/`

### Adding a New Frontend Feature

1. **Create feature directory** in `frontend/src/features/[feature-name]/`
2. **Add components** in `components/`
3. **Add custom hooks** in `hooks/`
4. **Add API service** in `services/api.ts`
5. **Add Redux slice** in `store/` (if needed)
6. **Create page component** in `frontend/src/pages/`
7. **Add route** in `frontend/src/app/Router.tsx`
8. **Write tests** in `frontend/tests/`

### Running the Full Stack Locally

1. **Start infrastructure**: `docker-compose up -d postgres redis`
2. **Setup test data**: `python scripts/setup-test-data.py` (first time only)
3. **Start backend**: `cd backend && uvicorn app.main:app --reload --port 8008`
4. **Start Celery worker**: `cd backend && celery -A app.tasks.celery_app worker -l info`
5. **Start frontend**: `cd frontend && npm run dev`
6. **Access application**: http://localhost:3003

### Debugging Tips

**Backend**:
- Add breakpoints: Use `import pdb; pdb.set_trace()` or IDE debugger
- Check logs: `docker-compose logs -f backend`
- Monitor Celery tasks: `docker-compose logs -f celery-worker`
- Database inspection: `docker-compose exec postgres psql -U postgres -d doctify`

**Frontend**:
- React DevTools: Browser extension for component inspection
- Redux DevTools: Browser extension for state debugging
- Network tab: Monitor API calls and responses
- Console: Check for JavaScript errors and logs

**Performance**:
- Backend profiling: Use `cProfile` or `line_profiler`
- Frontend profiling: Chrome DevTools Performance tab
- Database queries: PostgreSQL slow query log (pg_stat_statements)
- Redis monitoring: `docker-compose exec redis redis-cli monitor`

## Troubleshooting

### Common Issues

**PostgreSQL Connection Errors**:
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL container is running: `docker-compose ps postgres`
- Check PostgreSQL logs: `docker-compose logs postgres`

**Redis Connection Errors**:
- Check `REDIS_URL` in `.env`
- Ensure Redis container is running: `docker-compose ps redis`
- Test connection: `docker-compose exec redis redis-cli ping`

**AI Provider Errors**:
- Verify API keys in `.env`
- Check provider status pages
- L25 orchestration will automatically fallback to next provider

**Celery Tasks Not Running**:
- Ensure Celery worker is running: `docker-compose ps celery-worker`
- Check Celery logs: `docker-compose logs -f celery-worker`
- Verify Redis broker connection

**Frontend Build Errors**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`
- Check for TypeScript errors: `npm run type-check`

**CORS Errors**:
- Verify `BACKEND_CORS_ORIGINS` includes frontend URL
- Check security middleware configuration in `backend/app/main.py`

## Production Deployment Checklist

- [ ] Environment variables configured for production
- [ ] `DEBUG=False` in backend `.env`
- [ ] Secret keys rotated and secure
- [ ] Database indexes created (automatic on startup)
- [ ] Security audit passed: `./scripts/security-audit.sh`
- [ ] Performance tests passed with acceptable results
- [ ] HTTPS/SSL configured with valid certificates
- [ ] Security headers validated
- [ ] Monitoring and logging configured (Prometheus + Grafana)
- [ ] Backup strategy implemented
- [ ] CI/CD pipeline configured (GitHub Actions)
- [ ] Docker images scanned for vulnerabilities (Trivy)
- [ ] Rate limiting configured
- [ ] Error tracking configured (e.g., Sentry)

## Additional Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **React Documentation**: https://react.dev/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **SQLAlchemy Documentation**: https://docs.sqlalchemy.org/
- **Redis Documentation**: https://redis.io/documentation
- **Celery Documentation**: https://docs.celeryproject.org/
- **Playwright Documentation**: https://playwright.dev/
- **Project Roadmap**: See `README.md` for feature roadmap

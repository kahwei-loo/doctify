# Development Guide

Quick reference for developing Doctify locally.

## Prerequisites

- **Docker & Docker Compose** (recommended) or:
  - Python 3.11+, Node.js 20+, PostgreSQL 15 + pgvector, Redis 7

## Quick Start (Docker)

```bash
cp backend/.env.example backend/.env       # Add your AI API keys
cp frontend/.env.example frontend/.env.local
docker-compose up -d
```

Open http://localhost:3003 — click **Try Demo** to explore with sample data.

## Local Development

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements/dev.txt
uvicorn app.main:app --reload --port 8008

# Frontend (separate terminal)
cd frontend
npm install && npm run dev

# Celery worker (separate terminal)
cd backend
celery -A app.workers.celery_app worker -l info --pool=solo -Q ocr_queue
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3003 |
| Backend API | http://localhost:8008 |
| Swagger Docs | http://localhost:8008/docs |

## Project Structure

```
backend/app/
├── api/v1/endpoints/    # REST API routes
├── core/                # Config, security, exceptions
├── db/repositories/     # Repository pattern (data access)
├── domain/              # Domain entities, value objects
├── models/              # Pydantic request/response schemas
├── services/            # Business logic (OCR, RAG, auth)
├── tasks/               # Celery async tasks
└── middleware/           # Security headers, CORS, rate limiting

frontend/src/
├── app/                 # Router, App shell
├── features/            # Feature modules (auth, documents, KB, chat, ...)
├── shared/              # Reusable components, hooks, utils
├── pages/               # Page components (route mapping)
├── store/               # Redux + RTK Query
└── services/            # API client layer
```

## Architecture Patterns

- **Backend**: Repository Pattern + DDD + async-first + Celery for long tasks
- **Frontend**: Feature-based organization + RTK Query + lazy-loaded routes
- **AI**: LiteLLM gateway with multi-provider fallback (GPT-4V → Claude → Gemini)
- **RAG**: pgvector retrieve → Cohere rerank → LLM generate → groundedness verify

## Quality Gates

```bash
# Frontend
cd frontend && npx tsc --noEmit --skipLibCheck   # Type check
npm run lint                                      # ESLint
npm test                                          # Vitest

# Backend
cd backend && ruff check app/                     # Linting
pytest                                            # Tests
```

## Git Workflow

1. Create feature branch from `main`: `git checkout -b feature/xxx`
2. Make changes, run quality gates
3. Commit with [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, etc.
4. Push and open PR

## Documentation

- [Architecture](./docs/architecture/) — System design decisions
- [Deployment](./docs/deployment/) — Production deployment
- [Self-Hosting](./docs/self-hosting/) — VPS setup guide
- [RAG System](./docs/rag/) — AI Q&A pipeline
- [Contributing](./CONTRIBUTING.md) — Contribution guidelines

# Doctify Project Plan Changelog

This file records key milestones and completion dates for the project restructuring and migration. For detailed task descriptions, see [PLAN_ARCHIVE.md](./PLAN_ARCHIVE.md).

---

## [2026-02-24] - AI Model Management Settings (Phase 1)

### Backend: Dynamic Model Catalog (DB-backed CRUD)
- ✅ `model_catalog` DB table + Alembic migration with 12 seed entries
- ✅ `ModelCatalogRepository` — CRUD with `get_all_active()`, `get_by_model_id()`
- ✅ Pydantic schemas with `field_validator`: purposes enum, model_id regex, provider normalization
- ✅ Admin API: GET/POST/PATCH/DELETE `/admin/ai-models/catalog`
- ✅ Service layer: uniqueness check, gateway cache refresh on save

### Frontend: Settings UI Redesign + Model Management
- ✅ Settings page redesigned: sidebar nav (desktop) + horizontal scroll (mobile)
- ✅ Admin-only "AI Models" tab with `adminOnly` filtering
- ✅ Purpose assignment dropdowns populated from DB catalog
- ✅ Model Catalog section: card list with provider badge + purpose badges
- ✅ `AddModelDialog` — form with ProviderSelect combobox + purpose checkboxes
- ✅ `EditModelDialog` — pre-filled form with partial update
- ✅ `DeleteModelDialog` — styled AlertDialog with warning (replaces native confirm)
- ✅ `ProviderSelect` — custom combobox (search existing + "Add custom" option)
- ✅ RTK Query endpoints (6 hooks) with `AIModelSettings` tag invalidation
- ✅ `NotificationsSection` → honest "Coming Soon" placeholder

### Architecture
- ✅ `is_superuser` field added to login response for frontend role detection
- ✅ Gateway singleton DB cache + `update_model_cache()` + `reset_gateway()`

---

## [2026-02-13] - LiteLLM AI Gateway (PR #6 Merged)

### Centralized AI Gateway
- ✅ `AIGateway` singleton (`gateway.py` ~190 lines) wrapping LiteLLM library mode
- ✅ `ModelPurpose` enum: CHAT, CHAT_FAST, EMBEDDING, VISION, CLASSIFIER, RERANKER
- ✅ Migrated 9 services: embedding, generation, groundedness, classifiers, evaluation, reranker, public_chat, insights
- ✅ Migrated L25 OCR orchestrator to LiteLLM
- ✅ Removed langchain packages, fixed dependency pins (pydantic≥2.5.0, openai≥1.68.2)

---

## [2026-02-12] - AI Assistants P0/P1 (PR #5 Merged)

### P0: Core Assistant Configuration
- ✅ System prompt textarea + KB dropdown + dialog useEffect fix

### P1: Assistant Management Features
- ✅ `WidgetEmbedDialog`, `TestAssistantDialog`, `AssistantAnalyticsDialog`
- ✅ PublicChatDemo assistant selector
- ✅ Bug fixes: RAG fallback to direct LLM, loading/error states, source badges, polling, widget dedup

---

## [2026-02-10] - Unified Knowledge & Insights v2.0 (PR #3 Merged)

### KB NotebookLM Redesign
- ✅ Side-by-side Sources + Chat layout (42 files changed)
- ✅ Source Cards → Expanded View → Chat Panel → Polish

---

## [2026-01-16] - Phase 4 & 5 Improvements

### Phase 4: Test Improvements (↑90%)
- ✅ Created `frontend/vitest.config.ts` configuration
- ✅ Added `backend/tests/fixtures/` shared test data
  - mocks.py (521 lines) - External service mock objects
  - files.py (303 lines) - Test file generation utilities
  - api_keys.py (203 lines) - API key test data

### Phase 5: Deployment & Monitoring (↑85%)
- ✅ Created Grafana Dashboard JSON files
  - doctify-application.json - Application performance monitoring
  - doctify-celery.json - Celery task monitoring
  - doctify-system.json - System resource monitoring

---

## [2026-01-16] - PM Verification & Status Update

### Comprehensive Verification Results
- Phase 2: 82% → 99% (Repository Pattern complete)
- Phase 3: 87.5% → 94% (Features/Redux/Vite complete)
- Phase 4: 95% → 90% (discovered missing fixtures)
- Phase 5: 98% → 85% (missing Grafana dashboards)

### Priority Task Identification
- 🔴 All high-priority tasks completed
- 🟡 Medium priority: projects/dashboard feature implementation (optional)
- 🟢 Low priority: K8s/Terraform/ELK (future)

---

## [2026-01-15] - Phase 0-3 Complete

### Phase 0: Database Migration (100%)
- ✅ PostgreSQL + pgvector replacing MongoDB
- ✅ SQLAlchemy 2.0 async models
- ✅ Alembic migration configuration
- ✅ Repository layer updates

### Phase 1: Infrastructure (100%)
- ✅ Directory structure created (backend/frontend)
- ✅ Pydantic Settings v2 configuration
- ✅ Dependency management reorganization (requirements/, pyproject.toml)
- ✅ Docker multi-stage builds
- ✅ CI/CD workflows (backend-ci, frontend-ci, deploy)

### Phase 2: Backend Refactoring (99%)
- ✅ Repository Pattern (base, document, project, user)
- ✅ Domain Layer (entities, value_objects)
- ✅ Services (document, ocr, auth, storage)
- ✅ API dependency injection (deps.py)
- ✅ Celery tasks (ocr.py, export.py)

### Phase 3: Frontend Refactoring (94%)
- ✅ Features directory structure (auth, documents)
- ✅ Redux Store + RTK Query
- ✅ API Client + Interceptors
- ✅ WebSocket Client
- ✅ Vite code splitting and compression

---

## [2026-01-15] - Security Audit

### Critical Issues Identified
- 🔴 Rate limiting not implemented → Implementation plan designed
- 🔴 JWT token revocation missing → Redis blacklist approach designed
- 🔴 Email verification broken → Method signature issue identified
- 🔴 Input validation missing → Pydantic schema designed
- 🔴 Account lockout not implemented → Lockout service designed

### Security Hardening Plan
- Estimated effort: 3-4 days
- Priority: P0 (immediate)

---

## [2026-01-15] - Architecture Decisions Confirmed

### Deployment Priority
1. 🥇 Local development (docker-compose)
2. 🥈 Cloud deployment (VPS Portfolio)
3. 🥉 Kubernetes (optional/future)

### Technology Choices
- Architecture pattern: Modular Monolith
- Database: PostgreSQL + pgvector
- AI strategy: External APIs (OpenAI/Claude)

---

## Overall Project Status

| Date | Completion | Status |
|------|-----------|--------|
| 2026-02-24 | ~97% | 🚀 Feature-complete, merge-ready |
| 2026-02-13 | ~96% | ✅ LiteLLM Gateway merged |
| 2026-02-12 | ~95% | ✅ Assistants + KB redesign merged |
| 2026-01-16 | ~93% | 🚀 Basically deployable |
| 2026-01-15 | ~85% | 🔧 Refactoring in progress |

---

*Last updated: 2026-02-24*

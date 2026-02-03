# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Kubernetes deployment manifests
- Terraform IaC configuration
- ELK/Loki log aggregation
- MFA authentication support
- RBAC (Role-Based Access Control)
- Database backup automation

## [1.0.1] - 2026-01-17

### Fixed
- **Frontend Configuration**
  - Added Tailwind CSS configuration (`tailwind.config.js`, `postcss.config.js`)
  - Fixed Redux serialization warning (converted `Set<string>` to `string[]` in documentsSlice)
  - Fixed Docker frontend port mapping (3000 → 3003)

- **API Integration**
  - Created Projects API with RTK Query (`projectsApi.ts`)
  - Replaced mock data with real API calls in ProjectsPage
  - Fixed API Keys response type handling

- **Security Hardening**
  - Added conditional logging (dev-only for sensitive data)
  - Implemented error message sanitization
  - Enhanced Protected Route with Redux state validation
  - Added request timeout and cancellation support

### Added
- **Accessibility (A11y)**
  - Added `aria-label` attributes to icon-only buttons
  - Implemented form error associations with `aria-invalid` and `aria-describedby`
  - Added keyboard navigation support
  - Enhanced focus management for modals

- **Monitoring**
  - AlertManager configuration with email/Slack notifications
  - Prometheus alerting rules for application, database, and system metrics
  - Alert routing by severity (critical, warning, database, worker)
  - Inhibition rules to prevent duplicate alerts

### Changed
- Improved UI/UX styling consistency across all pages
- Enhanced responsive design for mobile devices
- Optimized component rendering performance

## [1.0.0] - 2026-01-16

### Added
- **Core Platform**
  - AI-powered document intelligence platform
  - Multi-provider OCR with L25 orchestration (OpenAI, Anthropic, Google AI)
  - Automatic fallback and retry mechanisms
  - Real-time WebSocket notifications

- **Backend (FastAPI)**
  - Repository Pattern with PostgreSQL + pgvector
  - Domain-Driven Design architecture
  - Async-first implementation with SQLAlchemy 2.0
  - JWT authentication with refresh tokens
  - API key management system
  - Rate limiting with Redis sliding window
  - Celery task queue for async processing
  - Comprehensive security middleware (OWASP headers)

- **Frontend (React + TypeScript)**
  - Feature-based architecture
  - Redux Toolkit with RTK Query
  - Vite build with code splitting
  - WebSocket client for real-time updates
  - Responsive UI with TailwindCSS

- **Infrastructure**
  - Docker multi-stage builds
  - Docker Compose for local development
  - GitHub Actions CI/CD pipelines
  - Prometheus metrics and alerting
  - Grafana dashboards (application, Celery, system)

- **Testing**
  - Backend: pytest with 80%+ coverage target
  - Frontend: Vitest + Playwright E2E
  - Performance testing with Locust/k6

- **Documentation**
  - Comprehensive API documentation (OpenAPI)
  - Architecture documentation
  - Deployment guides
  - Security hardening guide

### Security
- Input validation with Pydantic schemas
- SQL injection prevention (parameterized queries)
- XSS protection headers
- CORS configuration
- Account lockout mechanism
- Audit logging system

## [0.9.0] - 2026-01-15

### Changed
- Migrated from MongoDB to PostgreSQL + pgvector
- Implemented Repository Pattern for data access
- Restructured backend with Domain-Driven Design
- Upgraded to SQLAlchemy 2.0 async

### Added
- Alembic database migrations
- pgvector for vector similarity search
- Redis caching layer
- Security audit and hardening

## [0.1.0] - 2025-12-01

### Added
- Initial project structure
- Basic document upload and processing
- Simple OCR integration
- User authentication

[Unreleased]: https://github.com/kahwei-loo/doctify/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/kahwei-loo/doctify/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/kahwei-loo/doctify/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/kahwei-loo/doctify/compare/v0.1.0...v0.9.0
[0.1.0]: https://github.com/kahwei-loo/doctify/releases/tag/v0.1.0

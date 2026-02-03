## Development Conventions

### Code Style & Formatting

**Backend (Python)**:
- Formatter: Black (line length: 88)
- Import sorting: isort
- Linting: flake8, mypy (type checking), ruff
- Docstrings: Google style

**Frontend (TypeScript)**:
- Formatter: Prettier
- Linting: ESLint with TypeScript plugin
- Import organization: Absolute imports from src/
- Component style: Functional components with hooks

### Naming Conventions

**Backend**:
- Files: snake_case (e.g., document_repository.py)
- Classes: PascalCase (e.g., DocumentRepository)
- Functions/Methods: snake_case (e.g., get_by_id)
- Constants: UPPER_SNAKE_CASE (e.g., MAX_UPLOAD_SIZE)

**Frontend**:
- Files: PascalCase for components (e.g., LoginForm.tsx), camelCase for utilities
- Components: PascalCase (e.g., DocumentUploadZone)
- Functions: camelCase (e.g., useDocuments)
- Types/Interfaces: PascalCase with descriptive names

### Git Workflow

**Branch Strategy**:
- main: Production-ready code
- feature/*: New features
- fix/*: Bug fixes
- refactor/*: Code refactoring

**Commit Messages**:
- Format: `type(scope): description`
- Types: feat, fix, docs, refactor, test, chore
- Include "Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

### File Organization

**Test Files**:
- Location: tests/ directory (not next to source files)
- Naming: test_*.py or *.test.ts
- Structure: Mirror source directory structure

**Scripts**:
- Location: scripts/ directory
- Purpose: Utility scripts, setup, performance testing

**Documentation**:
- Claude-specific: claudedocs/ directory
- Architecture docs: docs/architecture/
- Deployment guides: docs/deployment/

### API Design

**REST Endpoints**:
- Versioning: /api/v1/
- Naming: Plural nouns (e.g., /documents, /projects)
- HTTP Methods: GET (read), POST (create), PUT (update), DELETE (remove)

**Request/Response**:
- Request: Pydantic models for validation
- Response: Consistent structure with status, data, error fields
- Error handling: HTTP status codes + detailed error messages

### Security Practices

**Backend**:
- JWT tokens: httpOnly cookies + CSRF protection
- Password hashing: bcrypt with salt
- SQL injection prevention: SQLAlchemy ORM (no raw queries)
- Input validation: Pydantic schemas

**Frontend**:
- XSS prevention: React auto-escaping + DOMPurify for user content
- CSRF tokens: Included in API requests
- Secure storage: Tokens in httpOnly cookies, not localStorage

### Performance Guidelines

**Backend**:
- Use async/await for I/O operations
- Implement caching for frequently accessed data (Redis)
- Lazy loading for large datasets
- Connection pooling for database

**Frontend**:
- Code splitting: Lazy load routes and heavy components
- Memoization: React.memo, useMemo, useCallback where appropriate
- Debouncing: User input, search queries
- Bundle optimization: Vite tree-shaking and minification

### Testing Standards

**Test Structure**:
- AAA pattern: Arrange, Act, Assert
- Fixtures: Reusable test data in fixtures/
- Mocking: External dependencies (API calls, databases)
- Coverage: Aim for 80% backend, 70% frontend

**CI/CD**:
- Run tests on every PR
- Automated linting and formatting checks
- Build validation before merge
- Security scanning (dependency vulnerabilities)

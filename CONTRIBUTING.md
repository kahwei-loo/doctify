# Contributing to Doctify

First off, thank you for considering contributing to Doctify! It's people like you that make this project a great learning platform.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to security@doctify.dev.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples**
- **Describe the behavior you observed and what you expected**
- **Include screenshots if relevant**
- **Note your environment** (OS, Node version, Python version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternative solutions you've considered**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the development setup** instructions in README.md
3. **Make your changes** following our coding standards
4. **Add tests** if applicable
5. **Ensure all tests pass**
6. **Update documentation** if needed
7. **Submit a pull request**

## Development Process

### Setting Up Development Environment

1. **Clone your fork**:
```bash
git clone https://github.com/YOUR_USERNAME/doctify.git
cd doctify
```

2. **Create a feature branch**:
```bash
git checkout -b feature/your-feature-name
```

3. **Install dependencies**:
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/dev.txt

# Frontend
cd frontend
npm install
```

4. **Set up pre-commit hooks** (optional but recommended):
```bash
pre-commit install
```

### Coding Standards

#### Python (Backend)

- Follow **PEP 8** style guide
- Use **type hints** for all function signatures
- Write **docstrings** for all public functions (Google style)
- Keep functions small and focused (max 50 lines)
- Use **async/await** for I/O operations
- Run **Black** for code formatting
- Run **Flake8** for linting
- Run **MyPy** for type checking

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type check
mypy app/
```

#### TypeScript/React (Frontend)

- Follow **Airbnb Style Guide**
- Use **functional components** and hooks
- Use **TypeScript strict mode**
- Keep components small and focused
- Use **meaningful variable names**
- Write **JSDoc comments** for complex functions
- Run **ESLint** and **Prettier**

```bash
# Lint and format
npm run lint
npm run format

# Type check
npm run type-check
```

### Testing

#### Backend Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_repositories.py
```

**Testing Standards**:
- Write unit tests for all new functions
- Maintain **80%+ code coverage**
- Use descriptive test names (test_should_do_something_when_condition)
- Use fixtures for common test data
- Mock external dependencies

#### Frontend Testing

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

**Testing Standards**:
- Write tests for all new components
- Maintain **70%+ code coverage**
- Use React Testing Library
- Test user interactions, not implementation details
- Use meaningful test descriptions

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples**:
```
feat(backend): add repository pattern for data access

Implement base repository class and document repository
to separate data access logic from business logic.

Closes #123

fix(frontend): resolve WebSocket reconnection issue

The WebSocket client was not properly handling reconnection
after network disruption. Added exponential backoff retry logic.

Fixes #456
```

### Pull Request Process

1. **Update documentation** if you change functionality
2. **Add tests** for new features
3. **Ensure all tests pass** locally
4. **Update CHANGELOG.md** with your changes
5. **Link related issues** in the PR description
6. **Request review** from maintainers
7. **Address review feedback** promptly

### Branch Naming Convention

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or updates

Examples:
- `feature/repository-pattern`
- `fix/websocket-reconnection`
- `refactor/service-layer`
- `docs/api-documentation`

## Project Structure

```
doctify/
├── backend/          # Python FastAPI backend
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Core configuration
│   │   ├── db/       # Database and repositories
│   │   ├── domain/   # Domain entities and value objects
│   │   ├── models/   # Pydantic models
│   │   ├── services/ # Business logic
│   │   └── tasks/    # Celery tasks
│   └── tests/        # Backend tests
├── frontend/         # React TypeScript frontend
│   ├── src/
│   │   ├── app/      # App configuration
│   │   ├── features/ # Feature modules
│   │   ├── shared/   # Shared components and utilities
│   │   └── pages/    # Page components
│   └── tests/        # Frontend tests
└── docs/             # Documentation
```

## Architecture Patterns

This project follows modern architecture patterns:

- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic separation
- **Dependency Injection** - Loose coupling
- **Domain-Driven Design** - Domain entities and value objects
- **Feature-Based Organization** - Frontend module organization

Please familiarize yourself with these patterns before contributing.

## Getting Help

- **Documentation**: Check [docs/](./docs/) directory
- **Issues**: Browse existing [GitHub Issues](https://github.com/kahwei-loo/doctify/issues)
- **Discussions**: Join [GitHub Discussions](https://github.com/kahwei-loo/doctify/discussions)
- **Email**: Contact security@doctify.dev

## Recognition

Contributors who submit pull requests will be added to our [Contributors](https://github.com/kahwei-loo/doctify/graphs/contributors) page.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Doctify! 🎉

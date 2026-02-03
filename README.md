# Doctify 📄

> AI-Powered Document Intelligence Platform - Transform business documents into structured data automatically

[![Build Status](https://img.shields.io/github/actions/workflow/status/kahwei-loo/doctify/ci.yml?branch=main)](https://github.com/kahwei-loo/doctify/actions)
[![Coverage](https://img.shields.io/codecov/c/github/kahwei-loo/doctify)](https://codecov.io/gh/kahwei-loo/doctify)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 18](https://img.shields.io/badge/react-18.0+-61dafb.svg)](https://reactjs.org/)

## 🎯 Overview

Doctify is a production-ready SaaS platform that leverages AI to automatically parse and extract structured data from business documents. Built as a **portfolio project** and **experimental lab**, it showcases modern software architecture patterns, clean code practices, and production-grade DevOps workflows.

**Live Demo**: [https://doctify.yourdomain.com](https://doctify.yourdomain.com) *(Coming Soon)*

### Key Features

- 🤖 **AI-Powered OCR** - Intelligent document parsing using OpenAI-compatible APIs
- 🧠 **RAG Q&A System** - Ask questions about documents and get AI-generated answers with source citations
- 📊 **Structured Data Extraction** - Convert unstructured documents to JSON/CSV/XLSX
- ⚡ **Real-time Processing** - WebSocket-based live progress updates
- 🔄 **Async Task Queue** - Celery-powered background processing with Redis
- 📝 **Version Control** - Track document parsing history and edits
- 🔐 **Authentication** - JWT tokens + API keys for secure access
- 🎨 **Modern UI** - React 18 with TypeScript, Tailwind CSS, and Radix UI
- 🐳 **Docker-Ready** - Full containerization with Docker Compose
- 📈 **Monitoring** - Prometheus metrics and structured logging
- 🧪 **Well-Tested** - 80%+ backend and 70%+ frontend test coverage

## 🏗️ Architecture

### Tech Stack

**Backend**:
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15 with pgvector extension (for RAG)
- **Cache/Queue**: Redis 7
- **Task Queue**: Celery with async workers
- **AI Provider**: OpenRouter API (OpenAI-compatible)
- **Vector Search**: pgvector with HNSW/IVFFlat indexes

**Frontend**:
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Redux Toolkit + RTK Query
- **UI Components**: Radix UI + Tailwind CSS
- **Charts**: Recharts

**Infrastructure**:
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Structured JSON logs with ELK-ready format

### System Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React     │─────▶│  FastAPI    │─────▶│ PostgreSQL  │
│   Frontend  │      │   Backend   │      │   Database  │
│             │◀─────│             │◀─────│             │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                            │
                     ┌──────┴──────┐
                     │             │
                     ▼             ▼
              ┌────────────┐ ┌──────────┐
              │   Celery   │ │  Redis   │
              │   Worker   │ │  Cache   │
              └────────────┘ └──────────┘
```

For detailed architecture documentation, see [docs/architecture/](./docs/architecture/).

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/kahwei-loo/doctify.git
cd doctify
```

2. **Set up environment variables**

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local with your configuration
```

3. **Start with Docker Compose**

```bash
docker-compose up -d
```

4. **Access the application**

- Frontend: http://localhost:3003
- Backend API: http://localhost:8008
- API Documentation: http://localhost:8008/docs

### Local Development

**Backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements/dev.txt
uvicorn app.main:app --reload --port 8008
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

**Celery Worker** (Required for document processing):
```bash
cd backend
celery -A app.workers.celery_app worker -l info --pool=solo -Q ocr_queue
```

## 📖 Documentation

- [API Documentation](./docs/api/) - REST API specifications and examples
- [Architecture Design](./docs/architecture/) - System architecture and design decisions
- [Deployment Guide](./docs/deployment/) - Production deployment instructions
- [Development Guide](./docs/development/) - Local development setup and workflows
- **[RAG Documentation](./docs/rag/)** - AI-powered Q&A system user guide and tuning guide

## 🧪 Testing

**Run Backend Tests**:
```bash
cd backend
pytest -v --cov=app --cov-report=html
```

**Run Frontend Tests**:
```bash
cd frontend
npm run test
npm run test:coverage
```

**Run E2E Tests**:
```bash
npm run test:e2e
```

## 📊 Project Status

This is an **active portfolio project** serving as an experimental lab for:
- Modern software architecture patterns (Repository Pattern, DDD, CQRS)
- Production-grade DevOps practices (CI/CD, monitoring, logging)
- Clean code principles and test-driven development
- Performance optimization and scalability patterns

**Current Phase**: MVP Complete (90%) - Refactoring for production-readiness

**Roadmap**:
- [x] Core document processing functionality
- [x] User authentication and authorization
- [x] Real-time WebSocket updates
- [x] Export functionality (JSON/CSV/XLSX)
- [ ] Enhanced monitoring and alerting
- [ ] Performance optimization (target: <200ms API response)
- [ ] Comprehensive test suite (target: 80%+ coverage)
- [ ] Production deployment to subdomain

## 🤝 Contributing

Contributions are welcome! This project serves as a learning platform, so feel free to:
- Report bugs and issues
- Suggest new features or improvements
- Submit pull requests
- Share your ideas and feedback

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 👤 Author

**Kah Wei Loo**
- Portfolio: [https://kahweiloo.com](https://kahweiloo.com)
- GitHub: [@kahwei-loo](https://github.com/kahwei-loo)
- LinkedIn: [kahwei-loo](https://linkedin.com/in/kahwei-loo)

## 🙏 Acknowledgments

- Built with modern open-source technologies
- Inspired by production SaaS platforms
- Continuous learning and improvement

---

**⭐ If you find this project useful, please consider giving it a star!**

# Doctify Project Diagram Documentation

## Overview

This directory contains all architecture diagrams for the Doctify project, written in Mermaid syntax and can be rendered directly in any Markdown viewer that supports Mermaid.

## Diagram Index

| # | File | Type | Description | Priority |
|---|------|------|-------------|----------|
| 01 | [01-system-context-diagram.md](./01-system-context-diagram.md) | System Context | System context diagram - Platform architecture and external system interactions | 🔴 High |
| 02 | [02-entity-relationship-diagram.md](./02-entity-relationship-diagram.md) | ER Diagram | Entity relationship diagram - Database models and module independence | 🔴 High |
| 03 | [03-documents-ocr-component-diagram.md](./03-documents-ocr-component-diagram.md) | Component | Documents/OCR module component diagram | 🟡 Medium |
| 04 | [04-knowledge-base-component-diagram.md](./04-knowledge-base-component-diagram.md) | Component | Knowledge Base module component diagram | 🟡 Medium |
| 05 | [05-ai-assistants-component-diagram.md](./05-ai-assistants-component-diagram.md) | Component | AI Assistants module component diagram | 🟡 Medium |
| 06 | [06-document-ocr-sequence-diagram.md](./06-document-ocr-sequence-diagram.md) | Sequence | Document OCR processing sequence diagram | 🟡 Medium |
| 07 | [07-knowledge-base-rag-sequence-diagram.md](./07-knowledge-base-rag-sequence-diagram.md) | Sequence | Knowledge Base RAG query sequence diagram | 🟡 Medium |
| 08 | [08-ai-assistant-chat-sequence-diagram.md](./08-ai-assistant-chat-sequence-diagram.md) | Sequence | AI Assistant chat sequence diagram | 🟡 Medium |
| 09 | [09-state-diagrams.md](./09-state-diagrams.md) | State | State diagrams (Document, Conversation, DataSource) | 🟢 Low |
| 10 | [10-deployment-diagram.md](./10-deployment-diagram.md) | Deployment | Docker deployment architecture diagram | 🟢 Low |
| 11 | [11-ai-learning-roadmap.md](./11-ai-learning-roadmap.md) | Learning Path | Comprehensive AI development learning roadmap (6 stages, foundations to expert) | 🟡 Medium |

## Core Architecture Highlights

### Three Independent Core Modules

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Doctify Platform                               │
├─────────────────┬─────────────────────┬─────────────────────────────────┤
│  📄 Documents   │  📚 Knowledge Base  │  🤖 AI Assistants              │
│  (OCR Module)   │  (KB Module)        │  (Assistant Module)            │
│  ─────────────  │  ─────────────────  │  ─────────────────────────────  │
│  Independent    │  Independent        │  Independent + Optional KB     │
│  No FK to       │  No FK to           │  Optional knowledge_base_id FK │
│  other modules  │  other modules      │                                │
└─────────────────┴─────────────────────┴─────────────────────────────────┘
```

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: FastAPI + Python 3.11 + AsyncIO
- **Database**: PostgreSQL 15 + pgvector
- **Cache/Queue**: Redis 7 + Celery
- **AI**: OpenAI / Anthropic / Google AI (L25 Orchestration)

## How to View Diagrams

### Method 1: VS Code + Mermaid Plugin
1. Install "Markdown Preview Mermaid Support" extension
2. Open the .md file
3. Use Ctrl+Shift+V to preview

### Method 2: GitHub/GitLab
View .md files directly in the repository - platforms natively support Mermaid rendering

### Method 3: Mermaid Live Editor
1. Visit https://mermaid.live/
2. Copy and paste diagram code to view

### Method 4: Export to Image
Using Mermaid CLI tool:
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i diagram.md -o diagram.png
```

## Diagram Use Cases

| Scenario | Recommended Diagrams |
|----------|---------------------|
| Project introduction/presentation | 01 System Context + 02 ER Diagram |
| New member onboarding | 01, 02, 10 Deployment |
| Module development | 03/04/05 Component Diagrams |
| Debugging issues | 06/07/08 Sequence Diagrams |
| Understanding states | 09 State Diagrams |
| Operations/Deployment | 10 Deployment Diagram |
| AI learning path planning | 11 AI Learning Roadmap |
| Team training & development | 11 AI Learning Roadmap |

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-28 | 1.0 | Initial creation of all 10 diagrams |
| 2026-02-04 | 1.1 | Added AI Learning Roadmap (11) - comprehensive 6-stage learning path |

---

*Last Updated: 2026-02-04*
*Tools: Claude Code + Mermaid*

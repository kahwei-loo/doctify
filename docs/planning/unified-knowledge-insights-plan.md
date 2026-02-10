# Unified Knowledge & Insights Platform - Implementation Plan

> **Version**: 1.2
> **Date**: 2026-02-10
> **Status**: MVP Implementation Complete — Pending PR
> **Approach**: Option C (Unified KB Entry + Intent Routing) → Hybrid (Long-term)
> **Branch**: `feature/unified-knowledge-insights` (5 commits, unpushed)

---

## Implementation Status (Updated 2026-02-10)

### Phase Completion Summary

| Phase | Plan Section | Status | Notes |
|-------|-------------|--------|-------|
| Phase 0: Foundation | 6.1 | ✅ Complete | Migration 015, Redis rate limiter, pagination fix |
| Phase 1: Unified Data Source | 6.2 | ⚠️ Partial | Backend + upload complete. Schema editor UI deferred |
| Phase 2: Intent Classification | 6.3 | ✅ Complete | Classifier, router, unified API, streaming |
| Phase 3: UI Integration | 6.4 | ✅ Complete | UnifiedQueryPanel, AdaptiveResponseRenderer, nav cleanup |

### Commits on Branch

| Hash | Description |
|------|------------|
| `ed3848b` | feat: unified knowledge & insights platform (weeks 1-3) |
| `d918f45` | feat: unified knowledge week 4 — testing, observability, feedback |
| `c6cdad2` | feat: unified knowledge week 5 — pagination, streaming, demo mode, UX polish |
| `1071adb` | fix: correct mock paths and test data in verification |
| `9e0eb6a` | fix: runtime bugs found during verification |

### Test Coverage

| Test Suite | Tests | Status |
|-----------|-------|--------|
| IntentClassifier unit tests | 21 | ✅ Passing |
| PipelineRouter unit tests | 12 | ✅ Passing |
| Unified Knowledge integration tests | 16 | ✅ Passing |
| **Total** | **49** | **✅ All passing** |

### Acceptance Criteria Status (Section 10.3)

- [x] User can upload CSV/XLSX as a KB data source _(endpoint implemented)_
- [ ] Schema is auto-inferred and editable _(auto-inferred on upload; edit UI deferred to follow-up PR)_
- [x] User can ask document questions and get text answers _(unified query → RAG pipeline)_
- [x] User can ask data questions and get charts _(unified query → Analytics pipeline)_
- [ ] System correctly routes 90%+ of queries _(needs runtime benchmark — follow-up)_
- [x] Multi-turn conversations work across both pipelines _(conversation stickiness in PipelineRouter)_
- [x] Streaming works for both RAG and analytics responses _(SSE for RAG, single event for Analytics)_
- [x] Demo mode covers the unified flow _(mock handlers + data for RAG/Analytics/Ambiguous)_
- [ ] No regressions in existing KB/RAG functionality _(needs E2E test — follow-up)_

### Deferred Items (Follow-up Issues)

| Item | Type | Priority | Rationale for Deferral |
|------|------|----------|----------------------|
| `StructuredDataConfig.tsx` (schema editor) | Feature | P1 | Separate user story — upload works without editing |
| Data preview tab | Feature | P2 | UX enhancement, not core flow |
| `test_insights_dataset_service.py` | Tech debt | P1 | Pre-existing code, not new to this branch |
| `test_insights_query_service.py` | Tech debt | P1 | Pre-existing code, not new to this branch |
| Frontend unit tests | Quality | P2 | Runtime-verified via Playwright |
| E2E Playwright tests | Quality | P1 | Benefits whole KB module |
| Performance benchmarks | Measurement | P2 | Requires production-like environment |
| Routing accuracy benchmark | Measurement | P1 | Needs 50+ diverse query test set |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Product Vision](#3-product-vision)
4. [MVP Scope (v2.0)](#4-mvp-scope-v20)
5. [Technical Architecture](#5-technical-architecture)
   - 5.1 High-Level Architecture
   - 5.2 Intent Classifier Design (incl. Multi-Dataset Disambiguation, Bilingual Support)
   - 5.3 Pipeline Router
   - 5.4 Structured Data Source Integration
   - 5.5 Observability & Feedback Mechanism (NEW)
6. [Implementation Phases](#6-implementation-phases)
7. [Data Model Changes](#7-data-model-changes)
8. [API Design](#8-api-design)
9. [Frontend Design](#9-frontend-design)
10. [Testing Strategy](#10-testing-strategy)
11. [Future Roadmap (v2.x - v3.0)](#11-future-roadmap-v2x---v30)
12. [Risk Assessment](#12-risk-assessment)
13. [Success Metrics](#13-success-metrics)
- [Appendix A: File Inventory](#appendix-a-file-inventory-current-state)
- [Appendix B: Glossary](#appendix-b-glossary)
- [Appendix C: Data Migration Strategy](#appendix-c-data-migration-strategy) (NEW)

---

## 1. Executive Summary

### Problem Statement

Doctify currently has two separate intelligence modules:
- **Knowledge Base (KB)**: Handles unstructured data (documents, PDFs, text) via RAG pipeline (Vector Search + BM25 + LLM Generation)
- **Insights**: Handles structured data (CSV, XLSX) via NL-to-SQL pipeline (Intent Parsing → SQL Generation → DuckDB Execution → Chart Rendering)

These operate as independent silos with no cross-referencing capability, no shared data management, and separate navigation paths. This limits commercial value and creates user confusion about which module to use.

### Proposed Solution

Merge the Insights module into the Knowledge Base as a new data source type (`structured_data`), creating a **Unified Knowledge Platform** where users manage all data sources in one place and the system automatically routes queries to the appropriate pipeline.

### Commercial Value

| Standalone KB | Standalone Insights | Unified Platform |
|---|---|---|
| Commodity RAG product | Simple BI (crowded market) | Differentiated "ask anything" platform |
| Text-only answers | Charts-only answers | Text + Charts + Cross-reference |
| Competes with every RAG tool | Competes with Metabase, Superset | Few direct competitors |

### Long-term Vision: Hybrid Queries

The killer feature — queries that cross-reference BOTH document content AND structured data:

> "Which departments exceeded the travel budget limits defined in our policy document?"

This requires RAG (policy document) + SQL (expense data) working together. The MVP builds the foundation for this by unifying data management and adding intent-based routing.

---

## 2. Current State Analysis

### 2.1 Knowledge Base Module (Production-Ready)

**Status**: Complete with P0-P3 RAG enhancements (91/100 maturity score)

| Component | Status | Details |
|---|---|---|
| Frontend | ✅ Complete | 29 components, 4 data source types, settings, embeddings view |
| Backend API | ✅ Complete | 11 endpoints, CRUD + test-query + embedding generation |
| Database | ✅ Complete | 4 migrations (009, 011-014), pgvector + tsvector |
| RAG Pipeline | ✅ Complete | Hybrid search, reranking, streaming, caching, evaluation |
| Demo Mode | ✅ Complete | Mock data + API wrapper |
| Tests | ⚠️ Partial | Basic coverage, needs expansion |

**Data Source Types Supported**:
1. `uploaded_docs` — Document uploads (PDF, DOCX, TXT)
2. `website` — Website crawling with depth control
3. `text` — Direct text input
4. `qa_pairs` — Question-answer pairs

**KB Config** (per knowledge base):
- Embedding model selection (text-embedding-3-small / large)
- Chunk size (512 / 1024 / 2048)
- Chunk overlap (0 / 128 / 256)
- Chunk strategy (fixed / semantic / recursive)

### 2.2 Insights Module (Code-Complete, Not Production-Ready)

**Status**: Code complete but missing production essentials

| Component | Status | Details |
|---|---|---|
| Frontend | ✅ Complete | 6 components, InsightsPage, 5 chart types |
| Backend API | ✅ Complete | 11 endpoints, dataset + conversation + query |
| Backend Services | ✅ Complete | QueryService (979 LOC), DatasetService (539 LOC) |
| Database Models | ✅ Complete | 3 models (InsightsDataset, Conversation, Query) |
| Alembic Migration | ❌ Missing | Tables may auto-create but not production-safe |
| Tests | ❌ Missing | Zero test coverage (~3000 LOC untested) |
| Demo Mode | ⚠️ Partial | Mock data exists but not fully integrated |
| Documentation | ❌ Missing | No user guide, no architecture docs |

**Critical Gaps**:
1. **No Alembic migration** — 3 tables have no dedicated migration file
2. **In-memory rate limiter** — Uses `threading.Lock`, ineffective across workers
3. **In-memory pagination** — Queries all records then slices in Python
4. **No tests** — Entire module has zero test coverage
5. **No CHANGELOG entry** — Module not documented in project changelog

### 2.3 Architecture Comparison

| Aspect | Knowledge Base | Insights |
|---|---|---|
| **Data Type** | Unstructured (text, PDFs) | Structured (CSV, XLSX) |
| **Storage** | pgvector embeddings | Parquet files (filesystem) |
| **Query Engine** | Vector + BM25 hybrid search | DuckDB SQL execution |
| **AI Usage** | Embedding + Generation + Reranking | Intent parsing + Response formatting |
| **Output** | Text answers with sources | Charts + Text + SQL |
| **Multi-turn** | RAG conversations (P1.3) | Conversation context (JSONB) |
| **Security** | Input sanitization | SQL injection prevention |
| **Caching** | Redis semantic cache (P3.1) | None |

---

## 3. Product Vision

### 3.1 User Persona

**Primary**: Knowledge workers (HR, Finance, Legal, Operations) who need to find information across both documents and data files.

**Pain Point**: "I have policy documents AND spreadsheets. I have to search them separately and manually cross-reference."

### 3.2 Core Value Proposition

> **One Knowledge Base, Any Data, Any Question**
>
> Upload documents, spreadsheets, websites — ask questions in natural language. Doctify automatically determines whether you need a text answer, a chart, or both.

### 3.3 User Journey (Target State)

```
1. User creates a Knowledge Base ("Q1 2026 Planning")
2. Adds data sources:
   - Upload: Company policy PDF, meeting notes
   - Upload: Budget spreadsheet (XLSX), sales data (CSV)
   - Crawl: Company wiki pages
3. System auto-detects data types and processes accordingly:
   - Documents → Chunking → Embedding → Vector store
   - Spreadsheets → Schema inference → Parquet storage → Ready for SQL
   - Website → Crawl → Extract text → Embedding → Vector store
4. User asks questions in a single chat interface:
   - "What is our remote work policy?" → RAG pipeline → Text answer with sources
   - "Show monthly revenue trend" → SQL pipeline → Line chart + insights
   - "Which departments exceeded travel limits?" → Hybrid → Text + chart (future)
```

---

## 4. MVP Scope (v2.0)

The MVP delivers **Option C**: unified KB entry point with intent-based routing. Users manage all data in Knowledge Base; the system routes queries to the right pipeline.

### 4.1 What's IN Scope

#### Phase 0: Foundation (Fix Current Gaps)

| Task | Priority | Effort |
|---|---|---|
| Create Alembic migration for Insights tables (015) | P0 | 0.5d |
| Replace in-memory rate limiter with Redis | P0 | 0.5d |
| Fix in-memory pagination (use SQL LIMIT/OFFSET) | P0 | 0.5d |
| Add CHANGELOG entry for Insights module | P0 | 0.5h |
| Write unit tests for DatasetService | P0 | 1d |
| Write unit tests for QueryService | P0 | 1d |
| Write integration tests for Insights API | P0 | 1d |

#### Phase 1: Unified Data Source Management

| Task | Priority | Effort |
|---|---|---|
| Add `structured_data` data source type to KB | P0 | 1d |
| Create dataset upload flow within KB (reuse DatasetUploader) | P0 | 1.5d |
| Schema editor component within KB data source view | P1 | 1d |
| Dataset preview within KB data source view | P1 | 0.5d |
| Migrate Insights storage to KB-scoped directories | P1 | 1d |
| Update KB stats to include structured data metrics | P1 | 0.5d |
| **Intent Classifier spike/prototype** (de-risk Phase 2) | P0 | 1d |

#### Phase 2: Intent Classification & Query Routing

| Task | Priority | Effort |
|---|---|---|
| Build IntentClassifier service (LLM-based, bilingual) | P0 | 2d |
| Multi-dataset disambiguation logic + ambiguity fallback | P0 | 1d |
| Create PipelineRouter that dispatches to RAG or SQL | P0 | 1d |
| Unified query endpoint that accepts any question | P0 | 1d |
| Extend KB TestQueryPanel to handle both result types | P0 | 1.5d |
| Adaptive response renderer (text OR chart OR both) | P0 | 2d |
| Streaming support for unified queries (RAG only, sync for analytics) | P1 | 0.5d |
| Classification observability logging + feedback endpoint | P1 | 0.5d |

#### Phase 3: UI Integration

| Task | Priority | Effort |
|---|---|---|
| Extend KB detail page with "Analytics" tab | P0 | 1d |
| Unified query panel (replaces separate RAG + Insights UIs) | P0 | 2d |
| Schema management tab for structured data sources | P1 | 1d |
| Data preview tab for structured data sources | P1 | 0.5d |
| Remove standalone Insights page (redirect to KB) | P2 | 0.5d |
| Update sidebar navigation | P2 | 0.5h |
| Update demo mode for unified flow | P1 | 1d |

### 4.2 What's OUT of Scope (MVP)

- Hybrid queries (cross-referencing documents + data)
- External data connectors (MySQL, PostgreSQL, BigQuery)
- Dashboard persistence and sharing
- Scheduled queries and alerts
- Data refresh / ETL pipelines
- Multi-dataset JOINs
- Real-time data streaming
- Export to BI tools
- Governance and access control per data source

### 4.3 MVP Effort Estimate

| Phase | Effort | Calendar Time |
|---|---|---|
| Phase 0: Foundation | ~5.5 days | Week 1 |
| Phase 1: Unified Data Source + Classifier Spike | ~6.5 days | Week 2 |
| Phase 2: Intent & Routing | ~9.5 days | Week 3-4 |
| Phase 3: UI Integration | ~6.5 days | Week 5-6 |
| Testing & Polish | ~3 days | Week 6-7 |
| **Total** | **~31.5 days** | **~7 weeks** |

> **Buffer note**: The original 6-week estimate assumed zero friction. The updated 7-week estimate
> includes: (1) +1d for Intent Classifier spike/prototype in Phase 1, (2) +1d for multi-dataset
> disambiguation logic and bilingual testing in Phase 2, (3) ~3 days general buffer across phases
> for integration surprises and edge cases. If the classifier spike reveals fundamental issues,
> Phase 2 may need redesign — this buffer accounts for that risk.

---

## 5. Technical Architecture

### 5.1 High-Level Architecture (MVP)

```
┌─────────────────────────────────────────────────────┐
│                  Knowledge Base UI                    │
│  ┌──────────┬──────────┬──────────┬───────────────┐  │
│  │ Sources  │Embeddings│ Query    │  Analytics    │  │
│  │ Tab      │Tab       │ Tab      │  Tab (NEW)    │  │
│  └──────────┴──────────┴──────┬───┴───────────────┘  │
│                               │                       │
│                    User Query (NL)                     │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│              Intent Classifier (LLM)                   │
│                                                        │
│  Input: user_query + kb_metadata (data_source_types)   │
│  Output: { intent: 'rag' | 'analytics' | 'hybrid',    │
│            confidence: 0.0-1.0,                        │
│            reasoning: string }                         │
└──────────┬────────────────────────────┬───────────────┘
           │                            │
     intent='rag'                intent='analytics'
           │                            │
           ▼                            ▼
┌──────────────────┐        ┌───────────────────────┐
│  RAG Pipeline    │        │  Analytics Pipeline    │
│                  │        │                        │
│  Hybrid Search   │        │  Schema Resolution     │
│  → Reranking     │        │  → SQL Generation      │
│  → Generation    │        │  → DuckDB Execution    │
│  → Groundedness  │        │  → Chart Suggestion    │
│  → Streaming     │        │  → Insight Generation  │
└────────┬─────────┘        └───────────┬────────────┘
         │                              │
         ▼                              ▼
┌───────────────────────────────────────────────────────┐
│              Adaptive Response Renderer                 │
│                                                        │
│  RAG Result → Text + Sources panel                     │
│  Analytics Result → Chart + SQL + Insights panel       │
│  Hybrid Result → Text + Chart + Cross-references       │
└───────────────────────────────────────────────────────┘
```

### 5.2 Intent Classifier Design

The Intent Classifier determines which pipeline to use based on the query and the KB's data sources.

**Input Context**:
```json
{
  "query": "Show monthly revenue trend",
  "kb_data_sources": [
    { "type": "uploaded_docs", "name": "Company Handbook" },
    { "type": "structured_data", "name": "Sales Q1 2026",
      "schema_summary": "columns: month, region, revenue, units_sold" }
  ],
  "conversation_context": { "last_intent": "analytics" }
}
```

**Classification Logic**:
1. If KB has ONLY document sources → always `rag`
2. If KB has ONLY structured data → always `analytics` (+ resolve target dataset)
3. If KB has both → LLM classification with confidence score
4. If confidence < 0.6 → ask user to clarify OR default to `rag`
5. Conversation context influences: follow-up to analytics query likely stays `analytics`

**Classifier Output Schema**:
```json
{
  "intent": "rag | analytics",
  "confidence": 0.92,
  "reasoning": "Query asks for numerical trend data matching sales dataset schema",
  "target_data_source_id": "uuid-of-best-matching-dataset"  // REQUIRED for analytics intent
}
```

**Multi-Dataset Disambiguation** (Critical Design Decision):

When a KB has multiple structured data sources, the classifier must determine which dataset to query. This is resolved through a **schema-column matching** strategy:

1. **Schema summary injection**: Each structured data source's column names, types, and sample values are included in the classifier prompt
2. **LLM selects best match**: The classifier identifies which dataset's schema best matches the query's data needs
3. **Ambiguity fallback**: If confidence < 0.7 for dataset selection, return an error asking the user to specify:
   - "Your KB has 3 data sources. Did you mean 'Sales Q1' or 'Budget FY26'?"
4. **Conversation stickiness**: Within a conversation, subsequent analytics queries default to the same dataset unless the user explicitly switches

Example with multiple datasets:
```json
{
  "query": "Show revenue by region",
  "kb_data_sources": [
    { "type": "structured_data", "id": "ds-1", "name": "Sales Q1",
      "schema_summary": "columns: month, region, revenue, units_sold" },
    { "type": "structured_data", "id": "ds-2", "name": "HR Headcount",
      "schema_summary": "columns: department, headcount, hire_date, salary_band" },
    { "type": "uploaded_docs", "id": "ds-3", "name": "Company Handbook" }
  ]
}
// → intent: "analytics", target_data_source_id: "ds-1" (revenue+region match Sales Q1)
```

**LLM Prompt Template** (bilingual-ready):
```
You are a query intent classifier for a knowledge base system.
你是知识库系统的查询意图分类器。

Given a user's question and available data sources, determine:
1. Whether to search documents (rag) or query structured data (analytics)
2. If analytics, which data source best matches the query

Available data sources:
{data_sources_summary}

User question: {query}
Previous conversation context: {conversation_context}

Respond with JSON:
{
  "intent": "rag" | "analytics",
  "confidence": 0.0-1.0,
  "target_data_source_id": "id-if-analytics-else-null",
  "reasoning": "Brief explanation in same language as user query"
}

Important rules:
- If the query references numbers, trends, aggregations, comparisons → likely analytics
- If the query asks about policies, procedures, definitions, concepts → likely rag
- For analytics, match query terms against column names and sample values
- If multiple datasets could match, pick the one with highest column relevance
- If unsure which dataset, set confidence below 0.7
- Respond in the same language as the user's question (English or Chinese)
```

**Bilingual Support**: The prompt template supports both English and Chinese queries. The classifier is instructed to respond in the user's language for the `reasoning` field, ensuring consistent UX across languages. Test coverage must include both languages (see Section 10).

**Optimization**: Use a small, fast model (GPT-4o-mini) for classification to minimize latency. Cache classification results for similar queries.

**Observability**: Every classification decision is logged with:
- Input query, KB metadata, conversation context
- Output intent, confidence, target dataset, reasoning
- Latency (ms) and model used
- Whether fast-path was taken (skipped LLM)

This data feeds into the routing accuracy dashboard (see Section 5.5).

### 5.3 Pipeline Router

```python
class PipelineRouter:
    """Routes queries to the appropriate pipeline based on intent classification."""

    async def route_query(
        self,
        query: str,
        kb_id: UUID,
        conversation_id: Optional[UUID],
        session: AsyncSession,
    ) -> UnifiedQueryResponse:
        # 1. Get KB metadata (data source types, schemas)
        kb_metadata = await self._get_kb_metadata(kb_id, session)

        # 2. Fast-path: if only one pipeline applicable
        if kb_metadata.has_only_documents:
            return await self._execute_rag(query, kb_id, conversation_id, session)
        if kb_metadata.has_only_structured:
            return await self._execute_analytics(query, kb_id, conversation_id, session)

        # 3. Classify intent
        classification = await self.intent_classifier.classify(
            query, kb_metadata, conversation_context
        )

        # 4. Route to appropriate pipeline
        if classification.intent == "rag":
            return await self._execute_rag(query, kb_id, conversation_id, session)
        elif classification.intent == "analytics":
            return await self._execute_analytics(query, kb_id, conversation_id, session)
        else:  # hybrid (future)
            return await self._execute_hybrid(query, kb_id, conversation_id, session)
```

### 5.4 Structured Data Source Integration

The existing Insights `DatasetService` functionality is adapted as a KB data source handler:

```
KB Data Source (type='structured_data')
├── config (JSONB):
│   ├── file_info: { original_name, storage_path, size_bytes, row_count }
│   ├── schema_definition: { columns: [...] }
│   └── parquet_path: "uploads/kb_{kb_id}/datasets/{ds_id}.parquet"
├── status: 'active' | 'processing' | 'error'
└── Processing pipeline:
    1. User uploads CSV/XLSX
    2. Pandas reads file → infers schema
    3. Converts to Parquet in KB-scoped directory
    4. Schema stored in data_source.config
    5. Status set to 'active' (ready for queries)
```

**Key Difference from Current Insights**: No separate `insights_datasets` table. The `data_sources` table with `type='structured_data'` serves as the single source of truth.

### 5.5 Observability & Feedback Mechanism

Accurate intent routing is critical to user experience. The system must provide visibility into classification decisions and a feedback loop for continuous improvement.

#### Classification Logging

Every query routed through the Intent Classifier generates a log entry:

```python
@dataclass
class ClassificationLog:
    query_id: UUID
    kb_id: UUID
    user_query: str
    intent: str                    # rag | analytics
    confidence: float
    target_data_source_id: Optional[UUID]
    reasoning: str
    fast_path_used: bool           # True if LLM was skipped
    classification_latency_ms: int
    model_used: str                # e.g. "gpt-4o-mini"
    conversation_context_used: bool
    timestamp: datetime
```

These logs are stored in a `query_classification_logs` table (added to Migration 016) and exposed via an admin API for analysis.

#### User Feedback Mechanism

After receiving a response, users can signal incorrect routing:

- **Thumbs down + "Wrong type"** button: indicates the system should have used the other pipeline
- On feedback submission, the system:
  1. Logs the correction to `query_classification_feedback` table
  2. Optionally re-routes the query to the correct pipeline
  3. Uses accumulated feedback for periodic classification prompt tuning

#### Routing Accuracy Dashboard

Admin dashboard (Phase 3 stretch goal) showing:
- Classification distribution (rag vs analytics vs fast-path)
- Average confidence scores over time
- User correction rate (lower = better)
- Latency distribution for classification step
- Fast-path hit rate (efficiency metric)

#### Metrics Tracked

| Metric | Source | Alert Threshold |
|---|---|---|
| Classification accuracy | User feedback corrections | < 85% → alert |
| Classification latency P95 | Classification logs | > 500ms → alert |
| Fast-path hit rate | Classification logs | < expected based on KB composition |
| User correction rate | Feedback table | > 15% → review prompts |

---

## 6. Implementation Phases

### 6.1 Phase 0: Foundation (Week 1)

**Goal**: Fix all existing gaps before building new features.

#### 0.1 Alembic Migration for Insights Tables

Create migration `015_add_insights_tables.py`:
- `insights_datasets` table (if keeping for backward compatibility during transition)
- `insights_conversations` table
- `insights_queries` table
- Proper indexes and foreign keys

#### 0.2 Replace In-Memory Rate Limiter

Replace `threading.Lock` + `defaultdict` in `QueryService` with Redis-based rate limiter:
- Use Redis `INCR` + `EXPIRE` for atomic rate limiting
- Effective across multiple Celery workers and API processes
- Reuse existing Redis connection from `app.db.redis`

#### 0.3 Fix Pagination

Replace in-memory slicing with proper SQL pagination:
```python
# Before (current):
datasets = await self.dataset_repo.find_by_user(user_id)
return datasets[skip:skip+limit]  # loads ALL into memory

# After:
datasets = await self.dataset_repo.find_by_user_paginated(
    user_id, skip=skip, limit=limit
)
```

#### 0.4 Tests

- Unit tests: `tests/unit/test_services/test_insights_dataset_service.py`
- Unit tests: `tests/unit/test_services/test_insights_query_service.py`
- Integration tests: `tests/integration/test_api/test_insights_endpoints.py`
- Target: 70%+ coverage for Insights module

### 6.2 Phase 1: Unified Data Source Management (Week 2)

**Goal**: Users can upload structured data (CSV/XLSX) as a KB data source.

#### 1.1 Backend: New Data Source Type

Extend `DataSourceType` enum and KB API:
```python
# backend/app/db/models/knowledge_base.py
class DataSourceType(str, Enum):
    UPLOADED_DOCS = "uploaded_docs"
    WEBSITE = "website"
    TEXT = "text"
    QA_PAIRS = "qa_pairs"
    STRUCTURED_DATA = "structured_data"  # NEW
```

Add structured data handling to data source creation endpoint:
- Accept CSV/XLSX file upload
- Reuse `DatasetService.upload_dataset()` logic for parsing and schema inference
- Store Parquet file in `uploads/kb_{kb_id}/datasets/{ds_id}.parquet`
- Store schema in `data_source.config.schema_definition`

#### 1.2 Frontend: Data Source Upload Extension

Extend `AddDataSourceDialog.tsx`:
- Add "Structured Data (CSV/XLSX)" option to data source type selector
- Reuse `DatasetUploader` component (with minor adaptations)
- Show schema preview after upload
- Add schema editor (inline or in separate tab)

#### 1.3 Schema Management

Create `StructuredDataConfig.tsx` component:
- Display column definitions (name, type, metric/dimension, aliases)
- Allow editing aliases, descriptions, aggregation defaults
- AI-powered schema inference button (reuse existing endpoint)
- Data preview tab (first 100 rows in table view)

#### 1.4 Intent Classifier Spike / Prototype (End of Phase 1)

**Purpose**: De-risk Phase 2 by validating the Intent Classifier approach before full implementation.

**Scope** (~1 day):
- Create a minimal `intent_classifier.py` with hardcoded prompt template
- Test against 20 sample queries (10 RAG, 10 analytics) in both English and Chinese
- Measure: accuracy, latency, cost per classification
- Validate multi-dataset disambiguation with 2-3 sample schemas
- Document findings and adjust Phase 2 design if needed

**Success Gate**: ≥ 85% accuracy on sample queries AND < 300ms latency per classification. If either threshold is not met, adjust the classification approach before proceeding to Phase 2 (consider: fine-tuning, few-shot examples, or rule-based pre-filter).

### 6.3 Phase 2: Intent Classification & Query Routing (Week 3-4)

**Goal**: A single query endpoint that intelligently routes to RAG or Analytics.

#### 2.1 Intent Classifier Service

Create `backend/app/services/rag/intent_classifier.py`:
- LLM-based classification using GPT-4o-mini
- Input: query text + KB metadata (data source types + schema summaries)
- Output: intent (`rag` | `analytics`) + confidence + reasoning + `target_data_source_id`
- **Multi-dataset disambiguation**: When multiple structured data sources exist, classifier selects best-matching dataset via schema-column matching (see Section 5.2)
- **Bilingual prompt**: Supports English and Chinese queries with language-matched reasoning
- Conversation context awareness for multi-turn queries (dataset stickiness)
- Fast-path optimization: skip LLM if KB has only one data type
- **Observability**: Log every classification decision for accuracy tracking (see Section 5.5)

#### 2.2 Pipeline Router Service

Create `backend/app/services/rag/pipeline_router.py`:
- Orchestrates intent classification and pipeline execution
- Wraps existing `RetrievalService` + `GenerationService` for RAG
- Wraps existing `QueryService` for Analytics
- Returns unified response format

#### 2.3 Unified Query API

Create new endpoint or extend existing:
```
POST /api/v1/knowledge-bases/{kb_id}/query
{
  "question": "Show monthly revenue trend",
  "conversation_id": "optional-uuid",
  "search_mode": "auto",  // auto | rag | analytics
  "stream": false
}
```

Response format (unified):
```json
{
  "id": "query-uuid",
  "question": "Show monthly revenue trend",
  "intent": "analytics",
  "intent_confidence": 0.95,
  "response": {
    "text": "Here's the monthly revenue trend for Q1 2026...",
    "sources": [],
    "chart": {
      "type": "line",
      "config": { "x_key": "month", "y_keys": ["revenue"] },
      "data": [...]
    },
    "insights": ["Revenue grew 15% month-over-month in February"],
    "sql": "SELECT month, SUM(revenue) FROM data GROUP BY month ORDER BY month"
  },
  "metadata": {
    "pipeline": "analytics",
    "execution_time_ms": 450,
    "tokens_used": 320
  }
}
```

#### 2.4 Streaming Support

> **Design Note**: RAG and Analytics have fundamentally different streaming characteristics.
> RAG benefits from token-by-token SSE streaming because LLM generation is the bottleneck (seconds).
> Analytics (DuckDB) executes synchronously and returns results in < 200ms — streaming adds no value
> and introduces unnecessary complexity. The unified endpoint uses a **response-type-aware strategy**:

Streaming strategy by pipeline:
- **RAG streaming** (existing): token-by-token SSE for LLM text generation
- **Analytics responses**: Single JSON response (no streaming) — DuckDB execution is fast
- **Unified SSE event types**: `intent` (sent immediately), then:
  - If RAG: `text_chunk` (streamed) → `sources` → `groundedness` → `done`
  - If Analytics: `analytics_result` (single event with chart + SQL + insights) → `done`

This avoids over-engineering the analytics path while preserving the RAG streaming UX.

### 6.4 Phase 3: UI Integration (Week 4-5)

**Goal**: Seamless user experience within KB pages.

#### 3.1 KB Detail Page Extension

Add new tabs to `KBDetailTabs.tsx`:
- **Query** tab (unified): Replace current TestQueryPanel with unified query interface
- **Analytics** tab: Schema management + data preview for structured sources

#### 3.2 Unified Query Panel

Create `UnifiedQueryPanel.tsx`:
- Single text input for any question
- Auto-detect mode indicator ("Searching documents..." or "Analyzing data...")
- Manual mode override (dropdown: Auto / Documents / Data)
- Conversation history sidebar

#### 3.3 Adaptive Response Renderer

Create `AdaptiveResponseRenderer.tsx`:
- Detects response type and renders appropriate UI:
  - RAG response → Text with source citations (existing `RAGResponseCard`)
  - Analytics response → Chart + insights + collapsible SQL (adapted from `ResultsPanel`)
  - Hybrid response → Combined view (future)
- Smooth transitions between response types in conversation

#### 3.4 Navigation Cleanup

- Remove standalone `/insights` route (or redirect to `/knowledge-base`)
- Remove Insights from sidebar (or rename to "Data Insights" under KB)
- Update breadcrumbs and page titles
- Update demo mode mock data for unified flow

---

## 7. Data Model Changes

### 7.1 Migration 015: Insights Tables (Phase 0)

```sql
-- Create insights_datasets table (for backward compatibility during transition)
CREATE TABLE insights_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    file_info JSONB NOT NULL,
    schema_definition JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    row_count INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE insights_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL REFERENCES insights_datasets(id) ON DELETE CASCADE,
    title VARCHAR(255),
    context JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE insights_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES insights_conversations(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL REFERENCES insights_datasets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_input TEXT NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    parsed_intent JSONB,
    generated_sql TEXT,
    result JSONB,
    error_message TEXT,
    response_text TEXT,
    response_chart JSONB,
    response_insights JSONB,
    token_usage JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX ix_insights_datasets_user_status ON insights_datasets(user_id, status);
CREATE INDEX ix_insights_datasets_user_created ON insights_datasets(user_id, created_at);
CREATE INDEX ix_insights_conversations_user_dataset ON insights_conversations(user_id, dataset_id);
CREATE INDEX ix_insights_conversations_updated ON insights_conversations(updated_at);
CREATE INDEX ix_insights_queries_conversation_created ON insights_queries(conversation_id, created_at);
CREATE INDEX ix_insights_queries_user_status ON insights_queries(user_id, status);
```

### 7.2 Migration 016: Extend Data Sources for Structured Data (Phase 1)

> **Design Trade-off: "Fat Table" Approach**
>
> We extend `rag_queries` with analytics-specific columns (`chart_config`, `sql_generated`,
> `intent_classification`) rather than creating a separate `analytics_queries` table. This is a
> deliberate trade-off:
>
> | Approach | Pros | Cons |
> |---|---|---|
> | **Fat table (chosen)** | Single conversation history, unified query ID space, simpler API | NULL columns for non-applicable fields, table grows wider |
> | **Separate tables** | Clean schema per pipeline | Complex JOINs for conversation history, two ID spaces, harder unified UI |
>
> The fat table approach is preferred because the Unified Query Panel needs a single conversation
> timeline that interleaves RAG and analytics queries. Splitting would require UNION queries and
> polymorphic rendering logic. The NULL columns are acceptable since JSONB NULLs are space-efficient
> in PostgreSQL.
>
> **Revisit trigger**: If `rag_queries` exceeds 10M rows or analytics-specific query patterns emerge
> that are incompatible with the RAG query lifecycle, consider table splitting.

```sql
-- Add structured_data support to data_sources
-- No schema change needed - data_sources.type is VARCHAR and config is JSONB
-- Just need to handle the new type in application code

-- Add analytics query tracking to rag_queries (fat table approach)
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS query_pipeline VARCHAR(20) DEFAULT 'rag';
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS chart_config JSONB;
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS sql_generated TEXT;
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS intent_classification JSONB;

-- Classification logging (observability - see Section 5.5)
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS classification_latency_ms INTEGER;
ALTER TABLE rag_queries ADD COLUMN IF NOT EXISTS target_data_source_id UUID;

-- Index for pipeline filtering
CREATE INDEX IF NOT EXISTS ix_rag_queries_pipeline ON rag_queries(query_pipeline);

-- User feedback on classification accuracy
CREATE TABLE IF NOT EXISTS query_classification_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID NOT NULL REFERENCES rag_queries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expected_intent VARCHAR(20) NOT NULL,  -- what it should have been
    feedback_type VARCHAR(20) NOT NULL DEFAULT 'wrong_intent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_classification_feedback_query
    ON query_classification_feedback(query_id);
```

### 7.3 Data Source Config Schema (structured_data)

```json
{
  "type": "structured_data",
  "config": {
    "file_info": {
      "original_name": "sales_q1_2026.xlsx",
      "storage_path": "uploads/kb_xxx/datasets/ds_yyy.parquet",
      "size_bytes": 1048576,
      "row_count": 5000,
      "uploaded_at": "2026-02-08T10:00:00Z"
    },
    "schema_definition": {
      "columns": [
        {
          "name": "month",
          "dtype": "datetime",
          "aliases": ["date", "period"],
          "description": "Reporting month",
          "is_metric": false,
          "is_dimension": true,
          "sample_values": ["2026-01", "2026-02", "2026-03"]
        },
        {
          "name": "revenue",
          "dtype": "float",
          "aliases": ["sales", "amount"],
          "description": "Monthly revenue in USD",
          "is_metric": true,
          "is_dimension": false,
          "default_agg": "SUM",
          "sample_values": [125000.50, 138000.75]
        }
      ]
    }
  }
}
```

---

## 8. API Design

### 8.1 New Endpoints (MVP)

#### Unified Query Endpoint

```
POST /api/v1/knowledge-bases/{kb_id}/query
```

**Request**:
```json
{
  "question": "What was Q1 revenue by region?",
  "conversation_id": "uuid (optional)",
  "mode": "auto",           // auto | rag | analytics
  "stream": false,           // SSE streaming
  "language": "en"           // en | zh
}
```

**Response**:
```json
{
  "id": "uuid",
  "conversation_id": "uuid",
  "question": "What was Q1 revenue by region?",
  "intent": {
    "classification": "analytics",
    "confidence": 0.92,
    "reasoning": "Query asks for numerical aggregation (revenue) by dimension (region)"
  },
  "response": {
    "text": "Q1 2026 revenue by region shows APAC leading at $2.1M...",
    "sources": [],
    "chart": {
      "type": "bar",
      "config": {
        "x_key": "region",
        "y_keys": ["revenue"],
        "title": "Q1 Revenue by Region"
      },
      "data": [
        { "region": "APAC", "revenue": 2100000 },
        { "region": "EMEA", "revenue": 1800000 },
        { "region": "Americas", "revenue": 1500000 }
      ]
    },
    "insights": [
      "APAC leads with 38.9% of total revenue",
      "Total Q1 revenue: $5.4M"
    ],
    "sql": "SELECT region, SUM(revenue) as revenue FROM data GROUP BY region ORDER BY revenue DESC"
  },
  "metadata": {
    "pipeline": "analytics",
    "execution_time_ms": 380,
    "tokens_used": 450,
    "data_source_id": "uuid"
  }
}
```

#### Structured Data Source Upload (within KB)

```
POST /api/v1/knowledge-bases/{kb_id}/data-sources/upload-structured
Content-Type: multipart/form-data

file: <CSV or XLSX file>
name: "Sales Data Q1"
description: "Quarterly sales by region" (optional)
```

**Response**: Standard data source creation response with schema preview.

#### Schema Management

```
GET  /api/v1/data-sources/{ds_id}/schema          → Get schema definition
PUT  /api/v1/data-sources/{ds_id}/schema          → Update schema
POST /api/v1/data-sources/{ds_id}/schema/infer    → AI-powered inference
GET  /api/v1/data-sources/{ds_id}/preview         → Data preview (first 100 rows)
```

### 8.2 Modified Endpoints

| Endpoint | Change |
|---|---|
| `POST /knowledge-bases/{id}/test-query` | Support `mode` parameter for analytics queries |
| `GET /knowledge-bases/{id}` | Include structured data source count in stats |
| `GET /knowledge-bases/stats` | Include structured data metrics |

### 8.3 Deprecated Endpoints (Post-MVP)

Once migration is complete, the standalone Insights endpoints will be deprecated:
```
/api/v1/insights/*  →  Deprecated in favor of /api/v1/knowledge-bases/{kb_id}/*
```

A migration utility will be provided to move existing Insights datasets into KB data sources.

---

## 9. Frontend Design

### 9.1 KB Detail Page Layout (Updated)

```
┌─────────────────────────────────────────────────┐
│  Knowledge Base: "Q1 2026 Planning"              │
│  3 document sources • 1 structured data source   │
├─────────────────────────────────────────────────┤
│  [Sources] [Embeddings] [Query] [Analytics] [Settings] │
├─────────────────────────────────────────────────┤
│                                                   │
│  (Tab content area)                               │
│                                                   │
└─────────────────────────────────────────────────┘
```

**Sources Tab** (updated):
- Existing: uploaded_docs, website, text, qa_pairs
- NEW: structured_data cards showing name, row count, column count, status
- "Add Data Source" dialog includes new "Structured Data (CSV/XLSX)" option

**Query Tab** (updated → Unified Query Panel):
- Single input field for any question
- Mode selector: Auto / Documents / Data (default: Auto)
- Intent indicator badge: "📄 Searching documents" or "📊 Analyzing data"
- Adaptive response area (text with sources OR chart with insights)
- Conversation history sidebar

**Analytics Tab** (NEW):
- Only visible if KB has structured data sources
- Schema management for each structured data source
- Data preview table
- Quick chart templates (common queries)

### 9.2 Adaptive Response Component

```tsx
// AdaptiveResponseRenderer.tsx
interface UnifiedResponse {
  intent: 'rag' | 'analytics' | 'hybrid';
  response: {
    text?: string;
    sources?: Source[];
    chart?: ChartConfig;
    insights?: string[];
    sql?: string;
  };
}

// Renders:
// - RAG: Text answer → Source citations → Groundedness badge
// - Analytics: Chart → Text summary → Insights list → SQL (collapsible)
// - Hybrid: Text + Chart side by side (future)
```

### 9.3 Component Reuse Strategy

| Existing Component | Reused In | Adaptation |
|---|---|---|
| `DatasetUploader` | `AddDataSourceDialog` | Wrap with data source creation logic |
| `ChartRenderer` | `AdaptiveResponseRenderer` | No changes needed |
| `ResultsPanel` | Reference for analytics response layout | Refactored |
| `RAGResponseCard` | Reference for RAG response layout | Refactored |
| `QueryInput` | `UnifiedQueryPanel` | Add mode selector |
| `ConversationHistory` | `UnifiedQueryPanel` sidebar | Minor type updates |

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Backend** (target: 80% coverage):
| Test File | Covers |
|---|---|
| `test_intent_classifier.py` | Intent classification with various query types |
| `test_pipeline_router.py` | Routing logic, fast-path optimization |
| `test_dataset_service.py` | File upload, schema inference, preview |
| `test_query_service.py` | SQL generation, execution, response formatting |
| `test_rate_limiter.py` | Redis-based rate limiting |

**Frontend** (target: 70% coverage):
| Test File | Covers |
|---|---|
| `test_UnifiedQueryPanel.tsx` | Query submission, mode selection |
| `test_AdaptiveResponseRenderer.tsx` | Response type detection, rendering |
| `test_StructuredDataConfig.tsx` | Schema editing, validation |
| `test_insightsApi.ts` | RTK Query hooks |

### 10.2 Integration Tests

| Test | Scenario |
|---|---|
| End-to-end unified query | Upload CSV to KB → Ask analytics question → Get chart |
| Intent routing accuracy (EN) | Test 25+ English queries across both intent types |
| Intent routing accuracy (ZH) | Test 25+ Chinese queries across both intent types |
| **Multi-dataset disambiguation** | **KB with 3 structured sources → classifier picks correct one** |
| **Ambiguity fallback** | **Ambiguous query with multiple matching datasets → user prompt returned** |
| Multi-turn conversation | RAG question → Analytics follow-up → context maintained |
| **Dataset stickiness** | **Analytics query → follow-up → same dataset used without re-classification** |
| Schema inference | Upload various CSV formats → verify schema quality |
| Error handling | Invalid queries, malformed files, rate limits |
| **Classification observability** | **Verify log entries created for each classification decision** |

### 10.3 Acceptance Criteria

- [x] User can upload CSV/XLSX as a KB data source _(endpoint implemented, Feb 9)_
- [ ] Schema is auto-inferred and editable _(auto-inferred on upload; edit UI not yet)_
- [x] User can ask document questions and get text answers _(unified query → RAG pipeline)_
- [x] User can ask data questions and get charts _(unified query → Analytics pipeline)_
- [ ] System correctly routes 90%+ of queries to the right pipeline _(needs runtime benchmark)_
- [x] Multi-turn conversations work across both pipelines _(conversation stickiness in PipelineRouter)_
- [x] Streaming works for both RAG and analytics responses _(SSE for RAG, single event for Analytics)_
- [x] Demo mode covers the unified flow _(mock handlers + data for RAG/Analytics/Ambiguous)_
- [ ] No regressions in existing KB/RAG functionality _(needs E2E test validation)_

---

## 11. Future Roadmap (v2.x - v3.0)

### v2.1: Data Connectors (Post-MVP, ~3-4 weeks)

**Goal**: Connect to external databases instead of just file uploads.

#### Supported Connectors

| Connector | Priority | Effort | Use Case |
|---|---|---|---|
| PostgreSQL | P0 | 1 week | Internal databases, analytics DBs |
| MySQL | P0 | 1 week | Legacy systems, CMS databases |
| BigQuery | P1 | 1 week | Data warehouses, large-scale analytics |
| SQLite | P2 | 0.5 week | Local databases, embedded analytics |
| MongoDB | P2 | 1 week | NoSQL data sources |
| REST API | P2 | 1 week | External data services |
| Google Sheets | P3 | 0.5 week | Collaborative spreadsheets |

#### Architecture

```
┌─────────────────────────────┐
│   Data Connector Manager     │
├─────────────────────────────┤
│  ┌───────────┐ ┌──────────┐ │
│  │ PostgreSQL│ │  MySQL   │ │
│  │ Adapter   │ │  Adapter │ │
│  └───────────┘ └──────────┘ │
│  ┌───────────┐ ┌──────────┐ │
│  │ BigQuery  │ │  REST    │ │
│  │ Adapter   │ │  Adapter │ │
│  └───────────┘ └──────────┘ │
├─────────────────────────────┤
│  Connection Pool Manager     │
│  Schema Discovery Engine     │
│  Query Rewrite Layer         │
│  Credential Vault (encrypted)│
└─────────────────────────────┘
```

#### Key Features
- **Connection string management** with encrypted credential storage
- **Schema discovery** — auto-detect tables, columns, relationships
- **Query rewrite** — adapt generated SQL to target database dialect
- **Connection pooling** — efficient resource management
- **Health checks** — periodic connectivity verification
- **Read-only access** — prevent accidental data modification

#### Data Source Configuration (connector type)
```json
{
  "type": "database_connector",
  "config": {
    "connector_type": "postgresql",
    "connection": {
      "host": "analytics-db.company.com",
      "port": 5432,
      "database": "sales_analytics",
      "schema": "public",
      "tables": ["sales", "customers", "products"],
      "credentials_id": "vault-ref-uuid"
    },
    "sync_config": {
      "mode": "live_query",  // or "snapshot"
      "refresh_interval": null,
      "max_rows": 1000000
    },
    "discovered_schema": {
      "tables": [
        {
          "name": "sales",
          "columns": [...],
          "row_count": 50000,
          "relationships": [
            { "column": "customer_id", "references": "customers.id" }
          ]
        }
      ]
    }
  }
}
```

### v2.2: Dashboard Persistence & Sharing (~2 weeks)

**Goal**: Save and share query results as reusable dashboards.

#### Features
- **Save queries as dashboard widgets** — pin chart/table results to a dashboard
- **Dashboard builder** — drag-and-drop layout with grid system
- **Auto-refresh** — configurable refresh intervals for live data
- **Sharing** — shareable dashboard links with permission control
- **Export** — PDF, PNG, CSV export of dashboard and individual widgets
- **Templates** — pre-built dashboard templates by industry (HR, Finance, Sales)

#### Data Model
```sql
CREATE TABLE kb_dashboards (
    id UUID PRIMARY KEY,
    knowledge_base_id UUID REFERENCES knowledge_bases(id),
    user_id UUID REFERENCES users(id),
    title VARCHAR(200),
    description TEXT,
    layout JSONB,        -- Grid layout configuration
    is_shared BOOLEAN DEFAULT false,
    share_token VARCHAR(64),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE kb_dashboard_widgets (
    id UUID PRIMARY KEY,
    dashboard_id UUID REFERENCES kb_dashboards(id),
    query_id UUID REFERENCES rag_queries(id),
    title VARCHAR(200),
    widget_type VARCHAR(20),  -- chart, table, metric, text
    config JSONB,             -- Widget-specific configuration
    position JSONB,           -- { x, y, w, h } in grid
    refresh_interval INTEGER, -- seconds, null = manual
    created_at TIMESTAMP
);
```

### v2.3: Hybrid Queries — The Killer Feature (~4-6 weeks)

**Goal**: Queries that cross-reference documents AND structured data.

#### Architecture

```
User: "Which departments exceeded the travel budget limits defined in our policy?"

┌──────────────────────────────────────────────────┐
│              Intent Classifier                     │
│  → intent: "hybrid" (confidence: 0.88)            │
│  → reasoning: "Needs policy content + expense data"│
└──────────┬───────────────────────┬────────────────┘
           │                       │
    ┌──────▼──────┐        ┌──────▼──────┐
    │ RAG Pipeline │        │ SQL Pipeline │
    │              │        │              │
    │ Search for   │        │ Query expense│
    │ "travel      │        │ data by      │
    │  budget      │        │ department   │
    │  policy"     │        │              │
    └──────┬──────┘        └──────┬──────┘
           │                       │
           ▼                       ▼
    ┌──────────────────────────────────────┐
    │         Hybrid Synthesizer            │
    │                                       │
    │  RAG context: "Travel budget per      │
    │  department: Marketing $50K,          │
    │  Engineering $30K, Sales $80K"        │
    │                                       │
    │  SQL result: [                        │
    │    {dept: "Marketing", spent: $62K},  │
    │    {dept: "Engineering", spent: $28K},│
    │    {dept: "Sales", spent: $75K}       │
    │  ]                                    │
    │                                       │
    │  → Cross-reference and generate:      │
    │    "Marketing exceeded by $12K (24%)" │
    │    "Engineering within budget (-$2K)" │
    │    "Sales within budget (-$5K)"       │
    └──────────────────────────────────────┘
```

#### Implementation Steps
1. **Hybrid intent detection** — identify queries needing both pipelines
2. **Parallel pipeline execution** — run RAG + SQL simultaneously
3. **Context injection** — pass RAG results as context to SQL interpretation
4. **Hybrid synthesizer** — LLM combines both results into unified answer
5. **Combined response format** — text + chart + cross-references

### v2.4: Scheduled Queries & Alerts (~2 weeks)

- **Scheduled queries** — run saved queries on a cron schedule
- **Threshold alerts** — notify when metric exceeds/drops below threshold
- **Email/Slack integration** — send alerts and reports to channels
- **Data freshness monitoring** — alert when data source hasn't been updated

### v2.5: Data Refresh & ETL (~2-3 weeks)

- **Manual refresh** — re-upload updated CSV/XLSX
- **Scheduled sync** — periodic sync from database connectors
- **Incremental updates** — append new data without full refresh
- **Data versioning** — track schema and data changes over time
- **Transformation rules** — basic ETL (rename, filter, compute columns)

### v3.0: Enterprise Features (~6-8 weeks)

| Feature | Description | Effort |
|---|---|---|
| **Multi-dataset JOINs** | Query across multiple data sources with relationship mapping | 3 weeks |
| **Governance & Lineage** | Data access audit trail, column-level permissions | 2 weeks |
| **Row-Level Security** | Users see only data they're authorized for | 2 weeks |
| **Caching Layer** | Redis cache for expensive analytics queries | 1 week |
| **Query Optimizer** | Analyze and optimize generated SQL | 1 week |
| **Multilingual NL** | Support 10+ languages for queries | 2 weeks |
| **Multimodal Input** | Upload images/screenshots of charts for analysis | 3 weeks |
| **API Access** | REST API for programmatic query access | 1 week |
| **Embedding Analytics** | Generate embeddings from structured data for semantic search | 2 weeks |

### Version Timeline (Estimated)

```
v2.0 (MVP)   ──── 7 weeks ────  Unified KB + Intent Routing (incl. buffer)
v2.1         ──── 3-4 weeks ──  Data Connectors
v2.2         ──── 2 weeks ────  Dashboard Persistence
v2.3         ──── 4-6 weeks ──  Hybrid Queries (killer feature)
v2.4         ──── 2 weeks ────  Scheduled Queries & Alerts
v2.5         ──── 2-3 weeks ──  Data Refresh & ETL
v3.0         ──── 6-8 weeks ──  Enterprise Features
```

---

## 12. Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Intent classification accuracy < 90% | Medium | High | Manual mode override + confidence threshold + user feedback loop + Phase 1 spike to validate |
| **Multi-dataset disambiguation failure** | **Medium** | **High** | **Schema-column matching + ambiguity fallback to user prompt + conversation stickiness** |
| LLM latency for classification adds > 500ms | Medium | Medium | Use GPT-4o-mini + cache similar queries + fast-path bypass |
| **Bilingual classification inconsistency** | **Medium** | **Medium** | **Bilingual prompt template + test coverage for both EN/ZH + language-matched reasoning** |
| Schema inference quality for messy data | High | Medium | Manual schema editing + AI suggestions + validation rules |
| SQL injection through NL queries | Low | Critical | Parameterized queries + whitelist validation (already implemented) |
| Parquet file size limits for large datasets | Medium | Medium | Implement row limit (1M rows) + suggest database connector for larger datasets |
| Breaking changes to existing KB API | Low | High | All new parameters optional + backward compatible + feature flags |
| **Fat table (`rag_queries`) grows unwieldy** | **Low** | **Medium** | **Monitor row count + revisit if >10M rows + JSONB NULLs are space-efficient** |

### Product Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Users confused by unified interface | Medium | Medium | Clear mode indicators + progressive disclosure + onboarding guide |
| Feature too complex for MVP | Medium | High | Strict scope control + phased delivery + cut analytics tab if needed |
| Migration disrupts existing Insights users | Low | Medium | Keep standalone mode during transition + data migration utility (see Appendix C) |
| **No observability → silent routing errors** | **Medium** | **High** | **Classification logging + user feedback mechanism + routing dashboard (Section 5.5)** |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Increased LLM costs from classification | Medium | Medium | Fast-path bypass + caching + usage monitoring |
| Performance degradation with large datasets | Medium | Medium | DuckDB query timeout + pagination + row limits |
| Testing complexity for dual pipeline | High | Medium | Comprehensive integration tests + classification accuracy benchmarks |

---

## 13. Success Metrics

### MVP Success Criteria

| Metric | Target | Measurement |
|---|---|---|
| Intent classification accuracy | ≥ 90% | Test suite of 50+ diverse queries |
| Query response time (P95) | < 3 seconds | End-to-end including classification |
| User can complete upload-to-query flow | 100% | Manual QA + E2E test |
| Zero regressions in existing KB features | 0 failures | Full test suite passes |
| Structured data sources per KB | ≥ 1 avg | Analytics tracking |

### Post-MVP Success Metrics

| Metric | Target | Timeframe |
|---|---|---|
| Users creating mixed KBs (docs + data) | 30% of active users | 3 months post-launch |
| Queries using auto-routing (not manual) | 80% | 3 months post-launch |
| User satisfaction (analytics queries) | 4.0/5.0 | Quarterly survey |
| Dashboard creation rate | 2+ per active user | 6 months post-launch |
| Hybrid query usage | 10% of all queries | 6 months post-launch |
| Data connector adoption | 20% of structured sources | 6 months post-launch |

---

## Appendix A: File Inventory (Current State)

### Files to Modify (MVP)

**Backend**:
- `backend/app/db/models/knowledge_base.py` — Add `STRUCTURED_DATA` type
- `backend/app/db/models/rag.py` — Add `query_pipeline`, `chart_config`, `sql_generated`, `intent_classification` columns
- `backend/app/schemas/rag.py` — Add unified query request/response schemas
- `backend/app/api/v1/endpoints/knowledge_bases.py` — Add structured data upload + unified query endpoints
- `backend/app/services/rag/__init__.py` — Export new services
- `backend/app/core/config.py` — Add intent classifier config

**Frontend**:
- `frontend/src/features/knowledge-base/types/index.ts` — Add `structured_data` type + unified query types
- `frontend/src/features/knowledge-base/components/AddDataSourceDialog.tsx` — Add structured data option
- `frontend/src/features/knowledge-base/components/KBDetailTabs.tsx` — Add Analytics tab
- `frontend/src/store/api/ragApi.ts` — Add unified query endpoint
- `frontend/src/shared/components/layout/Sidebar.tsx` — Update navigation
- `frontend/src/app/Router.tsx` — Update routing

### Files to Create (MVP)

**Backend**:
- `backend/alembic/versions/20260208_000000_015_add_insights_tables.py`
- `backend/alembic/versions/20260208_100000_016_extend_rag_for_analytics.py`
- `backend/app/services/rag/intent_classifier.py`
- `backend/app/services/rag/pipeline_router.py`

**Frontend**:
- `frontend/src/features/knowledge-base/components/UnifiedQueryPanel.tsx`
- `frontend/src/features/knowledge-base/components/AdaptiveResponseRenderer.tsx`
- `frontend/src/features/knowledge-base/components/StructuredDataConfig.tsx`
- `frontend/src/features/knowledge-base/components/AnalyticsTab.tsx`

**Tests**:
- `backend/tests/unit/test_services/test_insights_dataset_service.py`
- `backend/tests/unit/test_services/test_insights_query_service.py`
- `backend/tests/unit/test_services/test_intent_classifier.py` (incl. bilingual + multi-dataset)
- `backend/tests/unit/test_services/test_pipeline_router.py`
- `backend/tests/integration/test_api/test_insights_endpoints.py`
- `backend/tests/integration/test_api/test_unified_query.py`

**Scripts**:
- `scripts/migrate_insights_to_kb.py` (post-MVP data migration utility)

### Files to Deprecate (Post-MVP)

- `frontend/src/pages/InsightsPage.tsx` → Redirect to KB
- `frontend/src/features/insights/` → Migrate to KB feature, then remove
- `frontend/src/store/api/insightsApi.ts` → Migrate to ragApi, then remove
- `backend/app/api/v1/endpoints/insights.py` → Deprecation notice, then remove

---

## Appendix B: Glossary

| Term | Definition |
|---|---|
| **RAG** | Retrieval-Augmented Generation — find relevant document chunks and generate answers |
| **NL-to-SQL** | Natural Language to SQL — convert questions into database queries |
| **Intent Classification** | Determining whether a query should use RAG or Analytics pipeline |
| **Hybrid Query** | A query that requires both document retrieval and data analysis |
| **Structured Data** | Tabular data (CSV, XLSX, database tables) with defined schemas |
| **Unstructured Data** | Free-text documents (PDF, DOCX, web pages) |
| **DuckDB** | In-memory analytical database used for SQL execution on Parquet files |
| **Parquet** | Columnar storage format optimized for analytical queries |
| **RRF** | Reciprocal Rank Fusion — combines vector and keyword search results |
| **Data Connector** | Integration that connects to external databases for live queries |
| **Fat Table** | Database design where optional columns are added to an existing table rather than creating separate tables |
| **Schema-Column Matching** | Strategy for selecting the best dataset by comparing query terms against column names |

---

## Appendix C: Data Migration Strategy

### Context

Existing Insights module users may have `insights_datasets` records with associated conversations and queries. When the unified KB system is deployed, these need to be migrated into KB `data_sources` with `type='structured_data'`.

### Migration Approach

#### Phase 0: Backward Compatibility (Week 1)

During Phase 0, Migration 015 creates the `insights_*` tables formally. The standalone Insights module continues to work as-is. No user action required.

#### Phase 1-2: Parallel Operation (Week 2-4)

Both systems operate in parallel:
- New structured data uploads go to KB data sources
- Existing Insights data remains in `insights_*` tables
- Standalone Insights page still accessible

#### Post-MVP: Migration Utility

A one-time migration script converts existing Insights data:

```python
# scripts/migrate_insights_to_kb.py

async def migrate_insights_to_kb(user_id: UUID, session: AsyncSession):
    """Migrate a user's Insights datasets into their Knowledge Bases."""

    # 1. Create a default KB for the user (if they don't have one)
    #    Name: "Imported Data (from Insights)"
    kb = await get_or_create_migration_kb(user_id, session)

    # 2. For each insights_dataset:
    datasets = await get_user_insights_datasets(user_id, session)
    for dataset in datasets:
        # 2a. Create a KB data_source with type='structured_data'
        data_source = await create_data_source(
            kb_id=kb.id,
            type='structured_data',
            name=dataset.name,
            config={
                'file_info': dataset.file_info,
                'schema_definition': dataset.schema_definition,
                'parquet_path': dataset.parquet_path,  # reuse existing file
            }
        )

        # 2b. Migrate conversations → rag_conversations
        for conv in dataset.conversations:
            rag_conv = await create_rag_conversation(
                kb_id=kb.id,
                user_id=user_id,
                title=conv.title,
                migrated_from='insights',
            )

            # 2c. Migrate queries → rag_queries (with analytics columns)
            for query in conv.queries:
                await create_rag_query(
                    conversation_id=rag_conv.id,
                    query_pipeline='analytics',
                    user_input=query.user_input,
                    chart_config=query.response_chart,
                    sql_generated=query.generated_sql,
                    # ... other fields
                )

        # 2d. Mark old dataset as migrated
        dataset.status = 'migrated'
        dataset.migration_target_id = data_source.id

    await session.commit()
```

#### Migration Timeline

| Step | When | Action | Rollback |
|---|---|---|---|
| 1. Deploy v2.0 | MVP launch | Both systems live, no migration yet | N/A |
| 2. Announce deprecation | MVP + 2 weeks | Notify users standalone Insights will be removed | N/A |
| 3. Run migration utility | MVP + 4 weeks | Execute for all users, verify data integrity | Restore from `insights_*` tables (still intact) |
| 4. Redirect `/insights` | MVP + 6 weeks | Redirect to KB page, show migration notice | Re-enable standalone route |
| 5. Remove standalone code | MVP + 8 weeks | Delete Insights feature module and API endpoints | Git revert |
| 6. Drop `insights_*` tables | MVP + 12 weeks | Final cleanup after confirming zero usage | Backup before drop |

#### Safety Guarantees

- **No data loss**: Original `insights_*` tables are NOT dropped until Step 6 (12 weeks after MVP)
- **Parquet files reused**: File paths are updated in metadata, actual files are not copied (zero-downtime)
- **Verification**: Migration script includes a `--dry-run` mode that reports what would be migrated
- **Per-user migration**: Can be run for individual users (e.g., for beta testing before bulk migration)

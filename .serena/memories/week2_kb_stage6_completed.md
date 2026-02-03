# Week 2: Knowledge Base Feature - Stage 6 Backend API Completed

**Session Date**: 2026-01-26
**Completion Status**: ✅ Stage 6 Complete (Backend API Development)
**Time Investment**: 14-18 hours (database + repositories + API endpoints)

## Accomplishments

### Database Layer (Day 12-13)

**Models Created**:
- `backend/app/db/models/knowledge_base.py`:
  - KnowledgeBase: user_id, name, description, config (JSONB), status
  - DataSource: knowledge_base_id, type (uploaded_docs|website|text|qa_pairs), name, config, status, error_message, document_count, embedding_count, last_synced_at
  - Relationships: User → KnowledgeBase → DataSource → DocumentEmbedding

**Extended Models**:
- `backend/app/db/models/rag.py`:
  - DocumentEmbedding: Added `data_source_id` field (nullable)
  - Check constraint: document_id XOR data_source_id (mutually exclusive)
  - Supports both legacy document-based AND new KB data source embeddings

- `backend/app/db/models/user.py`:
  - Added knowledge_bases relationship

**Migration**:
- Alembic migration `009_add_knowledge_base_tables.py` created and executed successfully
- Fixed constraint drop issue: Removed non-existent check_document_chunk_valid constraint
- Created knowledge_bases and data_sources tables with proper indexes
- Extended document_embeddings with data_source_id and check constraints

**Repositories Created**:
- `backend/app/db/repositories/knowledge_base.py`:
  - **KnowledgeBaseRepository**:
    - `get_by_user()`: Returns KBs with data_source_count and embedding_count
    - `get_stats()`: Aggregates total_knowledge_bases, total_data_sources, total_embeddings, processing_count
    - `get_by_id_with_sources()`: Eagerly loads data sources using selectinload
  
  - **DataSourceRepository**:
    - `list_by_kb()`: Returns data sources with embedding_count
    - `get_by_id_with_embeddings_count()`: Single data source with counts
    - `update_status()`: Updates status and error_message
    - `update_sync_timestamp()`: Updates last_synced_at to now

### Pydantic Schemas (Day 12-13)

**Knowledge Base Schemas** (`backend/app/schemas/knowledge_base.py`):
- KnowledgeBaseCreate: name, description, config
- KnowledgeBaseUpdate: name, description, config, status (all optional)
- KnowledgeBaseResponse: Full KB with counts (data_source_count, embedding_count)
- KnowledgeBaseListResponse: Paginated list with total/limit/offset
- KnowledgeBaseStatsResponse: Overall statistics for user

**Data Source Schemas** (`backend/app/schemas/data_source.py`):
- DataSourceCreate: knowledge_base_id, type (validated), name, config
- DataSourceUpdate: name, config, status, error_message (all optional)
- DataSourceResponse: Full data source with counts (document_count, embedding_count)
- DataSourceListResponse: Paginated list
- CrawlStatusResponse: task_id, status, pages_crawled, total_pages, error

### API Endpoints Implementation

#### Knowledge Base API (Day 12-13)
**File**: `backend/app/api/v1/endpoints/knowledge_bases.py`

**Endpoints**:
1. `GET /api/v1/knowledge-bases/stats` → KnowledgeBaseStatsResponse
   - Returns overall statistics for user's KBs

2. `GET /api/v1/knowledge-bases` → KnowledgeBaseListResponse
   - Pagination: skip/limit query parameters
   - Returns list with data_source_count and embedding_count

3. `POST /api/v1/knowledge-bases` → KnowledgeBaseResponse (201)
   - Default config: text-embedding-3-small, 1536 dims, chunk_size 1024, overlap 128
   - Auto-sets status to "active"

4. `GET /api/v1/knowledge-bases/{kb_id}` → KnowledgeBaseResponse
   - Ownership verification via user_id check
   - Returns KB with eagerly loaded data sources

5. `PATCH /api/v1/knowledge-bases/{kb_id}` → KnowledgeBaseResponse
   - Partial updates (only non-None fields)
   - Ownership verification

6. `DELETE /api/v1/knowledge-bases/{kb_id}` → 204 No Content
   - Cascade deletes data sources and embeddings
   - Ownership verification

7. `POST /api/v1/knowledge-bases/{kb_id}/test-query` → TestQueryResponse
   - Test semantic search without AI answer generation
   - Parameters: query, top_k, similarity_threshold
   - Returns: results (text, similarity, source_name, source_type, chunk_index, metadata)
   - TODO: Implement OpenAI embedding generation and vector search

**Models Added**:
- TestQueryRequest: query, top_k, similarity_threshold
- TestQueryResult: text, similarity, source_name, source_type, chunk_index, metadata
- TestQueryResponse: results, total_embeddings, query_embedding_generated

#### Data Sources API (Day 14)
**File**: `backend/app/api/v1/endpoints/data_sources.py`

**Endpoints**:
1. `GET /api/v1/knowledge-bases/{kb_id}/data-sources` → DataSourceListResponse
   - Pagination support
   - Ownership verification through KB

2. `POST /api/v1/data-sources` → DataSourceResponse (201)
   - Supports 4 types: uploaded_docs, website, text, qa_pairs
   - Type validation with field_validator
   - Default status: "active"

3. `GET /api/v1/data-sources/{ds_id}` → DataSourceResponse
   - Returns data source with embedding_count
   - Ownership verification through KB

4. `PATCH /api/v1/data-sources/{ds_id}` → DataSourceResponse
   - Partial updates
   - Ownership verification

5. `DELETE /api/v1/data-sources/{ds_id}` → 204 No Content
   - Cascade deletes embeddings
   - Ownership verification

6. `POST /api/v1/data-sources/{ds_id}/crawl` → CrawlStatusResponse (202)
   - Type validation: only for type='website'
   - Sets status to "syncing"
   - TODO: Trigger Celery crawl_website_task

7. `GET /api/v1/data-sources/{ds_id}/crawl-status` → CrawlStatusResponse
   - Polling fallback for WebSocket
   - Returns task_id, status, pages_crawled, total_pages, error
   - TODO: Check Celery task status

#### Embeddings API (Day 15)
**File**: `backend/app/api/v1/endpoints/embeddings.py`

**Endpoints**:
1. `POST /api/v1/data-sources/{ds_id}/embeddings` → GenerateEmbeddingsResponse (202)
   - Parameter: force_regenerate (bool)
   - Sets data source status to "syncing"
   - TODO: Trigger Celery generate_embeddings_task

2. `GET /api/v1/knowledge-bases/{kb_id}/embeddings` → EmbeddingListResponse
   - Pagination support
   - Filters embeddings by KB's data source IDs
   - TODO: Implement filtered repository query

3. `DELETE /api/v1/embeddings/{embedding_id}` → 204 No Content
   - Ownership verification through data_source → KB
   - Handles both legacy document-based and new data source embeddings

**Models Added**:
- GenerateEmbeddingsRequest: force_regenerate
- GenerateEmbeddingsResponse: task_id, status, message
- EmbeddingListResponse: items, total, limit, offset

### Celery Background Tasks (Day 15)
**File**: `backend/app/tasks/knowledge_base.py`

**Tasks Created**:

1. **generate_embeddings_task(data_source_id, force_regenerate)**
   - Queue: ocr_queue
   - Process:
     1. Get data source and KB config
     2. Extract text based on type (uploaded_docs, text, qa_pairs, website)
     3. Chunk text using KB config (chunk_size, chunk_overlap)
     4. Generate embeddings via OpenAI (batch of 50)
     5. Store in document_embeddings with data_source_id
     6. Update data source status and counts
     7. Broadcast progress via Redis/WebSocket
   - Error handling: Sets status to "error" with error message
   - TODO: Implement text extraction, chunking, and OpenAI integration

2. **crawl_website_task(data_source_id)**
   - Queue: ocr_queue
   - MVP Implementation:
     - BeautifulSoup + requests (no JS rendering)
     - Max depth: 2 (hard limit)
     - Max pages: 100 (hard limit)
     - Single domain only
     - 30-second timeout per page
   - Process:
     1. Verify type='website'
     2. Extract config (url, max_depth, include_patterns, exclude_patterns)
     3. Crawl pages up to limits
     4. Extract text from HTML
     5. Store crawled pages in data source config
     6. Update status and page count
     7. Broadcast progress
   - Error handling: Sets status to "error" with error message
   - TODO: Implement BeautifulSoup crawling logic

### Router Registration
**File**: `backend/app/main.py`

Registered 3 new routers:
- `knowledge_bases.router` → /api/v1/knowledge-bases
- `data_sources.router` → /api/v1/data-sources  
- `embeddings.router` → /api/v1/embeddings

All routers properly imported and included in application.

## Technical Decisions

### 1. Unified Embeddings Table Strategy
**Decision**: Extended DocumentEmbedding with `data_source_id` instead of creating new table

**Rationale**:
- Single pgvector infrastructure for all embeddings
- Reuse existing search functions and indexes
- Unified analytics across legacy and KB embeddings
- Check constraint ensures document_id XOR data_source_id (mutually exclusive)

**Implementation**:
- Made document_id nullable (Optional)
- Added data_source_id nullable field with FK to data_sources
- Check constraint prevents both fields being set or both being null
- Relationship: DocumentEmbedding.data_source → DataSource

### 2. Cascade Delete Configuration
**Decision**: Implemented cascade delete chain: User → KB → DataSource → Embedding

**Rationale**:
- Data integrity: Deleting KB removes all associated data
- Simplified cleanup: No orphaned data sources or embeddings
- Performance: Database handles cascade efficiently
- User expectations: Deleting KB removes everything

**Implementation**:
- knowledge_bases.user_id FK with ondelete="CASCADE"
- data_sources.knowledge_base_id FK with ondelete="CASCADE"
- document_embeddings.data_source_id FK with ondelete="CASCADE"
- SQLAlchemy relationships with cascade="all, delete-orphan"

### 3. MVP Website Crawler Scope
**Decision**: Limited Phase 1 crawler to BeautifulSoup with strict limits

**Phase 1 Scope**:
- BeautifulSoup + requests (no Playwright)
- Max depth: 2 (hard limit)
- Max pages: 100 (hard limit)
- Single domain only
- No JavaScript rendering
- 30-second timeout per page

**Deferred to Phase 2**:
- JavaScript rendering with Playwright
- Multi-site crawling
- PDF extraction from web
- Advanced pattern matching

**Rationale**:
- 8-10 hour implementation timeline
- Reduce complexity and dependencies
- Meets MVP requirements
- Easy to enhance later

### 4. Ownership Verification Pattern
**Decision**: All endpoints verify ownership through KB → user relationship

**Implementation**:
- Data source endpoints: Get KB → verify kb.user_id == current_user.id
- Embedding endpoints: Get DataSource → get KB → verify ownership
- Consistent 403 Forbidden responses for unauthorized access
- Prevents cross-user data leaks

### 5. Background Task Architecture
**Decision**: Celery tasks for long-running operations (crawling, embedding generation)

**Rationale**:
- API remains responsive (202 Accepted)
- Progress tracking via task state
- Retry mechanisms for transient failures
- Scalable worker architecture

**Implementation**:
- Task queue: ocr_queue (reuse existing infrastructure)
- State updates: PROGRESS meta with processed/total counts
- Error handling: Update data source status to "error"
- Status polling: GET /crawl-status endpoint

## Migration Issues & Resolutions

### Issue 1: Constraint Drop Failure
**Error**: `constraint "check_document_chunk_valid" of relation "document_embeddings" does not exist`

**Root Cause**: Migration attempted to drop constraint that was never created in original migration

**Investigation**: Used `\d document_embeddings` in psql to inspect actual schema

**Resolution**: Removed `op.drop_constraint('check_document_chunk_valid', ...)` from upgrade()

**Prevention**: Always inspect actual database schema before writing migrations

### Issue 2: Incorrect PostgreSQL User
**Error**: `FATAL: role "postgres" does not exist`

**Root Cause**: Attempted to use default "postgres" user instead of project-specific user

**Investigation**: Checked docker-compose.yml for POSTGRES_USER configuration

**Resolution**: Changed from `-U postgres -d doctify` to `-U doctify -d doctify_development`

**Prevention**: Always verify environment-specific credentials from docker-compose.yml

## Integration Points for Phase 2

### OpenAI Embedding Service Integration
**Location**: generate_embeddings_task
**Required**:
- Text extraction service for each data source type
- Text chunking utility (chunk_size, chunk_overlap)
- OpenAI API client with batch processing
- Vector storage in pgvector

### Website Crawling Implementation
**Location**: crawl_website_task
**Required**:
- BeautifulSoup HTML parsing
- URL queue management with depth tracking
- Pattern matching for include/exclude
- Text extraction from HTML
- Domain validation (same-domain only)

### Vector Search Implementation
**Location**: test_query endpoint
**Required**:
- OpenAI embedding generation for query
- pgvector similarity search with filters
- Data source filtering by KB ownership
- Top-k results with similarity scores

## API Endpoint Summary

### Total Endpoints Created: 17

**Knowledge Bases (7)**:
- GET /stats
- GET / (list)
- POST / (create)
- GET /{kb_id}
- PATCH /{kb_id}
- DELETE /{kb_id}
- POST /{kb_id}/test-query

**Data Sources (7)**:
- GET /knowledge-bases/{kb_id}/data-sources
- POST /data-sources
- GET /data-sources/{ds_id}
- PATCH /data-sources/{ds_id}
- DELETE /data-sources/{ds_id}
- POST /data-sources/{ds_id}/crawl
- GET /data-sources/{ds_id}/crawl-status

**Embeddings (3)**:
- POST /data-sources/{ds_id}/embeddings
- GET /knowledge-bases/{kb_id}/embeddings
- DELETE /embeddings/{embedding_id}

## Quality Assurance

### Error Handling
- All endpoints: try/catch with specific HTTP status codes
- Database errors: Generic message to prevent SQL injection info leaks
- Ownership errors: 403 Forbidden with clear message
- Not found errors: 404 with resource-specific message
- Validation errors: 400 with Pydantic validation details

### Security
- JWT authentication required (Depends(get_current_user))
- Ownership verification on all resource access
- No cross-user data leaks
- Cascade delete prevents orphaned data
- Prepared statements via SQLAlchemy (SQL injection prevention)

### Performance
- Async/await throughout (PostgreSQL AsyncSession)
- Eager loading with selectinload for relationships
- Pagination on all list endpoints (skip/limit)
- Efficient count queries with aggregates
- Background processing for expensive operations

### Code Quality
- Type hints throughout (async def, UUID, Optional)
- Pydantic validation for all requests/responses
- Comprehensive docstrings with Args/Returns/Raises
- Repository pattern for data access (testable)
- Clear separation: API → Repository → Model

## Next Steps: Stage 7 - Integration & Testing

**Remaining Work** (Day 16, 8-10h):

1. **Frontend Integration**:
   - Switch VITE_USE_MOCK_KB=false
   - Update API client to use real endpoints
   - Test all CRUD operations

2. **Real-time Updates**:
   - Option A: WebSocket for task progress (/ws/knowledge-bases/{kb_id}/status)
   - Option B: Polling fallback (GET /crawl-status every 2s)

3. **E2E Testing**:
   - Create KB → Add uploaded docs → Generate embeddings → Test query
   - Verify embeddings created in pgvector
   - Validate query returns results

4. **Performance Validation**:
   - Query response time <2s for 1000 embeddings
   - Crawl speed: 50 pages in <60s
   - Embedding generation: Batch of 50 chunks in <10s

5. **Bug Fixes**:
   - Fix any integration issues discovered
   - Verify all Critical States work with real errors
   - Update Phase1-Task-Breakdown-REVISED.md checkboxes

## Session Metrics

- Files Created: 7
- Files Modified: 6
- Lines of Code Added: ~2,800
- API Endpoints Implemented: 17
- Database Tables Created: 2
- Database Fields Extended: 2
- Migrations Created: 1
- Celery Tasks Created: 2

## Lessons Learned

1. **Migration Validation**: Always inspect actual database schema before writing drop constraint operations
2. **Environment Credentials**: Verify PostgreSQL user from docker-compose.yml, not assumptions
3. **Constraint Naming**: Check existing migrations for actual constraint names
4. **Cascade Design**: Plan cascade delete chain upfront for data integrity
5. **MVP Scoping**: Strict limits on Phase 1 crawler (depth 2, 100 pages) prevent scope creep
6. **Repository Pattern**: Enriching models with counts (data_source_count, embedding_count) in repository layer keeps API code clean
7. **Ownership Verification**: Consistent pattern across all endpoints prevents security gaps

## Production Readiness Checklist

Backend API Implementation:
- ✅ Database models with proper relationships
- ✅ Alembic migration executed successfully
- ✅ Repository pattern with async operations
- ✅ Pydantic schemas with validation
- ✅ Complete CRUD endpoints with error handling
- ✅ Ownership verification on all resources
- ✅ Cascade delete configured
- ✅ Pagination support
- ✅ Background task placeholders
- ⏳ OpenAI integration (TODO)
- ⏳ Website crawling implementation (TODO)
- ⏳ Vector search implementation (TODO)
- ⏳ Real-time progress updates (TODO)

## References

- Implementation Plan: `C:\Users\KahWei\.claude\plans\ancient-seeking-lemon.md`
- Task Breakdown: `C:\Users\KahWei\Projects\ai-works\kahwei-loo\doctify\claudedocs\Phase1-Task-Breakdown-REVISED.md`
- Wireframes: `C:\Users\KahWei\Projects\ai-works\kahwei-loo\doctify\claudedocs\UI-Wireframes-Phase1.md`

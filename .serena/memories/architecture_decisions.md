# Architecture Decisions - Doctify Phase 1 Knowledge Base Feature

**Last Updated**: 2026-01-26

## Database Architecture Decisions

### Decision 1: Unified Embeddings Table with XOR Constraint
**Date**: 2026-01-26
**Context**: Need to support both legacy document-based embeddings AND new knowledge base data source embeddings

**Decision**: Extended DocumentEmbedding model with `data_source_id` instead of creating separate table

**Implementation**:
```python
# backend/app/db/models/rag.py
class DocumentEmbedding(BaseModel):
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), 
        nullable=True, index=True
    )
    data_source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="CASCADE"), 
        nullable=True, index=True
    )
    
    # Check constraint: Exactly one must be set
    __table_args__ = (
        CheckConstraint(
            "(document_id IS NOT NULL AND data_source_id IS NULL) OR "
            "(document_id IS NULL AND data_source_id IS NOT NULL)",
            name="check_embedding_source"
        ),
    )
```

**Rationale**:
- ✅ Single pgvector infrastructure for all embeddings
- ✅ Reuse existing search functions and HNSW indexes
- ✅ Unified analytics across legacy and KB embeddings
- ✅ Simpler schema maintenance (one table vs two)
- ✅ Easier migration path for future refactoring

**Trade-offs**:
- ⚠️ Nullable foreign keys (but enforced by check constraint)
- ⚠️ Requires application logic to populate correct field

**Alternatives Considered**:
- ❌ Separate `kb_embeddings` table: Would duplicate pgvector infrastructure
- ❌ Polymorphic table with type discriminator: More complex queries

**Status**: ✅ Implemented and validated

---

### Decision 2: Cascade Delete Chain for Data Integrity
**Date**: 2026-01-26
**Context**: User deletion should cleanly remove all associated knowledge base data

**Decision**: Implemented cascade delete chain: User → KnowledgeBase → DataSource → DocumentEmbedding

**Implementation**:
```python
# User → KnowledgeBase
class KnowledgeBase(BaseModel):
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )

# KnowledgeBase → DataSource
class DataSource(BaseModel):
    knowledge_base_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("knowledge_bases.id", ondelete="CASCADE")
    )

# DataSource → DocumentEmbedding
class DocumentEmbedding(BaseModel):
    data_source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="CASCADE")
    )

# SQLAlchemy relationships
knowledge_bases = relationship("KnowledgeBase", back_populates="user", 
                               cascade="all, delete-orphan")
data_sources = relationship("DataSource", back_populates="knowledge_base", 
                            cascade="all, delete-orphan")
embeddings = relationship("DocumentEmbedding", back_populates="data_source", 
                          cascade="all, delete-orphan")
```

**Rationale**:
- ✅ Data integrity: No orphaned data sources or embeddings
- ✅ Performance: Database handles cascade efficiently (single DELETE)
- ✅ User expectations: Deleting KB removes all associated data
- ✅ Simplified cleanup: No manual cascading in application code
- ✅ GDPR compliance: User deletion removes all personal data

**Trade-offs**:
- ⚠️ Irreversible: Deleted data cannot be recovered without backups
- ⚠️ Potential for accidental data loss if not careful

**Alternatives Considered**:
- ❌ Soft delete (status='deleted'): Complicates queries, orphaned data
- ❌ Manual cascade in application: Error-prone, performance issues
- ❌ Foreign keys without CASCADE: Leaves orphaned data

**Status**: ✅ Implemented and validated

---

## API Design Decisions

### Decision 3: Ownership Verification Through Relationship Chain
**Date**: 2026-01-26
**Context**: Need to verify user owns resources at different hierarchy levels

**Decision**: Consistent ownership verification pattern through KB → User relationship

**Implementation**:
```python
# Data source endpoints
async def get_data_source(ds_id: uuid.UUID, current_user: User, db: AsyncSession):
    ds = await ds_repo.get_by_id(ds_id)
    kb = await kb_repo.get_by_id(ds.knowledge_base_id)
    
    if not kb or kb.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

# Embedding endpoints
async def delete_embedding(embedding_id: uuid.UUID, current_user: User, db: AsyncSession):
    embedding = await embedding_repo.get_by_id(embedding_id)
    ds = await ds_repo.get_by_id(embedding.data_source_id)
    kb = await kb_repo.get_by_id(ds.knowledge_base_id)
    
    if not kb or kb.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
```

**Rationale**:
- ✅ Security: Prevents cross-user data access
- ✅ Consistency: Same pattern across all endpoints
- ✅ Simplicity: No complex multi-table joins in queries
- ✅ Clear authorization logic: Easy to audit and test

**Trade-offs**:
- ⚠️ Additional database queries (but async and cached)
- ⚠️ N+1 query potential (mitigated by selectinload)

**Alternatives Considered**:
- ❌ JOIN in single query: Complex, hard to maintain
- ❌ Authorization service: Over-engineering for Phase 1
- ❌ User-scoped queries: Difficult with nested resources

**Status**: ✅ Implemented across all endpoints

---

### Decision 4: Pagination-First for All List Endpoints
**Date**: 2026-01-26
**Context**: List endpoints could return large result sets

**Decision**: All list endpoints support skip/limit pagination from day one

**Implementation**:
```python
@router.get("/knowledge-bases")
async def list_knowledge_bases(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBaseListResponse:
    kbs = await kb_repo.get_by_user(user_id=current_user.id, skip=skip, limit=limit)
    total = await kb_repo.count({"user_id": current_user.id})
    
    return KnowledgeBaseListResponse(items=kbs, total=total, limit=limit, offset=skip)
```

**Rationale**:
- ✅ Performance: Prevents large result sets from overwhelming API
- ✅ UX: Enables infinite scroll and pagination in frontend
- ✅ Scalability: Works with 10 KBs or 10,000 KBs
- ✅ Standard pattern: Matches industry best practices

**Trade-offs**:
- ⚠️ Complexity: Requires total count query (but optimized)
- ⚠️ State management: Frontend must track current page

**Alternatives Considered**:
- ❌ Return all results: Performance issues with large datasets
- ❌ Cursor-based pagination: More complex, harder to implement page numbers
- ❌ No pagination: Not scalable

**Status**: ✅ Implemented on all list endpoints

---

## Background Processing Decisions

### Decision 5: Celery for Long-Running Operations
**Date**: 2026-01-26
**Context**: Website crawling and embedding generation can take minutes

**Decision**: Use Celery tasks with 202 Accepted pattern for async operations

**Implementation**:
```python
# API endpoint returns immediately
@router.post("/data-sources/{ds_id}/crawl")
async def trigger_crawl(ds_id: uuid.UUID, ...):
    await ds_repo.update_status(ds_id, "syncing")
    task = crawl_website_task.delay(str(ds_id))
    
    return CrawlStatusResponse(
        task_id=task.id,
        status="pending",
        pages_crawled=0
    )

# Celery task runs in background
@celery_app.task(bind=True, queue="ocr_queue")
async def crawl_website_task(self, data_source_id: str):
    # Crawl pages...
    self.update_state(state='PROGRESS', meta={'pages_crawled': 25, 'total_pages': 50})
    # Store results...
```

**Rationale**:
- ✅ API responsiveness: Returns 202 Accepted immediately
- ✅ Progress tracking: Task state updates via Celery
- ✅ Retry mechanisms: Celery handles transient failures
- ✅ Scalability: Add more workers for horizontal scaling
- ✅ User experience: Frontend can poll or use WebSocket for updates

**Trade-offs**:
- ⚠️ Infrastructure: Requires Redis and Celery workers
- ⚠️ Complexity: Async error handling more complex

**Alternatives Considered**:
- ❌ Synchronous processing: Would block API for minutes
- ❌ Threading: Not scalable, hard to monitor
- ❌ Serverless functions: Vendor lock-in, cold starts

**Status**: ✅ Implemented with placeholders for Phase 2

---

### Decision 6: MVP Website Crawler with Strict Limits
**Date**: 2026-01-26
**Context**: Need website crawling for Phase 1, but limited timeline (8-10h)

**Decision**: BeautifulSoup-based crawler with hard limits (depth 2, max 100 pages)

**Phase 1 Scope**:
- ✅ BeautifulSoup + requests (no Playwright)
- ✅ Max depth: 2 (hard limit)
- ✅ Max pages: 100 (hard limit)
- ✅ Single domain only
- ✅ No JavaScript rendering
- ✅ 30-second timeout per page

**Deferred to Phase 2**:
- ⏳ JavaScript rendering (Playwright)
- ⏳ Multi-site crawling
- ⏳ PDF extraction
- ⏳ Advanced pattern matching
- ⏳ Robots.txt compliance

**Rationale**:
- ✅ Time-boxed: Fits 8-10 hour implementation window
- ✅ MVP sufficient: Most documentation sites are static HTML
- ✅ Risk reduction: Avoids Playwright complexity
- ✅ Easy to enhance: Clear upgrade path to Phase 2

**Trade-offs**:
- ⚠️ Limited functionality: Cannot crawl SPAs or JavaScript-heavy sites
- ⚠️ Depth limit: May miss deeper content

**Alternatives Considered**:
- ❌ Playwright from day one: 20+ hours implementation
- ❌ No crawler: Defeats purpose of "website" data source
- ❌ Third-party API: Cost and vendor lock-in

**Status**: ✅ Implemented as placeholder in crawl_website_task

---

## Repository Pattern Decisions

### Decision 7: Repository-Level Count Enrichment
**Date**: 2026-01-26
**Context**: API responses need data_source_count and embedding_count

**Decision**: Enrich models with counts in repository layer, not API layer

**Implementation**:
```python
# Repository method
async def get_by_user(self, user_id: uuid.UUID) -> List[KnowledgeBase]:
    kbs = await self.session.execute(select(KnowledgeBase)...)
    
    for kb in kbs:
        # Enrich with counts
        kb.data_source_count = len(kb.data_sources)
        
        embedding_count_query = select(func.count(DocumentEmbedding.id)).where(...)
        embedding_result = await self.session.execute(embedding_count_query)
        kb.embedding_count = embedding_result.scalar() or 0
    
    return kbs
```

**Rationale**:
- ✅ Separation of concerns: Data access logic in repository
- ✅ Testability: Repository methods easily unit tested
- ✅ Reusability: Counts logic shared across endpoints
- ✅ Cleaner API layer: API focuses on HTTP concerns

**Trade-offs**:
- ⚠️ Additional queries: But optimized with eager loading
- ⚠️ Not true model attributes: Dynamically added (use getattr)

**Alternatives Considered**:
- ❌ Counts in API layer: Mixes data access with HTTP logic
- ❌ Separate count endpoints: More API calls from frontend
- ❌ Always join counts: Complex queries, performance issues

**Status**: ✅ Implemented in KnowledgeBaseRepository and DataSourceRepository

---

## Schema Design Decisions

### Decision 8: JSONB for Flexible Configuration
**Date**: 2026-01-26
**Context**: Different data source types need different configuration

**Decision**: Use PostgreSQL JSONB for KB config and data source config

**Implementation**:
```python
# Knowledge Base config
class KnowledgeBase(BaseModel):
    config: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    # Example: {"embedding_model": "text-embedding-3-small", "chunk_size": 1024, "chunk_overlap": 128}

# Data Source config (varies by type)
class DataSource(BaseModel):
    config: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    # uploaded_docs: {"files": [...]}
    # website: {"url": "...", "max_depth": 2, "include_patterns": [...]}
    # text: {"content": "..."}
    # qa_pairs: {"pairs": [{"question": "...", "answer": "..."}]}
```

**Rationale**:
- ✅ Flexibility: Each data source type has unique config
- ✅ Extensibility: Add new config fields without migration
- ✅ PostgreSQL native: JSONB is indexed and queryable
- ✅ Validation: Pydantic schemas validate structure at API layer

**Trade-offs**:
- ⚠️ No database-level validation: Rely on application validation
- ⚠️ Schema drift risk: Requires documentation of expected fields

**Alternatives Considered**:
- ❌ Separate tables per type: Complex schema, many tables
- ❌ EAV pattern: Query complexity, poor performance
- ❌ Text JSON: Not queryable, no indexing

**Status**: ✅ Implemented for both KnowledgeBase and DataSource

---

## Migration Strategy Decisions

### Decision 9: Migration Validation Before Execution
**Date**: 2026-01-26
**Context**: Attempted constraint drop on non-existent constraint caused migration failure

**Decision**: Always inspect actual database schema before writing constraint operations

**Process**:
1. Use `\d table_name` in psql to see actual constraints
2. Compare with previous migrations to verify constraint names
3. Write migration based on actual schema, not assumptions
4. Test migration on development database first

**Example Issue**:
```python
# Migration tried to drop constraint that didn't exist
op.drop_constraint('check_document_chunk_valid', 'document_embeddings')

# Error: constraint "check_document_chunk_valid" does not exist
# Investigation: Original migration created unique constraint, not check constraint

# Solution: Remove the drop constraint line
```

**Rationale**:
- ✅ Prevents migration failures in production
- ✅ Faster iteration: No rollback and retry cycles
- ✅ Accurate migrations: Based on reality, not assumptions

**Best Practices**:
1. Inspect schema: `docker-compose exec postgres psql -U doctify -d doctify_development -c "\d table_name"`
2. Check previous migrations: Verify constraint names in alembic/versions/
3. Test locally: Run migration on development database first
4. Validate: Check schema after migration to ensure correctness

**Status**: ✅ Established as standard practice

---

## Security Decisions

### Decision 10: Consistent 403 Forbidden for Ownership Violations
**Date**: 2026-01-26
**Context**: Need clear security posture for unauthorized resource access

**Decision**: Return 403 Forbidden (not 404) when user doesn't own resource

**Implementation**:
```python
# All endpoints follow this pattern
kb = await kb_repo.get_by_id(kb_id)

if not kb:
    raise HTTPException(status_code=404, detail="Knowledge base not found")

if kb.user_id != current_user.id:
    raise HTTPException(status_code=403, detail="Access denied")
```

**Rationale**:
- ✅ Security: Reveals existence of resource (but user knows ID already)
- ✅ UX: Clear error message ("Access denied" vs "Not found")
- ✅ Standards: RESTful best practice (403 for authorization failures)
- ✅ Debugging: Easier to diagnose permission issues

**Trade-offs**:
- ⚠️ Information leakage: Confirms resource exists (acceptable trade-off)

**Alternatives Considered**:
- ❌ Return 404 for both: Confusing UX, harder to debug
- ❌ Return 401: Incorrect semantics (user is authenticated)

**Status**: ✅ Implemented across all endpoints

---

## Summary

### Key Architectural Patterns

1. **Unified Embeddings Table**: Single table with XOR constraint for document_id/data_source_id
2. **Cascade Delete Chain**: User → KB → DataSource → Embedding
3. **Repository-Level Enrichment**: Counts and relationships in repository, not API
4. **Pagination-First**: All list endpoints support skip/limit from day one
5. **Background Processing**: Celery for long-running operations (crawling, embeddings)
6. **Ownership Verification**: Consistent pattern through KB → User relationship
7. **JSONB Configuration**: Flexible config for different data source types
8. **MVP Scoping**: BeautifulSoup crawler with strict limits (depth 2, 100 pages)
9. **Migration Validation**: Inspect actual schema before writing migrations
10. **Clear Authorization**: 403 Forbidden for ownership violations

### Design Principles Applied

- **Separation of Concerns**: API → Repository → Model layers
- **Async-First**: All I/O operations use async/await
- **Type Safety**: Pydantic validation + SQLAlchemy type hints
- **Security-First**: Ownership verification on every endpoint
- **Performance-Conscious**: Pagination, eager loading, background tasks
- **Maintainability**: Consistent patterns, clear error messages
- **Extensibility**: JSONB configs, easy to add new data source types

### Future Enhancement Paths

- Phase 2: Playwright crawler with JavaScript rendering
- Phase 2: Advanced pattern matching and robots.txt compliance
- Phase 2: Multi-site crawling and PDF extraction
- Phase 2: WebSocket for real-time progress updates
- Phase 2: Advanced filtering and search in embeddings
- Phase 2: Batch embedding operations

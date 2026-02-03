## Week 2-3: Knowledge Base页 - 后端开发计划

**参考文档**: `claudedocs/Phase1-Task-Breakdown-REVISED.md` (Lines 573-739)
**目标**: 为Knowledge Base页提供完整后端API支持
**总工作量**: 32-42小时 (4-5.5天 full-time)
**开发策略**: Week 3开发，Week 3 End完成并集成到前端

---

### 🎯 当前Terminal任务：Week 2后端开发

**Terminal**: Terminal 2 (后端专用 - 当前这个)
**状态**: 📋 准备开始
**并行工作**: 与Terminal 1前端开发并行进行

---

### 📋 后端任务清单 (32-42h)

#### Task 1: 数据库模型创建 (6-8h)

**文件创建**:
```python
backend/app/db/models/knowledge_base.py
backend/app/db/models/data_source.py
backend/app/db/models/embedding.py
```

**1.1 KnowledgeBase Model (2-3h)**
```python
class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    config = Column(JSONB, default={})  # embedding_model, chunk_size等
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    data_sources = relationship("DataSource", back_populates="knowledge_base")
    user = relationship("User", back_populates="knowledge_bases")
```

**1.2 DataSource Model (2-3h)**
```python
class DataSource(Base):
    __tablename__ = "data_sources"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    knowledge_base_id = Column(UUID, ForeignKey("knowledge_bases.id"), nullable=False)
    
    # Source type and content
    type = Column(Enum("uploaded_docs", "website", "text", "qa_pairs"), nullable=False)
    name = Column(String(255))
    status = Column(Enum("active", "processing", "failed"), default="active")
    content = Column(JSONB)  # 存储URL配置/text/qa_pairs
    metadata = Column(JSONB, default={})
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    knowledge_base = relationship("KnowledgeBase", back_populates="data_sources")
    embeddings = relationship("Embedding", back_populates="data_source")
```

**1.3 Embedding Model (2-3h)**
```python
class Embedding(Base):
    __tablename__ = "embeddings"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    data_source_id = Column(UUID, ForeignKey("data_sources.id"), nullable=False)
    
    # Vector data
    chunk_id = Column(String(255), nullable=False, index=True)
    text = Column(Text)  # 原始文本chunk
    vector = Column(Vector(1536))  # pgvector - OpenAI embedding dimension
    metadata = Column(JSONB, default={})  # chunk位置、来源页面等
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    data_source = relationship("DataSource", back_populates="embeddings")
    
    # Indexes
    __table_args__ = (
        Index('idx_embeddings_vector', 'vector', postgresql_using='ivfflat'),
    )
```

**1.4 Alembic Migration (1-2h)**
```bash
# 创建migration
cd backend
alembic revision --autogenerate -m "Add knowledge base, data source, and embedding models"

# 审查生成的migration文件
# 确保pgvector extension启用
# 确保vector index正确创建

# 运行migration
alembic upgrade head
```

---

#### Task 2: Knowledge Base API (8-10h)

**文件**: `backend/app/api/v1/endpoints/knowledge_bases.py`

**2.1 Repository Layer (3-4h)**
```python
# backend/app/db/repositories/knowledge_base.py

class KnowledgeBaseRepository(BaseRepository[KnowledgeBase]):
    
    async def get_user_stats(self, user_id: UUID) -> KBStatsResponse:
        """Get Overall View statistics."""
        # 查询用户的所有KBs统计
        # 返回: total_kbs, total_data_sources, total_documents, total_embeddings
    
    async def list_by_user(self, user_id: UUID) -> List[KnowledgeBase]:
        """List all user's Knowledge Bases."""
        # 包含关联的data_sources count, embeddings count
    
    async def create(self, data: dict) -> KnowledgeBase:
        """Create new KB."""
    
    async def update(self, kb_id: UUID, data: dict) -> KnowledgeBase:
        """Update KB config."""
    
    async def delete(self, kb_id: UUID) -> bool:
        """Delete KB and cascade delete data sources & embeddings."""
```

**2.2 API Endpoints (3-4h)**
```python
# backend/app/api/v1/endpoints/knowledge_bases.py

@router.get("/stats", response_model=KBStatsResponse)
async def get_kb_stats(
    current_user: User = Depends(get_current_verified_user),
    repo: KBRepository = Depends(get_kb_repository)
):
    """Get Overall View statistics for Knowledge Bases."""
    return await repo.get_user_stats(current_user.id)

@router.get("", response_model=List[KBListResponse])
async def list_knowledge_bases(
    current_user: User = Depends(get_current_verified_user),
    repo: KBRepository = Depends(get_kb_repository)
):
    """List all user's Knowledge Bases."""
    return await repo.list_by_user(current_user.id)

@router.post("", response_model=KBResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_base(
    data: KBCreateRequest,
    current_user: User = Depends(get_current_verified_user),
    repo: KBRepository = Depends(get_kb_repository)
):
    """Create a new Knowledge Base."""
    return await repo.create({
        "user_id": current_user.id,
        "name": data.name,
        "description": data.description,
        "config": data.config or {"embedding_model": "text-embedding-3-small", "chunk_size": 1024},
    })

@router.get("/{kb_id}", response_model=KBResponse)
async def get_knowledge_base(...):
    """Get KB details."""

@router.patch("/{kb_id}", response_model=KBResponse)
async def update_knowledge_base(...):
    """Update KB config (embedding_model, chunk_size, overlap)."""

@router.delete("/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_knowledge_base(...):
    """Delete KB (cascade delete data sources & embeddings)."""
```

**2.3 Pydantic Schemas (1-2h)**
```python
# backend/app/models/knowledge_base.py

class KBCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

class KBResponse(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    config: Dict[str, Any]
    data_source_count: int
    embedding_count: int
    created_at: datetime
    updated_at: datetime

class KBStatsResponse(BaseModel):
    total_kbs: int
    total_data_sources: int
    total_documents: int
    total_embeddings: int
```

---

#### Task 3: Data Sources API (10-12h)

**文件**: `backend/app/api/v1/endpoints/data_sources.py`

**3.1 Repository Layer (3-4h)**
```python
# backend/app/db/repositories/data_source.py

class DataSourceRepository(BaseRepository[DataSource]):
    
    async def list_by_kb(self, kb_id: UUID) -> List[DataSource]:
        """List all data sources for a KB."""
    
    async def create(self, data: dict) -> DataSource:
        """Create new data source (支持4种type)."""
    
    async def update_status(self, ds_id: UUID, status: str, metadata: dict = None):
        """Update data source processing status."""
    
    async def delete(self, ds_id: UUID) -> bool:
        """Delete data source and cascade delete embeddings."""
```

**3.2 API Endpoints (4-5h)**
```python
@router.get("/knowledge-bases/{kb_id}/data-sources", response_model=List[DataSourceResponse])
async def list_data_sources(
    kb_id: UUID,
    current_user: User = Depends(get_current_verified_user),
    kb_repo: KBRepository = Depends(get_kb_repository),
    ds_repo: DataSourceRepository = Depends(get_data_source_repository)
):
    """List all data sources for a KB."""
    # 1. Verify KB ownership
    kb = await kb_repo.get_by_id(kb_id)
    if not kb or kb.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="KB not found")
    
    # 2. Get data sources
    return await ds_repo.list_by_kb(kb_id)

@router.post("/data-sources", response_model=DataSourceResponse, status_code=201)
async def create_data_source(
    data: DataSourceCreateRequest,
    current_user: User = Depends(get_current_verified_user),
    kb_repo: KBRepository = Depends(get_kb_repository),
    ds_repo: DataSourceRepository = Depends(get_data_source_repository)
):
    """Create a new data source (支持4种type)."""
    # 1. Verify KB ownership
    # 2. Create data source based on type
    # 3. For type=website: Trigger crawl task
    # 4. For type=uploaded_docs: Link to uploaded documents
    # 5. For type=text/qa_pairs: Store content directly

@router.post("/data-sources/{ds_id}/crawl")
async def trigger_website_crawl(
    ds_id: UUID,
    config: WebsiteCrawlConfig,
    ...
):
    """Trigger website crawling Celery task."""
    # 1. Verify data source ownership and type=website
    # 2. Update status to "processing"
    # 3. Trigger Celery task
    task = crawl_website_task.delay(str(ds_id), config.dict())
    
    return {
        "task_id": task.id,
        "status": "started",
        "ds_id": str(ds_id)
    }

@router.get("/data-sources/{ds_id}/crawl-status")
async def get_crawl_status(ds_id: UUID, ...):
    """Get crawling progress (轮询 or WebSocket)."""
    # 从Redis获取进度信息
    # 返回: pages_crawled, pages_total, current_url, status
```

**3.3 Celery Tasks (3-4h)**
```python
# backend/app/tasks/data_source_tasks.py

@celery_app.task(bind=True)
def crawl_website_task(self, ds_id: str, config: dict):
    """
    Website crawling Celery task.
    
    Steps:
    1. 从DataSource获取URL配置
    2. 使用scrapy/beautifulsoup爬取页面
    3. 遵守max_depth, include_patterns限制
    4. 更新进度到Redis (WebSocket推送)
    5. 保存爬取内容到DataSource.content
    6. 更新status为"active" or "failed"
    """
    pass
```

---

#### Task 4: Embeddings API (8-12h)

**文件**: `backend/app/api/v1/endpoints/embeddings.py`

**4.1 Repository Layer (2-3h)**
```python
# backend/app/db/repositories/embedding.py

class EmbeddingRepository(BaseRepository[Embedding]):
    
    async def list_by_kb(self, kb_id: UUID, limit: int = 100) -> List[Embedding]:
        """List embeddings for a KB (with pagination)."""
    
    async def list_by_data_source(self, ds_id: UUID) -> List[Embedding]:
        """List embeddings for a data source."""
    
    async def create_batch(self, embeddings: List[dict]) -> List[Embedding]:
        """Batch insert embeddings."""
    
    async def delete_by_data_source(self, ds_id: UUID) -> int:
        """Delete all embeddings for a data source."""
    
    async def vector_search(self, kb_id: UUID, query_vector: List[float], top_k: int = 5):
        """Vector similarity search using pgvector."""
        # SELECT *, (vector <=> $query_vector) AS distance
        # FROM embeddings
        # WHERE data_source_id IN (SELECT id FROM data_sources WHERE kb_id = $kb_id)
        # ORDER BY distance
        # LIMIT $top_k
```

**4.2 API Endpoints (3-4h)**
```python
@router.post("/data-sources/{ds_id}/embeddings", status_code=202)
async def generate_embeddings(
    ds_id: UUID,
    current_user: User = Depends(get_current_verified_user),
    ds_repo: DataSourceRepository = Depends(get_data_source_repository)
):
    """Trigger embeddings generation Celery task."""
    # 1. Verify data source ownership
    # 2. Update status to "processing"
    # 3. Trigger Celery task
    task = generate_embeddings_task.delay(str(ds_id))
    
    return {
        "task_id": task.id,
        "status": "started",
        "ds_id": str(ds_id)
    }

@router.get("/knowledge-bases/{kb_id}/embeddings", response_model=List[EmbeddingResponse])
async def list_embeddings(
    kb_id: UUID,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    ...
):
    """List all embeddings for a KB (with pagination)."""

@router.delete("/embeddings/{embedding_id}", status_code=204)
async def delete_embedding(embedding_id: UUID, ...):
    """Delete single embedding."""
```

**4.3 Celery Task (3-5h)**
```python
# backend/app/tasks/embedding_tasks.py

@celery_app.task(bind=True)
def generate_embeddings_task(self, ds_id: str):
    """
    Generate embeddings for a data source.
    
    Steps:
    1. 获取DataSource内容
    2. 文本分块 (按照KB config中的chunk_size和overlap)
    3. 批量调用OpenAI Embeddings API
       - text-embedding-3-small: 1536 dimensions
       - 批量处理以节省API调用
    4. 存储向量到embeddings表
    5. 更新进度到Redis (WebSocket推送)
    6. 更新DataSource.status为"active"
    """
    pass
```

---

#### Task 5: Test Query API (2-4h)

**文件**: `backend/app/api/v1/endpoints/knowledge_bases.py`

```python
@router.post("/knowledge-bases/{kb_id}/test-query", response_model=TestQueryResponse)
async def test_query(
    kb_id: UUID,
    data: TestQueryRequest,
    current_user: User = Depends(get_current_verified_user),
    kb_repo: KBRepository = Depends(get_kb_repository),
    embedding_repo: EmbeddingRepository = Depends(get_embedding_repository)
):
    """
    Test query against KB using vector similarity search.
    
    Steps:
    1. 验证KB所有权
    2. 生成query embedding
    3. pgvector相似度搜索
    4. 返回Top-K结果 + metadata
    """
    # 1. Verify KB ownership
    kb = await kb_repo.get_by_id(kb_id)
    if not kb or kb.user_id != current_user.id:
        raise HTTPException(status_code=404)
    
    # 2. Generate query embedding
    start_time = time.time()
    query_vector = await openai_service.create_embedding(data.query)
    
    # 3. Vector search
    results = await embedding_repo.vector_search(
        kb_id=kb_id,
        query_vector=query_vector,
        top_k=data.top_k or 5
    )
    
    query_time_ms = int((time.time() - start_time) * 1000)
    
    # 4. Format results
    return {
        "results": [
            {
                "text": r.text,
                "score": 1.0 - r.distance,  # Convert distance to similarity
                "source": r.data_source.name,
                "metadata": r.metadata,
            }
            for r in results
        ],
        "query_time_ms": query_time_ms,
        "total_results": len(results),
    }
```

---

### 开发顺序建议

**Week 2 (Day 1-3)**:
1. Task 1: 数据库模型 (6-8h)
   - 创建models → Alembic migration → 运行migration
   - 验证pgvector extension和indexes

2. Task 2: Knowledge Base API (8-10h)
   - Repository → Endpoints → Schemas
   - 单元测试

**Week 3 (Day 1-2)**:
3. Task 3: Data Sources API (10-12h)
   - Repository → Endpoints → Celery Task基础
   - Website Crawler可以简化或使用第三方库

**Week 3 (Day 3-4)**:
4. Task 4: Embeddings API (8-12h)
   - Repository → Endpoints → Celery Task
   - OpenAI API集成

**Week 3 (Day 5)**:
5. Task 5: Test Query API (2-4h)
   - Endpoint → pgvector搜索
   - 性能优化

---

### MVP优化建议

**如果时间紧张，Phase 1可仅实现**:
- ✅ Uploaded Documents (复用existing upload logic)
- ✅ Text Input (直接存储到content字段)
- ✅ Q&A Pairs (JSONB存储)
- ⏸️ **Website Crawler延后至Phase 2** (节省12-16小时)

**理由**: Website Crawler涉及爬虫逻辑、进度追踪、WebSocket推送，较复杂。前3种类型足够演示Knowledge Base核心功能。

---

### 集成测试清单

**API Integration Tests** (每个Task完成后运行):
- [ ] Knowledge Base CRUD操作
- [ ] Data Source创建 (4种type)
- [ ] Embeddings生成流程
- [ ] Test Query准确性
- [ ] 权限验证 (跨用户隔离)

**性能Tests**:
- [ ] Vector search响应时间 < 100ms (10K vectors)
- [ ] Embeddings批量生成性能
- [ ] API并发处理能力

---

### 下一步行动

**立即开始**:
1. 创建数据库模型文件 (backend/app/db/models/)
2. 编写Alembic migration
3. 运行migration并验证pgvector

**预计完成时间**: Week 3 End (5天 full-time equivalent)

**集成点**: Week 3 End前端切换Mock Data → 真实API

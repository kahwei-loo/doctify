# API Gap Analysis - Phase 1 Frontend Restructuring

**Date**: 2026-01-25
**Purpose**: 对比现有后端API vs Phase 1 Wireframes要求，确定需要新建的endpoints

---

## 执行摘要

### 总体状况

- ✅ **已有API**: 68 endpoints
- ❌ **缺失API**: 31 endpoints (45% gap)
- ⚠️ **需要修改**: 5 endpoints
- 📊 **覆盖率**: 55% (68/99)

### 优先级分类

| 优先级 | 数量 | 描述 | 实施时间 |
|--------|------|------|---------|
| 🔴 **Critical** | 12 | 核心功能，Week 1-2必须完成 | Week 1-2 |
| 🟡 **High** | 14 | 重要功能，Week 3-4完成 | Week 3-4 |
| 🟢 **Medium** | 5 | 增强功能，Week 5-6完成 | Week 5-6 |

---

## 1. Documents页 - API状态

### ✅ 已有 (100% 覆盖)

```typescript
// 文档管理
POST   /api/v1/documents/upload                  ✅ 已有
GET    /api/v1/documents                         ✅ 已有
GET    /api/v1/documents/{document_id}           ✅ 已有
DELETE /api/v1/documents/{document_id}           ✅ 已有
POST   /api/v1/documents/{document_id}/process   ✅ 已有
POST   /api/v1/documents/{document_id}/retry     ✅ 已有
GET    /api/v1/documents/{document_id}/export    ✅ 已有

// 项目管理
GET    /api/v1/projects                          ✅ 已有
POST   /api/v1/projects                          ✅ 已有
GET    /api/v1/projects/{project_id}             ✅ 已有
PUT    /api/v1/projects/{project_id}             ✅ 已有
DELETE /api/v1/projects/{project_id}             ✅ 已有
GET    /api/v1/projects/stats                    ✅ 已有
GET    /api/v1/projects/{project_id}/statistics  ✅ 已有
```

### ❌ 缺失 - 需要新建

```typescript
// OCR确认流程 (🔴 Critical - Week 1)
POST   /api/v1/documents/{document_id}/confirm   ❌ 缺失
Request: {
  ocr_data: {
    extracted_fields: { ... },
    user_corrections: { ... }
  },
  user_confirmed: boolean
}
Response: {
  document_id: string,
  status: "confirmed" | "rejected",
  updated_at: timestamp
}
```

### 📝 实施建议

**Week 1-2 (Documents页重构)**:
1. ✅ Upload、List、Detail、Delete已有 - 可直接使用
2. ❌ **新建**: `POST /documents/{document_id}/confirm` - OCR确认endpoint
   - 位置: `backend/app/api/v1/endpoints/documents.py`
   - 估计时间: 2-3小时
   - 依赖: 需要在Document model添加`confirmed`状态

---

## 2. Knowledge Base页 - API状态

### ❌ 完全缺失 (0% 覆盖)

整个Knowledge Base功能**完全没有后端API**。需要从零开始实现。

### 🔴 Critical - 必须实现 (Week 3-4)

```typescript
// === Knowledge Base管理 ===
GET    /api/v1/knowledge-bases/stats              ❌ 缺失
Response: {
  total_kbs: number,
  total_data_sources: number,
  total_documents: number,
  breakdown: [{
    kb_id: string,
    kb_name: string,
    data_source_count: number,
    document_count: number,
    vector_count: number
  }]
}

GET    /api/v1/knowledge-bases                    ❌ 缺失
Response: {
  knowledge_bases: [{
    id: string,
    name: string,
    description: string,
    data_source_count: number,
    document_count: number,
    vector_count: number,
    created_at: timestamp,
    updated_at: timestamp
  }]
}

POST   /api/v1/knowledge-bases                    ❌ 缺失
Request: {
  name: string,
  description?: string,
  config?: {
    embedding_model?: string,
    chunk_size?: number,
    chunk_overlap?: number
  }
}

GET    /api/v1/knowledge-bases/{kb_id}            ❌ 缺失
PUT    /api/v1/knowledge-bases/{kb_id}            ❌ 缺失
DELETE /api/v1/knowledge-bases/{kb_id}            ❌ 缺失

// === Data Sources管理 ===
GET    /api/v1/knowledge-bases/{kb_id}/data-sources  ❌ 缺失
Response: {
  data_sources: [{
    id: string,
    type: "uploaded_docs" | "website" | "text" | "qa_pairs",
    name: string,
    status: "active" | "processing" | "failed",
    document_count: number,
    vector_count: number,
    last_synced_at: timestamp
  }]
}

POST   /api/v1/knowledge-bases/{kb_id}/data-sources  ❌ 缺失
Request: {
  type: "uploaded_docs" | "website" | "text" | "qa_pairs",
  name: string,
  config: {
    // For uploaded_docs
    document_ids?: string[],

    // For website
    url?: string,
    max_depth?: number,

    // For text
    content?: string,

    // For qa_pairs
    pairs?: [{ question: string, answer: string }]
  }
}

GET    /api/v1/data-sources/{ds_id}               ❌ 缺失
PUT    /api/v1/data-sources/{ds_id}               ❌ 缺失
DELETE /api/v1/data-sources/{ds_id}               ❌ 缺失

// === Website Crawling ===
POST   /api/v1/data-sources/{ds_id}/crawl         ❌ 缺失
GET    /api/v1/data-sources/{ds_id}/crawl-status  ❌ 缺失
Response: {
  status: "pending" | "crawling" | "completed" | "failed",
  pages_discovered: number,
  pages_processed: number,
  estimated_time_remaining: number,
  current_url: string,
  errors: []
}

// === Q&A Pairs ===
POST   /api/v1/data-sources/{ds_id}/qa-pairs      ❌ 缺失
GET    /api/v1/data-sources/{ds_id}/qa-pairs      ❌ 缺失
PUT    /api/v1/qa-pairs/{qa_id}                   ❌ 缺失
DELETE /api/v1/qa-pairs/{qa_id}                   ❌ 缺失
```

### 📝 实施建议

**Week 3-4 (Knowledge Base页)**:

**数据库Models需要新建**:
1. `KnowledgeBase` model
2. `DataSource` model
3. `QAPair` model
4. Vector embeddings存储（利用现有的`DocumentEmbedding`或创建`KBEmbedding`）

**新建文件**:
- `backend/app/api/v1/endpoints/knowledge_bases.py` (Knowledge Base CRUD)
- `backend/app/api/v1/endpoints/data_sources.py` (Data Source CRUD + Crawling)
- `backend/app/services/kb/kb_service.py` (Business logic)
- `backend/app/services/kb/crawling_service.py` (Website crawling)
- `backend/app/db/repositories/kb_repository.py`
- `backend/app/db/repositories/data_source_repository.py`

**估计时间**:
- Database models: 4-6小时
- API endpoints: 12-16小时
- Services (包括crawling): 12-16小时
- **总计**: 28-38小时 (3.5-5天 full-time)

**依赖关系**:
- Website crawling可能需要集成第三方库（如`beautifulsoup4`, `playwright`用于JS渲染）
- Vector embedding可以复用现有的RAG embedding service
- 需要Celery tasks处理异步crawling和向量化

---

## 3. AI Assistants页 - API状态

### ⚠️ 部分存在 (30% 覆盖)

现有的`chat.py`提供了基础的conversation management，但缺少Assistant管理层。

### ✅ 已有 (可复用但需调整)

```typescript
// 现有Chat API (可作为基础)
POST   /api/v1/chat/conversations                 ✅ 已有
GET    /api/v1/chat/conversations                 ✅ 已有
GET    /api/v1/chat/conversations/{conversation_id}/messages  ✅ 已有
WS     /api/v1/chat/ws/{conversation_id}          ✅ 已有
```

### ❌ 缺失 - 需要新建

```typescript
// === AI Assistants管理 ===
GET    /api/v1/assistants/stats                   ❌ 缺失
Response: {
  total_assistants: number,
  total_conversations: number,
  active_platforms: string[],
  breakdown: [{
    assistant_id: string,
    assistant_name: string,
    conversation_count: number,
    percentage: number
  }]
}

GET    /api/v1/assistants                         ❌ 缺失
Response: {
  assistants: [{
    id: string,
    name: string,
    description: string,
    knowledge_base_id?: string,
    knowledge_base_name?: string,
    personality: string,
    conversation_count: number,
    avg_satisfaction: number,
    status: "active" | "inactive",
    platforms: string[],
    public_url?: string,
    created_at: timestamp
  }]
}

POST   /api/v1/assistants                         ❌ 缺失
Request: {
  name: string,
  description?: string,
  knowledge_base_id?: string,
  personality?: string,
  config?: {
    temperature?: number,
    max_tokens?: number,
    model?: string
  }
}

GET    /api/v1/assistants/{assistant_id}          ❌ 缺失
PUT    /api/v1/assistants/{assistant_id}          ❌ 缺失
DELETE /api/v1/assistants/{assistant_id}          ❌ 缺失

// === Assistant配置 ===
PUT    /api/v1/assistants/{assistant_id}/personality       ❌ 缺失
PUT    /api/v1/assistants/{assistant_id}/knowledge-bases   ❌ 缺失
POST   /api/v1/assistants/{assistant_id}/generate-embed    ❌ 缺失

// === 对话管理（"1 Assistant = Multiple Conversations"架构）===
GET    /api/v1/assistants/{assistant_id}/conversations     ❌ 缺失
Query: {
  platform?: "all" | "facebook" | "whatsapp" | "website",
  status?: "all" | "resolved" | "in_progress" | "pending",
  date_from?: string,
  date_to?: string,
  search?: string,
  page: number,
  page_size: number
}
Response: {
  conversations: [{
    id: string,
    platform: string,
    user_id: string,
    user_name: string,
    user_avatar?: string,
    status: "resolved" | "in_progress" | "pending",
    message_count: number,
    started_at: timestamp,
    last_message_at: timestamp,
    last_message_preview: string,
    rating?: number,
    tags: string[]
  }],
  total: number,
  page: number,
  page_size: number,
  total_pages: number
}

GET    /api/v1/conversations/{conversation_id}             ❌ 缺失
Response: {
  id: string,
  platform: string,
  user: { name: string, avatar_url?: string },
  assistant: { id: string, name: string },
  messages: [{
    id: string,
    role: "user" | "assistant",
    content: string,
    timestamp: timestamp,
    response_time?: number,  // For assistant messages
    source?: {               // For assistant messages
      knowledge_base_id: string,
      document_id: string,
      snippet: string
    },
    confidence?: number
  }],
  status: "resolved" | "in_progress" | "pending",
  rating?: number,
  tags: string[]
}

POST   /api/v1/conversations/{conversation_id}/rate        ❌ 缺失
Request: {
  rating: number,  // 1-5
  feedback?: string
}

// === 公开聊天API（无需认证）===
POST   /api/v1/public/assistants/{public_id}/chat         ❌ 缺失
Request: {
  message: string,
  conversation_id?: string,  // Optional, for continuing conversation
  user_info?: {
    name?: string,
    email?: string
  }
}
Response: {
  conversation_id: string,
  message: {
    role: "assistant",
    content: string,
    source?: { knowledge_base_name: string },
    confidence: number
  }
}

WS     /api/v1/public/assistants/{public_id}/chat         ❌ 缺失
```

### 📝 实施建议

**Week 5-6 (AI Assistants页)**:

**需要调整现有代码**:
1. 现有的`ChatConversation` model需要添加：
   - `assistant_id` foreign key
   - `platform` field (facebook/whatsapp/website)
   - `user_id` field (外部用户，不是系统User)
   - `user_name`, `user_avatar` fields
   - `status` field (resolved/in_progress/pending)
   - `rating` field

2. 现有的`ChatMessage` model需要添加：
   - `response_time` field
   - `source` JSONB field (KB source information)
   - `confidence` field

**新建文件**:
- `backend/app/api/v1/endpoints/assistants.py` (Assistant CRUD)
- `backend/app/api/v1/endpoints/conversations.py` (Conversation管理)
- `backend/app/api/v1/endpoints/public_chat.py` (公开API)
- `backend/app/services/assistant/assistant_service.py`
- `backend/app/services/assistant/public_chat_service.py`
- `backend/app/db/models/assistant.py`
- `backend/app/db/repositories/assistant_repository.py`

**估计时间**:
- Database model调整: 3-4小时
- API endpoints: 10-14小时
- Services: 10-14小时
- Public API + WebSocket: 6-8小时
- **总计**: 29-40小时 (3.5-5天 full-time)

**依赖关系**:
- 需要Knowledge Base已实现（Week 3-4完成）
- 公开API需要考虑rate limiting和安全措施
- Embed code生成（HTML/JS snippet）

---

## 4. Dashboard页 - API状态

### ✅ 已有 (80% 覆盖)

```typescript
// Dashboard统计
GET    /api/v1/dashboard/stats                    ✅ 已有
GET    /api/v1/dashboard/trends                   ✅ 已有
GET    /api/v1/dashboard/recent                   ✅ 已有
GET    /api/v1/dashboard/distribution             ✅ 已有
```

### 🟢 Medium - 增强功能

```typescript
// 使用量/配额追踪 (Phase 1可选)
GET    /api/v1/usage/monthly                      ❌ 缺失
Response: {
  ocr: { used: number, quota: number },
  rag: { used: number, quota: number },
  storage: { used_mb: number, quota_mb: number },
  next_reset: timestamp
}
```

### 📝 实施建议

**Week 7-8 (Dashboard + Polish)**:
1. ✅ 现有Dashboard API足够Phase 1使用
2. ❌ `GET /usage/monthly` - 可选，如果时间允许可添加
   - 估计时间: 4-6小时
   - 需要tracking user usage（可能需要新的Usage model）

---

## 5. Global APIs - 认证和通用功能

### ✅ 已有 (100% 覆盖)

```typescript
// 用户认证
POST   /api/v1/auth/register                      ✅ 已有
POST   /api/v1/auth/login                         ✅ 已有
POST   /api/v1/auth/logout                        ✅ 已有
POST   /api/v1/auth/refresh                       ✅ 已有
GET    /api/v1/auth/me                            ✅ 已有
PUT    /api/v1/auth/me                            ✅ 已有
POST   /api/v1/auth/password/change               ✅ 已有

// RAG
POST   /api/v1/rag/query                          ✅ 已有
GET    /api/v1/rag/history                        ✅ 已有
```

---

## 6. 实施优先级和时间估计

### Week 1-2: Documents页 (🔴 Critical)

| API | 状态 | 估计时间 | 优先级 |
|-----|------|---------|--------|
| POST /documents/{id}/confirm | ❌ 新建 | 2-3小时 | 🔴 Critical |

**总计**: 2-3小时

### Week 3-4: Knowledge Base页 (🔴 Critical)

| 模块 | API数量 | 估计时间 | 优先级 |
|------|---------|---------|--------|
| KB Management | 6 endpoints | 8-10小时 | 🔴 Critical |
| Data Sources | 8 endpoints | 12-16小时 | 🔴 Critical |
| Website Crawling | 2 endpoints | 8-10小时 | 🟡 High |
| Q&A Pairs | 4 endpoints | 4-6小时 | 🟡 High |

**总计**: 32-42小时 (4-5.5天)

### Week 5-6: AI Assistants页 (🟡 High)

| 模块 | API数量 | 估计时间 | 优先级 |
|------|---------|---------|--------|
| Assistant Management | 6 endpoints | 8-10小时 | 🟡 High |
| Assistant Config | 3 endpoints | 4-6小时 | 🟡 High |
| Conversations | 4 endpoints | 10-12小时 | 🟡 High |
| Public Chat API | 2 endpoints | 8-10小时 | 🟡 High |

**总计**: 30-38小时 (4-5天)

### Week 7-8: Dashboard + Polish (🟢 Medium)

| API | 状态 | 估计时间 | 优先级 |
|-----|------|---------|--------|
| GET /usage/monthly | ❌ 新建 | 4-6小时 | 🟢 Medium |

**总计**: 4-6小时

---

## 7. 数据库Schema变更需求

### 新Models需要创建

```python
# backend/app/db/models/knowledge_base.py
class KnowledgeBase(Base):
    __tablename__ = "knowledge_bases"
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    name = Column(String(255))
    description = Column(Text, nullable=True)
    config = Column(JSONB)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    # Relationships
    data_sources = relationship("DataSource", back_populates="knowledge_base")
    assistants = relationship("Assistant", back_populates="knowledge_base")


# backend/app/db/models/data_source.py
class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(UUID, primary_key=True)
    knowledge_base_id = Column(UUID, ForeignKey("knowledge_bases.id"))
    type = Column(Enum("uploaded_docs", "website", "text", "qa_pairs"))
    name = Column(String(255))
    status = Column(Enum("active", "processing", "failed"))
    config = Column(JSONB)  # Type-specific configuration
    document_count = Column(Integer, default=0)
    vector_count = Column(Integer, default=0)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime)


# backend/app/db/models/assistant.py
class Assistant(Base):
    __tablename__ = "assistants"
    id = Column(UUID, primary_key=True)
    user_id = Column(UUID, ForeignKey("users.id"))
    knowledge_base_id = Column(UUID, ForeignKey("knowledge_bases.id"), nullable=True)
    name = Column(String(255))
    description = Column(Text, nullable=True)
    personality = Column(Text)  # System prompt
    config = Column(JSONB)  # Model config (temperature, max_tokens, etc.)
    public_id = Column(String(32), unique=True)  # For public URL
    status = Column(Enum("active", "inactive"))
    platforms = Column(ARRAY(String))  # ["website", "facebook", "whatsapp"]
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    # Relationships
    knowledge_base = relationship("KnowledgeBase", back_populates="assistants")
    conversations = relationship("ChatConversation", back_populates="assistant")


# backend/app/db/models/qa_pair.py
class QAPair(Base):
    __tablename__ = "qa_pairs"
    id = Column(UUID, primary_key=True)
    data_source_id = Column(UUID, ForeignKey("data_sources.id"))
    question = Column(Text)
    answer = Column(Text)
    embedding = Column(Vector(1536))  # OpenAI embedding dimension
    created_at = Column(DateTime)
```

### 现有Models需要调整

```python
# backend/app/db/models/chat.py
class ChatConversation(Base):
    # 新增字段:
    assistant_id = Column(UUID, ForeignKey("assistants.id"))  # NEW
    platform = Column(Enum("website", "facebook", "whatsapp"))  # NEW
    external_user_id = Column(String(255))  # NEW - 外部平台用户ID
    external_user_name = Column(String(255))  # NEW
    external_user_avatar = Column(String(500), nullable=True)  # NEW
    status = Column(Enum("resolved", "in_progress", "pending"))  # NEW
    rating = Column(Integer, nullable=True)  # NEW - 1-5
    tags = Column(ARRAY(String), default=[])  # NEW


class ChatMessage(Base):
    # 新增字段:
    response_time = Column(Float, nullable=True)  # NEW - seconds
    source = Column(JSONB, nullable=True)  # NEW - KB source info
    confidence = Column(Float, nullable=True)  # NEW - 0-1
```

---

## 8. 技术依赖和工具需求

### Python库需要添加

```bash
# For website crawling
beautifulsoup4==4.12.3
playwright==1.41.2  # For JS-rendered pages

# For vector similarity (if not already installed)
pgvector==0.2.5

# For rate limiting (public API)
slowapi==0.1.9

# For HTML sanitization (XSS prevention)
bleach==6.1.0
```

### Infrastructure需求

- **Celery workers**: Website crawling和向量化处理需要异步任务
- **Redis**: Task queue + caching
- **PostgreSQL with pgvector**: Vector storage
- **Storage**: 爬取的网页内容需要存储（可用现有upload storage）

---

## 9. 安全考虑

### 公开Chat API需要实施

1. **Rate Limiting**:
   - Per IP: 10 requests/minute
   - Per conversation: 20 messages/hour

2. **Input Validation**:
   - Message length限制: 2000 characters
   - XSS prevention: Sanitize all user inputs
   - Prompt injection detection

3. **CORS Configuration**:
   - 允许embed domains配置
   - Proper CORS headers for public API

4. **Monitoring**:
   - Track public API usage
   - Alert on abuse patterns
   - Log all public conversations for review

---

## 10. 测试策略

### Unit Tests需要覆盖

- 每个新API endpoint: Request/response validation
- Service layer business logic
- Repository layer database operations

### Integration Tests

- End-to-end workflows:
  - KB creation → Add data source → Vector embedding
  - Assistant creation → Public chat → Conversation storage
  - Website crawling → Content extraction → Embedding

### Load Testing

- Public chat API需要load testing（预期高并发）
- WebSocket connections stability testing

---

## 11. 下一步行动

### 立即行动（今天）

1. ✅ **Review这个Gap Analysis** - 确认API需求和优先级
2. 📋 **创建Database Migration计划** - 列出所有schema变更
3. 📝 **创建API开发Task List** - 分解到具体endpoint实施

### Week 1开始前

1. 🗄️ **Database Migrations** - 创建新表和调整现有表
2. 📦 **安装依赖** - beautifulsoup4, playwright等
3. 🔧 **Setup Celery Tasks** - Crawling和embedding异步任务结构

### 并行开发策略

- **Frontend开发**（你）: 从Week 1开始，使用mock data
- **Backend开发**（需要后端开发者）: Week 1-2开发KB APIs，Week 3-4开发Assistant APIs
- **前后端联调**: 每个Week末进行integration testing

---

## 附录: API Endpoint全表

### ✅ 已有 (68 endpoints)

<details>
<summary>查看完整列表</summary>

**Auth (15)**:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- POST /auth/password/change
- POST /auth/password/reset/request
- POST /auth/password/reset/confirm
- POST /auth/verify-email
- GET /auth/me
- PUT /auth/me
- POST /auth/api-keys
- GET /auth/api-keys
- DELETE /auth/api-keys/{key_id}
- POST /auth/api-keys/{key_id}/rotate
- POST /auth/users/{user_id}/unlock

**Documents (9)**:
- POST /documents/upload
- POST /documents/{document_id}/process
- GET /documents/{document_id}
- GET /documents
- DELETE /documents/{document_id}
- POST /documents/{document_id}/retry
- POST /documents/{document_id}/cancel
- GET /documents/{document_id}/export
- GET /documents/{document_id}/validate-quality

**Projects (8)**:
- POST /projects
- GET /projects/stats
- GET /projects/{project_id}
- GET /projects
- PUT /projects/{project_id}
- DELETE /projects/{project_id}
- GET /projects/{project_id}/statistics
- PUT /projects/{project_id}/config

**Dashboard (5)**:
- GET /dashboard/stats
- GET /dashboard/trends
- GET /dashboard/recent
- GET /dashboard/distribution
- POST /dashboard/invalidate-cache

**RAG (5)**:
- POST /rag/query
- GET /rag/history
- POST /rag/feedback
- GET /rag/stats
- DELETE /rag/history/{query_id}

**Chat (4)**:
- POST /chat/conversations
- GET /chat/conversations
- GET /chat/conversations/{conversation_id}/messages
- WS /chat/ws/{conversation_id}

**Templates (7)**:
- GET /templates
- POST /templates
- GET /templates/{template_id}
- PUT /templates/{template_id}
- PATCH /templates/{template_id}
- DELETE /templates/{template_id}
- POST /templates/{template_id}/apply

**Settings (2)**:
- GET /settings
- PATCH /settings

**Edit History (5)**:
- GET /edit-history/{document_id}
- POST /edit-history/{document_id}
- POST /edit-history/{document_id}/bulk
- POST /edit-history/{document_id}/rollback
- GET /edit-history/{document_id}/{entry_id}

**Insights (13)**:
- POST /insights
- GET /insights
- GET /insights/{task_id}
- PUT /insights/{task_id}
- DELETE /insights/{task_id}
- GET /insights/{task_id}/result
- POST /insights/{task_id}/retry
- POST /insights/batch
- GET /insights/batch/{batch_id}
- GET /insights/batch/{batch_id}/results
- DELETE /insights/batch/{batch_id}
- POST /insights/export
- GET /insights/stats

</details>

### ❌ 缺失 (31 endpoints)

**Knowledge Base (6)**:
- GET /knowledge-bases/stats
- GET /knowledge-bases
- POST /knowledge-bases
- GET /knowledge-bases/{kb_id}
- PUT /knowledge-bases/{kb_id}
- DELETE /knowledge-bases/{kb_id}

**Data Sources (12)**:
- GET /knowledge-bases/{kb_id}/data-sources
- POST /knowledge-bases/{kb_id}/data-sources
- GET /data-sources/{ds_id}
- PUT /data-sources/{ds_id}
- DELETE /data-sources/{ds_id}
- POST /data-sources/{ds_id}/crawl
- GET /data-sources/{ds_id}/crawl-status
- POST /data-sources/{ds_id}/qa-pairs
- GET /data-sources/{ds_id}/qa-pairs
- PUT /qa-pairs/{qa_id}
- DELETE /qa-pairs/{qa_id}

**AI Assistants (9)**:
- GET /assistants/stats
- GET /assistants
- POST /assistants
- GET /assistants/{assistant_id}
- PUT /assistants/{assistant_id}
- DELETE /assistants/{assistant_id}
- PUT /assistants/{assistant_id}/personality
- PUT /assistants/{assistant_id}/knowledge-bases
- POST /assistants/{assistant_id}/generate-embed

**Conversations (4)**:
- GET /assistants/{assistant_id}/conversations
- GET /conversations/{conversation_id}
- POST /conversations/{conversation_id}/rate
- POST /public/assistants/{public_id}/chat
- WS /public/assistants/{public_id}/chat

**Others (2)**:
- POST /documents/{document_id}/confirm
- GET /usage/monthly

---

## 总结

**Phase 1 API开发工作量**:
- **Total new APIs**: 31 endpoints
- **Total development time**: 68-89小时 (8.5-11天 full-time)
- **Database models**: 4 new models, 2 models需要调整
- **Dependencies**: 需要Celery, BeautifulSoup, Playwright

**关键路径**:
1. Week 1-2: Documents API (2-3小时) ✅ 轻松
2. Week 3-4: Knowledge Base APIs (32-42小时) ⚠️ 最大工作量
3. Week 5-6: AI Assistants APIs (30-38小时) ⚠️ 第二大工作量
4. Week 7-8: Polish + Optional features

**风险点**:
- Knowledge Base的website crawling复杂度较高
- Public chat API需要仔细考虑安全和rate limiting
- Vector embedding处理需要Celery异步任务
- Database schema变更需要careful migration planning

**建议**:
- 前端可以先用mock data开始开发，不需要等后端完成
- Knowledge Base和AI Assistants可以并行开发（不同开发者）
- 考虑MVP approach: Phase 1只实现Uploaded Docs + Text数据源，Website crawling放到Phase 2

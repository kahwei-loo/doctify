# Phase 1 Frontend Restructuring - Task Breakdown

**文档版本**: 1.0
**创建日期**: 2026-01-25
**总工期**: 8周 (320小时 full-time equivalent)
**前端工作量**: 180-200小时
**后端工作量**: 68-89小时
**并行开发策略**: 前端使用Mock Data先行，后端API逐步对接

---

## 执行摘要

### 项目范围
Phase 1重构覆盖4个核心页面，采用**三级导航架构** (SideNav → Context Panel → Content Area):

1. **Documents页** (Week 1-2): 现有功能重构 + Critical States
2. **Knowledge Base页** (Week 3-4): 全新页面，0→1开发
3. **AI Assistants页** (Week 5-6): "1 Assistant = Multiple Conversations"新架构
4. **Dashboard页** (Week 7-8): 整合 + Critical States + Polish

### 关键里程碑
- **Week 2 End**: Documents页完成，可演示基础功能
- **Week 4 End**: Knowledge Base页完成，前端可用Mock Data演示全流程
- **Week 6 End**: AI Assistants页完成，所有核心功能就位
- **Week 8 End**: Phase 1完整交付，所有Critical States实现

### 风险与依赖
- **后端API缺口**: 45% API缺失 (31/99 endpoints)
- **最大风险**: Knowledge Base (Week 3-4) 和 AI Assistants (Week 5-6) 后端开发量大
- **缓解策略**: 前端先用Mock Data完成UI/UX，后端可延后至Week 6-8并行开发

---

## Week 1-2: Documents页 重构

**目标**: 重构现有Documents页，应用新三级导航架构 + Critical States

**前端工作量**: 48-56小时 (6-7天 full-time)
**后端工作量**: 2-3小时 (0.25-0.4天 full-time)
**并行策略**: 前端独立完成，后端仅需1个新endpoint

### 前端任务清单 (48-56小时)

#### 1. 架构重构 (16-20小时)

**Task 1.1: SideNav L1导航组件** (4-5小时)
- [ ] 创建 `<SideNav>` 组件 (带选中状态高亮)
- [ ] 实现路由切换逻辑 (/documents, /knowledge-base, /assistants, /dashboard)
- [ ] 添加collapsed/expanded状态管理
- [ ] 实现响应式设计 (mobile: drawer模式)
```typescript
// frontend/src/shared/components/layout/SideNav.tsx
interface SideNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}
```

**Task 1.2: Documents页L2 Context Panel** (6-8小时)
- [ ] 创建 `<ProjectList>` 组件 (项目列表 + Overall View)
- [ ] 实现项目选择器 (带搜索/筛选)
- [ ] 添加 "Create New Project" 按钮
- [ ] 实现项目统计卡片 (文档数、处理中、已完成)
- [ ] 响应式处理 (mobile: 可收起)
```typescript
// frontend/src/features/documents/components/ProjectList.tsx
interface Project {
  id: string;
  name: string;
  document_count: number;
  created_at: string;
}
```

**Task 1.3: Documents页L3 Content Area** (6-7小时)
- [ ] 重构 `<DocumentTable>` 组件 (使用ShadcnUI Table)
- [ ] 实现文档列表 (文件名、状态、日期、操作)
- [ ] 添加批量操作工具栏 (删除、导出、重试)
- [ ] 实现文档排序/筛选/搜索
- [ ] 添加文档详情侧边栏
```typescript
// frontend/src/features/documents/components/DocumentTable.tsx
interface Document {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}
```

#### 2. 上传流程重构 (12-16小时)

**Task 2.1: 上传按钮 + 拖拽区域** (4-5小时)
- [ ] 重构 `<UploadButton>` 组件 (ShadcnUI Button + Dialog)
- [ ] 实现拖拽上传区域 (react-dropzone)
- [ ] 添加文件类型验证 (PDF, images, office docs)
- [ ] 实现文件大小验证 (10MB limit)
- [ ] 添加预览缩略图

**Task 2.2: 上传进度追踪** (4-5小时)
- [ ] 创建 `<UploadProgress>` 组件 (进度条 + 取消按钮)
- [ ] 实现多文件并行上传进度显示
- [ ] 添加上传失败重试机制
- [ ] 实现上传完成后自动跳转到文档列表

**Task 2.3: OCR处理进度** (4-6小时)
- [ ] 创建 `<OCRProgress>` 组件 (Skeleton + 进度百分比)
- [ ] 实现WebSocket实时更新 (复用existing useChatWebSocket hook)
- [ ] 添加OCR失败错误提示 + 重试按钮
- [ ] 实现OCR完成后自动刷新列表

#### 3. 确认流程实现 (8-10小时)

**Task 3.1: OCR结果确认页面** (6-8小时)
- [ ] 创建 `<OCRConfirmationView>` 页面组件
- [ ] 实现左右分栏布局 (原始图片 vs 提取结果)
- [ ] 添加可编辑表单字段 (用户可修正提取错误)
- [ ] 实现字段高亮 (与原图对应)
- [ ] 添加 "Confirm & Save" / "Discard" 按钮

**Task 3.2: 确认后数据保存** (2小时)
- [ ] 实现POST /documents/{document_id}/confirm API调用
- [ ] 添加保存成功Toast提示
- [ ] 实现保存后返回文档列表

#### 4. Critical States实现 (12-14小时)

**Task 4.1: Empty States** (4-5小时)
- [ ] 无项目状态 (带 "Create First Project" CTA)
- [ ] 项目内无文档状态 (带 "Upload First Document" CTA)
- [ ] 搜索无结果状态
- [ ] 筛选无结果状态

**Task 4.2: Loading States** (3-4小时)
- [ ] 文档列表加载 Skeleton (8行 skeleton rows)
- [ ] 上传进度条 (带百分比 + 剩余时间)
- [ ] OCR处理进度 (带进度百分比 + 预估时间)
- [ ] 项目列表加载 Skeleton

**Task 4.3: Error States** (3-4小时)
- [ ] 文件大小超限错误 (10MB limit提示)
- [ ] 文件类型不支持错误 (支持格式列表)
- [ ] 上传失败错误 (网络问题 + 重试按钮)
- [ ] OCR处理失败错误 (原因 + 重试按钮)

**Task 4.4: Confirmation Dialogs** (2-3小时)
- [ ] 删除项目确认 (显示影响文档数量)
- [ ] 删除文档确认 (单个/批量)
- [ ] 放弃OCR编辑确认 (未保存修改提示)

### 后端任务清单 (2-3小时)

**Task B1.1: 新增确认endpoint** (2-3小时)
- [ ] 创建 `POST /api/v1/documents/{document_id}/confirm`
- [ ] 实现Request Schema: `{ ocr_data: dict, user_confirmed: bool }`
- [ ] 更新document status = 'confirmed'
- [ ] 保存user_corrected_data到database
- [ ] 添加unit tests

**文件位置**: `backend/app/api/v1/endpoints/documents.py`

### 依赖关系
```
Task 1.1 (SideNav) → Task 1.2 (Context Panel) → Task 1.3 (Content Area)
                                                ↓
Task 2.1 (Upload) → Task 2.2 (Progress) → Task 2.3 (OCR Progress)
                                                ↓
                            Task 3.1 (Confirmation) → Task 3.2 (Save)
                                                ↓
                            Task 4.1-4.4 (Critical States)
```

### Week 2 End Milestone
✅ **Deliverables**:
- Documents页完整重构完成
- 三级导航架构验证成功
- 上传→OCR→确认流程完整可用
- 所有Critical States实现

---

## Week 3-4: Knowledge Base页 (全新开发)

**目标**: 从0→1开发Knowledge Base管理页面

**前端工作量**: 64-72小时 (8-9天 full-time)
**后端工作量**: 32-42小时 (4-5.5天 full-time)
**并行策略**: 前端Week 3使用Mock Data完成UI，后端Week 4并行开发API

### 前端任务清单 (64-72小时)

#### 1. 页面架构搭建 (16-20小时)

**Task 1.1: L2 KB List Panel** (6-8小时)
- [ ] 创建 `<KBList>` 组件 (KB列表 + Overall View卡片)
- [ ] 实现KB选择器 (带搜索)
- [ ] 添加 "Create New KB" 按钮
- [ ] 实现KB统计卡片 (Data Sources数、文档数、向量数)
```typescript
// frontend/src/features/knowledge-base/components/KBList.tsx
interface KnowledgeBase {
  id: string;
  name: string;
  data_source_count: number;
  document_count: number;
  embedding_count: number;
  created_at: string;
}
```

**Task 1.2: L3 KB Detail Tabs** (6-7小时)
- [ ] 创建 `<KBDetailView>` 组件 (4个Tab切换)
- [ ] 实现Data Sources Tab布局
- [ ] 实现Embeddings Tab布局
- [ ] 实现Test Tab布局
- [ ] 实现Settings Tab布局

**Task 1.3: Overall View统计卡片** (4-5小时)
- [ ] 创建 `<KBOverallStats>` 组件
- [ ] 实现4个统计卡片 (Total KBs, Data Sources, Documents, Embeddings)
- [ ] 添加趋势指标 (↑12% this month)
- [ ] 添加快速操作按钮 (+ Create KB)

#### 2. Data Sources管理 (20-24小时)

**Task 2.1: Data Source Type选择器** (4-5小时)
- [ ] 创建 `<DataSourceTypeSelector>` 组件 (4种类型)
- [ ] Uploaded Documents (文件上传)
- [ ] Website (URL爬虫)
- [ ] Text Input (直接输入)
- [ ] Q&A Pairs (问答对)

**Task 2.2: Uploaded Documents流程** (6-7小时)
- [ ] 实现文件上传对话框 (拖拽 + 选择)
- [ ] 显示已上传文档列表 (文件名、大小、状态)
- [ ] 实现文档删除功能
- [ ] 添加批量上传进度追踪

**Task 2.3: Website Crawler流程** (6-8小时)
- [ ] 创建Website配置表单 (URL, max_depth, include_patterns)
- [ ] 实现爬虫状态实时显示 (进度条 + 已爬取页面数)
- [ ] 显示爬取结果列表 (页面URL、标题、状态)
- [ ] 添加爬虫控制按钮 (开始、暂停、取消)
- [ ] 实现爬虫失败页面重试

**Task 2.4: Text & Q&A Pairs输入** (4-6小时)
- [ ] 创建Text Input表单 (Rich Text Editor)
- [ ] 创建Q&A Pairs表单 (动态添加/删除Q&A对)
- [ ] 实现保存/编辑功能
- [ ] 添加字数/对数统计

#### 3. Embeddings管理 (12-16小时)

**Task 3.1: Embeddings列表展示** (4-5小时)
- [ ] 创建 `<EmbeddingsTable>` 组件
- [ ] 显示embeddings列表 (来源、状态、向量数)
- [ ] 实现搜索/筛选功能
- [ ] 添加排序功能

**Task 3.2: 向量化处理流程** (4-6小时)
- [ ] 创建 "Generate Embeddings" 按钮
- [ ] 实现批量向量化进度显示 (进度条 + 已处理/总数)
- [ ] 显示向量化失败项 + 重试按钮
- [ ] 实现自动刷新 (WebSocket实时更新)

**Task 3.3: Embeddings详情查看** (4-5小时)
- [ ] 创建Embeddings详情侧边栏
- [ ] 显示元数据 (chunk_id, text_preview, vector_dimension)
- [ ] 实现删除单个embedding功能

#### 4. Test & Settings (8-10小时)

**Task 4.1: Test Query功能** (4-5小时)
- [ ] 创建Test Query输入框
- [ ] 实现实时查询 (输入→检索→显示结果)
- [ ] 显示Top-K结果 (文档片段 + 相似度分数)
- [ ] 添加调试信息 (query时间、命中数)

**Task 4.2: Settings配置** (4-5小时)
- [ ] 创建KB Settings表单
- [ ] 实现配置选项 (embedding_model, chunk_size, overlap)
- [ ] 添加保存/重置按钮
- [ ] 实现配置变更提示 (需要重新生成embeddings)

#### 5. Critical States实现 (8-10小时)

**Task 5.1: Empty States** (3-4小时)
- [ ] 无KB状态 (带 "Create First KB" CTA)
- [ ] KB内无Data Sources状态
- [ ] 无Embeddings状态
- [ ] Test Query无结果状态

**Task 5.2: Loading States** (2-3小时)
- [ ] KB列表加载Skeleton
- [ ] Data Sources列表Skeleton
- [ ] 爬虫进度显示 (页面爬取实时更新)
- [ ] 向量化进度显示 (批量处理进度)

**Task 5.3: Error States** (3-4小时)
- [ ] 爬虫失败错误 (URL无法访问、超时)
- [ ] 向量化失败错误 (API限额、网络问题)
- [ ] Test Query失败错误

**Task 5.4: Confirmation Dialogs** (2-3小时)
- [ ] 删除KB确认 (显示关联的Assistants警告)
- [ ] 删除Data Source确认
- [ ] 重新生成Embeddings确认 (旧向量将被删除)

### 后端任务清单 (32-42小时)

#### 1. 数据库模型创建 (6-8小时)

**Task B1.1: 创建4个新模型** (6-8小时)
- [ ] `KnowledgeBase` model (id, user_id, name, config, created_at)
- [ ] `DataSource` model (id, kb_id, type, status, content, metadata)
- [ ] `Embedding` model (id, data_source_id, chunk_id, vector, metadata)
- [ ] `Assistant` model (id, kb_id, name, public_id, platforms, config)
- [ ] 创建Alembic migration
- [ ] 添加索引 (kb_id, data_source_id)

**文件位置**: `backend/app/db/models/`

#### 2. Knowledge Base API (8-10小时)

**Task B2.1: KB CRUD endpoints** (8-10小时)
- [ ] `GET /knowledge-bases/stats` (Overall View数据)
- [ ] `GET /knowledge-bases` (列表)
- [ ] `POST /knowledge-bases` (创建)
- [ ] `GET /knowledge-bases/{kb_id}` (详情)
- [ ] `PATCH /knowledge-bases/{kb_id}` (更新设置)
- [ ] `DELETE /knowledge-bases/{kb_id}` (删除 + 级联检查)

**文件位置**: `backend/app/api/v1/endpoints/knowledge_bases.py`

#### 3. Data Sources API (10-12小时)

**Task B3.1: Data Sources CRUD** (6-8小时)
- [ ] `GET /knowledge-bases/{kb_id}/data-sources` (列表)
- [ ] `POST /data-sources` (创建 - 支持4种type)
- [ ] `GET /data-sources/{ds_id}` (详情)
- [ ] `DELETE /data-sources/{ds_id}` (删除)

**Task B3.2: Website Crawler** (4-6小时)
- [ ] `POST /data-sources/{ds_id}/crawl` (触发爬虫Celery task)
- [ ] `GET /data-sources/{ds_id}/crawl-status` (WebSocket实时状态)
- [ ] Celery task: `crawl_website_task(ds_id, config)`
- [ ] 实现爬虫逻辑 (BeautifulSoup/Scrapy)

**文件位置**: `backend/app/api/v1/endpoints/data_sources.py`, `backend/app/tasks/crawler.py`

#### 4. Embeddings API (8-12小时)

**Task B4.1: Embeddings生成** (6-8小时)
- [ ] `POST /data-sources/{ds_id}/embeddings` (触发向量化Celery task)
- [ ] `GET /data-sources/{ds_id}/embeddings-status` (生成进度)
- [ ] Celery task: `generate_embeddings_task(ds_id)`
- [ ] 实现向量化逻辑 (OpenAI Embeddings API)
- [ ] 存储到pgvector

**Task B4.2: Embeddings查询** (2-4小时)
- [ ] `GET /knowledge-bases/{kb_id}/embeddings` (列表)
- [ ] `DELETE /embeddings/{embedding_id}` (删除)

**文件位置**: `backend/app/api/v1/endpoints/embeddings.py`, `backend/app/tasks/embeddings.py`

#### 5. Test Query API (2-4小时)

**Task B5.1: Test Query实现** (2-4小时)
- [ ] `POST /knowledge-bases/{kb_id}/test-query`
- [ ] Request: `{ query: string, top_k: int }`
- [ ] 实现向量相似度搜索 (pgvector)
- [ ] 返回Top-K结果 (文档片段 + 分数)

**文件位置**: `backend/app/api/v1/endpoints/knowledge_bases.py`

### MVP优化建议
如后端资源紧张，可Phase 1仅实现:
- ✅ Uploaded Documents
- ✅ Text Input
- ✅ Q&A Pairs
- ⏸️ **Website Crawler延后至Phase 2** (节省12-16小时)

### 依赖关系
```
前端 Task 1.1-1.3 (页面架构) → 可使用Mock Data独立开发
                              ↓
前端 Task 2.1-2.4 (Data Sources) → Mock API调用
                              ↓
前端 Task 3.1-3.3 (Embeddings) → Mock API调用
                              ↓
前端 Task 4.1-4.2 (Test & Settings) → Mock API调用

后端 Task B1.1 (数据库模型) → Task B2.1 (KB API)
                              ↓
                         Task B3.1-3.2 (Data Sources API)
                              ↓
                         Task B4.1-4.2 (Embeddings API)
                              ↓
                         Task B5.1 (Test Query)

Week 4 End: 前端Mock Data替换为真实API调用
```

### Week 4 End Milestone
✅ **Deliverables**:
- Knowledge Base页面完整功能 (前端100%, 后端70-80%)
- 4种Data Sources类型全部支持
- Embeddings生成流程完整
- Test Query功能可用

---

## Week 5-6: AI Assistants页 (新架构实现)

**目标**: 实现 "1 Assistant = Multiple Conversations" Intercom Inbox风格页面

**前端工作量**: 56-64小时 (7-8天 full-time)
**后端工作量**: 30-38小时 (4-5天 full-time)
**并行策略**: 前端Week 5用Mock Data完成UI，后端Week 6并行开发

### 前端任务清单 (56-64小时)

#### 1. 页面架构搭建 (16-20小时)

**Task 1.1: L2 Assistants List Panel** (6-8小时)
- [ ] 创建 `<AssistantsList>` 组件 (Assistant卡片列表)
- [ ] 实现Overall View统计卡片 (Total Assistants, Active Conversations, Avg Response Time)
- [ ] 添加 "Create New Assistant" 按钮
- [ ] 实现Assistant选择器 (带搜索)
```typescript
// frontend/src/features/assistants/components/AssistantsList.tsx
interface Assistant {
  id: string;
  name: string;
  knowledge_base_name: string;
  conversation_count: number;
  active_conversations: number;
  platforms: ('website' | 'facebook' | 'whatsapp' | 'telegram')[];
  status: 'active' | 'inactive';
}
```

**Task 1.2: L3 Conversations Inbox** (6-8小时)
- [ ] 创建 `<ConversationsInbox>` 组件 (左右分栏)
- [ ] 左侧: Conversations列表 (Intercom风格)
- [ ] 右侧: Chat详情窗口
- [ ] 实现Conversation选择高亮
- [ ] 添加状态筛选器 (Unresolved, In Progress, Resolved)

**Task 1.3: Overall View统计** (4-6小时)
- [ ] 创建 `<AssistantsOverallStats>` 组件
- [ ] 5个统计卡片 (Total, Active, Conversations, Avg Response, Resolution Rate)
- [ ] 实现趋势指标展示
- [ ] 添加快速创建按钮

#### 2. Assistant管理 (12-16小时)

**Task 2.1: Create Assistant流程** (6-8小时)
- [ ] 创建Assistant配置表单 (name, KB选择, platforms)
- [ ] 实现多平台选择器 (checkbox: website, facebook, whatsapp, telegram)
- [ ] 添加配置选项 (temperature, max_tokens, system_prompt)
- [ ] 实现公开链接生成 (public_id)
- [ ] 显示Embed代码 (Website widget代码)

**Task 2.2: Assistant卡片详情** (4-6小时)
- [ ] 创建Assistant详情侧边栏
- [ ] 显示配置信息 (KB、平台、统计)
- [ ] 实现编辑/删除功能
- [ ] 添加 "Test Assistant" 按钮
- [ ] 显示公开链接和Embed代码

**Task 2.3: Test Assistant对话窗口** (2-4小时)
- [ ] 创建测试对话窗口 (独立dialog)
- [ ] 实现消息发送/接收 (WebSocket streaming)
- [ ] 显示来源引用 (Knowledge Base citations)

#### 3. Conversations Inbox (20-24小时)

**Task 3.1: Conversations列表** (8-10小时)
- [ ] 创建 `<ConversationsList>` 组件 (左侧列表)
- [ ] 显示对话卡片 (用户名、最后消息、时间、未读数)
- [ ] 实现状态标签 (Unresolved 🔴, In Progress 🟡, Resolved ✅)
- [ ] 实现平台图标 (Website 🌐, Facebook 📘, WhatsApp 💬, Telegram ✈️)
- [ ] 添加搜索/筛选功能 (按状态、平台、时间)
- [ ] 实现实时更新 (WebSocket新消息自动刷新)

**Task 3.2: Chat详情窗口** (8-10小时)
- [ ] 创建 `<ChatDetailView>` 组件 (右侧窗口)
- [ ] 显示对话标题栏 (用户名、平台、状态切换)
- [ ] 实现消息气泡 (用户/AI区分)
- [ ] 显示消息时间戳和已读状态
- [ ] 实现来源引用展示 (Knowledge Base citations)
- [ ] 添加管理员回复功能 (手动介入回复)

**Task 3.3: Conversation操作** (4-6小时)
- [ ] 实现状态切换 (Unresolved ↔ In Progress ↔ Resolved)
- [ ] 添加评分功能 (1-5星)
- [ ] 实现分配功能 (分配给团队成员)
- [ ] 添加标签功能 (添加/删除标签)

#### 4. Public Chat Widget (8-10小时)

**Task 4.1: Public Embed代码生成** (2-3小时)
- [ ] 生成可嵌入的JavaScript snippet
- [ ] 实现公开API endpoint测试 (POST /public/assistants/{public_id}/chat)

**Task 4.2: 公开聊天页面** (6-7小时)
- [ ] 创建 `/public-chat/{public_id}` 独立页面
- [ ] 实现匿名聊天界面 (无需登录)
- [ ] 显示欢迎消息和快速问题按钮
- [ ] 实现消息发送/接收 (WebSocket streaming)
- [ ] 显示来源引用和Powered by链接

#### 5. Critical States实现 (8-10小时)

**Task 5.1: Empty States** (3-4小时)
- [ ] 无Assistants状态 (带 "Create First Assistant" CTA)
- [ ] Assistant无Conversations状态
- [ ] 筛选无结果状态

**Task 5.2: Loading States** (2-3小时)
- [ ] Assistants列表Skeleton
- [ ] Conversations列表Skeleton
- [ ] 消息加载Skeleton
- [ ] Bot思考中动画 (typing indicator)

**Task 5.3: Error States** (3-4小时)
- [ ] Assistant创建失败 (KB未选择、名称重复)
- [ ] 消息发送失败 (网络问题 + 重试)
- [ ] Knowledge Base连接失败

**Task 5.4: Confirmation Dialogs** (2-3小时)
- [ ] 删除Assistant确认 (显示关联Conversations数量)
- [ ] Resolve Conversation确认
- [ ] 删除Conversation确认

### 后端任务清单 (30-38小时)

#### 1. 数据库模型调整 (6-8小时)

**Task B1.1: Assistant模型创建** (3-4小时)
- [ ] 创建 `Assistant` model
- [ ] 字段: id, user_id, knowledge_base_id, name, public_id, platforms, config
- [ ] 添加unique constraint (public_id)
- [ ] 创建Alembic migration

**Task B1.2: ChatConversation模型扩展** (3-4小时)
- [ ] 添加字段: assistant_id, platform, external_user_name, status, rating
- [ ] 添加indexes (assistant_id, platform, status)
- [ ] 创建Alembic migration

**文件位置**: `backend/app/db/models/assistant.py`, `backend/app/db/models/chat.py`

#### 2. Assistants API (10-12小时)

**Task B2.1: Assistants CRUD** (10-12小时)
- [ ] `GET /assistants/stats` (Overall View数据)
- [ ] `GET /assistants` (列表)
- [ ] `POST /assistants` (创建 + 生成public_id)
- [ ] `GET /assistants/{assistant_id}` (详情)
- [ ] `PATCH /assistants/{assistant_id}` (更新)
- [ ] `DELETE /assistants/{assistant_id}` (删除 + 级联检查)
- [ ] `POST /assistants/{assistant_id}/test` (测试对话)

**文件位置**: `backend/app/api/v1/endpoints/assistants.py`

#### 3. Conversations API (8-10小时)

**Task B3.1: Conversations管理** (8-10小时)
- [ ] `GET /assistants/{assistant_id}/conversations` (列表 + 筛选)
- [ ] `GET /conversations/{conversation_id}` (详情 + 消息历史)
- [ ] `PATCH /conversations/{conversation_id}/status` (状态更新)
- [ ] `PATCH /conversations/{conversation_id}/rating` (评分)
- [ ] `DELETE /conversations/{conversation_id}` (删除)

**文件位置**: `backend/app/api/v1/endpoints/conversations.py`

#### 4. Public Chat API (6-8小时)

**Task B4.1: 公开聊天endpoint** (6-8小时)
- [ ] `POST /public/assistants/{public_id}/chat` (无需auth)
- [ ] Request: `{ message: string, conversation_id?: string, external_user_id?: string }`
- [ ] 实现匿名用户对话创建/继续
- [ ] WebSocket streaming支持
- [ ] 实现RAG查询 + AI回复
- [ ] 记录conversation + messages

**文件位置**: `backend/app/api/v1/endpoints/public_chat.py`

#### 5. WebSocket增强 (2-4小时)

**Task B5.1: Assistant WebSocket** (2-4小时)
- [ ] 扩展existing WebSocket支持assistant_id
- [ ] 实现conversation_id自动关联
- [ ] 添加platform和external_user_id支持

**文件位置**: `backend/app/api/v1/endpoints/chat.py` (扩展existing)

### 依赖关系
```
前端 Task 1.1-1.3 (页面架构) → Mock Data独立开发
                              ↓
前端 Task 2.1-2.3 (Assistant管理) → Mock API
                              ↓
前端 Task 3.1-3.3 (Conversations Inbox) → Mock API + Mock WebSocket
                              ↓
前端 Task 4.1-4.2 (Public Widget) → Mock Public API

后端 Task B1.1-1.2 (模型调整) → Task B2.1 (Assistants API)
                                  ↓
                             Task B3.1 (Conversations API)
                                  ↓
                             Task B4.1 (Public Chat API)
                                  ↓
                             Task B5.1 (WebSocket增强)

Week 6 End: 前端Mock替换为真实API
```

### Week 6 End Milestone
✅ **Deliverables**:
- AI Assistants页完整功能
- "1 Assistant = Multiple Conversations"架构验证
- Public Chat Widget可用
- Intercom风格Inbox完整实现

---

## Week 7-8: Dashboard页 + Critical States完善 + 全局Polish

**目标**: Dashboard页优化 + 完成所有Critical States + 跨页面功能整合

**前端工作量**: 40-48小时 (5-6天 full-time)
**后端工作量**: 4-6小时 (0.5-0.75天 full-time)
**并行策略**: 前端主导，后端仅需少量endpoint优化

### 前端任务清单 (40-48小时)

#### 1. Dashboard页优化 (12-16小时)

**Task 1.1: Overall Stats优化** (4-6小时)
- [ ] 优化4个统计卡片UI (Documents, KBs, Assistants, Conversations)
- [ ] 添加趋势图表 (Recharts折线图)
- [ ] 实现实时更新 (每30秒刷新)
- [ ] 添加快速操作按钮

**Task 1.2: Recent Activities优化** (4-5小时)
- [ ] 优化Recent Documents列表 (最近上传/处理)
- [ ] 添加Recent Conversations预览
- [ ] 实现点击跳转到详情页

**Task 1.3: Document Distribution图表** (4-5小时)
- [ ] 优化Pie Chart UI (按项目分布)
- [ ] 添加交互式Tooltip
- [ ] 实现图例点击筛选

#### 2. Critical States完善 (16-20小时)

**Task 2.1: 跨页面Empty States审查** (4-5小时)
- [ ] 审查所有Empty States一致性
- [ ] 优化CTA按钮样式和文案
- [ ] 添加引导性提示文案
- [ ] 确保所有页面都有合适的Empty State

**Task 2.2: Loading States统一** (4-5小时)
- [ ] 统一所有Skeleton Screen样式
- [ ] 实现渐进式加载动画
- [ ] 优化进度条样式 (一致的颜色和动画)
- [ ] 添加加载时间估计 (所有长时间操作)

**Task 2.3: Error States完善** (4-5小时)
- [ ] 统一错误提示组件 (Toast/Banner/Modal)
- [ ] 添加详细错误信息和解决方案
- [ ] 实现错误日志上报 (可选)
- [ ] 优化网络错误重试机制

**Task 2.4: Confirmation Dialogs审查** (4-5小时)
- [ ] 审查所有Confirmation Dialogs一致性
- [ ] 优化警告文案和后果说明
- [ ] 统一按钮样式 (Cancel vs Destructive)
- [ ] 添加"Don't show again"选项 (非关键操作)

#### 3. 跨页面功能整合 (8-10小时)

**Task 3.1: 全局搜索功能** (4-5小时)
- [ ] 实现全局搜索框 (Command+K快捷键)
- [ ] 支持搜索Documents, KBs, Assistants, Conversations
- [ ] 显示搜索结果预览
- [ ] 实现点击跳转到详情页

**Task 3.2: 通知系统** (4-5小时)
- [ ] 实现全局通知铃铛图标
- [ ] 显示未读通知数量 (badge)
- [ ] 实现通知列表 (文档处理完成、对话未解决等)
- [ ] 添加通知点击跳转

#### 4. 性能优化 + Polish (8-10小时)

**Task 4.1: 性能优化** (4-5小时)
- [ ] 实现路由级别代码分割 (React.lazy)
- [ ] 优化大列表渲染 (react-window虚拟滚动)
- [ ] 添加API响应缓存 (React Query)
- [ ] 优化图片加载 (lazy loading)

**Task 4.2: UI/UX Polish** (4-5小时)
- [ ] 优化所有页面动画过渡
- [ ] 统一间距和字体大小
- [ ] 添加微交互动画 (hover, focus states)
- [ ] 优化移动端响应式体验
- [ ] 最终UI一致性审查

### 后端任务清单 (4-6小时)

**Task B1.1: Dashboard API优化** (2-3小时)
- [ ] 优化 `/dashboard/stats` 性能 (缓存)
- [ ] 优化 `/dashboard/trends` 查询效率
- [ ] 添加Redis缓存层 (30秒过期)

**Task B1.2: 通知系统API** (可选, 2-3小时)
- [ ] `GET /notifications` (通知列表)
- [ ] `PATCH /notifications/{id}/read` (标记已读)
- [ ] WebSocket推送支持

**文件位置**: `backend/app/api/v1/endpoints/dashboard.py`, `backend/app/api/v1/endpoints/notifications.py`

### 依赖关系
```
Task 1.1-1.3 (Dashboard优化) → 独立任务
                               ↓
Task 2.1-2.4 (Critical States完善) → 依赖Week 1-6所有页面完成
                               ↓
Task 3.1-3.2 (跨页面功能) → 依赖所有页面基础功能完成
                               ↓
Task 4.1-4.2 (性能优化 + Polish) → 最终整合
```

### Week 8 End Milestone
✅ **Deliverables**:
- Phase 1完整交付
- 所有4个页面功能完整
- 所有46个Critical States实现
- 性能优化完成
- UI/UX一致性达标

---

## 实施策略

### 1. 前后端并行开发

**前端Mock Data策略**:
```typescript
// frontend/src/services/api/mock/kb.mock.ts
export const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: '1',
    name: 'Customer Support KB',
    data_source_count: 3,
    document_count: 150,
    embedding_count: 1245,
    created_at: '2026-01-20T10:00:00Z'
  },
  // ... more mock data
];

// frontend/src/services/api/kb.service.ts
export const getKnowledgeBases = async (): Promise<KnowledgeBase[]> => {
  if (import.meta.env.MODE === 'development' && USE_MOCK_DATA) {
    return mockKnowledgeBases;
  }
  return api.get('/knowledge-bases');
};
```

**切换策略**:
- Week 1-3: 前端使用Mock Data完成UI开发
- Week 4-6: 后端API逐步Ready，前端逐步切换到真实API
- Week 7-8: 全部切换为真实API，Mock Data仅保留测试用途

### 2. 任务追踪模板

```markdown
## Week 1 Progress Tracker

### Documents页 - Day 1-2
- [ ] Task 1.1: SideNav L1导航组件 (4-5小时)
  - Status: 🔄 In Progress
  - Assignee: [Name]
  - Notes: ShadcnUI导航组件已选型

- [ ] Task 1.2: Documents页L2 Context Panel (6-8小时)
  - Status: 📋 Not Started
  - Assignee: -
  - Blockers: 依赖Task 1.1完成

### Backend API - Day 1-2
- [ ] Task B1.1: 新增确认endpoint (2-3小时)
  - Status: ✅ Completed
  - Assignee: [Name]
  - Notes: Unit tests通过
```

### 3. 代码审查检查清单

**前端审查点**:
- [ ] ShadcnUI组件正确使用 (不要自己重新造轮子)
- [ ] TypeScript类型完整定义
- [ ] 响应式设计 (mobile/tablet/desktop)
- [ ] 无障碍访问 (aria-labels, keyboard navigation)
- [ ] Error boundaries处理
- [ ] Loading states实现
- [ ] Empty states实现

**后端审查点**:
- [ ] Repository Pattern正确使用
- [ ] Async/await正确使用
- [ ] 错误处理完整 (try/except + logging)
- [ ] 数据验证 (Pydantic models)
- [ ] Unit tests覆盖率 >80%
- [ ] API documentation (docstrings)
- [ ] Security checks (权限验证)

### 4. 风险缓解计划

**风险1: 后端API开发滞后**
- **缓解**: 前端优先使用Mock Data完成UI，后端可延后至Week 4-6并行开发
- **应急**: 如Week 6后端仍未完成，Phase 1可先交付"UI-only"版本演示

**风险2: Knowledge Base复杂度超预期**
- **缓解**: MVP策略 - Phase 1仅实现Uploaded Docs + Text + Q&A，Website Crawler延后Phase 2
- **应急**: 进一步简化 - 仅保留Uploaded Docs一种Data Source

**风险3: WebSocket实时更新不稳定**
- **缓解**: 复用existing useChatWebSocket hook，已经过生产验证
- **应急**: 降级为定时轮询 (每5秒刷新)

**风险4: 时间不足**
- **缓解**: 每周末进行进度review，及时调整优先级
- **应急**: Critical States中的Nice-to-have项可延后Phase 2 (如"Don't show again"选项)

---

## 验收标准

### Week 2: Documents页
- [ ] 三级导航架构完整实现
- [ ] 上传→OCR→确认流程可演示
- [ ] 所有Document Critical States就位 (Empty, Loading, Error, Confirmation)
- [ ] 移动端响应式正常

### Week 4: Knowledge Base页
- [ ] KB列表 + Overall View展示正常
- [ ] 4种Data Sources类型UI完整 (Uploaded Docs可实际操作)
- [ ] Embeddings生成流程可演示 (至少前端流程)
- [ ] Test Query功能可用
- [ ] 所有KB Critical States就位

### Week 6: AI Assistants页
- [ ] Assistants列表 + Overall View展示正常
- [ ] Conversations Inbox完整实现 (Intercom风格)
- [ ] Public Chat Widget可嵌入测试
- [ ] WebSocket实时对话流畅
- [ ] 所有Assistants Critical States就位

### Week 8: Phase 1完整交付
- [ ] 所有4个页面功能完整
- [ ] 所有46个Phase 1 Critical States实现
- [ ] 前端代码质量: ESLint 0 errors, TypeScript 0 errors
- [ ] 后端代码质量: 单元测试覆盖率 >80%
- [ ] 性能: 首屏加载 <3秒，API响应 <500ms
- [ ] 兼容性: Chrome/Safari/Firefox最新版本
- [ ] 移动端: iPhone/Android正常使用

---

## 下一步行动

### 立即开始 (Week 1 Day 1)

**推荐执行顺序**:

1. **环境准备** (30分钟)
```bash
# 确保开发环境OK
cd backend && uvicorn app.main:app --reload --port 8008
cd frontend && npm run dev

# 验证WebSocket正常 (已修复)
# 验证PostgreSQL + Redis连接
```

2. **创建任务追踪文档** (15分钟)
```bash
# 创建Week 1进度追踪
claudedocs/Week1-Progress-Tracker.md
```

3. **开始Task 1.1: SideNav L1导航组件** (4-5小时)
```typescript
// 文件: frontend/src/shared/components/layout/SideNav.tsx
// 使用ShadcnUI + React Router
```

---

## 总结

**Phase 1总工作量**: 320小时 (40天 full-time equivalent)
- **前端**: 180-200小时 (22-25天)
- **后端**: 68-89小时 (8.5-11天)
- **测试+Polish**: 32小时 (4天)

**关键成功因素**:
1. ✅ **前后端并行**: Mock Data策略确保前端不blocked
2. ✅ **MVP思维**: 可选功能延后Phase 2 (Website Crawler, 通知系统)
3. ✅ **复用现有**: WebSocket hooks, API patterns复用减少开发量
4. ✅ **质量优先**: 每周code review确保技术债可控

**Phase 1完成后效果**:
- 🎯 **完整4页系统**: Documents, KB, Assistants, Dashboard全部就位
- 🎨 **一致UI/UX**: 三级导航架构统一，Critical States完整
- 🚀 **可演示**: 核心功能完整，可进行用户测试和反馈收集
- 📈 **可扩展**: 架构基础solid，Phase 2可快速迭代新功能

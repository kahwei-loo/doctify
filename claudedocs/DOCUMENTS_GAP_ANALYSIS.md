# Documents 功能差异分析报告

> **创建日期**: 2026-01-28
> **分析范围**: 新旧项目 Documents 模块全面对比

---

## 一、核心发现摘要

### 整体评估

| 方面 | 旧项目 | 新项目 | 结论 |
|------|--------|--------|------|
| **架构设计** | Service-based | Redux RTK Query | ✅ 新项目更现代 |
| **组件完整度** | 12 个文件 | 21 个文件 | ✅ 新项目更丰富 |
| **API 端点** | 3 个文件 (完整) | 1 个文件 (有缺失) | ⚠️ 新项目有缺失 |
| **类型定义** | 基础 | 全面 | ✅ 新项目更好 |
| **错误处理** | 基础 | 完善 | ✅ 新项目更好 |

### 关键结论

**新项目的优势**:
- 更现代的架构 (Redux RTK Query)
- 更丰富的 UI 组件 (错误状态、确认流程)
- 更好的 PDF 渲染 (react-pdf)
- 更完善的类型定义

**新项目的缺失** (需要修复):
- 🔴 无法保存编辑后的 OCR 结果
- 🔴 无法下载/预览原始文件
- 🟡 导出功能不完整

---

## 二、前端组件对比

### 2.1 Document Preview 组件

| 功能 | 旧项目 | 新项目 | 状态 |
|------|--------|--------|------|
| PDF 支持 | `<object>` 标签 | **react-pdf** | ✅ 新项目更好 |
| 图片预览 | `<img>` 标签 | 统一 ImagePreview | ✅ 新项目更好 |
| 缩放控制 | 50%-200% 手动 | 0.5-3x 比例 | ✅ 新项目更好 |
| 翻页导航 | 按钮 | 输入框+按钮 | ✅ 新项目更好 |
| 旋转支持 | ❌ 缺失 | ✅ 90°旋转 | ✅ **新功能** |
| 键盘导航 | ❌ 缺失 | ✅ 方向键、+/-、R、0 | ✅ **新功能** |
| 错误处理 | 基础 fallback | 详细错误状态 | ✅ 新项目更好 |
| PDF 安全 | ❌ 缺失 | ✅ 禁用 JavaScript | ✅ **新功能** |

### 2.2 提取结果组件

| 功能 | 旧项目 | 新项目 | 状态 |
|------|--------|--------|------|
| 结果展示 | ResultPanel + Tabs | ExtractedStructuredView | ✅ 重构 |
| 编辑模式 | ✅ 编辑/取消/保存 | ✅ 完整编辑流程 | ✅ 两者都有 |
| 置信度显示 | Badge | 增强 Tooltip | ✅ 新项目更好 |
| JSON 视图 | ✅ Tabs 切换 | ✅ 可用 | ✅ 两者都有 |
| 行项目表格 | ❌ 缺失 | ✅ **LineItemsTable** | ✅ **新功能** |
| 编辑历史 | ❌ 缺失 | ✅ **EditHistoryPanel** | ✅ **新功能** |
| 字段变更追踪 | ❌ 缺失 | ✅ FieldChange[] | ✅ **新功能** |
| 草稿恢复 | ❌ 缺失 | ✅ **RestoreDraftDialog** | ✅ **新功能** |

### 2.3 错误状态组件 (新项目独有)

| 组件 | 用途 |
|------|------|
| **OCRErrorState** | OCR 处理失败的详细错误展示 |
| **NetworkErrorState** | 网络故障处理 |
| **CorruptedFileError** | 文件损坏检测 |
| **UnsupportedPreview** | 不支持格式的 fallback |

### 2.4 布局组件

| 功能 | 旧项目 | 新项目 | 状态 |
|------|--------|--------|------|
| 分屏布局 | 左右 Sidebar | **DocumentSplitView** 可调整 | ✅ 新项目更好 |
| 可调整面板 | ✅ 手动调整比例 | ✅ 可拖拽分隔条 | ✅ 两者都有 |
| 移动端响应 | 基础响应式 | ✅ 优化移动布局 | ✅ 新项目更好 |
| 文档确认 | ❌ 缺失 | ✅ **DocumentConfirmationView** | ✅ **新功能** |
| 处理状态 | 简单 Badge | **ProcessingStatus** 带进度 | ✅ **新功能** |

---

## 三、后端 API 对比

### 3.1 文档基础 API

| 端点 | 旧项目 | 新项目 | 状态 |
|------|--------|--------|------|
| `POST /documents/upload` | ✅ | ✅ | ✅ 两者都有 |
| `GET /documents/{id}` | ✅ | ✅ | ✅ 两者都有 |
| `GET /documents` | ✅ | ✅ | ✅ 两者都有 |
| `PUT /documents/{id}/process` | ✅ | ✅ | ✅ 两者都有 |
| `PATCH /documents/{id}/result` | ✅ | ❌ | 🔴 **新项目缺失** |
| `DELETE /documents/{id}` | ❌ | ✅ | ✅ **新功能** |
| `POST /documents/{id}/retry` | ❌ | ✅ | ✅ **新功能** |
| `POST /documents/{id}/cancel` | ❌ | ✅ | ✅ **新功能** |

### 3.2 文件服务 API

| 端点 | 旧项目 | 新项目 | 状态 |
|------|--------|--------|------|
| `GET /documents/{id}/file/preview` | ✅ 图片 URL | ❌ | 🔴 **新项目缺失** |
| `GET /documents/{id}/file/download` | ✅ | ❌ | 🔴 **新项目缺失** |

### 3.3 导出 API

| 端点 | 旧项目 | 新项目 | 状态 |
|------|--------|--------|------|
| `POST /documents/{id}/exports` | ✅ create_export_job | ✅ export_document | ✅ 两者都有 |
| `GET /documents/{id}/exports` | ✅ 导出历史 | ❌ | 🟡 **新项目缺失** |
| `GET /exports/{id}` | ✅ 导出状态 | ❌ | 🟡 **新项目缺失** |
| `GET /exports/{id}/download` | ✅ 下载导出 | ❌ | 🔴 **新项目缺失** |

### 3.4 质量验证 API (新项目独有)

| 端点 | 用途 |
|------|------|
| `POST /documents/{id}/validate` | 验证提取质量 |
| `POST /documents/{id}/confirm` | 确认 OCR 结果 |

### 3.5 WebSocket API

| 端点 | 旧项目 | 新项目 | 状态 |
|------|--------|--------|------|
| `WS /documents/{id}` | ✅ | ✅ (via hooks) | ✅ 两者都有 |
| `WS /documents-list` | ✅ | ✅ (via hooks) | ✅ 两者都有 |
| 进度更新 | 基础 | ✅ 增强进度 | ✅ 新项目更好 |

---

## 四、类型定义对比

### 4.1 文档状态

```typescript
// 权威定义 (app/domain/entities/document.py): 5 种状态
type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// ⚠️ 注意: app/models/document.py 有不同定义 (processed, archived)
// 这是代码 bug，需要统一
```

### 4.2 新项目独有类型

```typescript
// 提取结果
interface ExtractionResult {
  text: string;
  confidence: number;
  metadata: Record<string, any>;
}

// 提取实体
interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  position: { page: number; x: number; y: number };
}

// 字段变更记录
interface FieldChange {
  field: string;
  original_value: any;
  new_value: any;
  changed_at: string;
  changed_by: string;
}

// 质量验证
interface QualityValidation {
  overall_confidence: number;
  low_confidence_fields: string[];
  validation_warnings: string[];
}
```

---

## 五、Hooks 和状态管理对比

### 5.1 自定义 Hooks

| Hook | 旧项目 | 新项目 | 状态 |
|------|--------|--------|------|
| useDocumentListWebSocket | ✅ | ✅ | ✅ 两者都有 |
| useDocumentUpload | ✅ | ✅ | ✅ 两者都有 |
| useDocumentProgressWebSocket | ✅ | ✅ useDocumentWebSocket | ✅ 类似 |
| useDocumentProcessing | ❌ | ✅ | ✅ **新功能** |
| useDocuments | ❌ | ✅ | ✅ **新功能** |

### 5.2 状态管理

| 功能 | 旧项目 | 新项目 |
|------|--------|--------|
| API 层 | Service-based | Redux RTK Query |
| 状态切片 | ❌ | documentsSlice.ts |
| 选择器 | ❌ | documentsSelectors.ts |
| 缓存 | 手动 | RTK Query 自动缓存 |

---

## 六、关键缺失功能 (需修复)

### 🔴 严重 (阻塞核心功能)

#### 1. 更新文档结果 API
```
PATCH /api/v1/documents/{id}/result

用途: 保存用户编辑后的 OCR 结果
影响: 用户无法保存对提取数据的修改
优先级: P0 - 必须立即修复
```

#### 2. 文件下载 API
```
GET /api/v1/documents/{id}/file/download

用途: 下载原始上传文件
影响: 用户无法下载已上传的文档
优先级: P0 - 必须立即修复
```

#### 3. 文件预览 API
```
GET /api/v1/documents/{id}/file/preview

用途: 获取文件预览 (图片/PDF)
影响: DocumentPreview 组件无法正确加载文件
优先级: P0 - 必须立即修复
```

### 🟡 中等 (影响完整性)

#### 4. 导出下载 API
```
GET /api/v1/exports/{id}/download

用途: 下载生成的导出文件
影响: 导出功能形同虚设
优先级: P1 - 尽快修复
```

#### 5. 导出历史 API
```
GET /api/v1/documents/{id}/exports

用途: 查看文档的导出历史
影响: 用户无法查看之前的导出记录
优先级: P2 - 可以延后
```

---

## 七、修复计划建议

### Phase 1: 关键修复 (本周)

| 任务 | 说明 | 预估 |
|------|------|------|
| 实现 `PATCH /documents/{id}/result` | 保存编辑结果 | 2h |
| 实现 `GET /documents/{id}/file/download` | 文件下载 | 1h |
| 实现 `GET /documents/{id}/file/preview` | 文件预览 | 1h |
| 修复 DocumentPreview 文件加载 | 前端对接 | 2h |
| 端到端测试编辑流程 | 验证 | 1h |

### Phase 2: 导出功能 (下周)

| 任务 | 说明 | 预估 |
|------|------|------|
| 实现 `GET /exports/{id}` | 导出状态查询 | 1h |
| 实现 `GET /exports/{id}/download` | 导出下载 | 1h |
| 实现 `GET /documents/{id}/exports` | 导出历史 | 1h |
| 前端导出 UI 完善 | 对接 | 2h |

### Phase 3: 增强功能 (可选)

| 任务 | 说明 | 优先级 |
|------|------|--------|
| 批量导出 | 同时导出多个文档 | 低 |
| 导出模板 | 自定义导出格式 | 低 |
| 高级过滤 | 更多筛选条件 | 低 |

---

## 八、文件清单

### 旧项目前端 (12 个文件)
```
frontend/src/
├── pages/
│   ├── DocumentsPage.tsx
│   └── DocumentDetailPage.tsx
├── components/
│   ├── DocumentPreviewPanel.tsx
│   ├── ResultPanel.tsx
│   ├── DocumentTable.tsx
│   ├── DocumentFilters.tsx
│   ├── DocumentStatusBadge.tsx
│   └── BatchActionBar.tsx
├── services/
│   └── documentService.ts
└── hooks/
    ├── useDocumentListWebSocket.ts
    └── useDocumentUpload.ts
```

### 新项目前端 (21 个文件)
```
frontend/src/features/documents/
├── components/
│   ├── DocumentPreview.tsx           # PDF/图片预览
│   ├── DocumentSplitView.tsx         # 分屏布局
│   ├── DocumentConfirmationView.tsx  # 确认流程
│   ├── ExtractedStructuredView.tsx   # 结构化数据
│   ├── LineItemsTable.tsx            # 行项目表格
│   ├── EditHistoryPanel.tsx          # 编辑历史
│   ├── ProcessingStatus.tsx          # 处理状态
│   ├── OCRErrorState.tsx             # OCR 错误
│   ├── NetworkErrorState.tsx         # 网络错误
│   ├── CorruptedFileError.tsx        # 文件损坏
│   ├── RestoreDraftDialog.tsx        # 草稿恢复
│   ├── DeleteDocumentsDialog.tsx     # 删除确认
│   ├── DocumentTable.tsx             # 文档列表
│   ├── DocumentTableSkeleton.tsx     # 加载骨架
│   ├── EmptyDocumentsState.tsx       # 空状态
│   └── UploadQueue.tsx               # 上传队列
├── hooks/
│   ├── useDocuments.ts
│   ├── useDocumentProcessing.ts
│   ├── useDocumentWebSocket.ts
│   ├── useDocumentUpload.ts
│   └── useDocumentListWebSocket.ts
├── services/
│   └── documentsApi.ts               # RTK Query API
├── store/
│   ├── documentsSlice.ts
│   └── documentsSelectors.ts
└── types/
    └── index.ts                      # 类型定义
```

### 旧项目后端 (3 个文件)
```
backend/app/api/v1/endpoints/
├── documents.py           # 基础 CRUD
├── documents_export.py    # 导出功能
└── documents_ws.py        # WebSocket
```

### 新项目后端 (1 个文件)
```
backend/app/api/v1/endpoints/
└── documents.py           # 所有操作 (573 行)
                           # 缺少: 文件服务、导出管理
```

---

## 九、结论

### 新项目优势
1. ✅ 更现代的架构 (Redux RTK Query)
2. ✅ 更完善的 UI 组件 (错误处理、确认流程)
3. ✅ 更好的 PDF 渲染 (react-pdf)
4. ✅ 更全面的类型定义
5. ✅ 新增功能 (重试、取消、验证、确认)

### 新项目需要修复
1. 🔴 无法保存 OCR 编辑结果 (`PATCH /result`)
2. 🔴 无法下载原始文件 (`GET /file/download`)
3. 🔴 无法预览文件 (`GET /file/preview`)
4. 🟡 导出功能不完整

### 工作量估计
- **关键修复**: 1 周
- **完整功能对等**: 2-3 周

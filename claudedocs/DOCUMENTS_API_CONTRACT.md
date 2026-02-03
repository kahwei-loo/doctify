# Documents/OCR 模块 - 功能清单与 API 契约

> **创建日期**: 2026-01-28
> **状态**: 规范文档 (开发和验收依据)
> **监督者**: KahWei

---

## 一、文档一致性审查结果

### 发现的不一致问题

| # | 问题 | 涉及文档 | 解决方案 |
|---|------|----------|----------|
| 1 | **字段命名规范冲突** | RESTORATION_PLAN.md 使用 `snake_case`，FRONTEND_REDESIGN_REQUIREMENTS.md 示例使用 `camelCase` | ✅ 统一采用 RESTORATION_PLAN.md 的规范：后端 `snake_case`，前端接收后自动转换 |
| 2 | **行项目字段名** | RESTORATION_PLAN.md: `line_items`，FRONTEND_REDESIGN_REQUIREMENTS.md: `lineItems` | ✅ 后端 `line_items`，前端显示/JS 变量可用 `lineItems` |
| 3 | **API 路径结构** | RESTORATION_PLAN.md: `/documents/{id}/download`，GAP_ANALYSIS.md: `/documents/{id}/file/download` | ✅ 统一采用 `/documents/{id}/file/download` (语义更清晰) |
| 4 | **Sample Output 命名** | FRONTEND_REDESIGN_REQUIREMENTS.md 示例使用 `buyerName`, `documentNo` | ✅ **注意**: Sample Output 是用户自定义的 AI 输出格式，命名由用户决定，不受后端规范约束 |

### 统一规范

```
后端 (Python/PostgreSQL): snake_case
  - field_name, default_value, line_items, expected_json_output

前端 (TypeScript):
  - API 响应自动转换 (axios 拦截器)
  - 内部变量可使用 camelCase
  - 类型定义保持与后端一致 (snake_case)

用户自定义 (Sample Output):
  - 用户可自由选择命名风格 (这是 AI 输出格式，不是系统字段)
```

---

## 二、功能清单

### 2.1 Project Configuration (项目配置)

| # | 功能 | 描述 | 优先级 | 状态 |
|---|------|------|--------|------|
| P1.1 | 创建项目配置 | 创建新的 OCR 提取模板 | P0 | ⏳ 待开发 |
| P1.2 | 编辑项目配置 | 修改现有配置 | P0 | ⏳ 待开发 |
| P1.3 | 字段配置 (Fields) | 添加/编辑/删除提取字段 | P0 | ⏳ 待开发 |
| P1.4 | 表格配置 (Table) | 配置表格列定义 | P0 | ⏳ 待开发 |
| P1.5 | Sample Output 编辑 | JSON 格式的期望输出 | P0 | ⏳ 待开发 |
| P1.6 | 配置版本管理 | 支持多版本配置 | P2 | ⏳ 延后 |

### 2.2 Document Upload (文档上传)

| # | 功能 | 描述 | 优先级 | 状态 |
|---|------|------|--------|------|
| D1.1 | 单文件上传 | 上传单个文档 | P0 | ✅ 已完成 |
| D1.2 | 批量上传 | 同时上传多个文件 | P0 | ✅ 已完成 |
| D1.3 | 拖拽上传 | 拖拽文件到上传区 | P1 | ✅ 已完成 |
| D1.4 | 上传进度显示 | 实时显示上传进度 | P0 | ✅ 已完成 |
| D1.5 | 文件类型验证 | PDF, PNG, JPG, JPEG, TIFF | P0 | ✅ 已完成 |
| D1.6 | 文件大小限制 | 最大 10MB | P0 | ✅ 已完成 |

### 2.3 Document Processing (文档处理)

| # | 功能 | 描述 | 优先级 | 状态 |
|---|------|------|--------|------|
| D2.1 | OCR 处理 | 自动触发 OCR 提取 | P0 | ✅ 已完成 |
| D2.2 | 处理状态显示 | pending/processing/completed/failed | P0 | ✅ 已完成 |
| D2.3 | 重试处理 | 失败后可重试 | P0 | ✅ 已完成 |
| D2.4 | 取消处理 | 取消进行中的处理 | P1 | ✅ 已完成 |
| D2.5 | WebSocket 进度 | 实时更新处理进度 | P0 | ✅ 已完成 |

### 2.4 Document Preview (文档预览)

| # | 功能 | 描述 | 优先级 | 状态 |
|---|------|------|--------|------|
| D3.1 | PDF 预览 | 显示 PDF 文件内容 | P0 | ⚠️ API 缺失 |
| D3.2 | 图片预览 | 显示 PNG/JPG 图片 | P0 | ⚠️ API 缺失 |
| D3.3 | 缩放控制 | 50%-200% 缩放 | P1 | ✅ 前端已实现 |
| D3.4 | 翻页导航 | PDF 多页导航 | P1 | ✅ 前端已实现 |
| D3.5 | 旋转支持 | 90° 旋转 | P2 | ✅ 前端已实现 |
| D3.6 | 文件下载 | 下载原始文件 | P0 | ⚠️ API 缺失 |

### 2.5 Extraction Result (提取结果)

| # | 功能 | 描述 | 优先级 | 状态 |
|---|------|------|--------|------|
| D4.1 | 结构化视图 | 以表单形式展示提取结果 | P0 | ✅ 已完成 |
| D4.2 | JSON 视图 | 原始 JSON 格式展示 | P0 | ✅ 已完成 |
| D4.3 | 置信度显示 | 显示字段和整体置信度 | P0 | ✅ 已完成 |
| D4.4 | 行项目表格 | 展示 line_items 数据 | P0 | ✅ 已完成 |
| D4.5 | 编辑提取结果 | 用户可修正 OCR 结果 | P0 | ⚠️ API 缺失 |
| D4.6 | 保存编辑结果 | 持久化用户修改 | P0 | ⚠️ API 缺失 |
| D4.7 | 确认结果 | 确认 OCR 结果正确 | P1 | ✅ API 已实现 |

### 2.6 Document Export (文档导出)

| # | 功能 | 描述 | 优先级 | 状态 |
|---|------|------|--------|------|
| D5.1 | 创建导出任务 | 生成导出文件 | P1 | ✅ 已完成 |
| D5.2 | 下载导出文件 | 下载生成的文件 | P1 | ⚠️ API 缺失 |
| D5.3 | 导出历史 | 查看导出记录 | P2 | ⏳ 延后 |
| D5.4 | 批量导出 | 同时导出多个文档 | P2 | ⏳ 延后 |

---

## 三、API 契约

### 3.1 Project Configuration API

#### `POST /api/v1/projects/{project_id}/config`
**创建项目配置**

```json
// Request
{
  "project_title": "Invoice Extraction",
  "project_description": "Extract data from invoices",
  "message_content": "{\"fields\":[...],\"table\":{...}}",
  "expected_json_output": "{\"document_no\":\"\",\"line_items\":[]}"
}

// Response 201
{
  "id": "uuid",
  "project_id": "uuid",
  "project_title": "Invoice Extraction",
  "project_description": "Extract data from invoices",
  "message_content": "{...}",
  "expected_json_output": "{...}",
  "version": "1.0",
  "is_default": true,
  "created_at": "2026-01-28T10:00:00Z",
  "updated_at": "2026-01-28T10:00:00Z"
}
```

#### `GET /api/v1/projects/{project_id}/config`
**获取项目配置**

```json
// Response 200
{
  "id": "uuid",
  "project_id": "uuid",
  "project_title": "Invoice Extraction",
  "project_description": "...",
  "message_content": "{...}",
  "expected_json_output": "{...}",
  "version": "1.0",
  "is_default": true,
  "created_at": "...",
  "updated_at": "..."
}
```

#### `PUT /api/v1/projects/{project_id}/config`
**更新项目配置**

```json
// Request
{
  "project_title": "Updated Title",
  "project_description": "Updated description",
  "message_content": "{...}",
  "expected_json_output": "{...}"
}

// Response 200
{ ... } // 同创建响应
```

---

### 3.2 Document CRUD API

#### `POST /api/v1/documents/upload`
**上传文档** ✅ 已实现

```json
// Request: multipart/form-data
// - file: File (required)
// - project_id: string (required)

// Response 201
{
  "id": "uuid",
  "filename": "invoice.pdf",
  "file_type": "application/pdf",
  "file_size": 102400,
  "status": "pending",
  "project_id": "uuid",
  "created_at": "2026-01-28T10:00:00Z"
}
```

#### `GET /api/v1/documents/{id}`
**获取文档详情** ✅ 已实现

```json
// Response 200
{
  "id": "uuid",
  "filename": "invoice.pdf",
  "file_type": "application/pdf",
  "file_size": 102400,
  "status": "completed",
  "project_id": "uuid",
  "extraction_result": {
    "document_no": "INV-001",
    "document_date": "2026-01-28",
    "line_items": [...]
  },
  "confidence": 0.95,
  "created_at": "...",
  "updated_at": "..."
}
```

#### `GET /api/v1/documents`
**获取文档列表** ✅ 已实现

```json
// Query Parameters
// - project_id: string (optional)
// - status: string (optional)
// - page: int (default: 1)
// - per_page: int (default: 20)

// Response 200
{
  "items": [...],
  "total": 100,
  "page": 1,
  "per_page": 20,
  "pages": 5
}
```

#### `DELETE /api/v1/documents/{id}`
**删除文档** ✅ 已实现

```json
// Response 204 No Content
```

---

### 3.3 Document Processing API

#### `PUT /api/v1/documents/{id}/process`
**触发 OCR 处理** ✅ 已实现

```json
// Response 202
{
  "id": "uuid",
  "status": "processing",
  "message": "Processing started"
}
```

#### `POST /api/v1/documents/{id}/retry`
**重试处理** ✅ 已实现

```json
// Response 202
{
  "id": "uuid",
  "status": "processing",
  "message": "Retry initiated"
}
```

#### `POST /api/v1/documents/{id}/cancel`
**取消处理** ✅ 已实现

```json
// Response 200
{
  "id": "uuid",
  "status": "cancelled"
}
```

---

### 3.4 File Service API ⚠️ 待实现

#### `GET /api/v1/documents/{id}/file/preview`
**获取文件预览** ⚠️ 待实现

```
// Response 200
// Content-Type: image/png | image/jpeg | application/pdf
// Body: Binary file content

// Error Response 404
{
  "detail": "File not found"
}
```

#### `GET /api/v1/documents/{id}/file/download`
**下载原始文件** ⚠️ 待实现

```
// Response 200
// Content-Type: application/octet-stream
// Content-Disposition: attachment; filename="invoice.pdf"
// Body: Binary file content
```

---

### 3.5 Extraction Result API ⚠️ 部分待实现

#### `PATCH /api/v1/documents/{id}/result`
**保存编辑后的提取结果** ⚠️ 待实现

```json
// Request
{
  "extraction_result": {
    "document_no": "INV-001-CORRECTED",
    "document_date": "2026-01-29",
    "line_items": [...]
  }
}

// Response 200
{
  "id": "uuid",
  "extraction_result": {...},
  "updated_at": "2026-01-28T11:00:00Z"
}
```

#### `POST /api/v1/documents/{id}/confirm`
**确认 OCR 结果** ✅ 已实现

```json
// Response 200
{
  "id": "uuid",
  "status": "confirmed",
  "confirmed_at": "2026-01-28T11:00:00Z"
}
```

#### `POST /api/v1/documents/{id}/validate`
**验证提取质量** ✅ 已实现

```json
// Response 200
{
  "overall_confidence": 0.92,
  "low_confidence_fields": ["buyer_address"],
  "validation_warnings": ["Field 'buyer_phone' has low confidence"]
}
```

---

### 3.6 Export API ⚠️ 部分待实现

#### `POST /api/v1/documents/{id}/export`
**创建导出任务** ✅ 已实现

```json
// Request
{
  "format": "json" | "csv" | "xlsx"
}

// Response 202
{
  "export_id": "uuid",
  "status": "processing",
  "format": "json"
}
```

#### `GET /api/v1/exports/{id}/download`
**下载导出文件** ⚠️ 待实现

```
// Response 200
// Content-Type: application/json | text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// Content-Disposition: attachment; filename="export_invoice_001.json"
// Body: Export file content
```

---

## 四、数据模型规范

### 4.1 Field Definition (字段定义)

```typescript
// 后端 Pydantic Model (snake_case)
interface FieldDefinition {
  name: string;              // 字段名 (必填)
  description: string;       // 字段描述 (默认: "")
  required: boolean;         // 是否必填 (默认: false)
  type: OutputType;          // 类型 (默认: "text")
  default_value: string;     // 默认值 (默认: "")
  fixed_value: string;       // 固定值 (默认: "")
}

type OutputType = "text" | "number" | "date" | "boolean";
```

### 4.2 Column Definition (列定义)

```typescript
interface ColumnDefinition {
  name: string;              // 列名 (必填)
  description: string;       // 列描述 (默认: "")
  required: boolean;         // 是否必填 (默认: false)
  type: OutputType;          // 类型 (默认: "text")
  default_value: string;     // 默认值 (默认: "")
  fixed_value: string;       // 固定值 (默认: "")
}
```

### 4.3 Table Configuration (表格配置)

```typescript
interface TableConfiguration {
  description: string;           // 表格描述 (默认: "")
  columns: ColumnDefinition[];   // 列定义列表
}
```

### 4.4 Message Content (配置内容)

```typescript
interface MessageContent {
  fields: FieldDefinition[];         // 字段配置
  table: TableConfiguration;         // 表格配置 (单表格)
}
```

### 4.5 Document Status (文档状态)

```typescript
// 权威定义 (来自 app/domain/entities/document.py)
// ✅ 所有层级已统一使用此定义
type DocumentStatus =
  | "pending"      // 等待处理
  | "processing"   // 处理中
  | "completed"    // 处理完成
  | "failed"       // 处理失败
  | "cancelled";   // 已取消
```

---

## 五、验收清单

### 5.1 Phase 1: 核心功能 (必须通过)

- [ ] **Project Configuration**
  - [ ] 可创建项目配置
  - [ ] 可添加/编辑/删除字段 (Field Configuration)
  - [ ] 可配置表格列 (Table Configuration)
  - [ ] Sample Output JSON 编辑器工作正常
  - [ ] 配置保存到数据库

- [ ] **Document Preview**
  - [ ] PDF 文件可预览 (`GET /documents/{id}/file/preview`)
  - [ ] 图片文件可预览
  - [ ] 原始文件可下载 (`GET /documents/{id}/file/download`)

- [ ] **Extraction Result**
  - [ ] 编辑后可保存 (`PATCH /documents/{id}/result`)
  - [ ] 修改后状态正确更新

### 5.2 Phase 2: 完整功能 (应该通过)

- [ ] **Export**
  - [ ] 可下载导出文件 (`GET /exports/{id}/download`)

- [ ] **OCR Integration**
  - [ ] OCR 处理使用 Project Config
  - [ ] 提取结果符合配置结构

### 5.3 Phase 3: 增强功能 (可以延后)

- [ ] 导出历史记录
- [ ] 批量导出
- [ ] 配置版本管理

---

## 六、待开发 API 汇总

| 优先级 | API | 说明 |
|--------|-----|------|
| **P0** | `GET /documents/{id}/file/preview` | 文件预览 |
| **P0** | `GET /documents/{id}/file/download` | 文件下载 |
| **P0** | `PATCH /documents/{id}/result` | 保存编辑结果 |
| **P0** | `POST /projects/{id}/config` | 创建配置 |
| **P0** | `GET /projects/{id}/config` | 获取配置 |
| **P0** | `PUT /projects/{id}/config` | 更新配置 |
| **P1** | `GET /exports/{id}/download` | 下载导出 |

---

## 七、已修复的代码问题

### 7.1 ✅ DocumentStatus 定义不一致 - 已修复

**原问题**: 两个文件中的 `DocumentStatus` 定义不同

| 文件 | 修复前 | 修复后 |
|------|--------|--------|
| `app/domain/entities/document.py` | pending, processing, completed, failed, cancelled | ✅ 不变 (权威来源) |
| `app/models/document.py` | pending, processing, ~~processed~~, failed, ~~archived~~ | ✅ 导入 domain entity |

**修复方案**: `models/document.py` 移除重复定义，改为从 domain entity 导入

### 7.2 ✅ 前端 DocumentStatus 冗余值 - 已修复

**文件**: `frontend/src/features/documents/types/index.ts`

| 修复前 | 修复后 |
|--------|--------|
| 7 个值 (合并两个后端定义) | 5 个值 (与 domain entity 一致) |

```typescript
// ✅ 修复后
type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
```

---

*文档创建者: Claude (Product Owner)*
*最后更新: 2026-01-28*
*版本: 1.2 (修复 DocumentStatus 代码不一致问题)*

# Doctify UI Wireframes - Phase 1

**Created**: 2025-01-25
**Purpose**: 详细UI设计规格，用于前端重构

---

## 页面结构总览

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Doctify                    [User] [Settings] [Help] │ ← Global Header
├─────────────────────────────────────────────────────────────┤
│ [Dashboard] [Documents] [Knowledge Base] [AI Assistants]   │ ← Main Navigation
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                     Page Content                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**导航状态**:
- Active: 蓝色底色 + 粗体文字
- Hover: 浅灰背景
- Inactive: 默认灰色文字

---

## 1. Dashboard Page（概览页）

### 布局设计

```
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard*   Documents   Knowledge Base   AI Assistants          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Welcome back, [User Name]! 👋                                   │
│  Here's what's happening with your documents                     │
│                                                                  │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌────────────┐│
│  │ 📄 Documents        │ │ 💬 Conversations    │ │ 📊 Usage   ││
│  │                     │ │                     │ │            ││
│  │   245               │ │   1,234             │ │ OCR: 45/500││
│  │   Total Uploaded    │ │   This Month        │ │ ████░░░░░  ││
│  │                     │ │                     │ │            ││
│  │   +12 this week     │ │   +89 this week     │ │ RAG:120/1K ││
│  └─────────────────────┘ └─────────────────────┘ │ ██████░░░░ ││
│                                                   └────────────┘│
│                                                                  │
│  Quick Actions:                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ 📤 Upload    │ │ 🤖 New Bot   │ │ 💡 Ask AI    │           │
│  │   Document   │ │   Assistant  │ │   Question   │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                  │
│  Recent Activity:                                [View All →]   │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 📄 Invoice_2025_01.pdf processed                           ││
│  │ 2 hours ago • ✅ 94% confidence                            ││
│  └────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 💬 New conversation on WhatsApp                            ││
│  │ 5 hours ago • Customer Support Bot                         ││
│  └────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 📚 Customer Support KB updated                             ││
│  │ Yesterday • 12 new documents added                         ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
│  AI Assistants Performance:                                      │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 🤖 Customer Support Bot                                    ││
│  │ Conversations: 234 | Avg Response Time: 1.2s               ││
│  │ User Satisfaction: ⭐⭐⭐⭐⭐ 4.8/5.0                         ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 组件规格

**统计卡片 (Stats Cards)**:
- 尺寸: 等宽3列，自适应高度
- 内容: 大数字（36px）+ 描述（14px）+ 趋势（12px绿色/红色）
- 图标: 左上角，32px
- 间距: 卡片之间 16px gap

**Quick Actions**:
- 样式: 大按钮，带图标和文字
- 交互: Hover时轻微上浮（transform: translateY(-2px)）
- 点击: 跳转到对应页面或打开modal

**Activity Feed**:
- 每项高度: 60px
- 显示: 最近5条，可展开查看更多
- 时间: 相对时间（2 hours ago, Yesterday）
- 状态图标: ✅ 成功, ⚠️ 警告, ❌ 失败

### 需要的API

```typescript
// 现有API (假设已有)
GET /api/v1/dashboard/stats
Response: {
  documents: {
    total: 245,
    this_week: 12,
    trend: "up" | "down"
  },
  conversations: {
    total: 1234,
    this_week: 89
  },
  usage: {
    ocr: { used: 45, quota: 500 },
    rag: { used: 120, quota: 1000 }
  }
}

GET /api/v1/dashboard/activity?limit=5
Response: {
  activities: [
    {
      id: "act_1",
      type: "document_processed" | "conversation" | "kb_updated",
      title: "Invoice_2025_01.pdf processed",
      description: "✅ 94% confidence",
      timestamp: "2025-01-25T10:00:00Z",
      link?: "/documents/doc_123"
    }
  ]
}

GET /api/v1/assistants/performance
Response: {
  assistants: [
    {
      id: "ast_1",
      name: "Customer Support Bot",
      conversations_count: 234,
      avg_response_time: 1.2,
      satisfaction_score: 4.8
    }
  ]
}
```

### 需要新增的功能

- ❌ **Activity Feed聚合** - 需要后端聚合documents/conversations/knowledge_base的最近活动
- ❌ **AI Assistant性能统计** - 需要计算平均响应时间、满意度评分（如果有反馈功能）
- ✅ **Stats API** - 可能已经有部分，需要补充趋势计算

---

## 2. Documents Page（文档管理页）

### 2.1 主视图 - 文件夹浏览

```
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard   Documents*   Knowledge Base   AI Assistants          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📁 My Documents                          [+ New Folder] [View▼]│
│  ────────────────────────────────────────────────────────────── │
│  📂 Invoices (24 files)                              [•••]       │
│  📂 Receipts (15 files)                              [•••]       │
│  📂 Contracts (3 files)                              [•••]       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                                                            │ │
│  │              📤 Drag & Drop Files Here                     │ │
│  │                                                            │ │
│  │          or click to browse your computer                 │ │
│  │                                                            │ │
│  │       Supported: PDF, PNG, JPG • Max 10MB per file        │ │
│  │                                                            │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                      [?] Help    │
│                                                                  │
│  Recent Uploads:                                  [View All →]  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📄 Invoice_2025_01.pdf           ⚠️ 76% Confidence        │ │
│  │ Date: 2025-01-15 • Amount: RM 1,234.56                    │ │
│  │ Status: Pending Review                                    │ │
│  │ [✅ Confirm] [✏️ Edit Details] [🗑️ Delete]                │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 📄 Receipt_001.jpg              ✅ 94% Confidence         │ │
│  │ Date: 2025-01-10 • Amount: RM 45.00                       │ │
│  │ Status: ✅ Confirmed                                       │ │
│  │ [👁️ View] [📥 Download]                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Usage This Month:                                               │
│  OCR: 45/500  ████████░░░░░░░░░░░░  9%                         │
│  Next reset: Feb 1, 2025                                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 上传工作流程1 - 需要选择文件夹

```
用户拖拽文件到上传区域
         ↓
┌────────────────────────────────────────┐
│ 📤 Upload to Folder                    │
│                                        │
│ You dropped 3 files:                  │
│ • Invoice_2025_01.pdf                 │
│ • Invoice_2025_02.pdf                 │
│ • Receipt_001.jpg                     │
│                                        │
│ Select destination folder:             │
│ ┌────────────────────────────────────┐│
│ │ 📂 Invoices                        ││
│ │ 📂 Receipts                        ││
│ │ 📂 Contracts                       ││
│ │ ──────────────────────────────────││
│ │ [+ Create New Folder]              ││
│ └────────────────────────────────────┘│
│                                        │
│        [Cancel]  [Upload to Folder]   │
└────────────────────────────────────────┘
```

### 2.3 上传工作流程2 - 直接拖到文件夹

```
用户拖拽文件到"📂 Invoices"文件夹
         ↓
┌────────────────────────────────────────┐
│ ✅ Confirm Upload                      │
│                                        │
│ Upload 2 files to "Invoices"?         │
│ • Invoice_2025_01.pdf (1.2 MB)        │
│ • Invoice_2025_02.pdf (890 KB)        │
│                                        │
│ These files will be processed with    │
│ OCR and added to your documents.      │
│                                        │
│ Estimated processing time: ~30 sec    │
│                                        │
│        [Cancel]  [✅ Confirm Upload]  │
└────────────────────────────────────────┘
```

### 2.4 OCR处理中状态

```
┌────────────────────────────────────────────────────────────┐
│ Processing Your Documents...                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 📄 Invoice_2025_01.pdf                                 ││
│ │ Status: 🔄 Processing OCR...                           ││
│ │ Progress: ████████████░░░░░░  60%                     ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 📄 Invoice_2025_02.pdf                                 ││
│ │ Status: ⏳ Queued                                       ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ [Close] (Processing continues in background)              │
└────────────────────────────────────────────────────────────┘
```

### 2.5 OCR结果展示 - 需要用户确认

```
┌────────────────────────────────────────────────────────────────┐
│ ✅ OCR Complete - Please Review                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ 📄 Invoice_2025_01.pdf                    ⚠️ 76% Confidence   │
│                                                                │
│ Extracted Data:                           [Edit All Fields]   │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Invoice Number: INV-2025-001            ⚠️ 65%           │  │
│ │ ┌────────────────────────┐                              │  │
│ │ │ INV-2025-001           │ [Edit]                       │  │
│ │ └────────────────────────┘                              │  │
│ │                                                          │  │
│ │ Date: 2025-01-15                        ✅ 89%           │  │
│ │ ┌────────────────────────┐                              │  │
│ │ │ 2025-01-15             │ [Edit]                       │  │
│ │ └────────────────────────┘                              │  │
│ │                                                          │  │
│ │ Total Amount: RM 1,234.56               ✅ 92%           │  │
│ │ ┌────────────────────────┐                              │  │
│ │ │ 1234.56                │ [Edit]                       │  │
│ │ └────────────────────────┘                              │  │
│ │                                                          │  │
│ │ Vendor: ABC Company Sdn Bhd             ✅ 88%           │  │
│ │ ┌────────────────────────┐                              │  │
│ │ │ ABC Company Sdn Bhd    │ [Edit]                       │  │
│ │ └────────────────────────┘                              │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ⚠️ Validation Issues:                                          │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ • Invoice number has low confidence (65%)                │  │
│ │   Please verify the number is correct                    │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ Line Items:                                  [+ Add Item]      │
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Description         Qty    Unit Price    Total           │  │
│ │ ──────────────────────────────────────────────────────   │  │
│ │ Product A            2      RM 500.00    RM 1,000.00     │  │
│ │ Product B            1      RM 234.56    RM 234.56       │  │
│ │                                          ─────────────    │  │
│ │                              Subtotal:   RM 1,234.56     │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                                │
│ ✅ Line items sum matches total amount                         │
│                                                                │
│       [❌ Delete]  [💾 Save as Draft]  [✅ Confirm & Save]    │
└────────────────────────────────────────────────────────────────┘
```

### 组件规格

**Upload Drop Zone**:
- 默认: 虚线边框，浅灰背景
- Drag Over: 蓝色边框，浅蓝背景
- 高度: 200px（桌面），150px（移动）
- 图标: 48px upload icon
- 支持: 点击选择或拖拽

**Folder List**:
- 可折叠: 点击展开显示文件列表
- Drag Target: 可直接拖文件到文件夹上
- Context Menu: 右键显示重命名/删除/移动
- 排序: 默认按名称，支持按时间/大小

**OCR Result Card**:
- Confidence Color Coding:
  - 90-100%: 绿色 ✅
  - 70-89%: 黄色 ⚠️
  - <70%: 红色 ❌
- Editable Fields: 所有字段可点击编辑
- Validation: 实时验证（金额合理性、日期格式）
- Auto-save Draft: 每30秒自动保存草稿

**Progress Indicator**:
- WebSocket实时更新进度
- 失败后显示错误信息和重试按钮
- 支持批量上传（最多10个文件）

### 需要的API

```typescript
// ✅ 现有API (可能需要调整)
POST /api/v1/documents/upload
Request: FormData { files, folder_id }
Response: {
  upload_id: "upl_123",
  files: [
    { file_id: "file_1", status: "queued", task_id: "task_1" }
  ]
}

// WebSocket实时进度
WS /api/v1/documents/progress/{upload_id}
Events: {
  type: "ocr_progress",
  file_id: "file_1",
  progress: 60,
  status: "processing" | "completed" | "failed"
}

// ❌ 需要新增: OCR结果包含置信度
GET /api/v1/documents/{document_id}/ocr-result
Response: {
  document_id: "doc_123",
  status: "pending_review" | "confirmed" | "rejected",
  ocr_data: {
    invoice_number: "INV-2025-001",
    date: "2025-01-15",
    total_amount: 1234.56,
    vendor_name: "ABC Company Sdn Bhd",
    line_items: [...]
  },
  confidence: {
    overall: 0.76,
    fields: {
      invoice_number: 0.65,
      date: 0.89,
      total_amount: 0.92,
      vendor_name: 0.88
    }
  },
  validation_errors: [
    {
      field: "invoice_number",
      message: "Low confidence, please verify",
      severity: "warning"
    }
  ]
}

// ❌ 需要新增: 用户确认OCR结果
POST /api/v1/documents/{document_id}/confirm
Request: {
  ocr_data: { ... },  // 可能被用户编辑过
  user_confirmed: true
}

// ✅ 现有: 文件夹管理（假设已有）
GET /api/v1/folders
POST /api/v1/folders
PUT /api/v1/folders/{folder_id}
DELETE /api/v1/folders/{folder_id}
```

### 需要新增的功能

- ❌ **OCR置信度评分** - AI返回字段级置信度
- ❌ **验证规则引擎** - 金额/日期合理性检查
- ❌ **用户确认流程** - pending_review状态 + 用户编辑
- ❌ **草稿自动保存** - 定时保存未确认的OCR结果
- ✅ **拖拽上传** - 前端实现
- ✅ **文件夹选择** - 如果后端已有folder API

---

## 3. Knowledge Base Page（知识库管理）

### 3.1 主视图 - Sidebar + Cards

```
┌───────┬──────────────────────────────────────────────────────────┐
│       │ Dashboard   Documents   Knowledge Base*   Assistants     │
├───────┼──────────────────────────────────────────────────────────┤
│       │                                                          │
│ 📚 KB │  Customer Support KB              [⚙️ Settings] [+ Add] │
│       │  Last updated: 2 hours ago                               │
│ ├─📁  │  ────────────────────────────────────────────────────── │
│ │├Doc │                                                          │
│ │├Web │  Data Sources:                         [Grid] [List▼]  │
│ │└Q&A │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ │     │  │ 📄       │ │ 🌐       │ │ 💬       │ │ 📝       │  │
│ ├─📁  │  │ Uploaded │ │ Website  │ │ Q&A      │ │ Text     │  │
│ │└All │  │ Docs     │ │ Crawl    │ │ Pairs    │ │ Input    │  │
│ │     │  │          │ │          │ │          │ │          │  │
│ └─📁  │  │ 245 docs │ │ 12 pages │ │ 89 pairs │ │ 5 notes  │  │
│       │  │ ✅ Active│ │ ✅ Active│ │ ✅ Active│ │ ✅ Active│  │
│       │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│       │                                                          │
│       │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│       │  │ 📊       │ │ 🔗       │ │ 📁       │ │ 🔌       │  │
│       │  │ CSV      │ │ Notion   │ │ Drive    │ │ API      │  │
│       │  │ Upload   │ │ Pages    │ │ (Google) │ │ Connect  │  │
│       │  │          │ │          │ │          │ │          │  │
│       │  │ 3 files  │ │ 🚧 Soon  │ │ 🚧 Soon  │ │ 🚧 Soon  │  │
│       │  │ ✅ Active│ │          │ │          │ │          │  │
│       │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│       │                                                          │
│       │  Recent Activity:                        [View All →]   │
│       │  ┌────────────────────────────────────────────────────┐│
│       │  │ 📄 Product FAQ v2.pdf added                        ││
│       │  │ 2 hours ago • 15 pages • Uploaded Docs             ││
│       │  │ [Preview] [Remove]                                 ││
│       │  └────────────────────────────────────────────────────┘│
│       │  ┌────────────────────────────────────────────────────┐│
│       │  │ 🌐 www.example.com/support crawled                 ││
│       │  │ Yesterday • 8 new pages • Website Crawl            ││
│       │  │ [View Pages] [Re-crawl]                            ││
│       │  └────────────────────────────────────────────────────┘│
│       │                                                          │
└───────┴──────────────────────────────────────────────────────────┘
```

### 3.2 Sidebar规格

```
┌─────────────────┐
│ 📚 Knowledge    │ ← Section Header
│    Bases        │
├─────────────────┤
│ ✨ Create New   │ ← 快速创建按钮
├─────────────────┤
│                 │
│ Customer Support│ ← 当前选中 (蓝色背景)
│ └─ 📁 Documents │
│ └─ 🌐 Web Pages │
│ └─ 💬 Q&A       │
│                 │
│ Product Catalog │ ← 其他KB (灰色文字)
│                 │
│ Internal Docs   │
│                 │
└─────────────────┘
```

**Sidebar交互**:
- Click KB名称: 切换到该KB
- Expand/Collapse: 显示/隐藏数据源类型
- Drag-and-drop: 重新排序KB
- Right-click: 重命名/删除KB

### 3.3 添加数据源 - Modal

```
┌────────────────────────────────────────────────────────────┐
│ ➕ Add Data Source to "Customer Support KB"               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Select Data Source Type:                                  │
│                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ 📄           │ │ 🌐           │ │ 💬           │       │
│ │ Upload       │ │ Website      │ │ Q&A Pairs    │       │
│ │ Documents    │ │ Crawl        │ │              │       │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ 📝           │ │ 📊           │ │ 🔗           │       │
│ │ Text         │ │ CSV          │ │ Notion       │       │
│ │ Input        │ │ Upload       │ │ (Phase 2)    │       │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                            │
│ ┌──────────────┐ ┌──────────────┐                        │
│ │ 📁           │ │ 🔌           │                        │
│ │ Google Drive │ │ API          │                        │
│ │ (Phase 2)    │ │ (Phase 2)    │                        │
│ └──────────────┘ └──────────────┘                        │
│                                                            │
│                             [Cancel]                       │
└────────────────────────────────────────────────────────────┘
```

### 3.4 数据源配置示例 - Website Crawl

```
┌────────────────────────────────────────────────────────────┐
│ 🌐 Add Website Crawl                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Website URL:                                               │
│ ┌────────────────────────────────────────────────────────┐│
│ │ https://www.example.com/support                        ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Crawl Depth:                                               │
│ ┌──────┐                                                  │
│ │  2   │ pages deep                                       │
│ └──────┘                                                  │
│ (1 = Only this page, 2 = Include linked pages)           │
│                                                            │
│ Include URL patterns: (Optional)                          │
│ ┌────────────────────────────────────────────────────────┐│
│ │ /support/*, /faq/*                                     ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Exclude URL patterns: (Optional)                          │
│ ┌────────────────────────────────────────────────────────┐│
│ │ /admin/*, /login/*                                     ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Auto Re-crawl:                                             │
│ ┌──────────────────────────────────┐                      │
│ │ [✓] Enable                       │                      │
│ │ Frequency: [Daily ▼]             │                      │
│ └──────────────────────────────────┘                      │
│                                                            │
│ ⚠️ Note: Crawling may take a few minutes depending on    │
│ the number of pages.                                       │
│                                                            │
│            [Cancel]  [Start Crawling]                     │
└────────────────────────────────────────────────────────────┘
```

### 3.5 数据源配置示例 - Manual Q&A Pairs

```
┌────────────────────────────────────────────────────────────┐
│ 💬 Add Q&A Pairs                                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Q&A Pair #1:                                    [+ Add]    │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Question:                                              ││
│ │ How do I reset my password?                            ││
│ │                                                        ││
│ │ Answer:                                                ││
│ │ To reset your password:                                ││
│ │ 1. Click "Forgot Password" on login page               ││
│ │ 2. Enter your email address                            ││
│ │ 3. Check your email for reset link                     ││
│ │ 4. Create a new password                               ││
│ │                                            [Remove]     ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Q&A Pair #2:                                    [+ Add]    │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Question:                                              ││
│ │ What are your business hours?                          ││
│ │                                                        ││
│ │ Answer:                                                ││
│ │ Monday-Friday: 9AM-6PM MYT                             ││
│ │ Saturday: 9AM-1PM MYT                                  ││
│ │ Sunday: Closed                                         ││
│ │                                            [Remove]     ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│                                             [+ Add More]   │
│                                                            │
│ 💡 Tip: Add common customer questions and clear answers   │
│ to improve your AI assistant's accuracy.                  │
│                                                            │
│                    [Cancel]  [Save Q&A Pairs]             │
└────────────────────────────────────────────────────────────┘
```

### 组件规格

**Knowledge Base Sidebar**:
- 宽度: 240px固定
- 可折叠: 移动端隐藏，汉堡菜单展开
- TreeView: 支持2级折叠（KB → 数据源类型）
- Active State: 蓝色背景 + 粗体

**Data Source Cards**:
- Grid: 4列（桌面），2列（平板），1列（手机）
- 卡片高度: 120px固定
- 状态标识:
  - ✅ Active: 绿色
  - 🔄 Syncing: 蓝色动画
  - ❌ Error: 红色
  - 🚧 Coming Soon: 灰色

**Add Data Source Flow**:
- Step 1: 选择类型（图标卡片）
- Step 2: 配置参数（表单）
- Step 3: 处理/爬取（进度条）
- Step 4: 完成确认

### 需要的API

```typescript
// ✅ 现有（假设已有）
GET /api/v1/knowledge-bases
Response: {
  knowledge_bases: [
    {
      id: "kb_1",
      name: "Customer Support KB",
      description: "...",
      created_at: "...",
      updated_at: "..."
    }
  ]
}

POST /api/v1/knowledge-bases
Request: { name, description }

// ❌ 需要新增: 数据源管理
GET /api/v1/knowledge-bases/{kb_id}/data-sources
Response: {
  data_sources: [
    {
      id: "ds_1",
      type: "uploaded_documents",
      config: { folder_id: "folder_1" },
      status: "active",
      document_count: 245,
      last_sync: "2025-01-25T10:00:00Z"
    },
    {
      id: "ds_2",
      type: "website_crawl",
      config: {
        url: "https://example.com/support",
        depth: 2,
        include_patterns: ["/support/*"],
        exclude_patterns: ["/admin/*"],
        auto_recrawl: true,
        recrawl_frequency: "daily"
      },
      status: "syncing",
      document_count: 12,
      last_sync: "2025-01-25T08:00:00Z"
    },
    {
      id: "ds_3",
      type: "manual_qa_pairs",
      config: {},
      status: "active",
      document_count: 89,
      last_sync: "2025-01-24T10:00:00Z"
    }
  ]
}

// ❌ 需要新增: 添加数据源
POST /api/v1/knowledge-bases/{kb_id}/data-sources
Request: {
  type: "website_crawl",
  config: {
    url: "...",
    depth: 2,
    include_patterns: [...],
    exclude_patterns: [...],
    auto_recrawl: true,
    recrawl_frequency: "daily"
  }
}

// Website Crawl
POST /api/v1/data-sources/{ds_id}/crawl
Response: { task_id: "task_123", status: "queued" }

// Q&A Pairs
POST /api/v1/data-sources/{ds_id}/qa-pairs
Request: {
  pairs: [
    { question: "...", answer: "..." }
  ]
}

// Text Input
POST /api/v1/data-sources/{ds_id}/text-documents
Request: {
  documents: [
    { title: "...", content: "..." }
  ]
}

// CSV Upload
POST /api/v1/data-sources/{ds_id}/csv-upload
Request: FormData { file, column_mapping: {...} }
```

### 需要新增的功能

- ❌ **Website Crawler** - 网页爬取功能（可用BeautifulSoup/Scrapy）
- ❌ **Q&A Pairs管理** - CRUD接口
- ❌ **Text Document管理** - 手动输入文本
- ❌ **CSV解析和向量化** - 结构化数据导入
- ❌ **数据源状态追踪** - active/syncing/error
- ❌ **Auto Re-crawl调度** - Celery定时任务
- ✅ **Vector存储** - 如果已经有RAG，应该已实现

---

## 4. AI Assistants Page（AI助手管理）

### 4.1 主视图 - 助手列表

```
┌──────────────────────────────────────────────────────────────────┐
│ Dashboard   Documents   Knowledge Base   AI Assistants*          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  My AI Assistants                              [+ Create New]    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🤖 Customer Support Bot                      [•••]          ││
│  │ Knowledge Q&A • Professional Style                          ││
│  │                                                             ││
│  │ 📚 Knowledge: Customer Support KB (245 docs)                ││
│  │ 💬 Conversations: 234 total • 89 this week                  ││
│  │ ⭐ Satisfaction: 4.8/5.0 (based on 45 ratings)              ││
│  │                                                             ││
│  │ Active Platforms:                                           ││
│  │ [Facebook ✅ Active] [WhatsApp 🚧 Setup] [Telegram ⏳]     ││
│  │                                                             ││
│  │ 🔗 Public URL: https://chat.doctify.ai/abc123              ││
│  │ [📋 Copy Link] [</> Embed Code] [⚙️ Settings] [💬 Test]   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📊 Sales Data Analyzer                       [•••]          ││
│  │ Data Analysis • Concise Responses                           ││
│  │                                                             ││
│  │ 📚 Knowledge: Product Catalog KB (89 docs)                  ││
│  │ 💬 Conversations: 45 total • 12 this week                   ││
│  │                                                             ││
│  │ 🔒 Private (No external integrations)                       ││
│  │                                                             ││
│  │ [⚙️ Settings] [💬 Chat] [📊 Analytics]                     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Recent Conversations:                          [View All →]    │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 💬 Facebook • 2 hours ago                                  ││
│  │ Customer: "How do I reset my password?"                    ││
│  │ Bot: "To reset your password, follow these steps..."       ││
│  │ Status: ✅ Resolved • Customer Support Bot                 ││
│  │ [View Thread]                                              ││
│  └────────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 💬 Website Chat Widget • 5 hours ago                       ││
│  │ Visitor: "What are your business hours?"                   ││
│  │ Bot: "We're open Monday-Friday 9AM-6PM MYT..."             ││
│  │ Status: ✅ Resolved • Customer Support Bot                 ││
│  │ [View Thread]                                              ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 创建助手 - Wizard Step 1

```
┌────────────────────────────────────────────────────────────┐
│ ✨ Create New AI Assistant                     [1/4]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Basic Information:                                         │
│                                                            │
│ Assistant Name: *                                          │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Customer Support Bot                                   ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Assistant Type: *                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│ │ ○ Knowledge  │ │ ● Data       │ │ ○ Chatbot    │       │
│ │   Q&A        │ │   Analysis   │ │              │       │
│ │              │ │              │ │              │       │
│ │ Answer       │ │ Analyze and  │ │ General      │       │
│ │ questions    │ │ visualize    │ │ conversation │       │
│ │ from your KB │ │ your data    │ │ assistant    │       │
│ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                            │
│ Description: (Optional)                                    │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Helps customers with common questions about our        ││
│ │ products and services.                                 ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│                             [Cancel]  [Next: Personality →]│
└────────────────────────────────────────────────────────────┘
```

### 4.3 创建助手 - Wizard Step 2

```
┌────────────────────────────────────────────────────────────┐
│ ✨ Create New AI Assistant                     [2/4]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Personality Settings:                                      │
│                                                            │
│ Response Style: *                                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ ● Friendly│ │ ○ Profes.│ │ ○ Tech.  │ │ ○ Casual │      │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                            │
│ Response Length: *                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│ │ ○ Concise│ │ ● Moderate│ │ ○ Detailed│                   │
│ │ 1-2 sent.│ │ 3-5 sent. │ │ Paragraph │                   │
│ └──────────┘ └──────────┘ └──────────┘                   │
│                                                            │
│ Custom System Prompt: (Optional, Advanced)                 │
│ ┌────────────────────────────────────────────────────────┐│
│ │ You are a helpful customer support assistant for       ││
│ │ [Company Name]. Always be polite, patient, and         ││
│ │ professional. If you don't know the answer, guide      ││
│ │ the customer to contact human support.                 ││
│ │                                            [?] Help     ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Preview:                                                   │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 💬 User: "How do I reset my password?"                 ││
│ │                                                        ││
│ │ 🤖 Bot: "Hi! I'd be happy to help you reset your      ││
│ │ password. Here's what you need to do:                  ││
│ │ 1. Click 'Forgot Password' on the login page          ││
│ │ 2. Enter your email address                            ││
│ │ 3. Check your email for a reset link..."              ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│                    [← Back]  [Next: Knowledge Base →]     │
└────────────────────────────────────────────────────────────┘
```

### 4.4 创建助手 - Wizard Step 3

```
┌────────────────────────────────────────────────────────────┐
│ ✨ Create New AI Assistant                     [3/4]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Connect Knowledge Base: *                                  │
│                                                            │
│ Select one or more knowledge bases:                        │
│ ┌────────────────────────────────────────────────────────┐│
│ │ [✓] Customer Support KB                                ││
│ │     245 documents • Last updated 2 hours ago           ││
│ │     Data: Uploaded Docs, Website, Q&A                  ││
│ │                                                        ││
│ │ [ ] Product Catalog KB                                 ││
│ │     89 documents • Last updated yesterday              ││
│ │     Data: CSV, Uploaded Docs                           ││
│ │                                                        ││
│ │ [ ] Internal Documentation                             ││
│ │     15 documents • Last updated last week              ││
│ │     Data: Notion Pages                                 ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ 💡 Tip: Select knowledge bases relevant to this assistant │
│ Multiple KBs will be searched when answering questions    │
│                                                            │
│ [+ Create New Knowledge Base]                              │
│                                                            │
│ Advanced Options: (Optional)                               │
│ ┌────────────────────────────────────────────────────────┐│
│ │ Search Settings:                                       ││
│ │ Top K Results: [5 ▼]                                   ││
│ │ Similarity Threshold: [0.7 ▼]                          ││
│ │                                                        ││
│ │ [ ] Enable web search fallback (if no KB match found) ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│                    [← Back]  [Next: Sharing & Deploy →]   │
└────────────────────────────────────────────────────────────┘
```

### 4.5 创建助手 - Wizard Step 4

```
┌────────────────────────────────────────────────────────────┐
│ ✨ Create New AI Assistant                     [4/4]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Sharing & Deployment:                                      │
│                                                            │
│ ┌─ Public Access ──────────────────────────────────────┐  │
│ │                                                      │  │
│ │ [✓] Enable Public URL                                │  │
│ │                                                      │  │
│ │ Your assistant will be available at:                 │  │
│ │ https://chat.doctify.ai/customer-support-bot         │  │
│ │ [📋 Copy Link]                                       │  │
│ │                                                      │  │
│ │ [✓] Generate Embed Code for Website                  │  │
│ │                                                      │  │
│ │ Widget Configuration:                                │  │
│ │ Theme: [Light ▼]                                     │  │
│ │ Position: [Bottom Right ▼]                           │  │
│ │ Primary Color: [#3B82F6]  [🎨]                       │  │
│ │                                                      │  │
│ │ [</> Copy Embed Code]                                │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ ┌─ Platform Integrations (Phase 2) ────────────────────┐  │
│ │                                                      │  │
│ │ Connect to messaging platforms:                      │  │
│ │                                                      │  │
│ │ [ ] Facebook Messenger         🚧 Coming Soon       │  │
│ │ [ ] WhatsApp Business          🚧 Coming Soon       │  │
│ │ [ ] Telegram                   🚧 Coming Soon       │  │
│ │ [ ] Shopee Chat                🚧 Coming Soon       │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                            │
│ 🎉 You're all set! Review and create your assistant       │
│                                                            │
│            [← Back]  [Cancel]  [✅ Create Assistant]      │
└────────────────────────────────────────────────────────────┘
```

### 4.6 对话视图 - Unified Interface

```
┌─────────┬──────────────────────────────────────────────────────┐
│         │ 💬 Conversations - Customer Support Bot              │
├─────────┼──────────────────────────────────────────────────────┤
│ Filters │                                                      │
│         │  [All Platforms▼] [Last 7 Days▼] [🔍 Search]        │
│ Platform│  ──────────────────────────────────────────────────  │
│ [✓] All │                                                      │
│ [ ] FB  │  ┌────────────────────────────────────────────────┐ │
│ [ ] WA  │  │ 💬 Facebook • 2 hours ago                      │ │
│ [ ] Web │  │ Customer: John Tan                             │ │
│         │  │ "How do I reset my password?"                  │ │
│ Status  │  │ ✅ Resolved • 3 messages                        │ │
│ [✓] All │  │ [View Thread →]                                │ │
│ [ ] Open│  └────────────────────────────────────────────────┘ │
│ [ ] Done│                                                      │
│         │  ┌────────────────────────────────────────────────┐ │
│ Date    │  │ 💬 Website Chat • 5 hours ago                  │ │
│ [✓] All │  │ Visitor: Anonymous                             │ │
│ [ ] Today│  │ "What are your business hours?"                │ │
│ [ ] Week│  │ ✅ Resolved • 2 messages                        │ │
│ [ ] Month│  │ [View Thread →]                                │ │
│         │  └────────────────────────────────────────────────┘ │
│ Assistant│                                                     │
│ [✓] All │  ┌────────────────────────────────────────────────┐ │
│ [ ] CSB │  │ 💬 WhatsApp • Yesterday                        │ │
│ [ ] SDA │  │ Customer: Sarah Lee (+60123456789)             │ │
│         │  │ "Can I change my delivery address?"            │ │
│         │  │ 🔄 In Progress • 5 messages                     │ │
│         │  │ [View Thread →]                                │ │
│         │  └────────────────────────────────────────────────┘ │
│         │                                                      │
│         │  [Load More...]                                     │
│         │                                                      │
└─────────┴──────────────────────────────────────────────────────┘
```

### 4.7 对话详情 - Thread View

```
┌────────────────────────────────────────────────────────────┐
│ ← Back to Conversations                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 💬 Conversation with John Tan                              │
│ Facebook Messenger • Started 2 hours ago                   │
│ Assistant: Customer Support Bot                            │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 👤 John Tan • 2:15 PM                                  ││
│ │ How do I reset my password?                            ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 🤖 Bot • 2:15 PM (Response time: 1.2s)                 ││
│ │                                                        ││
│ │ Hi John! I'd be happy to help you reset your password.││
│ │ Here's what you need to do:                            ││
│ │                                                        ││
│ │ 1. Go to the login page                                ││
│ │ 2. Click "Forgot Password"                             ││
│ │ 3. Enter your email address                            ││
│ │ 4. Check your email for a reset link                   ││
│ │ 5. Click the link and create a new password            ││
│ │                                                        ││
│ │ 📚 Source: Customer Support KB > Password FAQ          ││
│ │ Confidence: 94%                                        ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 👤 John Tan • 2:16 PM                                  ││
│ │ Thanks! That worked.                                   ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ ┌────────────────────────────────────────────────────────┐│
│ │ 🤖 Bot • 2:16 PM                                       ││
│ │ Great! I'm glad I could help. Is there anything else   ││
│ │ I can assist you with today?                           ││
│ └────────────────────────────────────────────────────────┘│
│                                                            │
│ Conversation Status: ✅ Resolved                           │
│                                                            │
│ Actions:                                                   │
│ [📥 Export] [🏷️ Add Tags] [👤 Assign to Human]           │
│                                                            │
│ ────────────────────────────────────────────────────────  │
│                                                            │
│ Rate this conversation:                                    │
│ Was the bot helpful? ⭐⭐⭐⭐⭐                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 组件规格

**Assistant Card**:
- 高度: 自适应，最小200px
- 包含: 名称、类型、Knowledge Base、统计、平台状态、公开链接
- Actions: 设置、测试、分析
- Platform Badges:
  - ✅ Active: 绿色
  - 🚧 Setup Required: 黄色
  - ⏳ Pending: 灰色

**Creation Wizard**:
- 4步流程，可前后导航
- 实时预览（Step 2 personality）
- 验证: Name必填，至少选1个KB
- 进度指示器: [1/4] [2/4] [3/4] [4/4]

**Conversation List**:
- 虚拟滚动（处理大量对话）
- Filter: Platform, Status, Date, Assistant
- Group by: Date (Today, Yesterday, This Week, Older)
- Real-time updates（WebSocket新对话）

**Thread View**:
- Chat bubble样式（用户右侧，Bot左侧）
- 时间戳 + 响应时间
- Source和Confidence显示
- Export to PDF/CSV功能

### 需要的API

```typescript
// ✅ 现有（假设RAG已实现）
GET /api/v1/assistants
POST /api/v1/assistants
PUT /api/v1/assistants/{assistant_id}
DELETE /api/v1/assistants/{assistant_id}

// ❌ 需要新增: 助手详细配置
GET /api/v1/assistants/{assistant_id}
Response: {
  id: "ast_1",
  name: "Customer Support Bot",
  type: "knowledge_qa",
  personality: {
    style: "friendly",
    response_length: "moderate",
    system_prompt: "..."
  },
  knowledge_base_ids: ["kb_1"],
  sharing: {
    enabled: true,
    public_url: "https://chat.doctify.ai/customer-support-bot",
    embed_code: "<script>...</script>",
    widget_config: {
      theme: "light",
      position: "bottom-right",
      primary_color: "#3B82F6"
    }
  },
  integrations: {
    facebook: null,  // Phase 2
    whatsapp: null,
    telegram: null,
    shopee: null
  },
  stats: {
    conversations_total: 234,
    conversations_this_week: 89,
    avg_response_time: 1.2,
    satisfaction_score: 4.8
  }
}

// ❌ 需要新增: 对话管理
GET /api/v1/assistants/{assistant_id}/conversations
Query: ?platform=all&status=all&date_from=...&date_to=...
Response: {
  conversations: [
    {
      id: "conv_1",
      platform: "facebook",
      user_id: "fb_user_123",
      user_name: "John Tan",
      status: "resolved" | "in_progress" | "pending",
      message_count: 3,
      started_at: "2025-01-25T14:15:00Z",
      last_message_at: "2025-01-25T14:16:00Z",
      preview: "How do I reset my password?"
    }
  ],
  total: 234,
  page: 1,
  page_size: 20
}

GET /api/v1/conversations/{conversation_id}
Response: {
  id: "conv_1",
  platform: "facebook",
  user: {
    id: "fb_user_123",
    name: "John Tan",
    avatar_url: "..."
  },
  assistant: {
    id: "ast_1",
    name: "Customer Support Bot"
  },
  messages: [
    {
      id: "msg_1",
      role: "user",
      content: "How do I reset my password?",
      timestamp: "2025-01-25T14:15:00Z"
    },
    {
      id: "msg_2",
      role: "assistant",
      content: "Hi John! I'd be happy to help...",
      timestamp: "2025-01-25T14:15:01Z",
      response_time: 1.2,
      source: {
        knowledge_base_id: "kb_1",
        document_id: "doc_45",
        snippet: "Password reset instructions..."
      },
      confidence: 0.94
    }
  ],
  status: "resolved",
  rating: 5,
  tags: ["password", "support"]
}

// ❌ 需要新增: Embed Code生成
POST /api/v1/assistants/{assistant_id}/generate-embed
Request: {
  theme: "light" | "dark",
  position: "bottom-right" | "bottom-left" | ...,
  primary_color: "#3B82F6"
}
Response: {
  embed_code: "<script src='...' data-assistant='...'></script>",
  public_url: "https://chat.doctify.ai/..."
}

// ❌ 需要新增: Chat API (公开聊天接口)
POST /api/v1/public/assistants/{public_id}/chat
Request: {
  message: "How do I reset my password?",
  conversation_id?: "conv_1"  // Optional, for continuing conversation
}
Response: {
  conversation_id: "conv_1",
  message: {
    role: "assistant",
    content: "...",
    source: {...},
    confidence: 0.94
  }
}

// WebSocket for real-time chat
WS /api/v1/public/assistants/{public_id}/chat
```

### 需要新增的功能

- ❌ **公开聊天API** - 无需认证的聊天endpoint（用于embed和public URL）
- ❌ **Embed Widget** - JavaScript widget（单独前端项目）
- ❌ **对话管理** - 存储和查询对话历史
- ❌ **多平台统一接口** - 抽象层处理Facebook/WhatsApp/Telegram（Phase 2）
- ❌ **响应时间追踪** - 记录每条Bot消息的生成时间
- ❌ **满意度评分** - 对话结束后请求评分（可选功能）
- ✅ **RAG Chat** - 应该已经有基础实现

---

## 5. 全局组件

### 5.1 Help Button ("?")

```
位置示例（Documents页）:

┌────────────────────────────────────┐
│ 📤 Drag & Drop Files Here   [?]   │ ← Help按钮右上角
└────────────────────────────────────┘

点击后弹出Tooltip:
┌─────────────────────────────────────────────┐
│ 📤 Upload Files                             │
│                                             │
│ • Drag files here or click to browse       │
│ • Supported: PDF, PNG, JPG                 │
│ • Max size: 10MB per file                  │
│ • Max 10 files at once                     │
│                                             │
│ Files will be processed with OCR and       │
│ extracted data will be displayed for       │
│ your review and confirmation.              │
│                                             │
│ [Got it]                                    │
└─────────────────────────────────────────────┘
```

**Help按钮位置**:
- Upload Zone
- Knowledge Base "Add Source"
- AI Assistant Creation Wizard
- OCR Result Review
- 任何复杂功能区域

**样式**:
- 图标: "?" 圆形按钮
- 颜色: 浅灰色，hover变蓝
- 大小: 20px × 20px
- Tooltip: 白色背景，黑色文字，最大宽度300px

### 5.2 Empty States

```
Documents页 - 空状态:

┌────────────────────────────────────────┐
│                                        │
│           📄                            │
│                                        │
│     No documents yet                   │
│                                        │
│  Upload your first document to get    │
│  started with AI-powered OCR           │
│                                        │
│     [📤 Upload Document]               │
│                                        │
└────────────────────────────────────────┘

Knowledge Base页 - 空状态:

┌────────────────────────────────────────┐
│                                        │
│           📚                            │
│                                        │
│  No knowledge bases yet                │
│                                        │
│  Create a knowledge base to power      │
│  your AI assistants with custom data   │
│                                        │
│     [✨ Create Knowledge Base]         │
│                                        │
└────────────────────────────────────────┘
```

**Empty State规格**:
- 大图标: 64px灰色图标
- 标题: 16px粗体
- 描述: 14px普通文字
- CTA按钮: 主要按钮样式
- 整体居中对齐

---

## 6. 响应式设计

### 桌面 (≥1024px)
- Sidebar: 240px固定宽度
- 主内容: flex-1自适应
- 卡片Grid: 4列（Knowledge Base），3列（其他）

### 平板 (768px - 1023px)
- Sidebar: 可折叠，汉堡菜单
- 主内容: 全宽
- 卡片Grid: 2-3列

### 移动 (<768px)
- Sidebar: 隐藏，汉堡菜单展开
- 主内容: 全宽
- 卡片Grid: 1列
- 底部导航栏（替代顶部导航）

---

## 7. API Summary - 现有 vs 需要新增

### ✅ 可能已有（需确认）

```typescript
// 用户认证
POST /api/v1/auth/login
POST /api/v1/auth/register
GET /api/v1/auth/me

// 文档上传
POST /api/v1/documents/upload
GET /api/v1/documents
GET /api/v1/documents/{document_id}
DELETE /api/v1/documents/{document_id}

// 文件夹管理
GET /api/v1/folders
POST /api/v1/folders
PUT /api/v1/folders/{folder_id}
DELETE /api/v1/folders/{folder_id}

// Knowledge Base (基础)
GET /api/v1/knowledge-bases
POST /api/v1/knowledge-bases
GET /api/v1/knowledge-bases/{kb_id}
DELETE /api/v1/knowledge-bases/{kb_id}

// AI Assistants (基础)
GET /api/v1/assistants
POST /api/v1/assistants
GET /api/v1/assistants/{assistant_id}
DELETE /api/v1/assistants/{assistant_id}

// RAG Chat
POST /api/v1/chat
GET /api/v1/chat/history
```

### ❌ 必须新增（Phase 1）

```typescript
// OCR结果置信度
GET /api/v1/documents/{document_id}/ocr-result
Response: {
  ocr_data: {...},
  confidence: { overall: 0.76, fields: {...} },
  validation_errors: [...]
}

POST /api/v1/documents/{document_id}/confirm
Request: { ocr_data: {...}, user_confirmed: true }

// 使用量统计
GET /api/v1/usage/monthly
Response: {
  ocr: { used: 45, quota: 500 },
  rag: { used: 120, quota: 1000 },
  next_reset: "2025-02-01"
}

// Dashboard统计
GET /api/v1/dashboard/stats
GET /api/v1/dashboard/activity

// Knowledge Base数据源
GET /api/v1/knowledge-bases/{kb_id}/data-sources
POST /api/v1/knowledge-bases/{kb_id}/data-sources
PUT /api/v1/data-sources/{ds_id}
DELETE /api/v1/data-sources/{ds_id}

// Website Crawl
POST /api/v1/data-sources/{ds_id}/crawl
GET /api/v1/data-sources/{ds_id}/crawl-status

// Q&A Pairs
POST /api/v1/data-sources/{ds_id}/qa-pairs
GET /api/v1/data-sources/{ds_id}/qa-pairs
PUT /api/v1/qa-pairs/{qa_id}
DELETE /api/v1/qa-pairs/{qa_id}

// AI Assistant详细配置
PUT /api/v1/assistants/{assistant_id}/personality
PUT /api/v1/assistants/{assistant_id}/knowledge-bases
POST /api/v1/assistants/{assistant_id}/generate-embed

// 对话管理
GET /api/v1/assistants/{assistant_id}/conversations
GET /api/v1/conversations/{conversation_id}
POST /api/v1/conversations/{conversation_id}/rate

// 公开聊天API（无需auth）
POST /api/v1/public/assistants/{public_id}/chat
WS /api/v1/public/assistants/{public_id}/chat
```

### ⏳ Phase 2功能（暂时不做）

```typescript
// Platform Integrations
POST /api/v1/assistants/{assistant_id}/integrations/facebook
POST /api/v1/assistants/{assistant_id}/integrations/whatsapp
POST /api/v1/assistants/{assistant_id}/integrations/telegram

// Notion Integration
POST /api/v1/data-sources/{ds_id}/notion/connect

// Google Drive Integration
POST /api/v1/data-sources/{ds_id}/google-drive/connect
```

---

## 8. 实施优先级建议

### Week 1-2: Documents页重构
1. 两种上传workflow UI
2. OCR结果展示（带置信度）
3. 用户确认/编辑界面

### Week 3-4: Knowledge Base页（新建）
1. Sidebar + TreeView
2. 数据源卡片显示
3. 添加数据源（先做简单的：Uploaded Docs, Text Input, Q&A）

### Week 5-6: AI Assistants页
1. 助手列表
2. 创建wizard（4步）
3. 对话列表和详情

### Week 7-8: Dashboard + Polish
1. Dashboard概览页
2. Help按钮和Empty States
3. 响应式调整
4. Posthog事件追踪

---

## 下一步行动

1. **Review这个Wireframe** - 确认UI设计方向是否正确
2. **确认现有API** - 检查后端哪些API已实现，哪些需要新增
3. **开始前端重构** - 从Documents页开始
4. **并行后端开发** - 实现新增的API endpoints

需要我：
- 调整任何Wireframe设计？
- 帮你review现有代码确认API状态？
- 创建更详细的组件规格文档？

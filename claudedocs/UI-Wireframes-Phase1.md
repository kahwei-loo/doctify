# Doctify UI Wireframes - Phase 1 (Revised)

**Created**: 2025-01-25
**Updated**: 2025-01-25 (基于现有设计风格)
**Purpose**: 详细UI设计规格，用于前端重构

**设计原则**:
- 保持现有ShadcnUI + 极简风格
- 三级导航架构（SideNav → Context Panel → Content Area）
- 全局拖拽检测
- Overall选项提供宏观视图

---

## 全局架构 - 三级导航系统

```
┌────────┬──────────────┬──────────────────────────────────────┐
│        │              │ [🔍 Search] [EN] [🔔] [☀️] [Avatar]  │ ← Global Header
│        │              ├──────────────────────────────────────┤
│        │              │                                      │
│ Level1 │   Level 2    │         Level 3                      │
│        │              │                                      │
│ SideNav│Context Panel │      Content Area                    │
│        │              │                                      │
│ (固定) │   (上下文)   │      (工作区)                        │
│ 200px  │   240px      │       flex-1                         │
│        │              │                                      │
└────────┴──────────────┴──────────────────────────────────────┘
```

**导航层级**:
1. **Level 1 - SideNav**: 主功能区切换（Dashboard, Documents, KB, Assistants）
2. **Level 2 - Context Panel**: 上下文选择（Projects列表, KB列表, Assistants列表）
3. **Level 3 - Content Area**: 具体工作内容（文档列表, 数据源, 对话）

**SideNav状态**:
- Active: 蓝色背景 + 白色文字
- Hover: 浅灰背景
- Collapsed: 仅显示图标（宽度60px）

---

## 1. Dashboard Page（概览页）- Pipeline可视化

### 布局设计（创意方案：AI Processing Pipeline）

```
┌────────┬──────────────────────────────────────────────────────────┐
│        │ [🔍 Search] [EN] [🔔] [☀️] [Avatar]                      │
│ [≡]    ├──────────────────────────────────────────────────────────┤
│ Doctify│                                                          │
├────────┤  👋 Good morning, User!                                  │
│        │                                                          │
│ 🏠 *   │  ┌───────────────────────────────────────────────────┐  │
│ Dashbd │  │ 📊 Your AI Processing Pipeline (Real-time)       │  │
│        │  │                                                   │  │
│ 📄     │  │ Upload → OCR → Review → Knowledge Base → AI Chat │  │
│ Docs   │  │   15      12      3         245           234    │  │
│        │  │   ↓       ↓       ↓          ↓             ↓     │  │
│ 📚     │  │  [███]   [███]   [██░]     [████]       [████]   │  │
│ KB     │  │   85%     75%     20%       100%          100%    │  │
│        │  │                                                   │  │
│ 🤖     │  │ ⚡ Processing: 12 documents in OCR queue          │  │
│ AI     │  │ ⚠️ Needs Attention: 3 OCR results awaiting review │  │
│        │  └───────────────────────────────────────────────────┘  │
│ ⬆️     │                                                          │
│ Upload │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│        │  │ 📄 245       │ │ 💬 234       │ │ 📊 Usage     │   │
│ ⚙️     │  │ Documents    │ │ Conversations│ │              │   │
│ Settings│  │              │ │              │ │ OCR: 45/500  │   │
│        │  │ +12 this week│ │ +89 this week│ │ ████░░░░░░   │   │
│        │  │ 94% OCR rate │ │ 4.8★ avg     │ │ 9%           │   │
│        │  └──────────────┘ └──────────────┘ └──────────────┘   │
│        │                                                          │
│        │  ⚡ Quick Actions:                                       │
│        │  [📤 Upload] [🤖 New Assistant] [💬 Start Chat]        │
│        │                                                          │
│        │  🔥 What's Hot Today:                                    │
│        │  ┌────────────────────────────────────────────────────┐ │
│        │  │ 💬 Most asked: "How to reset password?" (12 times) │ │
│        │  │ 📄 Top project: Customer Invoices (89 docs)        │ │
│        │  │ 🤖 Best performer: Support Bot (4.9★ rating)       │ │
│        │  └────────────────────────────────────────────────────┘ │
│        │                                                          │
│        │  📝 Recent Activity:                      [View All →]  │
│        │  ┌────────────────────────────────────────────────────┐ │
│        │  │ 📄 Invoice_2025_01.pdf • ✅ 94%                    │ │
│        │  │ 2 hours ago                                        │ │
│        │  └────────────────────────────────────────────────────┘ │
│        │  ┌────────────────────────────────────────────────────┐ │
│        │  │ 💬 Conversation: "Business hours?" • ✅ Resolved   │ │
│        │  │ 5 hours ago • Customer Support Bot                 │ │
│        │  └────────────────────────────────────────────────────┘ │
│        │                                                          │
│        │  📈 This Week vs Last Week:                              │
│        │  ┌────────────────────────────────────────────────────┐ │
│        │  │ Documents: +12 (↑ 15%)                             │ │
│        │  │ Conversations: +89 (↑ 24%)                         │ │
│        │  │ OCR Success: 94% (↑ 3%)                            │ │
│        │  └────────────────────────────────────────────────────┘ │
│        │                                                          │
└────────┴──────────────────────────────────────────────────────────┘
```

### 设计亮点

**1. Pipeline可视化**（眼前一亮）:
- 实时显示文档处理流程
- 进度条动画（Processing状态）
- 数字 + 百分比双重展示
- ⚡ 和 ⚠️ 实时提醒

**2. What's Hot Today**（智能推荐）:
- 最常问问题（可优化FAQ）
- 最活跃项目（用户关注点）
- 最佳AI助手（质量指标）

**3. 趋势对比**（数据洞察）:
- 本周vs上周
- 百分比增长
- 简洁的上升/下降箭头

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

### 2.1 主视图 - Overall（宏观视图）

```
┌────────┬──────────────┬────────────────────────────────────────────┐
│        │              │ [🔍 Search documents...] [Card▼] [Refresh]│
│ [≡]    │ Projects     ├────────────────────────────────────────────┤
│ Doctify│              │                                            │
├────────┤ [+ New]  [🔍]│  Documents - All Projects                  │
│        │              │                                            │
│ 🏠     │ ┌──────────┐ │  ┌─────────────────────────────────────┐  │
│ Dashbd │ │ 📊       │ │  │ 📊 Overall Statistics               │  │
│        │ │ Overall  │ │  │                                     │  │
│ 📄 *   │ │          │ │  │ Total: 245 documents                │  │
│ Docs   │ │ 245 docs │ │  │ This week: +12 (↑ 5%)              │  │
│        │ └──────────┘ │  │ OCR success: 94% avg                │  │
│ 📚     │              │  │ Pending review: 3                   │  │
│ KB     │ 📁 Projects  │  │ Storage: 2.4GB / 10GB (24%)         │  │
│        │              │  └─────────────────────────────────────┘  │
│ 🤖     │ ┌──────────┐ │                                            │
│ AI     │ │ 📁       │ │  ┌─────────────────────────────────────┐  │
│        │ │ Customer │ │  │ 📊 By Project Breakdown             │  │
│ ⬆️     │ │ Invoices │ │  │                                     │  │
│ Upload │ │          │ │  │ Customer Invoices:  89 docs (36%)   │  │
│        │ │ 89 docs  │ │  │ Supplier Receipts:  67 docs (27%)   │  │
│ ⚙️     │ └──────────┘ │  │ Legal Contracts:    45 docs (18%)   │  │
│ Settings│             │  │ Other:              44 docs (18%)   │  │
│        │ ┌──────────┐ │  └─────────────────────────────────────┘  │
│        │ │ 📁       │ │                                            │
│        │ │ Supplier │ │  📄 All Documents:         [Table▼] [Card]│
│        │ │ Receipts │ │  ┌────────────────────────────────────┐   │
│        │ │          │ │  │ Document          Status  Confidence│   │
│        │ │ 67 docs  │ │  ├────────────────────────────────────┤   │
│        │ └──────────┘ │  │ 📄 Invoice_001.pdf                 │   │
│        │              │  │ Customer Invoices  ✅      94%      │   │
│        │ ┌──────────┐ │  │ 2025-01-24 • RM 1,234.56           │   │
│        │ │ 📁 Legal │ │  ├────────────────────────────────────┤   │
│        │ │ Contracts│ │  │ 📄 Receipt_045.jpg                 │   │
│        │ │          │ │  │ Supplier Receipts  ⚠️      76%      │   │
│        │ │ 45 docs  │ │  │ 2025-01-23 • RM 89.50  [Review]    │   │
│        │ └──────────┘ │  ├────────────────────────────────────┤   │
│        │              │  │ 📄 Contract_2025.pdf               │   │
│        │ [+ Project]  │  │ Legal Contracts    ✅      98%      │   │
│        │              │  │ 2025-01-22 • 15 pages              │   │
│        │              │  └────────────────────────────────────┘   │
│        │              │  Showing 3 of 245 • [Load More...]        │
│        │              │                                            │
└────────┴──────────────┴────────────────────────────────────────────┘
```

### 2.2 单个Project视图 - Customer Invoices

```
┌────────┬──────────────┬────────────────────────────────────────────┐
│        │              │ [🔍 Search in project...] [Card▼] [•••]   │
│ [≡]    │ Projects     ├────────────────────────────────────────────┤
│ Doctify│              │                                            │
├────────┤ [+ New]  [🔍]│  Customer Invoices                         │
│        │              │                                            │
│ 🏠     │ 📊 Overall   │  ┌──────────────────────────────────────┐ │
│ Dashbd │              │  │                                      │ │
│        │ 📁 Projects  │  │    📤 Drag & Drop Files Here        │ │
│ 📄 *   │              │  │                                      │ │
│ Docs   │ ┌──────────┐ │  │  or click to browse your computer   │ │
│        │ │ 📁 *     │ │  │                                      │ │
│ 📚     │ │ Customer │ │  │  PDF, PNG, JPG • Max 10MB per file  │ │
│ KB     │ │ Invoices │ │  │                                      │ │
│        │ │          │ │  └──────────────────────────────────────┘ │
│ 🤖     │ │ 89 docs  │ │                                     [?]    │
│ AI     │ └──────────┘ │                                            │
│        │              │  📊 Project Stats:                         │
│ ⬆️     │ 📁 Supplier  │  Documents: 89 • This month: +24          │
│ Upload │    Receipts  │  Avg confidence: 92% • Pending: 2         │
│        │              │                                            │
│ ⚙️     │ 📁 Legal     │  📄 Documents:                  [Table▼]  │
│ Settings│   Contracts │  ┌────────────────────────────────────┐   │
│        │              │  │ Document          Date    Amount   │   │
│        │ [+ Project]  │  ├────────────────────────────────────┤   │
│        │              │  │ 📄 INV-2025-089.pdf               │   │
│        │              │  │ ✅ 94%    2025-01-24  RM 1,234.56  │   │
│        │              │  │ [View] [Download]                  │   │
│        │              │  ├────────────────────────────────────┤   │
│        │              │  │ 📄 INV-2025-088.pdf               │   │
│        │              │  │ ⚠️ 76%    2025-01-23  RM 567.80    │   │
│        │              │  │ [Review] [Edit] [Delete]           │   │
│        │              │  └────────────────────────────────────┘   │
│        │              │  Showing 2 of 89 • [Load More...]         │
│        │              │                                            │
└────────┴──────────────┴────────────────────────────────────────────┘
```

### 2.3 全局拖拽检测（智能UX）

**场景1**：用户在任意页面拖拽文件到浏览器

```
┌──────────────────────────────────────────┐
│ 🎯 Drop Zone Detected!                   │
│                                          │
│ Drop your files anywhere to upload      │
│                                          │
│ ┌──────────────────────────────────────┐│
│ │                                      ││
│ │         📤 Drop Here                 ││
│ │                                      ││
│ │   3 files detected                   ││
│ │   • Invoice_001.pdf                  ││
│ │   • Invoice_002.pdf                  ││
│ │   • Receipt_045.jpg                  ││
│ │                                      ││
│ └──────────────────────────────────────┘│
│                                          │
│ Select project:                          │
│ ○ Customer Invoices                     │
│ ○ Supplier Receipts                     │
│ ○ Legal Contracts                       │
│ ● Create new project...                 │
│                                          │
│        [Cancel]  [Upload Files]         │
└──────────────────────────────────────────┘
```

**场景2**：用户拖拽到特定Project上（快速上传）

```
Projects Panel高亮:

┌──────────────┐
│ 📁 Customer  │ ← 高亮蓝色边框
│    Invoices  │   (Drop target)
│              │
│ 89 docs      │
│              │
│ Drop 3 files │ ← 临时提示
│ here         │
└──────────────┘

直接弹出确认对话框:

┌────────────────────────────────────┐
│ Upload to Customer Invoices?       │
│                                    │
│ 3 files:                           │
│ • Invoice_001.pdf (1.2 MB)        │
│ • Invoice_002.pdf (890 KB)        │
│ • Receipt_045.jpg (234 KB)        │
│                                    │
│ [Cancel]  [Upload & Process OCR]  │
└────────────────────────────────────┘
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

### 3.1 主视图 - Overall（宏观视图）

```
┌────────┬──────────────┬────────────────────────────────────────────┐
│        │              │ [🔍 Search knowledge bases...] [+ Add Source│
│ [≡]    │ Knowledge    ├────────────────────────────────────────────┤
│ Doctify│   Bases      │                                            │
├────────┤              │  Knowledge Bases - Overview                │
│        │ [+ New]  [🔍]│                                            │
│ 🏠     │              │  ┌─────────────────────────────────────┐  │
│ Dashbd │ ┌──────────┐ │  │ 📊 Overall Statistics               │  │
│        │ │ 📊       │ │  │                                     │  │
│ 📄     │ │ Overall  │ │  │ Total KBs: 3                        │  │
│ Docs   │ │          │ │  │ Total data sources: 12              │  │
│        │ │ 3 KBs    │ │  │ Total documents: 351                │  │
│ 📚 *   │ │ 351 docs │ │  │ Vector DB size: 45.2 MB             │  │
│ KB     │ └──────────┘ │  │ Last sync: 2 hours ago              │  │
│        │              │  └─────────────────────────────────────┘  │
│ 🤖     │ 📚 KBs       │                                            │
│ AI     │              │  ┌─────────────────────────────────────┐  │
│        │ ┌──────────┐ │  │ 📊 By Knowledge Base Breakdown      │  │
│ ⬆️     │ │ 📚       │ │  │                                     │  │
│ Upload │ │ Customer │ │  │ Customer Support:   245 docs (70%)  │  │
│        │ │ Support  │ │  │ Product Catalog:     89 docs (25%)  │  │
│ ⚙️     │ │          │ │  │ Internal Docs:       17 docs (5%)   │  │
│ Settings│ │ 245 docs │ │  └─────────────────────────────────────┘  │
│        │ └──────────┘ │                                            │
│        │              │  📚 All Knowledge Bases:        [Grid▼]   │
│        │ ┌──────────┐ │  ┌───────────────┐ ┌───────────────┐     │
│        │ │ 📚       │ │  │ 📚 Customer   │ │ 📚 Product    │     │
│        │ │ Product  │ │  │    Support    │ │    Catalog    │     │
│        │ │ Catalog  │ │  │               │ │               │     │
│        │ │          │ │  │ 4 sources     │ │ 2 sources     │     │
│        │ │ 89 docs  │ │  │ 245 documents │ │ 89 documents  │     │
│        │ └──────────┘ │  │ ✅ Active     │ │ ✅ Active     │     │
│        │              │  │               │ │               │     │
│        │ ┌──────────┐ │  │ [Open] [⚙️]   │ │ [Open] [⚙️]   │     │
│        │ │ 📚       │ │  └───────────────┘ └───────────────┘     │
│        │ │ Internal │ │                                            │
│        │ │ Docs     │ │  ┌───────────────┐                        │
│        │ │          │ │  │ 📚 Internal   │                        │
│        │ │ 17 docs  │ │  │    Docs       │                        │
│        │ └──────────┘ │  │               │                        │
│        │              │  │ 1 source      │                        │
│        │ [+ Create KB]│  │ 17 documents  │                        │
│        │              │  │ ✅ Active     │                        │
│        │              │  │               │                        │
│        │              │  │ [Open] [⚙️]   │                        │
│        │              │  └───────────────┘                        │
│        │              │                                            │
└────────┴──────────────┴────────────────────────────────────────────┘
```

### 3.2 单个KB视图 - Customer Support

```
┌────────┬──────────────┬────────────────────────────────────────────┐
│        │              │ [🔍 Search sources...] [+ Add Source] [⚙️] │
│ [≡]    │ Knowledge    ├────────────────────────────────────────────┤
│ Doctify│   Bases      │                                            │
├────────┤              │  Customer Support KB                       │
│        │ [+ New]  [🔍]│  Last updated: 2 hours ago                 │
│ 🏠     │              │                                            │
│ Dashbd │ 📊 Overall   │  📊 KB Stats:                              │
│        │              │  4 sources • 245 docs • 32.1 MB           │
│ 📄     │ 📚 KBs       │                                            │
│ Docs   │              │  📁 Data Sources:                [Grid▼]  │
│        │ ┌──────────┐ │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ 📚 *   │ │ 📚 *     │ │  │ 📄       │ │ 🌐       │ │ 💬       │  │
│ KB     │ │ Customer │ │  │ Uploaded │ │ Website  │ │ Q&A      │  │
│        │ │ Support  │ │  │ Docs     │ │ Crawl    │ │ Pairs    │  │
│ 🤖     │ │          │ │  │          │ │          │ │          │  │
│ AI     │ │ 245 docs │ │  │ 189 docs │ │ 12 pages │ │ 44 pairs │  │
│        │ └──────────┘ │  │ ✅ Active│ │ ✅ Active│ │ ✅ Active│  │
│ ⬆️     │              │  │          │ │          │ │          │  │
│ Upload │ 📚 Product   │  │ [View]   │ │ [Crawl]  │ │ [Edit]   │  │
│        │    Catalog   │  └──────────┘ └──────────┘ └──────────┘  │
│ ⚙️     │              │                                            │
│ Settings│ 📚 Internal │  ┌──────────┐                              │
│        │    Docs      │  │ 📝       │                              │
│        │              │  │ Text     │                              │
│        │ [+ Create KB]│  │ Input    │                              │
│        │              │  │          │                              │
│        │              │  │ 0 docs   │                              │
│        │              │  │ ➕ Add   │                              │
│        │              │  │          │                              │
│        │              │  │ [Setup]  │                              │
│        │              │  └──────────┘                              │
│        │              │                                            │
│        │              │  📝 Recent Activity:        [View All →]   │
│        │              │  ┌────────────────────────────────────┐   │
│        │              │  │ 📄 FAQ_v2.pdf added                │   │
│        │              │  │ 2 hours ago • Uploaded Docs        │   │
│        │              │  │ [Preview] [Remove]                 │   │
│        │              │  └────────────────────────────────────┘   │
│        │              │                                            │
└────────┴──────────────┴────────────────────────────────────────────┘
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

**关键架构**: 支持 **"1 个 AI Assistant = 多个独立对话实例"**（参考Intercom Inbox模式）

### 4.1 主视图 - Overall（宏观视图）

```
┌────────┬──────────────┬────────────────────────────────────────────┐
│        │              │ [🔍 Search assistants...] [+ Create New]  │
│ [≡]    │ Assistants   ├────────────────────────────────────────────┤
│ Doctify│              │                                            │
├────────┤ [+ New]  [🔍]│  AI Assistants - Overview                  │
│        │              │                                            │
│ 🏠     │ ┌──────────┐ │  ┌─────────────────────────────────────┐  │
│ Dashbd │ │ 📊       │ │  │ 📊 Overall Statistics               │  │
│        │ │ Overall  │ │  │                                     │  │
│ 📄     │ │          │ │  │ Total Assistants: 3                 │  │
│ Docs   │ │ 3 bots   │ │  │ Total Conversations: 512            │  │
│        │ │ 512 conv.│ │  │ This week: +156 (↑ 44%)            │  │
│ 📚     │ └──────────┘ │  │ Active platforms: 2 (FB, Website)   │  │
│ KB     │              │  │ Avg satisfaction: 4.7/5.0           │  │
│        │ 🤖 Bots      │  └─────────────────────────────────────┘  │
│ 🤖 *   │              │                                            │
│ AI     │ ┌──────────┐ │  ┌─────────────────────────────────────┐  │
│        │ │ 🤖       │ │  │ 📊 By Assistant Breakdown           │  │
│ ⬆️     │ │ Customer │ │  │                                     │  │
│ Upload │ │ Support  │ │  │ Customer Support:   367 conv (72%)  │  │
│        │ │          │ │  │ Sales Analyzer:     123 conv (24%)  │  │
│ ⚙️     │ │ 367 conv.│ │  │ Internal Bot:        22 conv (4%)   │  │
│ Settings│ └──────────┘ │  └─────────────────────────────────────┘  │
│        │              │                                            │
│        │ ┌──────────┐ │  🤖 All Assistants:            [Grid▼]    │
│        │ │ 🤖       │ │  ┌───────────────┐ ┌───────────────┐     │
│        │ │ Sales    │ │  │ 🤖 Customer   │ │ 🤖 Sales      │     │
│        │ │ Analyzer │ │  │    Support    │ │    Analyzer   │     │
│        │ │          │ │  │               │ │               │     │
│        │ │ 123 conv.│ │  │ 367 conv.     │ │ 123 conv.     │     │
│        │ └──────────┘ │  │ ⭐ 4.8/5.0    │ │ ⭐ 4.5/5.0    │     │
│        │              │  │ ✅ FB, Web    │ │ 🔒 Private    │     │
│        │ ┌──────────┐ │  │               │ │               │     │
│        │ │ 🤖       │ │  │ [Open] [⚙️]   │ │ [Open] [⚙️]   │     │
│        │ │ Internal │ │  └───────────────┘ └───────────────┘     │
│        │ │          │ │                                            │
│        │ │ 22 conv. │ │  ┌───────────────┐                        │
│        │ └──────────┘ │  │ 🤖 Internal   │                        │
│        │              │  │    Bot        │                        │
│        │ [+ Create]   │  │               │                        │
│        │              │  │ 22 conv.      │                        │
│        │              │  │ ⭐ 4.9/5.0    │                        │
│        │              │  │ 🔒 Private    │                        │
│        │              │  │               │                        │
│        │              │  │ [Open] [⚙️]   │                        │
│        │              │  └───────────────┘                        │
│        │              │                                            │
└────────┴──────────────┴────────────────────────────────────────────┘
```

### 4.2 单个Assistant视图 - Customer Support Bot

**架构**: Sidebar (Assistants) → Context Panel (Conversations) → Content (Thread Details)

```
┌────────┬──────────────┬────────────────────────────────────────────┐
│        │              │ Customer Support Bot               [⚙️] [•••] │
│ [≡]    │ Assistants   ├────────────────────────────────────────────┤
│ Doctify│              │                                            │
├────────┤ [+ New]  [🔍]│  📊 Assistant Stats:                       │
│        │              │  367 conversations • 234 this week         │
│ 🏠     │ 📊 Overall   │  ⭐ 4.8/5.0 satisfaction • 1.2s avg reply  │
│ Dashbd │              │                                            │
│        │ 🤖 Bots      │  Active Platforms: [Facebook ✅] [Website ✅]│
│ 📄     │              │  🔗 https://chat.doctify.ai/support        │
│ Docs   │ ┌──────────┐ │                                            │
│        │ │ 🤖 *     │ │  💬 Conversations:         [All▼] [Today▼]│
│ 📚     │ │ Customer │ │  ┌────────────────────────────────────┐   │
│ KB     │ │ Support  │ │  │ 💬 Facebook • 2 hours ago          │   │
│        │ │          │ │  │ John Tan: "How to reset password?" │   │
│ 🤖 *   │ │ 367 conv.│ │  │ ✅ Resolved • 3 messages           │   │
│ AI     │ └──────────┘ │  │ [View Thread →]                    │   │
│        │              │  └────────────────────────────────────┘   │
│ ⬆️     │ 🤖 Sales     │  ┌────────────────────────────────────┐   │
│ Upload │    Analyzer  │  │ 💬 Website • 5 hours ago           │   │
│        │              │  │ Sarah: "Business hours?"           │   │
│ ⚙️     │ 🤖 Internal  │  │ ✅ Resolved • 2 messages           │   │
│ Settings│             │  │ [View Thread →]                    │   │
│        │              │  └────────────────────────────────────┘   │
│        │ [+ Create]   │  ┌────────────────────────────────────┐   │
│        │              │  │ 💬 Facebook • Yesterday            │   │
│        │              │  │ Ali: "Delivery address change?"    │   │
│        │              │  │ 🔄 In Progress • 5 messages        │   │
│        │              │  │ [View Thread →]                    │   │
│        │              │  └────────────────────────────────────┘   │
│        │              │                                            │
│        │              │  Showing 3 of 367 • [Load More...]        │
│        │              │                                            │
└────────┴──────────────┴────────────────────────────────────────────┘
```

**关键特性 - "1 Assistant = Multiple Conversation Instances"**:

```
Assistants Sidebar (Level 2):
┌──────────────┐
│ 🤖 Customer  │ ← Selected (蓝色背景)
│    Support   │
│ 367 conv.    │ ← 总对话数
│ +89 today    │ ← 今日新增
└──────────────┘

Content Area (Level 3):
显示该Assistant的所有对话实例:
- Facebook对话 #1 (John Tan)
- Facebook对话 #2 (Sarah Lee)
- Website对话 #1 (Anonymous)
- Website对话 #2 (Ali Rahman)
... (共367个独立对话实例)
```

**与Intercom对比**:
```
Intercom Inbox 模式:
Inbox (Level 1) → Conversation List (Level 2) → Thread (Level 3)

Doctify 模式:
Assistants (Level 2) → Conversation List (Level 3) → Thread (Detail View)
```

### 4.3 对话详情视图 - Thread View (打开单个对话实例)

```
┌────────┬──────────────┬────────────────────────────────────────────┐
│        │              │ ← Back to Customer Support Bot             │
│ [≡]    │ Assistants   ├────────────────────────────────────────────┤
│ Doctify│              │                                            │
├────────┤ [+ New]  [🔍]│  💬 Conversation with John Tan             │
│        │              │  Facebook • Started 2 hours ago            │
│ 🏠     │ 📊 Overall   │  Assistant: Customer Support Bot           │
│ Dashbd │              │                                            │
│        │ 🤖 Bots      │  ┌────────────────────────────────────┐   │
│ 📄     │              │  │ 👤 John Tan • 2:15 PM              │   │
│ Docs   │ ┌──────────┐ │  │ How do I reset my password?        │   │
│        │ │ 🤖 *     │ │  └────────────────────────────────────┘   │
│ 📚     │ │ Customer │ │                                            │
│ KB     │ │ Support  │ │  ┌────────────────────────────────────┐   │
│        │ │          │ │  │ 🤖 Bot • 2:15 PM (1.2s)            │   │
│ 🤖 *   │ │ 367 conv.│ │  │                                    │   │
│ AI     │ └──────────┘ │  │ Hi John! I'd be happy to help you  │   │
│        │              │  │ reset your password. Here's what   │   │
│ ⬆️     │ 🤖 Sales     │  │ you need to do:                    │   │
│ Upload │    Analyzer  │  │                                    │   │
│        │              │  │ 1. Go to the login page            │   │
│ ⚙️     │ 🤖 Internal  │  │ 2. Click "Forgot Password"         │   │
│ Settings│             │  │ 3. Enter your email...             │   │
│        │              │  │                                    │   │
│        │ [+ Create]   │  │ 📚 Source: Password FAQ            │   │
│        │              │  │ Confidence: 94%                    │   │
│        │              │  └────────────────────────────────────┘   │
│        │              │                                            │
│        │              │  ┌────────────────────────────────────┐   │
│        │              │  │ 👤 John Tan • 2:16 PM              │   │
│        │              │  │ Thanks! That worked.               │   │
│        │              │  └────────────────────────────────────┘   │
│        │              │                                            │
│        │              │  ┌────────────────────────────────────┐   │
│        │              │  │ 🤖 Bot • 2:16 PM (0.8s)            │   │
│        │              │  │ Great! Is there anything else I    │   │
│        │              │  │ can assist you with?               │   │
│        │              │  └────────────────────────────────────┘   │
│        │              │                                            │
│        │              │  Status: ✅ Resolved                       │
│        │              │                                            │
│        │              │  Actions: [📥 Export] [🏷️ Tag] [👤 Assign]│
│        │              │                                            │
│        │              │  Rate this conversation:                   │
│        │              │  ⭐⭐⭐⭐⭐                              │
│        │              │                                            │
└────────┴──────────────┴────────────────────────────────────────────┘
```

### 4.4 创建助手 - Wizard Step 1

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

### 4.6 Sidebar规格（三级导航）

```
Level 1 (SideNav): 🤖 AI Assistants
Level 2 (Context Panel): Assistants列表
Level 3 (Content): 对话列表或Thread详情

Assistants Sidebar:
┌──────────────┐
│ 📊 Overall   │ ← 宏观视图
│ 512 conv.    │
├──────────────┤
│ 🤖 Assistants│ ← Section Header
├──────────────┤
│ Customer     │ ← Selected (蓝色背景)
│ Support      │
│ 367 conv.    │   点击 → 显示该Assistant的所有对话
│ +89 today    │
├──────────────┤
│ Sales        │ ← Other Assistant
│ Analyzer     │
│ 123 conv.    │
├──────────────┤
│ Internal Bot │
│ 22 conv.     │
├──────────────┤
│ [+ Create]   │ ← 快速创建
└──────────────┘
```

**Sidebar交互**:
- Click Assistant: 显示该Assistant的所有对话实例
- Click Overall: 显示所有Assistants的统计和总对话列表
- Drag-and-drop: 重新排序Assistants
- Right-click: 设置/删除/复制

### 4.7 对话过滤和排序

在单个Assistant视图中，用户可以过滤对话:

```
Filters (顶部):
[All Platforms ▼] [Last 7 Days ▼] [All Status ▼] [🔍 Search]

Platform options:
- All Platforms
- Facebook
- WhatsApp
- Website Chat
- Telegram

Date options:
- Today
- Last 7 Days
- Last 30 Days
- Custom Range

Status options:
- All
- ✅ Resolved
- 🔄 In Progress
- ⏳ Pending

Sort by:
- Latest First (default)
- Oldest First
- Most Messages
- Highest Rating
```

### 4.8 组件规格

**Assistants Sidebar**:
- 宽度: 240px固定
- 可折叠: 移动端隐藏，汉堡菜单展开
- Active State: 蓝色背景 + 粗体
- 显示: Assistant名称 + 总对话数 + 今日新增
- Hover: 显示快捷操作（Settings, Test, Analytics）

**Assistant Card (Overall视图)**:
- 高度: 180px固定
- Grid: 3列（桌面），2列（平板），1列（手机）
- 包含: 名称、对话数、满意度评分、平台状态
- Actions: [Open] [⚙️ Settings]
- Platform Badges:
  - ✅ Active: 绿色
  - 🚧 Setup Required: 黄色
  - ⏳ Coming Soon: 灰色

**Creation Wizard**:
- 4步流程，可前后导航
- 实时预览（Step 2 personality）
- 验证: Name必填，至少选1个KB
- 进度指示器: [1/4] [2/4] [3/4] [4/4]

**Conversation Card**:
- 高度: 80px固定
- 虚拟滚动（处理大量对话）
- 显示: Platform图标, 用户名, 预览文本, 状态, 消息数
- Hover: 显示快速操作（View, Export, Delete）
- Status Badge:
  - ✅ Resolved: 绿色
  - 🔄 In Progress: 蓝色
  - ⏳ Pending: 黄色

**Thread View**:
- Chat bubble样式（用户右侧蓝色，Bot左侧灰色）
- 时间戳 + 响应时间
- Source和Confidence显示（Bot消息）
- Export to PDF/CSV功能
- Real-time updates（WebSocket新消息）

### 4.9 需要的API

```typescript
// ✅ 现有（假设RAG已实现）
GET /api/v1/assistants
POST /api/v1/assistants
PUT /api/v1/assistants/{assistant_id}
DELETE /api/v1/assistants/{assistant_id}

// ❌ 需要新增: Overall统计
GET /api/v1/assistants/stats
Response: {
  total_assistants: 3,
  total_conversations: 512,
  conversations_this_week: 156,
  trend: "up",  // "up" | "down" | "stable"
  active_platforms: ["facebook", "website"],
  avg_satisfaction: 4.7,
  breakdown: [
    { assistant_id: "ast_1", name: "Customer Support", conv_count: 367, percentage: 72 },
    { assistant_id: "ast_2", name: "Sales Analyzer", conv_count: 123, percentage: 24 },
    { assistant_id: "ast_3", name: "Internal Bot", conv_count: 22, percentage: 4 }
  ]
}

// ❌ 需要新增: 单个助手详细信息（支持"1 Assistant = Multiple Conversations"）
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
    facebook: { status: "active", page_id: "..." },  // Phase 2
    whatsapp: null,
    telegram: null,
    shopee: null
  },
  stats: {
    conversations_total: 367,
    conversations_this_week: 89,
    conversations_today: 12,
    avg_response_time: 1.2,
    satisfaction_score: 4.8,
    platforms: ["facebook", "website"]
  }
}

// ❌ 需要新增: 获取该Assistant的所有对话实例（核心功能）
GET /api/v1/assistants/{assistant_id}/conversations
Query: {
  platform?: "all" | "facebook" | "whatsapp" | "website",
  status?: "all" | "resolved" | "in_progress" | "pending",
  date_from?: "2025-01-01",
  date_to?: "2025-01-31",
  search?: "keyword",
  page: 1,
  page_size: 20
}
Response: {
  conversations: [
    {
      id: "conv_1",
      platform: "facebook",
      user_id: "fb_user_123",
      user_name: "John Tan",
      user_avatar: "...",
      status: "resolved" | "in_progress" | "pending",
      message_count: 3,
      started_at: "2025-01-25T14:15:00Z",
      last_message_at: "2025-01-25T14:16:00Z",
      last_message_preview: "How do I reset my password?",
      rating: 5,
      tags: ["password", "support"]
    }
  ],
  total: 367,
  page: 1,
  page_size: 20,
  total_pages: 19
}

// ❌ 需要新增: 单个对话详情（Thread View）
GET /api/v1/conversations/{conversation_id}
Response: {
  id: "conv_1",
  platform: "facebook",
  user: {
    id: "fb_user_123",
    name: "John Tan",
    avatar_url: "...",
    platform_user_id: "..."
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
        knowledge_base_name: "Customer Support KB",
        document_id: "doc_45",
        document_name: "Password FAQ",
        snippet: "To reset your password..."
      },
      confidence: 0.94
    }
  ],
  status: "resolved" | "in_progress" | "pending",
  rating: 5,
  tags: ["password", "support"],
  created_at: "2025-01-25T14:15:00Z",
  updated_at: "2025-01-25T14:16:30Z"
}

// ❌ 需要新增: 对话评分
POST /api/v1/conversations/{conversation_id}/rate
Request: {
  rating: 1 | 2 | 3 | 4 | 5,
  feedback?: "Optional feedback text"
}

// ❌ 需要新增: 对话标签管理
POST /api/v1/conversations/{conversation_id}/tags
Request: { tags: ["password", "urgent", "billing"] }

// ❌ 需要新增: Embed Code生成
POST /api/v1/assistants/{assistant_id}/generate-embed
Request: {
  theme: "light" | "dark",
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left",
  primary_color: "#3B82F6"
}
Response: {
  embed_code: "<script src='https://cdn.doctify.ai/widget.js' data-assistant='ast_1' data-theme='light'></script>",
  public_url: "https://chat.doctify.ai/customer-support-bot"
}

// ❌ 需要新增: 公开聊天API（无需认证，用于embed和public URL）
POST /api/v1/public/assistants/{public_id}/chat
Request: {
  message: "How do I reset my password?",
  conversation_id?: "conv_1",  // Optional, for continuing conversation
  user_info?: {  // Optional, for tracking
    name?: "John",
    email?: "john@example.com"
  }
}
Response: {
  conversation_id: "conv_1",
  message: {
    role: "assistant",
    content: "Hi! I'd be happy to help...",
    source: {
      knowledge_base_name: "Customer Support KB",
      document_name: "Password FAQ"
    },
    confidence: 0.94
  }
}

// WebSocket for real-time chat（embed widget使用）
WS /api/v1/public/assistants/{public_id}/chat?conversation_id=conv_1
Events: {
  type: "message",
  conversation_id: "conv_1",
  message: {...}
}
```

### 4.10 需要新增的功能（Phase 1 必须）

**核心架构**:
- ❌ **"1 Assistant = Multiple Conversations" 数据模型** - 对话与助手的一对多关系
- ❌ **Sidebar导航** - Assistants列表，支持Overall视图
- ❌ **对话实例管理** - 存储、查询、过滤单个Assistant的所有对话

**对话功能**:
- ❌ **对话存储** - 持久化每个对话的消息历史
- ❌ **对话状态管理** - resolved/in_progress/pending状态
- ❌ **Platform标识** - 区分来源（Facebook/Website/WhatsApp等）
- ❌ **响应时间追踪** - 记录每条Bot消息的生成时间
- ❌ **Source和Confidence** - 显示答案来源和置信度

**公开访问**:
- ❌ **公开聊天API** - 无需认证的endpoint（用于embed和public URL）
- ❌ **Embed Widget** - JavaScript chat widget（单独前端项目，Phase 1简化版）
- ❌ **Public URL生成** - 每个Assistant有独立的公开聊天页面

**可选功能**（Phase 1可延后）:
- ⏳ **满意度评分** - 对话结束后请求评分
- ⏳ **对话标签** - 手动打标签分类
- ⏳ **Export功能** - 导出对话为PDF/CSV
- ⏳ **多平台集成** - Facebook/WhatsApp/Telegram（Phase 2）

**已有基础**:
- ✅ **RAG Chat** - 应该已有基础实现
- ✅ **Knowledge Base** - 已有向量搜索

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

---

## 9. Critical UI States（必须实现）

### 9.1 Empty States（空状态）

**原则**：空状态不是"错误"，而是"机会" - 引导用户完成第一个行动。

#### 9.1.1 Documents页 - Empty States

```
Overall View - 无项目:

┌────────────────────────────────────────────────────────┐
│                                                        │
│                      📂                                │
│                                                        │
│            No projects yet                            │
│                                                        │
│    Create your first project to organize              │
│         your documents effectively                     │
│                                                        │
│           [+ Create First Project]                     │
│                                                        │
│    💡 Tip: Projects help you group related documents  │
│                                                        │
└────────────────────────────────────────────────────────┘


Project Selected - 无文档:

┌────────────────────────────────────────────────────────┐
│                                                        │
│                      📄                                │
│                                                        │
│         No documents in this project                   │
│                                                        │
│    Upload your first document to extract              │
│        structured data with AI-powered OCR             │
│                                                        │
│           [📤 Upload Document]                         │
│                                                        │
│    Supported: PDF, PNG, JPG • Max 10MB per file       │
│                                                        │
└────────────────────────────────────────────────────────┘


Search - 无结果:

┌────────────────────────────────────────────────────────┐
│  [🔍 invoice 2024]                          [Clear]    │
├────────────────────────────────────────────────────────┤
│                                                        │
│                      🔍                                │
│                                                        │
│         No documents found                             │
│                                                        │
│    Try adjusting your search or filters               │
│                                                        │
│    • Check spelling                                    │
│    • Try different keywords                            │
│    • Clear filters                                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 9.1.2 Knowledge Base页 - Empty States

```
Overall View - 无Knowledge Base:

┌────────────────────────────────────────────────────────┐
│                                                        │
│                      📚                                │
│                                                        │
│         No knowledge bases yet                         │
│                                                        │
│    Create a knowledge base to power your               │
│       AI assistants with custom data                   │
│                                                        │
│        [✨ Create Knowledge Base]                      │
│                                                        │
│    💡 KBs help your AI give accurate, relevant answers │
│                                                        │
└────────────────────────────────────────────────────────┘


KB Selected - 无数据源:

┌────────────────────────────────────────────────────────┐
│  Customer Support KB                      [⚙️] [•••]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                      📦                                │
│                                                        │
│         No data sources yet                            │
│                                                        │
│    Add your first data source to populate              │
│         this knowledge base                            │
│                                                        │
│           [+ Add Data Source]                          │
│                                                        │
│    Options: Uploaded Docs, Website, Text, Q&A         │
│                                                        │
└────────────────────────────────────────────────────────┘


Uploaded Docs - 无选择文档:

┌────────────────────────────────────────────────────────┐
│  Select Documents                         [Cancel]     │
├────────────────────────────────────────────────────────┤
│  [🔍 Search documents...]                              │
│                                                        │
│                      📄                                │
│                                                        │
│    No documents available                              │
│                                                        │
│    Upload documents first in Documents page            │
│                                                        │
│        [Go to Documents Page]                          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 9.1.3 AI Assistants页 - Empty States

```
Overall View - 无Assistant:

┌────────────────────────────────────────────────────────┐
│                                                        │
│                      🤖                                │
│                                                        │
│         No AI assistants yet                           │
│                                                        │
│    Create your first AI assistant to start             │
│       having intelligent conversations                 │
│                                                        │
│         [✨ Create Assistant]                          │
│                                                        │
│    💡 Connect a knowledge base for accurate answers    │
│                                                        │
└────────────────────────────────────────────────────────┘


Assistant Selected - 无对话:

┌────────────────────────────────────────────────────────┐
│  Customer Support Bot                     [⚙️] [•••]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                      💬                                │
│                                                        │
│         No conversations yet                           │
│                                                        │
│    Waiting for first customer to start chatting       │
│                                                        │
│    Share your assistant:                               │
│    🔗 Public URL                                       │
│    📋 Embed Code                                       │
│    📱 Facebook/WhatsApp (Phase 2)                      │
│                                                        │
└────────────────────────────────────────────────────────┘


Create Assistant Wizard - 无KB:

┌────────────────────────────────────────────────────────┐
│  Step 2: Select Knowledge Base                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│                      📚                                │
│                                                        │
│    No knowledge bases available                        │
│                                                        │
│    Create a knowledge base first to give your          │
│       assistant a foundation of information            │
│                                                        │
│      [Create Knowledge Base]  [Skip for Now]           │
│                                                        │
│    ℹ️  You can add a KB later in settings             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

#### 9.1.4 Dashboard页 - Empty State

```
Dashboard - 新用户首次登录:

┌────────────────────────────────────────────────────────┐
│                                                        │
│                      👋                                │
│                                                        │
│         Welcome to Doctify!                            │
│                                                        │
│    Get started with these simple steps:                │
│                                                        │
│    1️⃣  Upload your first document                     │
│    2️⃣  Create a knowledge base                        │
│    3️⃣  Build an AI assistant                          │
│                                                        │
│    [🚀 Start Quick Setup]  [Explore Dashboard]        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Empty State规格**:
- 图标大小: 64px × 64px
- 图标颜色: `text-gray-400` (浅灰色)
- 标题: `text-lg font-semibold` (18px粗体)
- 描述: `text-sm text-gray-600` (14px灰色)
- CTA按钮: `btn-primary` 样式，16px高度
- Tip文字: `text-xs text-gray-500` (12px，更浅灰)
- 整体居中对齐，垂直间距24px

---

### 9.2 Loading States（加载状态）

**原则**：永远不要让用户看到空白屏幕或卡住的界面。

#### 9.2.1 Document Upload - Processing

```
上传进行中:

┌────────────────────────────────────────────────────────┐
│  📤 Uploading: invoice_jan_2024.pdf                    │
│                                                        │
│  [████████████████░░░░░░░░] 75%                        │
│                                                        │
│  3.2 MB / 4.5 MB • 5 seconds remaining                │
└────────────────────────────────────────────────────────┘


OCR处理中:

┌────────────────────────────────────────────────────────┐
│  🔄 Processing OCR...                                  │
│                                                        │
│  [████████████░░░░░░░░░░░░] 60%                        │
│                                                        │
│  Extracting text and data structures                   │
│  Estimated: 15 seconds remaining                       │
│                                                        │
│  💡 Complex documents may take longer                  │
└────────────────────────────────────────────────────────┘


批量上传:

┌────────────────────────────────────────────────────────┐
│  📤 Uploading 5 documents...                           │
│                                                        │
│  ✅ invoice_001.pdf                                    │
│  ✅ invoice_002.pdf                                    │
│  🔄 invoice_003.pdf - Processing OCR (45%)             │
│  ⏳ invoice_004.pdf - Queued                           │
│  ⏳ invoice_005.pdf - Queued                           │
│                                                        │
│  Overall: [████████░░░░░░░░░░] 40%                    │
│                                                        │
│  [Cancel Remaining]                                    │
└────────────────────────────────────────────────────────┘
```

#### 9.2.2 Knowledge Base - Data Source Processing

```
Website爬取中:

┌────────────────────────────────────────────────────────┐
│  🌐 Crawling website...                                │
│                                                        │
│  [████████████████████░░░░] 80%                        │
│                                                        │
│  Pages discovered: 24                                  │
│  Pages processed: 19                                   │
│  Estimated: 30 seconds remaining                       │
│                                                        │
│  Current: https://example.com/support/faq              │
│                                                        │
│  [Stop Crawl]                                          │
└────────────────────────────────────────────────────────┘


向量化处理中:

┌────────────────────────────────────────────────────────┐
│  ⚡ Generating embeddings...                           │
│                                                        │
│  [██████████████████████░░] 90%                        │
│                                                        │
│  Processing: 45 / 50 documents                         │
│  Estimated: 10 seconds remaining                       │
│                                                        │
│  💡 This enables semantic search in your KB            │
└────────────────────────────────────────────────────────┘
```

#### 9.2.3 AI Assistant - Conversation

```
Bot正在思考:

┌────────────────────────────────────────────────────────┐
│  User                                      2:30 PM     │
│  ┌──────────────────────────────────────┐             │
│  │ How do I reset my password?          │             │
│  └──────────────────────────────────────┘             │
│                                                        │
│                                          Bot  2:30 PM  │
│             ┌────────────────────────────────────────┐ │
│             │ 🤔 Thinking...                         │ │
│             │ [••••••]                               │ │
│             └────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘


Streaming Response（逐字显示）:

┌────────────────────────────────────────────────────────┐
│                                          Bot  2:30 PM  │
│             ┌────────────────────────────────────────┐ │
│             │ Hi John! I'd be happy to help you     │ │
│             │ reset your password. Here's how:      │ │
│             │                                        │ │
│             │ 1. Go to the login page               │ │
│             │ 2. Click "Forgot Password"▊           │ │
│             └────────────────────────────────────────┘ │
│             📚 Source: Password Reset Guide            │
└────────────────────────────────────────────────────────┘
```

#### 9.2.4 Page Loading - Skeleton Screens

```
Documents列表 - Skeleton:

┌────────────────────────────────────────────────────────┐
│  [░░░░░░░░░░░░░] [░░░░░░] [░░░░░]             [░░░]   │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐ │
│  │ [░░░]                                            │ │
│  │ [░░░░░░░░░░░░░░░]                                │ │
│  │ [░░░░░░░░]                                       │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [░░░]                                            │ │
│  │ [░░░░░░░░░░░░░░░]                                │ │
│  │ [░░░░░░░░]                                       │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘

Dashboard - Skeleton:

┌────────────────────────────────────────────────────────┐
│  [░░░░░░░░░░]                                          │
│                                                        │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐             │
│  │[░░░]  │ │[░░░]  │ │[░░░]  │ │[░░░]  │             │
│  │[░░░░] │ │[░░░░] │ │[░░░░] │ │[░░░░] │             │
│  └───────┘ └───────┘ └───────┘ └───────┘             │
│                                                        │
│  [░░░░░░░░░░░░░░]                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │ [░░░░░░░] [░░░░] [░░░░░░]                        │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

**Loading State规格**:
- Progress Bar: 4px高度，圆角2px
- 进度颜色: `bg-blue-500`（主色调）
- 背景颜色: `bg-gray-200`
- 百分比文字: `text-sm text-gray-700`
- 估计时间: `text-xs text-gray-500`
- Skeleton颜色: `bg-gray-200` 带 `animate-pulse`
- Spinner: 16px × 16px，使用ShadcnUI的`Loader2`图标

---

### 9.3 Confirmation Dialogs（确认对话框）

**原则**：破坏性操作（删除、覆盖）必须二次确认，并清楚说明后果。

#### 9.3.1 Delete Confirmations

```
删除项目:

┌─────────────────────────────────────────────┐
│  ⚠️  Delete "Marketing Campaign 2024"?      │
├─────────────────────────────────────────────┤
│                                             │
│  This will permanently delete:              │
│                                             │
│  • 45 documents                             │
│  • All OCR data                             │
│  • All document history                     │
│                                             │
│  This action cannot be undone.              │
│                                             │
│  [Cancel]           [Delete Project]        │
│                      ^^^ 红色，危险样式     │
└─────────────────────────────────────────────┘


删除Knowledge Base:

┌─────────────────────────────────────────────┐
│  ⚠️  Delete "Customer Support KB"?          │
├─────────────────────────────────────────────┤
│                                             │
│  This will permanently delete:              │
│                                             │
│  • 3 data sources                           │
│  • 1,245 embedded documents                 │
│  • All vector data                          │
│                                             │
│  ⚠️  Warning: 2 AI assistants are using    │
│     this KB and will stop working!          │
│                                             │
│  • Customer Support Bot                     │
│  • Sales Analyzer Bot                       │
│                                             │
│  [Cancel]        [Delete Knowledge Base]    │
│                   ^^^ 红色，危险样式        │
└─────────────────────────────────────────────┘


删除AI Assistant:

┌─────────────────────────────────────────────┐
│  ⚠️  Delete "Customer Support Bot"?         │
├─────────────────────────────────────────────┤
│                                             │
│  This will permanently delete:              │
│                                             │
│  • 367 conversation histories               │
│  • All chat logs                            │
│  • Public URL and embed code                │
│  • All connected integrations               │
│                                             │
│  💡 Consider archiving instead of deleting  │
│                                             │
│  [Cancel]  [Archive]  [Delete Assistant]    │
│                        ^^^ 红色，危险样式   │
└─────────────────────────────────────────────┘


批量删除:

┌─────────────────────────────────────────────┐
│  ⚠️  Delete 12 selected documents?          │
├─────────────────────────────────────────────┤
│                                             │
│  You are about to delete:                   │
│                                             │
│  • 12 documents                             │
│  • All associated OCR data                  │
│  • All document versions                    │
│                                             │
│  This action cannot be undone.              │
│                                             │
│  [Cancel]          [Delete 12 Documents]    │
│                     ^^^ 红色，危险样式      │
└─────────────────────────────────────────────┘
```

#### 9.3.2 Discard Changes

```
离开编辑页面:

┌─────────────────────────────────────────────┐
│  ⚠️  Discard unsaved changes?               │
├─────────────────────────────────────────────┤
│                                             │
│  You have unsaved changes to:               │
│                                             │
│  • Assistant personality settings           │
│  • Connected knowledge bases                │
│                                             │
│  Are you sure you want to leave?            │
│                                             │
│  [Cancel]  [Save & Continue]  [Discard]     │
│                                ^^^ 次要样式  │
└─────────────────────────────────────────────┘


OCR结果编辑中途离开:

┌─────────────────────────────────────────────┐
│  ⚠️  Discard OCR corrections?               │
├─────────────────────────────────────────────┤
│                                             │
│  You have made 8 corrections to the         │
│  OCR results that haven't been saved.       │
│                                             │
│  [Cancel]    [Save Changes]    [Discard]    │
└─────────────────────────────────────────────┘
```

#### 9.3.3 Overwrite Warnings

```
上传同名文件:

┌─────────────────────────────────────────────┐
│  ⚠️  File already exists                    │
├─────────────────────────────────────────────┤
│                                             │
│  "invoice_jan_2024.pdf" already exists      │
│  in this project.                           │
│                                             │
│  Uploaded: 2024-01-15                       │
│  Size: 2.4 MB                               │
│                                             │
│  What would you like to do?                 │
│                                             │
│  [Cancel]  [Keep Both]  [Replace Existing]  │
└─────────────────────────────────────────────┘


导入数据源冲突:

┌─────────────────────────────────────────────┐
│  ⚠️  Duplicate documents detected           │
├─────────────────────────────────────────────┤
│                                             │
│  5 documents from "FAQ Website" already     │
│  exist in this knowledge base.              │
│                                             │
│  What would you like to do?                 │
│                                             │
│  [Cancel]                                   │
│  [Skip Duplicates]                          │
│  [Replace with New Versions]                │
│  [Keep Both (with suffix)]                  │
└─────────────────────────────────────────────┘
```

**Confirmation Dialog规格**:
- Modal宽度: 480px (max-w-md)
- 标题: `text-lg font-semibold` 配警告图标 ⚠️
- 内容: `text-sm text-gray-700`，列表用bullet points
- 警告信息: `bg-yellow-50 border-yellow-200` 带黄色边框
- 按钮顺序: [Cancel] [Secondary] [Primary/Danger]
- Danger按钮: `bg-red-600 hover:bg-red-700 text-white`
- ESC键 = Cancel，Enter键 = Primary action
- Overlay: `bg-black/50` 半透明黑色

---

### 9.4 Error States（错误状态）

**原则**：清楚说明发生了什么，为什么，以及用户可以做什么。

#### 9.4.1 Upload Errors

```
文件大小超限:

┌─────────────────────────────────────────────┐
│  ❌ Upload failed                            │
├─────────────────────────────────────────────┤
│                                             │
│  File "large_document.pdf" is too large     │
│                                             │
│  • File size: 15.2 MB                       │
│  • Maximum allowed: 10 MB                   │
│                                             │
│  💡 Try compressing the PDF or splitting    │
│     it into smaller files                   │
│                                             │
│  [Try Again]  [Learn More]                  │
└─────────────────────────────────────────────┘


不支持的文件类型:

┌─────────────────────────────────────────────┐
│  ❌ Unsupported file type                    │
├─────────────────────────────────────────────┤
│                                             │
│  "document.docx" cannot be processed        │
│                                             │
│  Supported formats:                         │
│  • PDF (.pdf)                               │
│  • Images (.png, .jpg, .jpeg)               │
│                                             │
│  💡 Convert DOCX to PDF before uploading    │
│                                             │
│  [Upload Different File]                    │
└─────────────────────────────────────────────┘


网络错误:

┌─────────────────────────────────────────────┐
│  ❌ Upload failed                            │
├─────────────────────────────────────────────┤
│                                             │
│  Network connection was interrupted         │
│                                             │
│  • Check your internet connection           │
│  • File may be partially uploaded           │
│                                             │
│  [Retry Upload]  [Cancel]                   │
└─────────────────────────────────────────────┘
```

#### 9.4.2 Processing Errors

```
OCR处理失败:

┌─────────────────────────────────────────────┐
│  ❌ OCR processing failed                    │
├─────────────────────────────────────────────┤
│                                             │
│  "invoice_scan.pdf" could not be processed  │
│                                             │
│  Possible reasons:                          │
│  • Image quality too low                    │
│  • Text is handwritten                      │
│  • Document is encrypted                    │
│                                             │
│  💡 Try uploading a clearer image or        │
│     a different version of the document     │
│                                             │
│  [Upload New Version]  [Contact Support]    │
└─────────────────────────────────────────────┘


Knowledge Base向量化失败:

┌─────────────────────────────────────────────┐
│  ❌ Embedding generation failed              │
├─────────────────────────────────────────────┤
│                                             │
│  Could not process data source:             │
│  "Customer Support Website"                 │
│                                             │
│  Error: 12 pages failed to load             │
│                                             │
│  • https://example.com/page1 (404)          │
│  • https://example.com/page2 (timeout)      │
│  • 10 more...                               │
│                                             │
│  [View Error Details]  [Retry Failed Pages] │
└─────────────────────────────────────────────┘
```

#### 9.4.3 API/Connection Errors

```
通用API错误:

┌─────────────────────────────────────────────┐
│  ❌ Something went wrong                     │
├─────────────────────────────────────────────┤
│                                             │
│  We couldn't complete your request          │
│                                             │
│  Error code: ERR_SERVER_500                 │
│                                             │
│  • This has been logged automatically       │
│  • Our team has been notified               │
│                                             │
│  [Try Again]  [Go Back]  [Contact Support]  │
└─────────────────────────────────────────────┘


WebSocket连接断开:

┌─────────────────────────────────────────────┐
│  ⚠️  Connection lost                         │
├─────────────────────────────────────────────┤
│                                             │
│  Real-time updates are paused               │
│                                             │
│  🔄 Attempting to reconnect...              │
│     (Retry 2 of 5)                          │
│                                             │
│  [Reconnect Now]  [Refresh Page]            │
└─────────────────────────────────────────────┘


配额超限:

┌─────────────────────────────────────────────┐
│  ⚠️  Monthly quota exceeded                  │
├─────────────────────────────────────────────┤
│                                             │
│  OCR Quota: 500 / 500 used                  │
│  Resets on: Feb 1, 2025                     │
│                                             │
│  You can:                                   │
│  • Wait for quota reset (7 days)            │
│  • Upgrade to a higher plan                 │
│  • Purchase additional quota                │
│                                             │
│  [View Plans]  [Buy Add-on]  [OK]           │
└─────────────────────────────────────────────┘
```

#### 9.4.4 Permission Errors

```
权限不足:

┌─────────────────────────────────────────────┐
│  ❌ Permission denied                        │
├─────────────────────────────────────────────┤
│                                             │
│  You don't have permission to delete        │
│  this project                               │
│                                             │
│  Required role: Admin or Owner              │
│  Your role: Member                          │
│                                             │
│  💡 Contact your workspace admin to         │
│     request access                          │
│                                             │
│  [Contact Admin]  [OK]                      │
└─────────────────────────────────────────────┘


Session过期:

┌─────────────────────────────────────────────┐
│  ⚠️  Session expired                         │
├─────────────────────────────────────────────┤
│                                             │
│  Your session has expired for security      │
│  reasons                                    │
│                                             │
│  Please sign in again to continue           │
│                                             │
│  [Sign In]                                  │
└─────────────────────────────────────────────┘
```

#### 9.4.5 Page-Level Errors

```
404 - Page Not Found:

┌─────────────────────────────────────────────┐
│                                             │
│               🔍                            │
│                                             │
│         404 - Page Not Found                │
│                                             │
│  The page you're looking for doesn't exist │
│  or has been moved                          │
│                                             │
│  • Check the URL for typos                  │
│  • Go back to previous page                 │
│  • Return to dashboard                      │
│                                             │
│  [← Go Back]  [Go to Dashboard]             │
│                                             │
└─────────────────────────────────────────────┘


500 - Server Error:

┌─────────────────────────────────────────────┐
│                                             │
│               ⚠️                            │
│                                             │
│         500 - Server Error                  │
│                                             │
│  Something went wrong on our end            │
│                                             │
│  • We've been notified and are working on it│
│  • Try refreshing the page                  │
│  • Check status.doctify.com for updates    │
│                                             │
│  [Refresh Page]  [Contact Support]          │
│                                             │
└─────────────────────────────────────────────┘


Network Offline:

┌─────────────────────────────────────────────┐
│                                             │
│               📡                            │
│                                             │
│         No Internet Connection              │
│                                             │
│  You're currently offline                   │
│                                             │
│  • Check your network connection            │
│  • Some features may not work               │
│  • Changes will sync when reconnected       │
│                                             │
│  [Retry Connection]                         │
│                                             │
└─────────────────────────────────────────────┘
```

**Error State规格**:
- Error Banner (inline): `bg-red-50 border-l-4 border-red-500 p-4`
- Error Modal: 同Confirmation Dialog尺寸
- 错误图标: ❌ 或 ⚠️，红色 `text-red-600`
- 标题: `text-lg font-semibold text-red-900`
- 描述: `text-sm text-gray-700`
- 帮助文字: `text-xs text-gray-600` 配💡图标
- Toast通知: `bg-red-600 text-white` 右上角，5秒自动消失
- Error ID: 技术错误显示error code供客服查询

---

### 9.5 Success States（成功反馈）

**原则**：让用户知道操作成功了，并引导下一步行动。

```
文档上传成功 - Toast:

┌──────────────────────────────────────┐
│ ✅ Document uploaded successfully    │
│ "invoice_jan_2024.pdf"               │
│ OCR processing started...            │
└──────────────────────────────────────┘
↑ 右上角，3秒后自动消失


Knowledge Base创建成功 - Banner:

┌────────────────────────────────────────────────────────┐
│ ✅ Knowledge Base "Customer Support" created!          │
│                                                        │
│ Next steps:                                            │
│ • [Add Data Sources] to populate your KB              │
│ • [Create an Assistant] to use this KB                │
│                                                [✕]     │
└────────────────────────────────────────────────────────┘


批量操作完成 - Modal:

┌─────────────────────────────────────────────┐
│  ✅ Batch operation completed                │
├─────────────────────────────────────────────┤
│                                             │
│  Successfully processed 10 documents        │
│                                             │
│  ✅ 8 succeeded                             │
│  ⚠️  2 failed                               │
│                                             │
│  [View Results]  [Close]                    │
└─────────────────────────────────────────────┘
```

**Success State规格**:
- Toast颜色: `bg-green-600 text-white`
- Banner颜色: `bg-green-50 border-green-200`
- 图标: ✅ `text-green-600`
- 持续时间: 3-5秒自动消失（Toast），用户手动关闭（Banner）
- 位置: Toast右上角，Banner页面顶部

---

## 9.6 实施检查清单

### Phase 1 Must-Have（第1-2周实施）

#### Documents页:
- [ ] Empty: 无项目状态
- [ ] Empty: 项目内无文档状态
- [ ] Empty: 搜索无结果状态
- [ ] Loading: 文档上传进度条
- [ ] Loading: OCR处理进度
- [ ] Loading: 批量上传状态
- [ ] Confirm: 删除项目确认
- [ ] Confirm: 批量删除确认
- [ ] Error: 文件大小超限
- [ ] Error: 不支持的文件类型
- [ ] Error: OCR处理失败
- [ ] Success: 上传成功Toast

#### Knowledge Base页:
- [ ] Empty: 无KB状态
- [ ] Empty: KB内无数据源状态
- [ ] Empty: 无可选文档状态
- [ ] Loading: 网站爬取进度
- [ ] Loading: 向量化进度
- [ ] Confirm: 删除KB确认（警告Assistant依赖）
- [ ] Error: 爬取失败错误
- [ ] Error: 向量化失败错误
- [ ] Success: 创建成功Banner

#### AI Assistants页:
- [ ] Empty: 无Assistant状态
- [ ] Empty: 无对话状态
- [ ] Empty: Wizard中无KB状态
- [ ] Loading: Bot思考中动画
- [ ] Loading: Streaming响应
- [ ] Confirm: 删除Assistant确认
- [ ] Confirm: 离开编辑页确认
- [ ] Error: 对话发送失败
- [ ] Success: Assistant创建成功

#### Global:
- [ ] Loading: Skeleton screens（所有列表页）
- [ ] Error: 404页面
- [ ] Error: 500页面
- [ ] Error: 网络离线状态
- [ ] Error: WebSocket断线提示
- [ ] Error: Session过期跳转
- [ ] Error: 配额超限提示
- [ ] Success: 通用成功Toast组件

### Phase 2 Nice-to-Have（后续迭代）
- [ ] Empty: Dashboard新用户引导
- [ ] Empty: 各种filter组合的无结果状态
- [ ] Loading: 页面切换过渡动画
- [ ] Confirm: 同名文件覆盖确认
- [ ] Error: 权限不足详细说明
- [ ] Success: 操作成功后的Next Steps建议

---

## 总结

**Critical States覆盖率**:
- Empty States: 12个场景 ✅
- Loading States: 8个场景 ✅
- Confirmation Dialogs: 8个场景 ✅
- Error States: 15个场景 ✅
- Success States: 3个模板 ✅

**实施优先级**:
1. **Week 1-2**: Documents页所有states（配合页面重构）
2. **Week 3-4**: Knowledge Base页所有states
3. **Week 5-6**: AI Assistants页所有states
4. **Week 7-8**: Global states + Polish

**组件复用**:
- `EmptyState` 组件（通用）
- `ProgressBar` 组件
- `ConfirmDialog` 组件
- `ErrorBanner` 组件
- `Toast` 组件
- `SkeletonLoader` 组件

所有states应该在实施对应页面时**同步完成**，不要留到最后，否则会给用户造成不完整的印象。

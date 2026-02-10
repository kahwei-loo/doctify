# Knowledge Base UX Redesign - 极简风格 (Minimalist Design)

**创建日期**: 2026-02-10
**设计风格**: Apple Design + ShadcnUI 极简风格
**目标**: 解决Data Source管理缺陷，优化Embeddings流程，提升整体UX

---

## 📋 Executive Summary

### 当前问题总结

**Critical Issues (P0)**:
1. ❌ **Data Source内容不可见** - 用户创建后无法查看、管理、编辑内容
2. ❌ **Embeddings流程混乱** - 用户不知道要embedding什么，步骤显得多余
3. ❌ **功能混淆** - Test Query vs Analytics目的不清晰

**Design Issues (P1)**:
4. ⚠️ **视觉设计需要优化** - 希望更接近Apple/ShadcnUI极简风格
5. ⚠️ **信息层级不清晰** - 缺少内容预览和状态指示

### 设计目标

1. **内容透明化**: 用户能清楚看到Data Source里有什么内容
2. **流程简化**: Embeddings自动化，减少手动操作
3. **视觉极简**: Apple风格的简洁设计
4. **功能清晰**: 明确区分不同功能的用途

---

## 🎨 设计原则

### Apple Design Principles

1. **Clarity (清晰)**
   - 文字清晰可读
   - 图标和元素易于理解
   - 功能明确无歧义

2. **Deference (克制)**
   - 内容为王，UI不抢戏
   - 精简的视觉元素
   - 充分的留白空间

3. **Depth (层次)**
   - 清晰的视觉层级
   - 流畅的过渡动效
   - 逻辑的信息架构

### ShadcnUI Characteristics

1. **组件简洁**: 边框简约，圆角适度
2. **色彩克制**: 主要使用中性色，强调色用于关键操作
3. **间距舒适**: 充足的内边距和外边距
4. **Typography**: 清晰的字体层级

---

## 🔍 当前设计分析

### 基于截图的分析

**当前页面结构** (从你的截图):
```
┌─────────────────────────────────────────────────────────┐
│  Sidebar           │  Main Content Area                 │
│  ┌─────────────┐  │  ┌─────────────────────────────┐  │
│  │ Dashboard   │  │  │ Product documentation       │  │
│  │ Documents   │  │  │  2 sources • 0 embeddings  │  │
│  │►Knowledge   │  │  │                            │  │
│  │   Base      │  │  │ Tabs:                      │  │
│  │ Chat        │  │  │ • Data Sources             │  │
│  │ AI          │  │  │ • Embeddings               │  │
│  │   Assistants│  │  │ • Test Query               │  │
│  │ Templates   │  │  │ • Analytics                │  │
│  │ Settings    │  │  │ • Settings                 │  │
│  └─────────────┘  │  │                            │  │
│                   │  │ Data Source Cards:         │  │
│                   │  │ ┌────────────────────┐    │  │
│                   │  │ │ Who am I           │    │  │
│                   │  │ │ Q&A Pairs          │    │  │
│                   │  │ │ 0 Documents        │    │  │
│                   │  │ │ 0 Embeddings       │    │  │
│                   │  │ └────────────────────┘    │  │
│                   │  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 识别的问题

**问题1: Data Source Card缺少内容预览**
- ❌ 当前: 只显示名称和计数
- ✅ 需要: 内容预览、类型图标、状态指示

**问题2: Embeddings是独立Tab**
- ❌ 当前: 用户需要切换到Embeddings tab，不知道要embedding什么
- ✅ 需要: 在Data Source内直接管理embeddings

**问题3: 5个Tab太多**
- ❌ 当前: Data Sources, Embeddings, Test Query, Analytics, Settings
- ✅ 需要: 简化为2-3个主要Tab

**问题4: 缺少操作入口**
- ❌ 当前: 只能删除，无法查看内容、编辑
- ✅ 需要: 清晰的操作按钮（查看、编辑、重新生成embeddings）

---

## 🎯 新设计方案

### 方案A: 增强型Data Source卡片 (推荐) ⭐

**设计理念**: 一切内容可见，操作就近原则

#### 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  Knowledge Base: Product documentation                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Overview          Sources (2)        Query & Test      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Tab: Sources ─────────────────────────────────────┐   │
│  │                                    [+ Add Source]   │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │ 📄 Who am I                    [Active]  ⋮  │  │   │
│  │  │ Q&A Pairs • 3 pairs                         │  │   │
│  │  │                                             │  │   │
│  │  │ Content Preview:                            │  │   │
│  │  │ Q: "Who am I?"                              │  │   │
│  │  │ A: "I am a helpful assistant..."            │  │   │
│  │  │                                             │  │   │
│  │  │ ⚡ Embeddings: Ready (128 vectors)          │  │   │
│  │  │ 📊 Last synced: 2 hours ago                 │  │   │
│  │  │                                             │  │   │
│  │  │ [View Full Content] [Edit] [Re-generate]   │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  │                                                    │   │
│  │  ┌─────────────────────────────────────────────┐  │   │
│  │  │ 📁 Uploaded Documents          [Active]  ⋮  │  │   │
│  │  │ PDF, DOCX • 5 files                         │  │   │
│  │  │                                             │  │   │
│  │  │ Files:                                      │  │   │
│  │  │ • product_spec.pdf (2.3 MB)                 │  │   │
│  │  │ • user_guide.docx (1.1 MB)                  │  │   │
│  │  │ • api_docs.pdf (850 KB)                     │  │   │
│  │  │ ... +2 more files                           │  │   │
│  │  │                                             │  │   │
│  │  │ ⚡ Embeddings: Processing... (45%)          │  │   │
│  │  │ 📊 Started: 5 minutes ago                   │  │   │
│  │  │                                             │  │   │
│  │  │ [Manage Files] [View All] [Re-generate]    │  │   │
│  │  └─────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 关键改进

**1. Data Source卡片增强**:
```
┌─────────────────────────────────────────────────┐
│ 📄 [Icon] Data Source Name        [Status] ⋮   │  ← 类型图标 + 状态标识
│ Type • Item count                               │  ← 清晰的类型和数量
│                                                 │
│ Content Preview:                                │  ← 📌 核心改进：内容预览
│ [根据类型显示预览内容]                            │
│                                                 │
│ ⚡ Embeddings: Status (count)                   │  ← 嵌入状态（不是独立tab）
│ 📊 Last synced/updated time                     │  ← 时间戳
│                                                 │
│ [Primary Action] [Edit] [Re-generate]          │  ← 就近操作按钮
└─────────────────────────────────────────────────┘
```

**2. 内容预览规则**:

| Data Source Type | Preview Content |
|------------------|-----------------|
| **Q&A Pairs** | First 3 Q&A pairs |
| **Uploaded Documents** | File list with names and sizes (show first 3, then "+N more") |
| **Text Input** | First 200 characters with "..." |
| **Website** | URL + page count + crawl status |
| **Structured Data** | Schema preview (columns) + row count |

**3. Embeddings状态直接显示在卡片上**:
- ✅ **Ready**: `⚡ Embeddings: Ready (128 vectors)`
- 🔄 **Processing**: `⚡ Embeddings: Processing... (45%)` with progress bar
- ⚠️ **Outdated**: `⚡ Embeddings: Outdated (content changed)`
- ❌ **Failed**: `⚡ Embeddings: Failed (click to retry)`

**4. 操作按钮清晰化**:
- **View Full Content**: 查看完整内容（模态框或侧边栏）
- **Edit**: 编辑data source配置或内容
- **Re-generate**: 重新生成embeddings（当内容变更时）
- **Manage Files**: （仅Uploaded Documents）管理文件列表

**5. 自动Embeddings流程**:
```
User Action              → Automatic System Response
─────────────────────────────────────────────────────
Create Data Source       → Auto-trigger embeddings
                           Show: "⚡ Embeddings: Processing..."

Edit Data Source Content → Mark as "Outdated"
                           Show button: [Re-generate Embeddings]

Delete Data Source       → Auto-delete embeddings
                           No manual cleanup needed
```

### Tab重新组织

**Before (5 Tabs)**:
```
┌──────────────────────────────────────────────────────┐
│ Data Sources | Embeddings | Test Query | Analytics | Settings │
└──────────────────────────────────────────────────────┘
```

**After (3 Tabs)** ⭐:
```
┌─────────────────────────────────────────┐
│ Overview | Sources | Query & Test       │
└─────────────────────────────────────────┘
```

**Tab功能定义**:

1. **Overview Tab (概览)**:
   - KB统计信息（data sources数量、总embeddings、存储使用）
   - 最近活动（Recent activity feed）
   - 快速操作（Quick actions）
   - 健康状态（Health indicators）

2. **Sources Tab (数据源)** - 主要工作区:
   - Data Source列表（增强型卡片）
   - Add Source按钮
   - 搜索和筛选
   - Embeddings状态直接显示在卡片内

3. **Query & Test Tab (查询测试)**:
   - 合并Test Query和Analytics
   - **上半部分**: Test Query区域（RAG测试）
   - **下半部分**: Analytics区域（查询统计）
   - 清晰标题区分两者功能

**Query & Test Tab布局**:
```
┌─────────────────────────────────────────────────────┐
│  Query & Test                                        │
│                                                      │
│  ┌─ Test Your Knowledge Base (RAG) ───────────────┐│
│  │                                                  ││
│  │  Ask a question:                                ││
│  │  ┌─────────────────────────────────────────┐   ││
│  │  │ What is Doctify?              [Ask] ►   │   ││
│  │  └─────────────────────────────────────────┘   ││
│  │                                                  ││
│  │  Results (top 5):                               ││
│  │  1. Doctify is an AI document platform...      ││
│  │  2. Key features include OCR...                ││
│  │  ...                                            ││
│  └──────────────────────────────────────────────────┘│
│                                                      │
│  ┌─ Analytics & Insights ──────────────────────────┐│
│  │                                                  ││
│  │  Query Statistics:                              ││
│  │  • Total queries: 1,234                         ││
│  │  • Avg response time: 450ms                     ││
│  │  • Top queries: [list]                          ││
│  │  ...                                            ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

## 🎨 视觉设计规范

### 色彩方案 (基于ShadcnUI)

```
Primary (主色):
- Background: hsl(0 0% 100%)               /* 纯白 */
- Foreground: hsl(222.2 84% 4.9%)          /* 深灰文字 */
- Muted: hsl(210 40% 96.1%)                /* 浅灰背景 */
- Border: hsl(214.3 31.8% 91.4%)           /* 边框灰 */

Accent (强调色):
- Primary: hsl(221.2 83.2% 53.3%)          /* 蓝色 */
- Success: hsl(142.1 76.2% 36.3%)          /* 绿色 */
- Warning: hsl(47.9 95.8% 53.1%)           /* 黄色 */
- Destructive: hsl(0 84.2% 60.2%)          /* 红色 */

Status Colors:
- Active: Green (#22c55e)
- Processing: Blue (#3b82f6)
- Outdated: Amber (#f59e0b)
- Failed: Red (#ef4444)
```

### Typography (字体层级)

```
Heading 1: 24px, font-weight: 600, line-height: 1.2
Heading 2: 20px, font-weight: 600, line-height: 1.3
Heading 3: 16px, font-weight: 600, line-height: 1.4
Body: 14px, font-weight: 400, line-height: 1.5
Small: 12px, font-weight: 400, line-height: 1.4
```

### Spacing (间距)

```
Card Padding: 16px (sm) | 24px (md) | 32px (lg)
Card Gap: 16px between cards
Section Gap: 32px between sections
Button Height: 36px (sm) | 40px (md) | 44px (lg)
Border Radius: 8px (cards) | 6px (buttons) | 4px (inputs)
```

### Components (组件样式)

**Data Source Card**:
```css
.data-source-card {
  background: white;
  border: 1px solid hsl(214.3 31.8% 91.4%);
  border-radius: 8px;
  padding: 24px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

.data-source-card:hover {
  border-color: hsl(221.2 83.2% 53.3%);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

**Status Badge**:
```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}
```

**Icon Guidelines**:
- 使用Lucide Icons（与ShadcnUI一致）
- 大小: 16px (small) | 20px (medium) | 24px (large)
- Data Source Type Icons:
  - 📄 Q&A Pairs: `MessageCircleQuestion`
  - 📁 Uploaded Documents: `FileStack`
  - 🌐 Website: `Globe`
  - 📊 Structured Data: `Database`
  - 📝 Text: `FileText`

---

## 🔄 用户流程优化

### 流程1: 创建Data Source（新增自动embeddings）

**Before (4 steps)**:
```
1. Click "Add Source"
2. Fill form → Create
3. Switch to "Embeddings" tab
4. Click "Generate Embeddings" → Wait
```

**After (2 steps)** ⭐:
```
1. Click "Add Source"
2. Fill form → Create → 自动触发embeddings
   显示: "⚡ Embeddings: Processing... (0%)"
```

**实现细节**:
```typescript
// After data source creation
const handleCreateDataSource = async (data) => {
  // Step 1: Create data source
  const dataSource = await createDataSource(data);

  // Step 2: Auto-trigger embeddings (NO user action needed)
  await triggerEmbeddings(dataSource.id);

  // Show toast notification
  toast.success('Data source created! Embeddings are being generated...');

  // Refresh to show processing status
  refetchDataSources();
};
```

### 流程2: 编辑Data Source内容

**Before (No solution)**:
```
❌ Cannot edit content after creation
```

**After (3 steps)** ⭐:
```
1. Click "Edit" on data source card
2. Modify content → Save
3. System shows: "⚡ Embeddings: Outdated"
   + [Re-generate Embeddings] button appears
```

**智能提示**:
```
┌──────────────────────────────────────────┐
│ ⚠️ Content Updated                       │
│ Your changes won't be reflected in      │
│ queries until embeddings are regenerated│
│                                          │
│ [Re-generate Now] [Later]               │
└──────────────────────────────────────────┘
```

### 流程3: 查看Data Source内容

**Before (No solution)**:
```
❌ Cannot view content, only name
```

**After (2 options)** ⭐:

**Option 1: Inline Preview (default)**
- Content preview直接显示在卡片上
- 看到前3项或200字符

**Option 2: Full View Modal**
- Click "View Full Content"
- Open modal with complete content
- 支持搜索、筛选（对于大量内容）

**Full View Modal布局**:
```
┌─────────────────────────────────────────────┐
│  Product Documentation - Q&A Pairs     ✕   │
├─────────────────────────────────────────────┤
│  [Search Q&A...]                            │
│                                             │
│  Q: Who am I?                               │
│  A: I am a helpful assistant...             │
│  ─────────────────────────────────────────  │
│  Q: What can you do?                        │
│  A: I can help with...                      │
│  ─────────────────────────────────────────  │
│  ... (showing 10 of 25 pairs)               │
│                                             │
│  [Previous] [1] [2] [3] ... [Next]          │
│                                             │
│                        [Edit] [Close]       │
└─────────────────────────────────────────────┘
```

### 流程4: Test Query（合并Analytics）

**Before (2 separate tabs)**:
```
Test Query tab: RAG testing
Analytics tab: Query statistics
→ 用户困惑：这两个有什么区别？
```

**After (1 tab, 2 sections)** ⭐:
```
┌─ Query & Test Tab ────────────────────┐
│                                       │
│ Section 1: Test Your KB (RAG)        │
│ → 清晰标题：测试你的知识库              │
│ → Ask questions, get answers          │
│                                       │
│ ─────────────────────────────────     │
│                                       │
│ Section 2: Analytics & Insights      │
│ → 清晰标题：查询分析                   │
│ → Query stats, usage metrics          │
└───────────────────────────────────────┘
```

---

## 📐 详细组件规格

### Component 1: Enhanced Data Source Card

**完整规格**:
```typescript
interface EnhancedDataSourceCardProps {
  dataSource: {
    id: string;
    name: string;
    type: 'qa_pairs' | 'uploaded_docs' | 'website' | 'text' | 'structured_data';
    status: 'active' | 'inactive';
    config: any;
    embeddings: {
      status: 'ready' | 'processing' | 'outdated' | 'failed';
      count: number;
      progress?: number; // 0-100 for processing
      lastGenerated?: Date;
    };
    metadata: {
      itemCount?: number; // Q&A pairs, files, pages, etc.
      lastSynced?: Date;
      contentPreview?: any; // Type-specific preview data
    };
  };
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
}
```

**Layout Structure**:
```
┌─────────────────────────────────────────────────────┐
│ ┌─ Header ────────────────────────────────────────┐│
│ │ [Icon] Name               [Status Badge]  [⋮]   ││
│ │ Type • Item count                               ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ Content Preview ──────────────────────────────┐│
│ │ [Type-specific preview content]                 ││
│ │ ...                                             ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ Embeddings Status ────────────────────────────┐│
│ │ ⚡ Embeddings: [Status] ([count] vectors)       ││
│ │ [Progress bar if processing]                    ││
│ │ 📊 Last synced: [time ago]                      ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ ┌─ Actions ──────────────────────────────────────┐│
│ │ [View Full] [Edit] [Re-generate]               ││
│ └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Embeddings Status Display Rules**:
```typescript
function getEmbeddingsDisplay(embeddings) {
  switch (embeddings.status) {
    case 'ready':
      return {
        icon: '⚡',
        text: `Ready (${embeddings.count} vectors)`,
        color: 'green',
        action: null
      };

    case 'processing':
      return {
        icon: '⚡',
        text: `Processing... (${embeddings.progress}%)`,
        color: 'blue',
        showProgress: true,
        action: null
      };

    case 'outdated':
      return {
        icon: '⚠️',
        text: `Outdated (content changed)`,
        color: 'amber',
        action: { label: 'Re-generate', prominent: true }
      };

    case 'failed':
      return {
        icon: '❌',
        text: `Failed (click to retry)`,
        color: 'red',
        action: { label: 'Retry', prominent: true }
      };
  }
}
```

### Component 2: Content Preview by Type

**Q&A Pairs Preview**:
```tsx
<div className="content-preview">
  <h4 className="text-sm font-medium mb-2">Content Preview:</h4>
  <div className="space-y-2">
    {qaPairs.slice(0, 3).map((pair, i) => (
      <div key={i} className="border-l-2 border-blue-500 pl-3">
        <p className="text-sm font-medium">Q: {pair.question}</p>
        <p className="text-sm text-muted-foreground">A: {pair.answer}</p>
      </div>
    ))}
    {qaPairs.length > 3 && (
      <p className="text-xs text-muted-foreground">
        ... +{qaPairs.length - 3} more pairs
      </p>
    )}
  </div>
</div>
```

**Uploaded Documents Preview**:
```tsx
<div className="content-preview">
  <h4 className="text-sm font-medium mb-2">Files:</h4>
  <ul className="space-y-1">
    {files.slice(0, 3).map((file, i) => (
      <li key={i} className="flex items-center gap-2 text-sm">
        <FileIcon className="h-4 w-4" />
        <span>{file.name}</span>
        <span className="text-muted-foreground">({formatSize(file.size)})</span>
      </li>
    ))}
    {files.length > 3 && (
      <li className="text-xs text-muted-foreground">
        ... +{files.length - 3} more files
      </li>
    )}
  </ul>
</div>
```

**Text Input Preview**:
```tsx
<div className="content-preview">
  <h4 className="text-sm font-medium mb-2">Text Preview:</h4>
  <p className="text-sm text-muted-foreground line-clamp-3">
    {text.substring(0, 200)}
    {text.length > 200 && '...'}
  </p>
</div>
```

**Website Preview**:
```tsx
<div className="content-preview">
  <h4 className="text-sm font-medium mb-2">Website Info:</h4>
  <div className="space-y-1 text-sm">
    <p className="flex items-center gap-2">
      <Globe className="h-4 w-4" />
      <a href={url} target="_blank" className="text-blue-600 hover:underline">
        {url}
      </a>
    </p>
    <p className="text-muted-foreground">
      {pageCount} pages crawled • Max depth: {maxDepth}
    </p>
    {crawlStatus && (
      <p className="text-muted-foreground">
        Status: {crawlStatus}
      </p>
    )}
  </div>
</div>
```

**Structured Data Preview**:
```tsx
<div className="content-preview">
  <h4 className="text-sm font-medium mb-2">Schema:</h4>
  <div className="space-y-1">
    <p className="text-sm text-muted-foreground">{rowCount} rows</p>
    <div className="flex flex-wrap gap-2">
      {schema.columns.slice(0, 5).map((col, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
          {col.name} <span className="text-muted-foreground">({col.type})</span>
        </span>
      ))}
      {schema.columns.length > 5 && (
        <span className="text-xs text-muted-foreground">
          +{schema.columns.length - 5} columns
        </span>
      )}
    </div>
  </div>
</div>
```

### Component 3: Query & Test Tab

**Tab Layout**:
```tsx
<div className="query-test-tab">
  {/* Section 1: RAG Testing */}
  <section className="test-query-section mb-8">
    <div className="section-header mb-4">
      <h2 className="text-xl font-semibold">Test Your Knowledge Base</h2>
      <p className="text-sm text-muted-foreground">
        Ask questions to test how well your KB retrieves information
      </p>
    </div>

    <div className="query-input mb-4">
      <div className="flex gap-2">
        <Input
          placeholder="Ask a question about your knowledge base..."
          className="flex-1"
        />
        <Button>Ask ►</Button>
      </div>
    </div>

    <div className="query-results">
      {/* Top 5 results with source highlighting */}
    </div>
  </section>

  {/* Divider */}
  <Separator className="my-8" />

  {/* Section 2: Analytics */}
  <section className="analytics-section">
    <div className="section-header mb-4">
      <h2 className="text-xl font-semibold">Analytics & Insights</h2>
      <p className="text-sm text-muted-foreground">
        Query statistics and usage metrics
      </p>
    </div>

    <div className="analytics-cards grid grid-cols-3 gap-4">
      {/* Stats cards */}
    </div>
  </section>
</div>
```

---

## 🚀 实施优先级

### Phase 1A: Data Source Card增强 (Week 1)

**优先级**: P0 (Critical)

**任务**:
1. ✅ 设计并实现增强型Data Source卡片组件
2. ✅ 添加内容预览功能（5种类型）
3. ✅ 添加Embeddings状态显示
4. ✅ 添加操作按钮（View, Edit, Re-generate）

**文件修改**:
- `DataSourceCard.tsx` - 新增或重构
- `DataSourceList.tsx` - 使用新卡片
- `KBDetailPage.tsx` - 更新布局

### Phase 1B: 自动Embeddings流程 (Week 1)

**优先级**: P0 (Critical)

**任务**:
1. ✅ 修改创建流程，自动触发embeddings
2. ✅ 移除独立的Embeddings tab
3. ✅ 实现"Outdated"检测机制
4. ✅ 添加Re-generate按钮逻辑

**文件修改**:
- `DataSourceConfigDialog.tsx` - 添加自动触发
- `embeddingsApi.ts` - API集成
- Backend endpoint - 确保支持自动触发

### Phase 2: Tab重组 (Week 2)

**优先级**: P1 (High)

**任务**:
1. ✅ 合并Test Query和Analytics为一个tab
2. ✅ 创建Overview tab
3. ✅ 移除Settings tab（移到全局）
4. ✅ 更新导航结构

**文件修改**:
- `KBDetailPage.tsx` - Tab结构重组
- `OverviewTab.tsx` - 新建
- `QueryTestTab.tsx` - 合并Test Query和Analytics

### Phase 3: 视觉优化 (Week 2)

**优先级**: P1 (High)

**任务**:
1. ✅ 应用ShadcnUI样式规范
2. ✅ 优化间距和布局
3. ✅ 统一色彩和图标
4. ✅ 添加微动效（hover, transition）

**文件修改**:
- `globals.css` - 更新CSS变量
- 所有组件 - 应用新样式

---

## 📊 成功指标

### 用户体验指标

1. **内容可见性**: 用户无需点击就能看到Data Source内容预览
2. **操作效率**: 从创建到可查询减少50%步骤（4步→2步）
3. **功能清晰度**: 用户能准确区分Test Query和Analytics功能

### 技术指标

1. **Embeddings自动化率**: 95%的Data Source创建后自动生成embeddings
2. **状态可见性**: 100%的embeddings状态实时显示
3. **错误恢复**: 失败的embeddings提供明确的重试机制

---

## 🎬 下一步行动

### 立即行动 (Day 1)

1. **Review this document** with team
2. **Create mockups** using Figma or similar tool (optional, can code directly)
3. **Update Phase 1 execution plan** based on this UX design

### 开始实施 (Day 2-5)

1. Start with Phase 1A: Enhanced Data Source Cards
2. Parallel: Phase 1B: Auto-embeddings flow
3. Test with real data as we build

### 验证和迭代 (Day 6-7)

1. User testing with qatest1@example.com
2. Gather feedback
3. Iterate on design based on usage

---

**设计状态**: ✅ Ready for implementation
**需要批准**: 是 - 请review后确认可以开始实施
**预计实施时间**: 2 weeks (与Phase 1-2 parallel)

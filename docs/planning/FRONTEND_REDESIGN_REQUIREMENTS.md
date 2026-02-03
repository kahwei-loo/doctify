# Doctify 前端重设计需求文档

**文档版本**: v1.0
**创建日期**: 2026-01-19
**状态**: Draft - 待审核

---

## 1. 文档概述

### 1.1 目的
本文档基于参考设计截图与当前实现的对比分析，定义前端UI/UX重设计的详细需求规格。

### 1.2 参考资料
- 参考设计截图 (9张): `C:\Users\KahWei\Pictures\Screenshots\Screenshot 2026-01-19 14*.png`
- 当前实现: `frontend/src/pages/` 和 `frontend/src/features/`

### 1.3 范围
- Documents 页面
- Document 详情页
- Projects 页面
- 项目配置弹窗

---

## 2. 参考设计优势分析

### 2.1 Documents 页面内的 Project 侧边栏 (参考设计 - 优秀)

参考设计中的 Project 侧边栏具有以下优秀设计特点：

```
┌─────────────────────────────────────┐
│ PROJECTS                        [≡] │
├─────────────────────────────────────┤
│ [🔍 Search...]                      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [AD] Auto Detect          ✓    │ │  ← 选中状态: 深色背景 + 高亮
│ │      document                   │ │  ← 副标题: 项目类型
│ └─────────────────────────────────┘ │
│                                     │
│ │ [TE] Test1                      │ │  ← 未选中: 浅色背景
│ │      Not set                    │ │
│                                     │
│           + New Project             │  ← 底部添加按钮
└─────────────────────────────────────┘
```

**优秀设计要点**:

| 设计元素 | 描述 | 价值 |
|----------|------|------|
| **彩色头像/首字母** | 每个项目有独特的彩色圆形头像显示首字母 (AD, TE) | 快速视觉识别，增强品牌感 |
| **双行信息展示** | 主标题 + 副标题（项目类型/描述） | 信息层次清晰 |
| **选中状态高亮** | 深蓝色背景 + 白色文字 | 明确的选中反馈 |
| **折叠状态** | 可折叠为仅显示头像的窄条 | 灵活的空间管理 |
| **搜索功能** | 顶部搜索框可快速过滤项目 | 提升效率 |
| **新建入口** | 底部"+ New Project"按钮 | 便捷的操作入口 |

---

## 3. 当前实现问题分析

### 3.1 Documents 页面内的 ProjectPanel (当前 - 有设计问题)

**文件位置**: `frontend/src/features/documents/components/ProjectPanel.tsx`

**存在的设计问题**:

| 问题 | 描述 | 影响 |
|------|------|------|
| **头像设计缺失** | 仅显示单字母，无彩色背景圆形 | 视觉识别度低 |
| **信息层次不足** | 只显示项目名称，无副标题/类型 | 用户需要额外点击才能了解项目 |
| **选中状态弱** | 使用 `bg-primary/10` 透明度过低 | 选中反馈不够明显 |
| **视觉对比度** | 文字与背景对比度不足 | 可读性问题 |
| **项目类型缺失** | 不显示项目的文档类型标签 | 用户无法快速识别项目用途 |
| **折叠状态简陋** | 折叠后仅显示字母，无视觉美感 | 体验不佳 |

**当前代码问题片段** (ProjectPanel.tsx:88-104):
```tsx
// 折叠状态下仅显示简单字母
{filteredProjects.slice(0, 5).map((project) => (
  <Button
    key={project.project_id}
    variant="ghost"
    size="icon"
    onClick={() => onSelectProject(project.project_id)}
    className={cn(
      'mb-1',
      selectedProjectId === project.project_id && 'bg-primary/10 text-primary'
    )}
    title={project.name}
  >
    <span className="text-xs font-medium">
      {project.name.charAt(0).toUpperCase()}  // ← 缺少彩色背景
    </span>
  </Button>
))}
```

---

## 4. 详细需求规格

### 4.1 ProjectPanel 组件重设计 (P0 - 高优先级)

#### 4.1.1 项目头像组件

**需求**: 创建 `ProjectAvatar` 组件

```tsx
interface ProjectAvatarProps {
  name: string;           // 项目名称
  type?: string;          // 项目类型 (document, invoice, receipt, etc.)
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**设计规格**:
- 圆形背景，根据项目名称生成唯一颜色 (HSL色相基于名称hash)
- 显示项目名称的前两个字母大写 (如 "Auto Detect" → "AD")
- 尺寸: sm=24px, md=32px, lg=40px
- 字体: Inter/系统字体, 粗体, 白色

**颜色生成算法**:
```typescript
const generateAvatarColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`; // 饱和度65%, 亮度45%
};
```

#### 4.1.2 ProjectPanelItem 组件改进

**当前文件**: `frontend/src/features/documents/components/ProjectPanelItem.tsx`

**需求改进**:

| 属性 | 当前 | 改进后 |
|------|------|--------|
| 头像 | 无 | ProjectAvatar 组件 |
| 主标题 | 仅名称 | 名称 (加粗) |
| 副标题 | 无 | 项目类型或描述 (灰色小字) |
| 选中状态 | `bg-primary/10` | `bg-primary text-primary-foreground` |
| 悬浮效果 | `hover:bg-muted` | `hover:bg-accent` |

**视觉规格**:
```
选中状态:
  背景: bg-[#1e3a5f] (深蓝色)
  文字: text-white
  头像: 保持彩色，加白色边框

未选中状态:
  背景: transparent
  悬浮: bg-accent (浅灰色)
  文字: text-foreground
```

#### 4.1.3 折叠状态改进

**需求**: 折叠状态下也显示彩色头像

```
展开状态 (w-64):
┌──────────────────────┐
│ [AD] Auto Detect     │
│      document        │
└──────────────────────┘

折叠状态 (w-16):
┌────┐
│[AD]│  ← 保持彩色圆形头像
└────┘
```

---

### 4.2 Documents 页面重设计 (P0 - 高优先级)

#### 4.2.1 拖拽上传区

**需求**: 创建 `DocumentUploadZone` 组件

**设计规格**:
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │   [📄]  Drop files here or click to upload         │    │  [Select Files]
│  │         PDF, JPG, PNG · Max 10MB per file          │    │
│  │         Concurrent upload supported                │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**交互规格**:
- 虚线边框 (border-dashed)
- 拖拽悬浮时: 边框变为实线 + 背景色变化
- 支持多文件同时拖拽
- 右侧蓝色 "Select Files" 按钮

#### 4.2.2 上传队列状态

**需求**: 创建 `UploadQueue` 组件

```
> Upload Queue    0 uploading    0 complete    0 failed
```

**设计规格**:
- 可折叠/展开的队列列表
- 实时显示上传进度
- 彩色状态标签:
  - uploading: 蓝色
  - complete: 绿色
  - failed: 红色

#### 4.2.3 文档表格

**需求**: 重构 `DocumentTable` 组件

**列定义**:
| 列名 | 宽度 | 内容 |
|------|------|------|
| Checkbox | 40px | 全选/单选 |
| File | flex | 文件图标 + 名称 + 大小/页数 |
| Type | 80px | 文档类型 + 置信度百分比 |
| Status | 100px | 状态Badge (Completed/Processing/Failed) |
| Confidence | 120px | 进度条 + 百分比 |
| Notes | 80px | 备注图标或文字 |
| Uploaded | 120px | 日期时间 |
| Actions | 100px | 查看/下载/更多 图标按钮 |

**文件类型图标**:
```typescript
const fileTypeIcons: Record<string, { icon: string; color: string }> = {
  'application/pdf': { icon: 'FileText', color: 'text-red-500 bg-red-50' },
  'image/png': { icon: 'Image', color: 'text-green-500 bg-green-50' },
  'image/jpeg': { icon: 'Image', color: 'text-blue-500 bg-blue-50' },
  // ...
};
```

#### 4.2.4 置信度进度条

**需求**: 创建 `ConfidenceBar` 组件

```tsx
interface ConfidenceBarProps {
  value: number;  // 0-100
  size?: 'sm' | 'md';
}
```

**颜色规则**:
- 0-50%: 红色 (bg-red-500)
- 51-70%: 橙色 (bg-orange-500)
- 71-85%: 黄色 (bg-yellow-500)
- 86-100%: 绿色 (bg-green-500)

---

### 4.3 Document 详情页重设计 (P0 - 高优先级)

#### 4.3.1 分屏布局

**需求**: 实现可调整的分屏视图

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back   cash_bill_test.pdf   bill 90%   40.5KB · 1 page(s)        │
│                                           [Refresh] [Copy] [Export]│
├────────────────────────────────┬────────────────────────────────────┤
│                                │                                    │
│   [PDF Preview Area]           │   ✓ Extracted Results   Completed  │
│                                │                                    │
│   ┌──────────────────────┐     │   [Structured] [JSON]     81%  ✎  │
│   │                      │     │                                    │
│   │   PDF preview        │     │   docType        documentNo        │
│   │   unavailable.       │     │   CASH BILL      227/143           │
│   │                      │     │                                    │
│   │   [Download]         │     │   documentDate   documentTime      │
│   │                      │     │   2024-10-15     (empty)           │
│   └──────────────────────┘     │                                    │
│                                │   ... more fields ...              │
│   [🔍-] 100% [🔍+]            │                                    │
│                                │   lineItems (10 items)             │
│                                │   ┌────────────────────────────┐   │
│                                │   │ itemNo │ desc │ qty │ ... │   │
│                                │   ├────────────────────────────┤   │
│                                │   │ PPI10  │ ...  │ 1   │ ... │   │
│                                │   └────────────────────────────┘   │
├────────────────────────────────┴────────────────────────────────────┤
│ Uploaded: 12/10/2025   Project: Auto Detect   Tokens: 5,551 (~RM)  │
│                                              Panel ratio: ────●──── │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 文档预览器 (PDF + 图片)

**需求**: 创建 `DocumentPreview` 组件，支持PDF和图片两种格式

**支持的文件类型**:
| 格式 | MIME类型 | 渲染方式 |
|------|----------|----------|
| PDF | `application/pdf` | react-pdf / pdf.js |
| PNG | `image/png` | `<img>` 标签 |
| JPG/JPEG | `image/jpeg` | `<img>` 标签 |

**功能**:
- **PDF文件**: 显示PDF页面、页码导航 (多页文档)
- **图片文件**: 直接渲染图片
- **通用功能**:
  - 缩放控制 (50% - 200%)
  - 下载链接 (预览不可用时)
  - 自动检测文件类型并选择渲染方式

**组件接口**:
```tsx
interface DocumentPreviewProps {
  fileUrl: string;
  mimeType: string;  // 'application/pdf' | 'image/png' | 'image/jpeg'
  fileName: string;
  onZoomChange?: (zoom: number) => void;
}
```

#### 4.3.3 Structured/JSON 切换

**需求**: Tab切换两种视图模式

**Structured 视图**:
- 两列网格布局显示字段
- 字段标签 (灰色小字) + 字段值 (黑色正文)
- 支持内联编辑

**JSON 视图**:
- 语法高亮的JSON代码块
- 深色背景 (类似代码编辑器)
- 复制按钮

#### 4.3.4 行项目表格 (提取结果明细)

**需求**: 创建 `LineItemsTable` 组件

**用途说明**:
此表格用于展示AI从发票、收据、采购单等文档中**提取出的商品/服务明细行数据**。这是OCR提取结果的一部分，不是通用表格组件。

**标准列定义**:
| 列名 | 字段键 | 类型 | 对齐 | 说明 |
|------|--------|------|------|------|
| 项目编号 | `itemNo` | string | left | 商品编码/SKU |
| 描述 | `description` | string | left | 商品/服务名称 |
| 数量 | `quantity` | number | right | 购买数量 |
| 单价 | `unitPrice` | number | right | 单位价格 |
| 折扣 | `discount` | number | right | 折扣金额 |
| 税率 | `taxRate` | number | right | 税率百分比 |
| 税额 | `taxAmount` | number | right | 税金金额 |
| 金额 | `amount` | number | right | 行小计 |

**组件接口**:
```tsx
interface LineItem {
  itemNo: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  amount: number;
}

interface LineItemsTableProps {
  items: LineItem[];
  showTotal?: boolean;  // 是否显示合计行
  editable?: boolean;   // 是否可编辑
}
```

**功能**:
- 可排序 (点击列头)
- 金额列右对齐 + 数字格式化
- 合计行 (可选显示)
- 响应式: 小屏幕水平滚动

---

### 4.4 Projects 页面重设计 (P0 - 高优先级)

#### 4.4.1 统计卡片

**需求**: 顶部统计概览

```
┌─────────────────┬─────────────────┬─────────────────┐
│  📄 Total Docs  │  ✓ Success Rate │  💰 Token Usage │
│       5         │     100%        │    68,069       │
│  Across all     │   5 completed   │  ~RM3.06 est.   │
└─────────────────┴─────────────────┴─────────────────┘
```

#### 4.4.2 图表组件

**Processing Status (环形图)**:
- 显示总数在中心
- 不同状态用不同颜色
- 底部图例

**Token Usage by Project (柱状图)**:
- 横向柱状图
- 按项目分组
- 显示数值标签

#### 4.4.3 增强项目卡片

```
┌─────────────────────────────────────────┐
│  Auto Detect                    [Active]│
│                                         │
│  Automatically detect and extract       │
│  information from any document type     │
│                                         │
│  📄 2 Documents   💰 20.2K (~RM0.91)  [↑]│
│                                         │
│  [document]                             │
│                                         │
│  Created 10/12/2025                     │
│  ────────────────────────────────────── │
│  👁 View    ✏ Edit    🗑 Delete         │
└─────────────────────────────────────────┘
```

---

### 4.5 项目配置弹窗 / Schema Builder (P1 - 中优先级)

**需求**: 使用 Accordion 组件创建 `ProjectConfigModal` (Schema Builder)

**功能说明**:
Schema Builder 是一个**文档提取模板配置器**，用户通过它定义"AI应从文档中提取哪些信息"。每个项目可以有自己的提取模板。

**四个配置区块**:

#### 4.5.1 Project Information (项目基本信息)
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Project Title | text | ✅ | 项目/模板名称 |
| Project Description | textarea (500字符) | ✅ | 描述此模板用途 (如: "智能识别各类文档，自动提取所有可见信息") |

#### 4.5.2 Field Configuration (字段配置)
**用途**: 定义AI应从文档中提取的**键值对字段**

**功能**:
- "+ Add Fields" 按钮动态添加字段
- 每个字段包含:
  - Field Name (字段名，如: buyerName, documentNo)
  - Field Type (类型: text, number, date, boolean)
  - Description (描述，帮助AI理解)
  - Required (是否必填)
- 支持拖拽排序
- 支持删除字段

**示例字段**: `buyerName`, `buyerAddress`, `buyerPhone`, `buyerEmail`, `buyerTaxId`, `documentNo`, `documentDate`

#### 4.5.3 Table Configuration (表格配置)
**用途**: 定义AI应从文档中提取的**表格/明细行数据结构**

| 字段 | 类型 | 说明 |
|------|------|------|
| Table Description | textarea | 描述表格内容 (如: "商品明细行，包含编号、描述、数量、单价、金额") |
| Column Definitions | 动态列表 | 定义表格列 (itemNo, description, quantity, unitPrice, amount等) |

#### 4.5.4 Sample Output (示例输出预览)
**用途**: 展示配置后的预期提取结果JSON格式

```json
{
  "buyerName": "示例公司",
  "documentNo": "INV-001",
  "lineItems": [
    { "itemNo": "001", "description": "商品A", "quantity": 1, "amount": 100 }
  ]
}
```

**组件接口**:
```tsx
interface ProjectConfigModalProps {
  projectId?: string;           // 编辑时传入
  defaultConfig?: ProjectSchema;
  onSave: (config: ProjectSchema) => void;
  onClose: () => void;
}

interface ProjectSchema {
  title: string;
  description: string;
  fields: FieldDefinition[];
  tableConfig?: TableConfig;
}
```

---

## 5. 技术规格

### 5.1 新增依赖

```json
{
  "dependencies": {
    "react-dropzone": "^14.2.3",
    "@tanstack/react-table": "^8.11.0",
    "react-pdf": "^7.7.0",
    "react-resizable-panels": "^1.0.0"
  }
}
```

### 5.2 新增组件清单

| 组件 | 路径 | 优先级 |
|------|------|--------|
| ProjectAvatar | `shared/components/ui/project-avatar.tsx` | P0 |
| DocumentUploadZone | `features/documents/components/DocumentUploadZone.tsx` | P0 |
| UploadQueue | `features/documents/components/UploadQueue.tsx` | P0 |
| DocumentTable | `features/documents/components/DocumentTable.tsx` | P0 |
| ConfidenceBar | `shared/components/ui/confidence-bar.tsx` | P0 |
| DocumentSplitView | `features/documents/components/DocumentSplitView.tsx` | P0 |
| DocumentPreview | `features/documents/components/DocumentPreview.tsx` | P0 |
| ExtractedStructuredView | `features/documents/components/ExtractedStructuredView.tsx` | P0 |
| LineItemsTable | `features/documents/components/LineItemsTable.tsx` | P0 |
| ProjectStats | `features/projects/components/ProjectStats.tsx` | P0 |
| ProcessingChart | `features/projects/components/ProcessingChart.tsx` | P1 |
| TokenUsageChart | `features/projects/components/TokenUsageChart.tsx` | P1 |
| EnhancedProjectCard | `features/projects/components/EnhancedProjectCard.tsx` | P0 |

### 5.3 重构组件清单

| 组件 | 当前路径 | 改动范围 |
|------|----------|----------|
| ProjectPanel | `features/documents/components/ProjectPanel.tsx` | 大幅重构 |
| ProjectPanelItem | `features/documents/components/ProjectPanelItem.tsx` | 大幅重构 |
| DocumentsPage | `pages/DocumentsPage.tsx` | 大幅重构 |
| DocumentDetailPage | `pages/DocumentDetailPage.tsx` | 完全重写 |
| ProjectsPage | `pages/ProjectsPage.tsx` | 大幅重构 |

---

## 6. 优先级与时间线

### 6.1 Phase 1: P0 核心功能 (预估: 16-24小时)

| 任务 | 预估 |
|------|------|
| ProjectAvatar + ProjectPanel 重构 | 3-4h |
| DocumentUploadZone + UploadQueue | 4-5h |
| DocumentTable + ConfidenceBar | 3-4h |
| DocumentSplitView + DocumentPreview (PDF+图片) | 4-5h |
| ExtractedStructuredView + LineItemsTable | 3-4h |
| ProjectStats + EnhancedProjectCard | 2-3h |

### 6.2 Phase 2: P1 重要功能 (预估: 12-16小时)

| 任务 | 预估 |
|------|------|
| ProcessingChart + TokenUsageChart | 4-5h |
| 项目配置弹窗重构 | 4-5h |
| 面包屑导航 | 2-3h |
| 面板比例滑块 | 2-3h |

### 6.3 Phase 3: P2 优化功能 (预估: 4-8小时)

| 任务 | 预估 |
|------|------|
| "Live"连接指示器 | 1-2h |
| Sample Output预览 | 2-3h |
| 其他细节优化 | 1-3h |

---

## 7. 验收标准

### 7.1 功能验收

- [ ] ProjectPanel 显示彩色头像和双行信息
- [ ] Documents 页面支持拖拽上传
- [ ] Documents 页面显示完整表格列
- [ ] Document 详情页支持分屏预览
- [ ] Document 详情页支持 PDF 和 图片 两种格式预览
- [ ] Document 详情页支持 Structured/JSON 切换
- [ ] Document 详情页正确显示 LineItems 表格
- [ ] Projects 页面显示统计卡片
- [ ] Schema Builder 四个区块 (Project Info, Fields, Table, Sample) 可用
- [ ] 所有现有功能保持正常工作

### 7.2 设计验收

- [ ] 与参考设计截图视觉一致性 ≥ 90%
- [ ] 响应式布局在 1280px+ 宽度下正常
- [ ] 深色/浅色主题支持
- [ ] 动画过渡流畅

### 7.3 性能验收

- [ ] 首屏加载 < 3s
- [ ] 表格渲染 100 条数据无卡顿
- [ ] 文档预览加载 (PDF/图片) < 2s

---

## 8. 风险与依赖

### 8.1 技术风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| PDF.js 集成复杂度 | 中 | 中 | 可降级为下载链接 |
| 分屏组件性能 | 低 | 低 | 使用虚拟滚动 |

### 8.2 外部依赖

- 后端 API 需支持返回更多字段数据 (token_usage, document_type)
- 后端需提供项目统计汇总 API

---

## 9. 审批记录

| 版本 | 日期 | 审批人 | 状态 |
|------|------|--------|------|
| v1.0 | 2026-01-19 | - | Draft - 待审核 |
| v1.1 | 2026-01-20 | - | 修订 - 根据用户反馈更新 |

---

## 10. 更新日志

### v1.1 (2026-01-20)

根据用户审核反馈，进行以下修订:

1. **Schema Builder 说明补充** (Section 4.5)
   - 明确 Schema Builder 是"文档提取模板配置器"
   - 详细说明四个配置区块的具体功能和用途
   - 添加组件接口定义

2. **Line Items 表格说明补充** (Section 4.3.4)
   - 明确此表格是展示"AI从文档中提取的商品/服务明细行"
   - 添加标准列定义表格 (8列)
   - 添加 TypeScript 接口定义

3. **文档预览器支持图片** (Section 4.3.2)
   - 将 "PDF预览器" 改为 "文档预览器 (PDF + 图片)"
   - 添加支持的文件类型: PDF, PNG, JPG/JPEG
   - 组件重命名: `PDFPreview` → `DocumentPreview`

4. **验收标准更新** (Section 7.1)
   - 新增: "Document 详情页支持 PDF 和 图片 两种格式预览"
   - 新增: "Document 详情页正确显示 LineItems 表格"
   - 新增: "Schema Builder 四个区块可用"

---

*文档创建者: Claude (PM Agent)*
*最后更新: 2026-01-20*

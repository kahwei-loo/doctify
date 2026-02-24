# Doctify Frontend Redesign Requirements

**Document Version**: v1.0
**Created**: 2026-01-19
**Status**: Draft - Pending Review

---

## 1. Document Overview

### 1.1 Purpose
This document defines detailed UI/UX redesign requirements based on a comparison analysis of reference design screenshots and the current implementation.

### 1.2 References
- Reference design screenshots (9 images): `C:\Users\KahWei\Pictures\Screenshots\Screenshot 2026-01-19 14*.png`
- Current implementation: `frontend/src/pages/` and `frontend/src/features/`

### 1.3 Scope
- Documents page
- Document detail page
- Projects page
- Project configuration modal

---

## 2. Reference Design Analysis

### 2.1 Project Sidebar in Documents Page (Reference Design - Excellent)

The Project sidebar in the reference design has the following excellent design characteristics:

```
┌─────────────────────────────────────┐
│ PROJECTS                        [≡] │
├─────────────────────────────────────┤
│ [🔍 Search...]                      │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ [AD] Auto Detect          ✓    │ │  ← Selected: dark background + highlight
│ │      document                   │ │  ← Subtitle: project type
│ └─────────────────────────────────┘ │
│                                     │
│ │ [TE] Test1                      │ │  ← Unselected: light background
│ │      Not set                    │ │
│                                     │
│           + New Project             │  ← Bottom add button
└─────────────────────────────────────┘
```

**Excellent Design Elements**:

| Design Element | Description | Value |
|----------------|-------------|-------|
| **Colored avatar/initials** | Each project has a unique colored circular avatar showing initials (AD, TE) | Quick visual identification, enhanced branding |
| **Two-line information display** | Title + subtitle (project type/description) | Clear information hierarchy |
| **Selected state highlight** | Dark blue background + white text | Clear selection feedback |
| **Collapsed state** | Can collapse to narrow strip showing only avatars | Flexible space management |
| **Search functionality** | Top search box for quick project filtering | Improved efficiency |
| **Create entry point** | Bottom "+ New Project" button | Convenient action entry point |

---

## 3. Current Implementation Analysis

### 3.1 ProjectPanel in Documents Page (Current - Has Design Issues)

**File location**: `frontend/src/features/documents/components/ProjectPanel.tsx`

**Existing design issues**:

| Issue | Description | Impact |
|-------|-------------|--------|
| **Missing avatar design** | Only shows single letter, no colored circular background | Low visual recognition |
| **Insufficient information hierarchy** | Only shows project name, no subtitle/type | Users need extra clicks to understand projects |
| **Weak selected state** | Uses `bg-primary/10` with too low opacity | Selection feedback not obvious enough |
| **Visual contrast** | Insufficient contrast between text and background | Readability issues |
| **Missing project type** | Doesn't show project document type labels | Users can't quickly identify project purpose |
| **Basic collapsed state** | Only shows letters when collapsed, no visual appeal | Poor experience |

**Current code issue snippet** (ProjectPanel.tsx:88-104):
```tsx
// Collapsed state only shows plain letters
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
      {project.name.charAt(0).toUpperCase()}  // ← Missing colored background
    </span>
  </Button>
))}
```

---

## 4. Detailed Requirements Specification

### 4.1 ProjectPanel Component Redesign (P0 - High Priority)

#### 4.1.1 Project Avatar Component

**Requirement**: Create `ProjectAvatar` component

```tsx
interface ProjectAvatarProps {
  name: string;           // Project name
  type?: string;          // Project type (document, invoice, receipt, etc.)
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Design Specifications**:
- Circular background with unique color generated from project name (HSL hue based on name hash)
- Display first two uppercase letters of project name (e.g., "Auto Detect" → "AD")
- Sizes: sm=24px, md=32px, lg=40px
- Font: Inter/system font, bold, white

**Color Generation Algorithm**:
```typescript
const generateAvatarColor = (name: string): string => {
  const hash = name.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`; // Saturation 65%, Lightness 45%
};
```

#### 4.1.2 ProjectPanelItem Component Improvements

**Current file**: `frontend/src/features/documents/components/ProjectPanelItem.tsx`

**Required improvements**:

| Property | Current | Improved |
|----------|---------|----------|
| Avatar | None | ProjectAvatar component |
| Title | Name only | Name (bold) |
| Subtitle | None | Project type or description (gray small text) |
| Selected state | `bg-primary/10` | `bg-primary text-primary-foreground` |
| Hover effect | `hover:bg-muted` | `hover:bg-accent` |

**Visual Specifications**:
```
Selected state:
  Background: bg-[#1e3a5f] (dark blue)
  Text: text-white
  Avatar: keep colored, add white border

Unselected state:
  Background: transparent
  Hover: bg-accent (light gray)
  Text: text-foreground
```

#### 4.1.3 Collapsed State Improvements

**Requirement**: Show colored avatars in collapsed state

```
Expanded state (w-64):
┌──────────────────────┐
│ [AD] Auto Detect     │
│      document        │
└──────────────────────┘

Collapsed state (w-16):
┌────┐
│[AD]│  ← Keep colored circular avatar
└────┘
```

---

### 4.2 Documents Page Redesign (P0 - High Priority)

#### 4.2.1 Drag & Drop Upload Zone

**Requirement**: Create `DocumentUploadZone` component

**Design Specifications**:
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

**Interaction Specifications**:
- Dashed border (border-dashed)
- On drag hover: border becomes solid + background color change
- Support multi-file drag & drop
- Blue "Select Files" button on the right

#### 4.2.2 Upload Queue Status

**Requirement**: Create `UploadQueue` component

```
> Upload Queue    0 uploading    0 complete    0 failed
```

**Design Specifications**:
- Collapsible/expandable queue list
- Real-time upload progress display
- Colored status labels:
  - uploading: blue
  - complete: green
  - failed: red

#### 4.2.3 Document Table

**Requirement**: Refactor `DocumentTable` component

**Column Definitions**:
| Column | Width | Content |
|--------|-------|---------|
| Checkbox | 40px | Select all / single select |
| File | flex | File icon + name + size/page count |
| Type | 80px | Document type + confidence percentage |
| Status | 100px | Status badge (Completed/Processing/Failed) |
| Confidence | 120px | Progress bar + percentage |
| Notes | 80px | Note icon or text |
| Uploaded | 120px | Date and time |
| Actions | 100px | View/download/more icon buttons |

**File Type Icons**:
```typescript
const fileTypeIcons: Record<string, { icon: string; color: string }> = {
  'application/pdf': { icon: 'FileText', color: 'text-red-500 bg-red-50' },
  'image/png': { icon: 'Image', color: 'text-green-500 bg-green-50' },
  'image/jpeg': { icon: 'Image', color: 'text-blue-500 bg-blue-50' },
  // ...
};
```

#### 4.2.4 Confidence Progress Bar

**Requirement**: Create `ConfidenceBar` component

```tsx
interface ConfidenceBarProps {
  value: number;  // 0-100
  size?: 'sm' | 'md';
}
```

**Color Rules**:
- 0-50%: Red (bg-red-500)
- 51-70%: Orange (bg-orange-500)
- 71-85%: Yellow (bg-yellow-500)
- 86-100%: Green (bg-green-500)

---

### 4.3 Document Detail Page Redesign (P0 - High Priority)

#### 4.3.1 Split-Screen Layout

**Requirement**: Implement adjustable split-screen view

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

#### 4.3.2 Document Previewer (PDF + Images)

**Requirement**: Create `DocumentPreview` component supporting both PDF and image formats

**Supported File Types**:
| Format | MIME Type | Rendering Method |
|--------|-----------|------------------|
| PDF | `application/pdf` | react-pdf / pdf.js |
| PNG | `image/png` | `<img>` tag |
| JPG/JPEG | `image/jpeg` | `<img>` tag |

**Features**:
- **PDF files**: Display PDF pages, page navigation (multi-page documents)
- **Image files**: Direct image rendering
- **Common features**:
  - Zoom control (50% - 200%)
  - Download link (when preview unavailable)
  - Auto-detect file type and select rendering method

**Component Interface**:
```tsx
interface DocumentPreviewProps {
  fileUrl: string;
  mimeType: string;  // 'application/pdf' | 'image/png' | 'image/jpeg'
  fileName: string;
  onZoomChange?: (zoom: number) => void;
}
```

#### 4.3.3 Structured/JSON Toggle

**Requirement**: Tab-based toggle between two view modes

**Structured View**:
- Two-column grid layout for field display
- Field label (gray small text) + field value (black body text)
- Inline editing support

**JSON View**:
- Syntax-highlighted JSON code block
- Dark background (code editor style)
- Copy button

#### 4.3.4 Line Items Table (Extracted Results Detail)

**Requirement**: Create `LineItemsTable` component

**Purpose**:
This table displays **item/service line data extracted by AI** from invoices, receipts, purchase orders, and other documents. It is part of the OCR extraction results, not a general-purpose table component.

**Standard Column Definitions**:
| Column | Field Key | Type | Alignment | Description |
|--------|-----------|------|-----------|-------------|
| Item No. | `itemNo` | string | left | Product code/SKU |
| Description | `description` | string | left | Product/service name |
| Quantity | `quantity` | number | right | Purchase quantity |
| Unit Price | `unitPrice` | number | right | Price per unit |
| Discount | `discount` | number | right | Discount amount |
| Tax Rate | `taxRate` | number | right | Tax rate percentage |
| Tax Amount | `taxAmount` | number | right | Tax amount |
| Amount | `amount` | number | right | Line subtotal |

**Component Interface**:
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
  showTotal?: boolean;  // Whether to show total row
  editable?: boolean;   // Whether fields are editable
}
```

**Features**:
- Sortable (click column headers)
- Amount columns right-aligned + number formatting
- Total row (optional display)
- Responsive: horizontal scroll on small screens

---

### 4.4 Projects Page Redesign (P0 - High Priority)

#### 4.4.1 Statistics Cards

**Requirement**: Top-level statistics overview

```
┌─────────────────┬─────────────────┬─────────────────┐
│  📄 Total Docs  │  ✓ Success Rate │  💰 Token Usage │
│       5         │     100%        │    68,069       │
│  Across all     │   5 completed   │  ~RM3.06 est.   │
└─────────────────┴─────────────────┴─────────────────┘
```

#### 4.4.2 Chart Components

**Processing Status (Donut Chart)**:
- Display total count in center
- Different colors for different statuses
- Bottom legend

**Token Usage by Project (Bar Chart)**:
- Horizontal bar chart
- Grouped by project
- Display value labels

#### 4.4.3 Enhanced Project Card

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

### 4.5 Project Configuration Modal / Schema Builder (P1 - Medium Priority)

**Requirement**: Create `ProjectConfigModal` (Schema Builder) using Accordion component

**Description**:
Schema Builder is a **document extraction template configurator** where users define "what information AI should extract from documents". Each project can have its own extraction template.

**Four Configuration Sections**:

#### 4.5.1 Project Information (Basic Details)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Project Title | text | ✅ | Project/template name |
| Project Description | textarea (500 chars) | ✅ | Describe template purpose (e.g., "Intelligently recognize various documents, automatically extract all visible information") |

#### 4.5.2 Field Configuration
**Purpose**: Define **key-value pair fields** that AI should extract from documents

**Features**:
- "+ Add Fields" button to dynamically add fields
- Each field includes:
  - Field Name (e.g., buyerName, documentNo)
  - Field Type (text, number, date, boolean)
  - Description (helps AI understand the field)
  - Required (whether the field is mandatory)
- Drag & drop reordering support
- Field deletion support

**Example Fields**: `buyerName`, `buyerAddress`, `buyerPhone`, `buyerEmail`, `buyerTaxId`, `documentNo`, `documentDate`

#### 4.5.3 Table Configuration
**Purpose**: Define **table/line item data structures** that AI should extract from documents

| Field | Type | Description |
|-------|------|-------------|
| Table Description | textarea | Describe table content (e.g., "Line items including item number, description, quantity, unit price, amount") |
| Column Definitions | dynamic list | Define table columns (itemNo, description, quantity, unitPrice, amount, etc.) |

#### 4.5.4 Sample Output (Preview)
**Purpose**: Display expected extraction result JSON format based on configuration

```json
{
  "buyerName": "Example Company",
  "documentNo": "INV-001",
  "lineItems": [
    { "itemNo": "001", "description": "Product A", "quantity": 1, "amount": 100 }
  ]
}
```

**Component Interface**:
```tsx
interface ProjectConfigModalProps {
  projectId?: string;           // Passed when editing
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

## 5. Technical Specifications

### 5.1 New Dependencies

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

### 5.2 New Components List

| Component | Path | Priority |
|-----------|------|----------|
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

### 5.3 Refactored Components List

| Component | Current Path | Scope of Changes |
|-----------|-------------|------------------|
| ProjectPanel | `features/documents/components/ProjectPanel.tsx` | Major refactor |
| ProjectPanelItem | `features/documents/components/ProjectPanelItem.tsx` | Major refactor |
| DocumentsPage | `pages/DocumentsPage.tsx` | Major refactor |
| DocumentDetailPage | `pages/DocumentDetailPage.tsx` | Complete rewrite |
| ProjectsPage | `pages/ProjectsPage.tsx` | Major refactor |

---

## 6. Priority and Timeline

### 6.1 Phase 1: P0 Core Features (Estimate: 16-24 hours)

| Task | Estimate |
|------|----------|
| ProjectAvatar + ProjectPanel refactor | 3-4h |
| DocumentUploadZone + UploadQueue | 4-5h |
| DocumentTable + ConfidenceBar | 3-4h |
| DocumentSplitView + DocumentPreview (PDF+images) | 4-5h |
| ExtractedStructuredView + LineItemsTable | 3-4h |
| ProjectStats + EnhancedProjectCard | 2-3h |

### 6.2 Phase 2: P1 Important Features (Estimate: 12-16 hours)

| Task | Estimate |
|------|----------|
| ProcessingChart + TokenUsageChart | 4-5h |
| Project config modal refactor | 4-5h |
| Breadcrumb navigation | 2-3h |
| Panel ratio slider | 2-3h |

### 6.3 Phase 3: P2 Enhancement Features (Estimate: 4-8 hours)

| Task | Estimate |
|------|----------|
| "Live" connection indicator | 1-2h |
| Sample Output preview | 2-3h |
| Other detail refinements | 1-3h |

---

## 7. Acceptance Criteria

### 7.1 Functional Acceptance

- [ ] ProjectPanel displays colored avatars and two-line information
- [ ] Documents page supports drag & drop upload
- [ ] Documents page displays full table columns
- [ ] Document detail page supports split-screen preview
- [ ] Document detail page supports both PDF and image format preview
- [ ] Document detail page supports Structured/JSON toggle
- [ ] Document detail page correctly displays LineItems table
- [ ] Projects page displays statistics cards
- [ ] Schema Builder four sections (Project Info, Fields, Table, Sample) are functional
- [ ] All existing features remain working

### 7.2 Design Acceptance

- [ ] Visual consistency with reference design screenshots ≥ 90%
- [ ] Responsive layout works correctly at 1280px+ width
- [ ] Dark/light theme support
- [ ] Smooth animation transitions

### 7.3 Performance Acceptance

- [ ] Initial page load < 3s
- [ ] Table renders 100 rows without lag
- [ ] Document preview load (PDF/images) < 2s

---

## 8. Risks and Dependencies

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PDF.js integration complexity | Medium | Medium | Can downgrade to download link |
| Split-screen component performance | Low | Low | Use virtual scrolling |

### 8.2 External Dependencies

- Backend API needs to support returning additional field data (token_usage, document_type)
- Backend needs to provide project statistics summary API

---

## 9. Approval Records

| Version | Date | Approver | Status |
|---------|------|----------|--------|
| v1.0 | 2026-01-19 | - | Draft - Pending Review |
| v1.1 | 2026-01-20 | - | Revised - Updated based on user feedback |

---

## 10. Changelog

### v1.1 (2026-01-20)

Revisions based on user review feedback:

1. **Schema Builder clarification** (Section 4.5)
   - Clarified that Schema Builder is a "document extraction template configurator"
   - Detailed description of four configuration sections with specific features and purposes
   - Added component interface definitions

2. **Line Items table clarification** (Section 4.3.4)
   - Clarified that this table displays "item/service line data extracted by AI from documents"
   - Added standard column definition table (8 columns)
   - Added TypeScript interface definitions

3. **Document previewer image support** (Section 4.3.2)
   - Changed "PDF previewer" to "Document previewer (PDF + images)"
   - Added supported file types: PDF, PNG, JPG/JPEG
   - Renamed component: `PDFPreview` → `DocumentPreview`

4. **Acceptance criteria updates** (Section 7.1)
   - Added: "Document detail page supports both PDF and image format preview"
   - Added: "Document detail page correctly displays LineItems table"
   - Added: "Schema Builder four sections are functional"

---

*Document created by: Claude (PM Agent)*
*Last updated: 2026-01-20*

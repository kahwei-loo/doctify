# Document Details Page - UI/UX Optimization Plan

**Created**: 2026-02-02
**Status**: Proposal - Awaiting Approval
**Priority**: P0 - Critical User Experience

---

## 1. Executive Summary

### Current State Issues
From screenshot analysis (`C:\Users\KahWei\Projects\ai-works\kahwei-loo\doctify\.playwright-mcp\current_document_details.png`):

| Issue | Impact | User Feedback |
|-------|--------|---------------|
| **Technical Overload** | ALL metadata exposed (model, provider, tokens, process time) | "Users only need Preview + Extracted Text" |
| **Poor Information Hierarchy** | No distinction between user-relevant vs technical data | "Other info doesn't need to be obvious" |
| **Display Errors** | "[object Object]" for Field Confidences, Token Usage, L25 Metadata | Broken UX, confusing |
| **Unformatted Data** | Confidence shows as "0.41000000000000003" | Unprofessional |
| **Wrong Focus** | Technical metadata equally prominent as business data | Users can't find what they need quickly |

### Optimization Goal
**Transform from "Developer Debug View" → "Business User Information View"**

Primary focus: **Document Preview** + **Extracted Business Data**
Secondary (minimized): Cost information (acceptable per user)
Hidden/Removed: Model selection, provider, process time, token breakdown, L25 metadata

---

## 2. Reference Design Analysis

### Reference Design Strengths (from FRONTEND_REDESIGN_REQUIREMENTS.md)

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
│   │   Document preview   │     │   docType        documentNo        │
│   │                      │     │   CASH BILL      227/143           │
│   │                      │     │                                    │
│   │                      │     │   documentDate   documentTime      │
│   │                      │     │   2024-10-15     (empty)           │
│   └──────────────────────┘     │                                    │
│                                │   lineItems (10 items)             │
│   [🔍-] 100% [🔍+]            │   ┌────────────────────────────┐   │
│                                │   │ itemNo │ desc │ qty │ ... │   │
│                                │   └────────────────────────────┘   │
├────────────────────────────────┴────────────────────────────────────┤
│ Uploaded: 12/10/2025   Project: Auto Detect   Tokens: 5,551 (~RM)  │
│                                              Panel ratio: ────●──── │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Design Principles**:
1. ✅ **Preview First** - Left panel for visual document verification
2. ✅ **Business Data Focus** - Right panel shows extracted business data (docType, dates, amounts)
3. ✅ **Minimal Footer** - Cost info in compact footer (acceptable per user)
4. ❌ **No Technical Details** - Model, provider, process time, token breakdown NOT shown
5. ✅ **Clean Hierarchy** - Clear visual separation of primary vs secondary info

---

## 3. Detailed Optimization Specifications

### 3.1 Header Area Optimization

**Current State** (Screenshot Analysis):
```
MIX STORE                                    [Expand] [Full View]
Document ID: 3f42afd8-...
```

**Optimized Design**:
```
← Documents    MIX STORE_16-11-2024_21-30-13.jpeg
               receipt 41%    Image · 179.4 KB                        [Refresh] [Export]
```

**Changes**:
- ✅ Add back navigation breadcrumb
- ✅ Show filename prominently
- ✅ Display doc type + confidence as badge/pill
- ✅ Show file type + size metadata
- ❌ Remove/minimize Document ID (technical, not user-relevant)
- ✅ Add action buttons (Refresh, Export)

---

### 3.2 Right Panel - Extracted Data Reorganization

#### 3.2.1 Top Section: Status + Tabs

**Current** (All fields visible at once):
```
Document Processing
Status: completed
Confidence: 0.41000000000000003
Process Time: 22.38...

[Raw OCR Data] [Preview] [Confirm] [History]
```

**Optimized**:
```
✓ Extracted Results    Completed

[Structured] [JSON]    41%  ✎ Edit
```

**Changes**:
- ✅ Simplified status indicator with icon
- ✅ Cleaner tab design (Structured/JSON primary)
- ✅ Formatted confidence as percentage (41%)
- ✅ Edit icon for inline editing
- ❌ Remove: Process Time (users don't need)
- ❌ Remove: Raw OCR Data tab (too technical)
- ⚙️ Keep: History tab but move to secondary position

---

#### 3.2.2 Extracted Data Display

**Current Issues**:
```tsx
// Current rendering in ExtractedStructuredView shows EVERYTHING:
Model: openai/gpt-4o-mini
Provider: openai
Process Time: 22.38...
Token Usage: [object Object]
Total Token Usage: [object Object]
Field Confidences: [object Object]
L25 Metadata: [object Object]
Retry Count: 2
// ... then business data ...
```

**Optimized Hierarchy**:

**Level 1: Business Data (Always Visible)**
```
Document Information:
├─ docType: receipt
├─ documentNo: (extracted number)
├─ documentDate: 2024-11-16
├─ documentTime: 21:30:13
├─ grandTotal: 85.30
└─ ... other business fields ...

Line Items: (5 items)
┌──────────────────────────────────────────────────┐
│ Description        │ Qty │ Price │ Total        │
├──────────────────────────────────────────────────┤
│ HM AyamGoreng McD │ 1   │ 18.90 │ 18.90       │
│ S IceLemonTea     │ 1   │ 5.50  │ 5.50        │
└──────────────────────────────────────────────────┘
```

**Level 2: Cost Summary (Collapsed by Default, Footer)**
```
─────────────────────────────────────────────────────────
Uploaded: 16/11/2024 21:30   Project: Auto Detect
Tokens: 5,551 (~RM0.25 est.)
                                    [Show Technical Details ▼]
```

**Level 3: Technical Details (Collapsed, Expandable)**
```
[Technical Details ▼]

  Model Information:
  ├─ Model: gpt-4o-mini
  ├─ Retry Count: 2 attempts
  └─ Confidence Score: 41%

  Processing Statistics:
  ├─ Process Time: 22.38s
  ├─ Prompt Tokens: 5,000
  ├─ Completion Tokens: 551
  └─ Total Tokens: 5,551
```

---

### 3.3 Data Field Visibility Matrix

| Field | Display Location | Visibility | Format | Rationale |
|-------|------------------|------------|--------|-----------|
| **docType** | Top badge | Always visible | "receipt 41%" | Essential for user to understand document |
| **documentNo** | Business data section | Always visible | As-is | Core business info |
| **documentDate** | Business data section | Always visible | "DD/MM/YYYY" | Core business info |
| **grandTotal** | Business data section | Always visible | "RM 85.30" | Most important financial data |
| **lineItems** | Table below | Always visible | Table format | Critical transaction details |
| **confidence** | Top badge | Always visible | "41%" | Quality indicator users need |
| **uploadedAt** | Footer | Always visible | "16/11/2024 21:30" | User-relevant metadata |
| **projectName** | Footer | Always visible | "Auto Detect" | Context for user |
| **tokens** | Footer | Always visible (collapsed) | "5,551 (~RM0.25)" | Cost info (acceptable per user) |
| **model** | Collapsed section | Hidden by default | "gpt-4o-mini" | User can't choose, not relevant |
| **provider** | ❌ Remove | Hidden permanently | N/A | Redundant with model, too technical |
| **processTime** | Collapsed section | Hidden by default | "22.4s" | Users don't need to know |
| **tokenUsage breakdown** | Collapsed section | Hidden by default | Formatted object | Too technical for most users |
| **fieldConfidences** | ❌ Remove | Hidden permanently | N/A | Too granular, confusing |
| **l25Metadata** | ❌ Remove | Hidden permanently | N/A | Internal debug info |

---

### 3.4 Component-Level Changes

#### File: `frontend/src/pages/DocumentDetailPage.tsx`

**Section 1: Header Component** (Lines ~200-250)
```tsx
// BEFORE (Current)
<div className="flex items-center justify-between">
  <div>
    <h1>{document.original_filename}</h1>
    <p className="text-sm text-muted-foreground">
      Document ID: {document.document_id}
    </p>
  </div>
</div>

// AFTER (Optimized)
<div className="flex items-center justify-between border-b pb-4">
  <div className="flex items-center space-x-4">
    {/* Back Navigation */}
    <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
      ← Documents
    </Button>

    <div>
      {/* Filename */}
      <h1 className="text-2xl font-semibold">{document.original_filename}</h1>

      {/* Metadata Row */}
      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
        {/* Doc Type Badge */}
        <Badge variant={document.ocr_result?.confidence > 0.7 ? 'success' : 'warning'}>
          {document.ocr_result?.doc_type} {formatConfidence(document.ocr_result?.confidence)}
        </Badge>

        {/* File Info */}
        <span>Image · {formatFileSize(document.file_size)}</span>
      </div>
    </div>
  </div>

  {/* Action Buttons */}
  <div className="flex space-x-2">
    <Button variant="outline" size="sm" onClick={handleRefresh}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Refresh
    </Button>
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  </div>
</div>
```

**Section 2: ExtractedStructuredView Component**

Create new component: `frontend/src/features/documents/components/ExtractedDataView.tsx`

```tsx
interface ExtractedDataViewProps {
  ocrResult: OCRResult;
  document: Document;
}

export const ExtractedDataView: React.FC<ExtractedDataViewProps> = ({ ocrResult, document }) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-semibold">Extracted Results</span>
          <Badge variant="success">Completed</Badge>
        </div>

        <div className="flex items-center space-x-4">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="structured">Structured</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold">{formatConfidence(ocrResult.confidence)}</span>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Business Data Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">
          Document Information
        </h3>

        {/* Field Grid - Only Business Data */}
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(ocrResult.data)
            .filter(([key]) => !TECHNICAL_FIELDS.includes(key))
            .map(([key, value]) => (
              <FieldDisplay key={key} label={key} value={value} />
            ))
          }
        </div>
      </div>

      {/* Line Items Table */}
      {ocrResult.lineItems && ocrResult.lineItems.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase">
            Line Items ({ocrResult.lineItems.length} items)
          </h3>
          <LineItemsTable items={ocrResult.lineItems} />
        </div>
      )}

      {/* Footer with Cost Summary */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>Uploaded: {formatDate(document.created_at)}</span>
            <span>Project: {document.project_name}</span>
            <span>Tokens: {formatTokens(ocrResult.tokens)} ({estimateCost(ocrResult.tokens)})</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          >
            {showTechnicalDetails ? 'Hide' : 'Show'} Technical Details
            {showTechnicalDetails ? <ChevronUp /> : <ChevronDown />}
          </Button>
        </div>

        {/* Collapsed Technical Details */}
        {showTechnicalDetails && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Model Information</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Model: {ocrResult.model}</div>
                <div>Retry Count: {ocrResult.retry_count} attempt(s)</div>
                <div>Confidence Score: {formatConfidence(ocrResult.confidence)}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Processing Statistics</h4>
              <div className="space-y-1 text-muted-foreground">
                <div>Process Time: {formatDuration(ocrResult.process_time)}</div>
                <div>Prompt Tokens: {ocrResult.tokens?.prompt_tokens?.toLocaleString()}</div>
                <div>Completion Tokens: {ocrResult.tokens?.completion_tokens?.toLocaleString()}</div>
                <div>Total Tokens: {ocrResult.tokens?.total_tokens?.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Fields to exclude from business data display
const TECHNICAL_FIELDS = [
  'model',
  'provider',
  'process_time',
  'token_usage',
  'field_confidences',
  'l25_metadata',
  'retry_count'
];
```

---

## 4. Implementation Roadmap

### Phase 1: Information Architecture Cleanup (2-3 hours)

**Files to Modify**:
- `frontend/src/pages/DocumentDetailPage.tsx`
- `frontend/src/features/documents/components/ExtractedStructuredView.tsx`

**Changes**:
1. ✅ Create field visibility categorization (Business vs Technical)
2. ✅ Implement collapsed technical details section
3. ✅ Fix "[object Object]" display errors
4. ✅ Format confidence as percentage
5. ✅ Move cost info to footer

**Acceptance Criteria**:
- [ ] No "[object Object]" displays
- [ ] Confidence shows as "41%" not "0.41000000000000003"
- [ ] Technical fields hidden by default
- [ ] Business data prominently displayed

---

### Phase 2: Header Optimization (1-2 hours)

**Changes**:
1. ✅ Add back navigation breadcrumb
2. ✅ Redesign header with filename + badges
3. ✅ Add action buttons (Refresh, Export)
4. ✅ Minimize Document ID display

**Acceptance Criteria**:
- [ ] Header matches reference design
- [ ] Navigation works correctly
- [ ] Action buttons functional

---

### Phase 3: Footer & Technical Details (1 hour)

**Changes**:
1. ✅ Create compact footer with upload date, project, tokens
2. ✅ Implement expandable "Show Technical Details" section
3. ✅ Move model/process time/token breakdown to collapsed area

**Acceptance Criteria**:
- [ ] Footer shows essential metadata only
- [ ] Technical details hidden by default
- [ ] Expand/collapse animation smooth

---

### Phase 4: Polish & Testing (1 hour)

**Changes**:
1. ✅ Add proper formatting helpers (formatConfidence, formatTokens, estimateCost)
2. ✅ Test with multiple document types
3. ✅ Verify responsive layout
4. ✅ Cross-browser testing

**Acceptance Criteria**:
- [ ] All data formats correctly
- [ ] No console errors
- [ ] Works on different screen sizes

---

## 5. Data Formatting Utilities

Create: `frontend/src/shared/utils/formatters.ts`

```typescript
/**
 * Format confidence score as percentage
 * @example formatConfidence(0.41) => "41%"
 */
export const formatConfidence = (confidence: number): string => {
  if (!confidence) return "N/A";
  return `${Math.round(confidence * 100)}%`;
};

/**
 * Format token count with thousands separator
 * @example formatTokens(5551) => "5,551"
 */
export const formatTokens = (tokens: number | { total_tokens: number }): string => {
  const count = typeof tokens === 'number' ? tokens : tokens?.total_tokens;
  return count?.toLocaleString() || "N/A";
};

/**
 * Estimate cost in RM based on token count
 * Assumes average cost of RM0.00005 per token (gpt-4o-mini rate)
 */
export const estimateCost = (tokens: number | { total_tokens: number }): string => {
  const count = typeof tokens === 'number' ? tokens : tokens?.total_tokens;
  if (!count) return "N/A";

  const cost = count * 0.00005; // RM0.00005 per token
  return `~RM${cost.toFixed(2)}`;
};

/**
 * Format file size
 * @example formatFileSize(179400) => "179.4 KB"
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Format duration
 * @example formatDuration(22.38) => "22.4s"
 */
export const formatDuration = (seconds: number): string => {
  if (!seconds) return "N/A";
  return `${seconds.toFixed(1)}s`;
};

/**
 * Format date
 * @example formatDate("2024-11-16T21:30:13") => "16/11/2024 21:30"
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

---

## 6. Before/After Comparison

### Before (Current Screenshot)
```
Issues:
❌ All technical fields visible equally
❌ "[object Object]" display errors
❌ Confidence: 0.41000000000000003
❌ No visual hierarchy
❌ Model/Provider/Process Time prominent
❌ Token Usage breakdown exposed
❌ L25 Metadata visible
❌ Field Confidences visible
```

### After (Optimized)
```
Improvements:
✅ Business data prominent (docType, dates, amounts, lineItems)
✅ Confidence formatted: "41%"
✅ Cost summary in compact footer: "5,551 tokens (~RM0.25)"
✅ Technical details collapsed by default
✅ Model/process time in expandable section
✅ Clean visual hierarchy
✅ No "[object Object]" errors
✅ No field confidences clutter
```

---

## 7. Success Metrics

### User Experience
- [ ] Users can find extracted business data within 2 seconds
- [ ] No confusion about technical terminology
- [ ] Preview + Extracted Text immediately visible
- [ ] Cost information accessible but not intrusive

### Technical Quality
- [ ] No display errors ("[object Object]")
- [ ] All data properly formatted
- [ ] Performance: <100ms to render extracted data
- [ ] Responsive: Works on 1280px+ screens

### User Feedback
- [ ] "Much cleaner and easier to understand"
- [ ] "I can find the information I need quickly"
- [ ] "The preview + data is what I need, technical stuff is out of the way"

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking existing workflows | Low | Medium | Comprehensive testing, keep all data accessible (just reorganized) |
| User confusion with new layout | Low | Low | Clear visual hierarchy, familiar patterns |
| Performance regression | Very Low | Low | Lightweight changes, no new heavy dependencies |
| Data loss during refactor | Very Low | High | Thorough testing, no data structure changes |

---

## 9. Next Steps

1. **Review & Approval** - Get user confirmation on this plan
2. **Implementation** - Follow 4-phase roadmap (5-7 hours total)
3. **Testing** - Verify with multiple document types
4. **Deployment** - Deploy to staging for user acceptance testing
5. **Production** - Roll out after approval

---

## 10. Additional Recommendations

### Future Enhancements (Post-Optimization)
1. **Inline Editing** - Allow users to edit extracted fields directly
2. **Field Confidence Indicators** - Subtle icons for low-confidence fields
3. **Export Options** - Export as JSON, CSV, Excel
4. **History Comparison** - Side-by-side comparison of extraction attempts
5. **Keyboard Shortcuts** - Quick navigation between fields

### Accessibility
- Ensure all collapsible sections have proper ARIA labels
- Keyboard navigation for all interactive elements
- Screen reader support for data tables
- High contrast mode support

---

**Status**: Ready for Implementation
**Estimated Effort**: 5-7 hours
**Priority**: P0 - Critical UX Improvement

*Created by: Claude Code*
*Date: 2026-02-02*

# Document Details Page - Visual Showcase

**Design Direction**: Refined Data Elegance
**Typography**: Instrument Serif + System Sans
**Philosophy**: Data-First, Progressive Disclosure

---

## 🎨 Visual Layout (After Optimization)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Documents  |  MIX_STORE_16-11-2024_21-30-13.jpeg                          │
│                 receipt 41% • Image · 179.4 KB        [Refresh] [Export]    │
├──────────────────────────────────┬──────────────────────────────────────────┤
│                                  │                                          │
│   [Document Preview]             │   ✓ Extracted Results    Completed      │
│                                  │                                          │
│   ┌────────────────────────┐     │   [Structured] [JSON]           41%  ✎  │
│   │                        │     │                                          │
│   │  MIX STORE Receipt     │     │   ⚠ Low Confidence Detection            │
│   │  Image/Document        │     │   Manual review recommended             │
│   │  Preview Area          │     │                                          │
│   │                        │     │   # DOCUMENT INFORMATION                │
│   │                        │     │                                          │
│   │                        │     │   ┌─────────────┬─────────────┐          │
│   │                        │     │   │ 📅 Date     │ 💰 Amount   │          │
│   │                        │     │   │ 16/11/2024  │ RM 85.30    │          │
│   └────────────────────────┘     │   ├─────────────┼─────────────┤          │
│                                  │   │ # Doc No    │ 📄 Type     │          │
│   [🔍-] 100% [🔍+]              │   │ 227/143     │ receipt     │          │
│                                  │   └─────────────┴─────────────┘          │
│                                  │                                          │
│                                  │   LINE ITEMS                  5 items   │
│                                  │   ┌──────────────────────────────────┐   │
│                                  │   │ Description  │ Qty │ Price │ Total│   │
│                                  │   ├──────────────────────────────────┤   │
│                                  │   │ HM AyamGoreng│  1  │ 18.90 │18.90│   │
│                                  │   │ S IceLemon   │  1  │  5.50 │ 5.50│   │
│                                  │   │ M Curly Fries│  2  │ 13.90 │27.80│   │
│                                  │   │ ...          │ ... │  ...  │ ... │   │
│                                  │   └──────────────────────────────────┘   │
│                                  │                                          │
├──────────────────────────────────┴──────────────────────────────────────────┤
│ 📅 Uploaded: 16/11/2024 21:30  |  # Project: Auto Detect                  │
│ ⚡ Tokens: 5,551 (~RM0.28)               [Show Technical Details ▼]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Design Principles

### 1. Typography Hierarchy

**Instrument Serif (Data)**:
```
Purpose: Numbers, values, business data
Weight: Medium to Bold
Usage:
  - Confidence percentage: "41%"
  - Currency amounts: "RM 85.30"
  - Table values: quantities, prices
  - Key metrics

Why: Creates elegance, signals importance,
     distinguishes data from interface
```

**System Sans (UI)**:
```
Purpose: Labels, buttons, UI elements
Weight: Regular to Semibold
Usage:
  - Field labels: "DOCUMENT INFORMATION"
  - Buttons: "Refresh", "Export"
  - Tab labels: "Structured", "JSON"
  - Status text

Why: Clean, functional, doesn't compete
     with data for attention
```

### 2. Color System

**Confidence-Based Colors**:
```css
/* High Confidence (≥70%) */
.confidence-high {
  background: rgba(34, 197, 94, 0.1);   /* green-500/10 */
  color: rgb(22, 163, 74);              /* green-600 */
  border-color: rgba(34, 197, 94, 0.2); /* green-500/20 */
}

/* Medium Confidence (50-69%) */
.confidence-medium {
  background: rgba(234, 179, 8, 0.1);   /* yellow-500/10 */
  color: rgb(202, 138, 4);              /* yellow-600 */
  border-color: rgba(234, 179, 8, 0.2); /* yellow-500/20 */
}

/* Low Confidence (<50%) */
.confidence-low {
  background: rgba(239, 68, 68, 0.1);   /* red-500/10 */
  color: rgb(220, 38, 38);              /* red-600 */
  border-color: rgba(239, 68, 68, 0.2); /* red-500/20 */
}
```

**Backgrounds**:
```css
/* Card backgrounds with blur */
.card-surface {
  background: rgba(var(--card), 0.5);
  backdrop-filter: blur(8px);
}

/* Field backgrounds */
.field-surface {
  background: rgba(var(--background), 0.5);
  border: 1px solid rgba(var(--border), 0.5);
  transition: border-color 150ms;
}

.field-surface:hover {
  border-color: rgba(var(--border), 1);
}

/* Muted backgrounds */
.muted-surface {
  background: rgba(var(--muted), 0.2);
}
```

### 3. Spacing & Layout

**Grid System**:
```
Business Fields:
  - Desktop: 2-column grid (grid-cols-2)
  - Gap: 1rem (gap-4)
  - Padding: 1.5rem per field (p-3)

Line Items Table:
  - Full width responsive
  - Horizontal scroll on mobile
  - Padding: 0.75rem per cell (p-3)

Sections:
  - Vertical spacing: 2rem (space-y-8)
  - Container padding: 1.5rem (p-6)
```

**Visual Rhythm**:
```
Header:   16px padding (py-4)
Content:  24px padding (p-6)
Footer:   16px padding (p-4)
Cards:    12px padding (p-3)
Gaps:     16px between elements (gap-4)
Sections: 32px between sections (space-y-8)
```

### 4. Interactive States

**Hover Transitions**:
```css
/* Copy buttons - opacity reveal */
.copy-button {
  opacity: 0;
  transition: opacity 150ms;
}
.field:hover .copy-button {
  opacity: 1;
}

/* Border transitions */
.field {
  border-color: rgba(var(--border), 0.5);
  transition: border-color 150ms;
}
.field:hover {
  border-color: rgba(var(--border), 1);
}

/* Table rows */
.table-row {
  transition: background-color 150ms;
}
.table-row:hover {
  background: rgba(var(--muted), 0.2);
}
```

**Collapse/Expand Animation**:
```css
.technical-details {
  animation: slideInFromTop 200ms ease-out;
}

@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 📊 Information Architecture

### Level 1: Primary (Always Visible)

**Business Data Fields**:
```
Priority: Immediate visibility
Location: Main content area
Style: Large serif typography, ample spacing
Examples:
  - documentType: "receipt"
  - documentDate: "16/11/2024"
  - grandTotal: "RM 85.30"
  - documentNo: "227/143"
```

**Line Items Table**:
```
Priority: Critical transaction data
Location: Below business fields
Style: Responsive table, serif numbers
Columns:
  - Description (left-aligned, sans-serif)
  - Quantity (right-aligned, serif)
  - Unit Price (right-aligned, serif, currency)
  - Total (right-aligned, serif, bold, currency)
```

### Level 2: Secondary (Compact Footer)

**Cost Summary**:
```
Priority: Visible but not prominent
Location: Footer, single row
Display: Icons + concise text
Elements:
  📅 Uploaded: 16/11/2024 21:30
  # Project: Auto Detect
  ⚡ Tokens: 5,551 (~RM0.28)
```

### Level 3: Tertiary (Collapsed)

**Technical Details**:
```
Priority: Available on-demand
Location: Footer expandable section
Trigger: "Show Technical Details ▼" button
Content:
  Model Information:
    - Model: gpt-4o-mini
    - Retry Count: 2 attempts
    - Confidence: 41%

  Processing Statistics:
    - Process Time: 22.4s
    - Prompt Tokens: 5,000
    - Completion Tokens: 551
```

---

## 🎭 Contextual Icons

**Purpose**: Visual cues without clutter

```
Document Fields:
  📅 Calendar  → Date fields
  💰 Dollar    → Amount/price fields
  # Hash       → ID/number fields
  📄 FileText  → Type/category fields

Footer Metadata:
  📅 Calendar  → Upload date
  # Hash       → Project name
  ⚡ Zap       → Token usage/cost

Technical Details:
  🖥️ Cpu       → Model information
  ⏱️ Clock     → Processing statistics

Actions:
  🔄 Refresh   → Reload data
  📤 Export    → Download/export
  ✏️ Edit      → Edit mode (disabled)
  📋 Copy      → Copy to clipboard
  ✓ Check     → Copied confirmation
```

**Icon Style**:
- Size: 14px (h-3.5 w-3.5)
- Color: text-muted-foreground
- Weight: Stroke width 2
- Library: Lucide React

---

## 🌊 Animation Philosophy

**Principle**: Smooth, purposeful, non-distracting

### Collapse/Expand
```
Duration: 200ms
Easing: ease-out
Effect: Slide from top with fade
Why: Feels natural, reveals content progressively
```

### Hover States
```
Duration: 150ms
Easing: ease (default)
Effect: Border color, opacity changes
Why: Immediate feedback, responsive feel
```

### Copy Confirmation
```
Duration: 1500ms
Effect: Icon swap (Copy → Check), color change
Why: Clear success feedback, auto-reset
```

### Tab Switching
```
Duration: Instant (no animation)
Effect: Content swap
Why: Fast, direct navigation
```

---

## 🔍 Before/After Visual Comparison

### BEFORE (Problems)

```
╔══════════════════════════════════════════════════════════╗
║ MIX STORE                                    [Buttons]  ║
║ Document ID: 3f42afd8-4af7-43ef-af18-53f6ee02fa41      ║
╠══════════════════════════════════════════════════════════╣
║ Document Processing                                     ║
║ Status: completed                                       ║
║ Confidence: 0.41000000000000003              ❌ BAD    ║
║ Process Time: 22.38378...                               ║
║                                                         ║
║ Model: openai/gpt-4o-mini                    ❌ TOO    ║
║ Provider: openai                                MUCH   ║
║ Token Usage: [object Object]                 ❌ INFO   ║
║ Total Token Usage: [object Object]                     ║
║ Field Confidences: [object Object]                     ║
║ L25 Metadata: [object Object]                          ║
║ Retry Count: 2                                         ║
║                                                         ║
║ [Then business data somewhere below...]                ║
╚══════════════════════════════════════════════════════════╝

Problems:
❌ Technical metadata overwhelming
❌ Display errors ([object Object])
❌ No visual hierarchy
❌ Poor formatting (0.41000000000000003)
❌ Users can't find business data quickly
```

### AFTER (Optimized)

```
╔══════════════════════════════════════════════════════════╗
║ ← Documents  |  MIX_STORE_16-11-2024_21-30-13.jpeg     ║
║                 receipt 41% • Image · 179.4 KB         ║
╠══════════════════════════════════════════════════════════╣
║ ✓ Extracted Results    Completed                       ║
║                                                         ║
║ [Structured] [JSON]                    41%         ✎   ║
║                                                         ║
║ # DOCUMENT INFORMATION                                  ║
║                                                         ║
║ ┌───────────────────────┬───────────────────────┐      ║
║ │ 📅 Document Date      │ 💰 Grand Total        │      ║
║ │ 16/11/2024            │ RM 85.30              │  ✅  ║
║ ├───────────────────────┼───────────────────────┤  CLEAN║
║ │ # Document No         │ 📄 Document Type      │      ║
║ │ 227/143               │ receipt               │      ║
║ └───────────────────────┴───────────────────────┘      ║
║                                                         ║
║ LINE ITEMS                               5 items       ║
║ ┌─────────────────────────────────────────────────┐    ║
║ │ Description     │ Qty │  Price  │  Total       │    ║
║ ├─────────────────────────────────────────────────┤    ║
║ │ HM AyamGoreng   │  1  │  18.90  │  RM 18.90    │    ║
║ │ S IceLemon      │  1  │   5.50  │  RM 5.50     │    ║
║ │ M Curly Fries   │  2  │  13.90  │  RM 27.80    │    ║
║ └─────────────────────────────────────────────────┘    ║
╠══════════════════════════════════════════════════════════╣
║ 📅 Uploaded: 16/11/2024  # Auto Detect                 ║
║ ⚡ Tokens: 5,551 (~RM0.28)  [Show Technical Details ▼] ║
╚══════════════════════════════════════════════════════════╝

Improvements:
✅ Business data prominent
✅ Clean formatting (41%)
✅ Visual hierarchy clear
✅ Technical details hidden
✅ Refined typography
✅ No display errors
```

---

## 💎 What Makes This Design Memorable

### 1. **Instrument Serif Typography**
Unexpected elegance for data-heavy interfaces. Numbers and values feel important, professional, and trustworthy.

### 2. **Progressive Disclosure**
Respects both power users (technical details available) and casual users (hidden by default). Everyone sees what they need.

### 3. **Contextual Icons**
Calendar for dates, dollar signs for money, zap for performance. Visual cues enhance understanding without adding noise.

### 4. **Smooth Interactions**
Every hover, click, and transition feels polished. Collapse/expand animation is particularly satisfying.

### 5. **Data-First Philosophy**
Business information is the hero. Everything else supports but doesn't compete for attention.

---

## 🎨 Color Palette Reference

```css
/* Confidence Colors */
--confidence-high-bg: rgba(34, 197, 94, 0.1);
--confidence-high-fg: rgb(22, 163, 74);
--confidence-high-border: rgba(34, 197, 94, 0.2);

--confidence-medium-bg: rgba(234, 179, 8, 0.1);
--confidence-medium-fg: rgb(202, 138, 4);
--confidence-medium-border: rgba(234, 179, 8, 0.2);

--confidence-low-bg: rgba(239, 68, 68, 0.1);
--confidence-low-fg: rgb(220, 38, 38);
--confidence-low-border: rgba(239, 68, 68, 0.2);

/* Surface Colors */
--card-surface: rgba(var(--card), 0.5);
--field-surface: rgba(var(--background), 0.5);
--muted-surface: rgba(var(--muted), 0.2);
--hover-surface: rgba(var(--muted), 0.2);

/* Border Colors */
--border-subtle: rgba(var(--border), 0.5);
--border-default: rgba(var(--border), 1);
```

---

## 📐 Typography Specification

```css
/* Data Display (Instrument Serif) */
.data-value {
  font-family: 'Instrument Serif', Georgia, serif;
  font-weight: 500;
  font-size: 1rem;
  line-height: 1.625;
}

.data-value-large {
  font-size: 2rem;
  font-weight: 700;
}

/* Labels (System Sans) */
.field-label {
  font-size: 0.6875rem;    /* 11px */
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
}

/* Section Headers */
.section-header {
  font-size: 0.75rem;      /* 12px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted-foreground);
}
```

---

**Design Complete**: Refined Data Elegance
**Typography**: Instrument Serif + System Sans
**Philosophy**: Progressive Disclosure, Data-First

*Created with frontend-design skill*
*Framework: React + TypeScript + TailwindCSS*

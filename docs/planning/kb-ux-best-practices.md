# KB Module UX — Industry Best Practices & Redesign Reference

> Analysis Date: 2026-02-11 (v3 — corrected dual-sidebar layouts + per-type source expanded views)
> Scope: True industry-aligned redesign, not incremental optimization

---

## Table of Contents

1. [Industry Landscape — What Market Leaders Actually Do](#1-industry-landscape)
2. [The Core Insight — Sources + Chat Is the Product](#2-the-core-insight)
3. [Current Doctify vs Industry](#3-current-doctify-vs-industry)
4. [Best Practice ASCII Layouts](#4-best-practice-ascii-layouts)
5. [Answer Library & Q&A History — Do We Need Them?](#5-answer-library--qa-history)
6. [Recommendations & Priority](#6-recommendations--priority)
7. [Sources](#7-sources)

---

## 1. Industry Landscape

### 1.1 NotebookLM (Google) — The Gold Standard

NotebookLM's redesign organizes the interface into **three resizable panels**:

```
┌────────────┬──────────────────────┬───────────────┐
│  Sources   │        Chat          │    Studio     │
│  (input)   │   (conversation)     │  (outputs)    │
└────────────┴──────────────────────┴───────────────┘
```

- **Sources panel**: List of uploaded documents. Click to expand and read inline.
  No stats dashboards. No health scores. Just the documents themselves.
- **Chat panel**: Conversational AI with **inline citations** that link back to
  source text. Hover a citation → see the exact quote. Click → jump to source.
- **Studio panel**: Outputs generated from sources (Study Guides, Briefing Docs,
  Audio Overviews). One-click creation.

**Design philosophy** (from designer Jason Spielman): Built around the
**creation journey** — inputs → conversation → outputs. Panels resize fluidly.
At narrow widths, panels collapse to icons while retaining navigation.

**What's NOT there**: No Overview dashboard. No embedding counts. No progress
bars. No health scores. No "How It Works" tutorials. No stats cards.

### 1.2 Claude Projects (Anthropic)

```
┌──────────────────────────────────────────────────┐
│  Project: "My Research"                   ⚙️     │
├──────────────┬───────────────────────────────────┤
│  📎 Files    │                                   │
│  file1.pdf   │     Chat conversation             │
│  file2.md    │     with full context              │
│  notes.txt   │     from all project files         │
│              │                                   │
│  [+ Add]     │     [input field]                 │
└──────────────┴───────────────────────────────────┘
```

Even simpler than NotebookLM: just **files + chat**. Project files appear in a
sidebar. The chat uses all uploaded files as context. Custom instructions per
project. No source management UI, no dashboards, no analytics.

### 1.3 Perplexity Spaces

```
┌──────────────────────────────────────────────────┐
│  Space: "Product Research"              ⚙️       │
├──────────────┬───────────────────────────────────┤
│  📄 Sources  │                                   │
│  + files     │     Thread-based                  │
│  + URLs      │     search & conversation         │
│  + notes     │     with source citations          │
│              │                                   │
│  👥 Members  │     [search/ask field]            │
└──────────────┴───────────────────────────────────┘
```

Sources sidebar (files, URLs, notes) + thread-based conversations.
Collaborative: invite viewers or "research partners." Each Space gets custom
AI instructions. **No dashboards or stats.**

### 1.4 Dify.ai — RAG-Specific Leader

Dify is the most relevant comparison because it's a **RAG platform builder**
(closer to Doctify's use case than consumer products).

```
┌──────────────────────────────────────────────────┐
│  Knowledge: "Product Docs"                       │
├────────────────────┬─────────────────────────────┤
│  📄 Documents      │  Document Detail            │
│                    │                             │
│  doc1.pdf    ✅    │  Chunks:                    │
│  doc2.txt    ✅    │  ┌─────────────────────┐    │
│  doc3.md     🔄    │  │ #1 "First chunk..." │    │
│                    │  │ #2 "Second chunk.." │    │
│  [+ Add]           │  │ #3 "Third chunk..." │    │
│                    │  └─────────────────────┘    │
│  Settings ⚙️       │                             │
└────────────────────┴─────────────────────────────┘
```

**Two-panel master-detail**: Document list (left) + chunk viewer (right).
Click a document → see its individual chunks with text content.

Key Dify patterns:
- **Visual chunk viewer** — builds user trust in RAG quality
- **Processing status inline** — ✅ done, 🔄 processing (not a separate dashboard)
- **Cmd+K quick search** — jump to any KB/document/chunk
- **Summary Index** — attach summaries to chunks for better retrieval
- No separate "Overview" tab — the document list IS the overview

### 1.5 Intercom Fin — Customer-Facing KB

Most relevant for **production chatbot** use cases:

```
┌──────────────────────────────────────────────────┐
│  Knowledge > Sources                             │
├──────────────────────────────────────────────────┤
│  [All] [For AI Agent] [For Copilot] [For Help]  │
├──────────────────────────────────────────────────┤
│  📄 Public Articles         12 (3 drafts)  [+]  │
│  📄 Internal Articles        8             [+]  │
│  🌐 Websites                 3  synced 2h ago    │
│  📎 PDFs & Snippets          5             [+]  │
│  🔗 Confluence               1  synced 1d ago    │
│  🔗 Notion                   2  synced 4h ago    │
└──────────────────────────────────────────────────┘
```

Key Intercom patterns:
- **Tab-based filtering by purpose** (Agent / Copilot / Help Center)
- **Category-based source grouping** with counts
- **Sync timestamps** for freshness ("synced 2h ago")
- **Green checkmarks** for availability
- **Unanswered questions** tracking (see Section 5)
- No dashboard — the source list IS the management view

### 1.6 Botpress / Voiceflow — Chatbot Builders

```
┌──────────────────────────────────────────────────┐
│  Knowledge Bases                                 │
├──────────────────────────────────────────────────┤
│  📂 Product KB                                   │
│    ├── 📄 docs.website.com (12 pages)            │
│    ├── 📄 product-manual.pdf                     │
│    └── 📄 FAQ answers (25 entries)               │
│                                                  │
│  📂 Support KB                                   │
│    ├── 📄 troubleshooting.pdf                    │
│    └── 📄 release-notes.md                       │
│                                                  │
│  [+ New Knowledge Base]                          │
└──────────────────────────────────────────────────┘
```

Key patterns:
- **Folder-based organization** within each KB
- **Step-by-step wizard** for uploads (guided, type-specific instructions)
- **Multiple KB segmentation** — different KBs for different agent purposes
- **Conversation transcripts** with evaluations (scoring conversations)
- No dashboard — just content management

### 1.7 Flowise — Developer-Oriented RAG

```
Document Store > "Product Docs"
┌─────────────────────────────────────────────────┐
│  📄 product-manual.pdf                          │
│  Loader: PDF  |  Splitter: Recursive (500/50)   │
│                                                 │
│  Chunk Preview:                                 │
│  ┌────────────────────────────────────────────┐ │
│  │ #1: "Doctify is an AI-powered platform..." │ │
│  │ #2: "The system supports multiple AI..."   │ │
│  │ #3: "Upload documents to begin..."         │ │
│  └────────────────────────────────────────────┘ │
│                                                 │
│  [Upsert to Vector Store]  [Test Retrieval]     │
└─────────────────────────────────────────────────┘
```

Key patterns:
- **Real-time chunk preview** before committing
- **Inline retrieval testing** — test from the document view itself
- **Pipeline visualization** — Upload → Split → Preview → Upsert
- **Configuration controls** — chunk size, overlap, splitter strategy

---

## 2. The Core Insight

### What Every Market Leader Has in Common

| Platform | Sources Panel | Chat/Query | Dashboard/Overview |
|----------|:---:|:---:|:---:|
| NotebookLM | ✅ | ✅ | **None** |
| Claude Projects | ✅ | ✅ | **None** |
| Perplexity Spaces | ✅ | ✅ | **None** |
| Dify.ai | ✅ | ✅ (separate) | **None** |
| Intercom Fin | ✅ | ✅ (separate) | **None** |
| Botpress | ✅ | ✅ (separate) | **None** |
| Flowise | ✅ | ✅ (inline) | **None** |
| **Doctify (current)** | ✅ | ✅ | **Yes (Overview tab)** |

**Nobody in the market has an Overview dashboard for an individual KB.**

The industry consensus is clear:
1. **Sources management** — add, view, remove, inspect content
2. **Chat / Query interface** — interact with the KB
3. **Settings** — configure chunking, model, etc. (usually a side panel)

That's it. The conversation IS the product. Everything else is overhead.

### The NotebookLM Mental Model

```
  Inputs        →    Conversation    →    Outputs
  (Sources)          (Chat)               (Generated content)
```

This maps perfectly to what Doctify could be:
- **Inputs**: Data sources (uploaded docs, Q&A pairs, text, websites, structured)
- **Conversation**: Unified Query (RAG + Analytics)
- **Outputs**: Answers with citations, charts, insights

### What About the KB Sidebar Panel?

The left sidebar KB panel (showing Overall View + KB list + "New KB") is a
**good pattern** that should be **preserved**. It mirrors:
- NotebookLM's notebook selector
- Perplexity's Spaces sidebar
- Notion's page tree

It provides:
- Quick KB switching without full-page navigation
- Always-visible context of which KB you're in
- Persistent "create new" CTA

---

## 3. Current Doctify vs Industry

### 3.1 What Doctify Does Right

| Pattern | Status | Notes |
|---------|--------|-------|
| KB sidebar panel for switching | ✅ Good | Keep this — matches industry pattern |
| Sources management (5 types) | ✅ Good | More source types than most platforms |
| Chat-like query interface | ✅ Good | Unified Query with streaming is solid |
| Sub-tabs for Query modes | ✅ Good | Ask Questions / Semantic Search separation |
| Content preview on cards | ✅ Good | Most platforms don't show inline previews |
| Source type variety | ✅ Good | Upload, Q&A, Text, Website, Structured — comprehensive |

### 3.2 What Doctify Gets Wrong (vs Industry)

| Issue | Doctify | Industry Standard |
|-------|---------|-------------------|
| **Overview tab exists** | Stats dashboard with 4 cards + health + tutorial | Nobody has this |
| **3-tab structure** | Overview / Sources / Query & Test | Should be 2: Sources / Chat |
| **"How It Works" permanent tutorial** | Takes ~25% of viewport | No platform shows permanent tutorials |
| **Stats-heavy approach** | "8 sources, 5 embeddings, 30KB" | Status shown inline on source items, not as dashboard |
| **View Content is a small dialog** | Modal with mostly numbers | Full content view with chunk inspection (Dify, Flowise) |
| **No chunk viewer** | Can't see how content was chunked | Dify + Flowise both show chunks |
| **Source cards look identical** | Same visual for all 5 types | Type differentiation with icons/colors |
| **No inline retrieval testing** | Must switch to Query tab to test | Flowise tests from document view |
| **Chat panel in a tab** | Hidden behind "Query & Test" tab | NotebookLM/Claude: chat always visible |

### 3.3 The Fundamental Architecture Question

Current Doctify (dual sidebar + tabbed content):
```
┌───────────┬──────────────────┬──────────────────────────────────────┐
│ Main Nav  │ KB Sidebar       │ Content Area                        │
│ Sidebar   │ Panel            │                                      │
│           │                  │  [Overview] [Sources] [Query&Test]   │
│ Dashboard │ Knowledge Bases  │                                      │
│ Documents │  🔍 Search...   │  (one view at a time)                │
│ KB     ◀ │                  │                                      │
│ Chat      │ Overall View     │                                      │
│ AI Assist │  5 embeddings   │                                      │
│ Templates │                  │                                      │
│ Settings  │ Product docs  ◀ │                                      │
│           │  8 src · 5 emb  │                                      │
│    «      │ + New KB         │                                      │
└───────────┴──────────────────┴──────────────────────────────────────┘
```

Industry direction (dual sidebar + side-by-side panels):
```
┌───────────┬──────────────────┬─────────────────────┬────────────────┐
│ Main Nav  │ KB Sidebar       │ Sources             │ Chat           │
│ Sidebar   │ Panel            │ (always visible)    │ (always visible│
│           │                  │                     │                │
│ Dashboard │ Knowledge Bases  │                     │                │
│ Documents │  🔍 Search...   │                     │                │
│ KB     ◀ │                  │                     │                │
│ Chat      │ Product docs  ◀ │                     │                │
│ AI Assist │  8 src · 5 emb  │                     │                │
│ Templates │                  │                     │                │
│ Settings  │ + New KB         │                     │                │
└───────────┴──────────────────┴─────────────────────┴────────────────┘
```

The key difference: in the industry model, **Sources and Chat are visible
simultaneously**, not behind tabs. This enables:
- Add a source → immediately test with a query
- See a bad answer → check which sources are missing
- Continuous feedback loop without tab switching

---

## 4. Best Practice ASCII Layouts

### 4.1 Option A: NotebookLM-Inspired (Sources + Chat Side-by-Side)

This is the most industry-aligned approach — a significant redesign.

```
┌───────────┬──────────────────┬─────────────────────┬──────────────────────────┐
│ Main Nav  │ KB Sidebar       │ Sources             │ Chat                     │
│ Sidebar   │                  │                     │                          │
│           │ Knowledge Bases  │ 📚 Product docs ⚙️ │                          │
│ Dashboard │  🔍 Search...   │                     │ You: "What is Doctify?"  │
│ Documents │                  │ [+ Add Source]  🔍  │                          │
│ KB     ◀ │ Overall View     │                     │ AI: "Based on your       │
│ Chat      │  5 embeddings   │ 📄 Pipeline Test    │ documents, Doctify is    │
│ AI Assist │                  │   ✅ 1 doc · 3 chk │ an AI-powered document   │
│ Templates │ Product docs  ◀ │                     │ intelligence platform    │
│ Settings  │  8 src · 5 emb  │ 📄 Auto-Embed V3   │ that provides..." [1][2] │
│           │                  │   ✅ 1 doc · 1 chk │                          │
│           │ + New KB         │                     │ [1] Pipeline Test, #1    │
│           │                  │ 💬 Product FAQ      │ [2] Auto-Embed V3, #1   │
│    «      │                  │   ✅ 15 pairs       │                          │
│           │                  │                     │ ──────────────────────── │
│           │                  │ 📝 Company Bio      │                          │
│           │                  │   ⚠️ not embedded   │ You: "Show sales data"   │
│           │                  │                     │                          │
│           │                  │ 🌐 Docs Site        │ AI: [📊 Monthly Sales]  │
│           │                  │   🔄 crawling...    │ "Based on your data..."  │
│           │                  │                     │                          │
│           │                  │ ──────────────────  │ ──────────────────────── │
│           │                  │ 📊 5 embedded / 8   │ Ask about your docs...📤│
└───────────┴──────────────────┴─────────────────────┴──────────────────────────┘
```

**Key design decisions:**
- **4-column layout**: Main Nav | KB Sidebar | Sources | Chat
- **No Overview tab** — Sources panel IS the overview (shows all sources with status)
- **No tabs** — Sources and Chat are always visible side-by-side
- **Main Nav sidebar** — collapsible (« button), app-level navigation
- **KB sidebar preserved** — switch between KBs, see counts, create new
- **Source status inline** — ✅ embedded, ⚠️ not embedded, 🔄 processing
- **Type-specific icons** — 📄 upload, 💬 Q&A, 📝 text, 🌐 website, 📊 structured
- **Summary stats at bottom of source list** — "5 embedded / 8 total"
- **Chat with citations** — [1][2] reference markers linking to source chunks
- **Settings via gear icon** — opens a sheet/panel, not a tab
- **Clicking a source** → expands inline to show detail + chunks (see 4.2)

> **Implementation note (2026-02-12):** The original spec called for `react-resizable-panels`
> for the Sources/Chat split. During implementation, the library had pixel/percentage sizing
> bugs (v4.4.1), so the final implementation uses a simple CSS flex layout
> (`w-[45%]` + `flex-1`) instead. Functionally equivalent, more reliable.

### 4.2 Option A — Source Expanded Views (Per Type)

When user clicks a source in the Sources panel, it expands to show detail.
**Chat stays open** — user can inspect content then immediately ask about it.
This is the NotebookLM pattern: source viewer and chat coexist.

Every source type follows a **universal 3-section structure**:

```
┌─────────────────────────┐
│ ◀ Back to Sources       │
│                         │
│ [Icon] Source Name      │
│ Type · Status · Count   │
│                         │
│ ┌─────────────────────┐ │
│ │ SECTION 1:          │ │  ← Varies by type (what user put in)
│ │ Source-Specific View │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ SECTION 2:          │ │  ← Universal (what AI actually sees)
│ │ Chunks              │ │
│ └─────────────────────┘ │
│                         │
│ [Actions]               │  ← Type-aware
└─────────────────────────┘
```

| Type | Section 1 (Source-Specific) | Section 2 (Chunks) | Actions |
|------|---|---|---|
| **Text** | Full text (editable) | Chunks | Edit, Re-embed, Delete |
| **Q&A** | Pairs list (editable) | Chunks | Edit, Re-embed, Delete |
| **Upload** | File list + extracted text | Chunks | View Raw, Re-embed, Delete |
| **Website** | Crawled page list (drill-down) | Chunks per page | Re-crawl, Re-embed, Delete |
| **Structured** | Schema + sample table | Chunks | View Full Data, Re-embed, Delete |

---

#### 4.2.1 Text Input — Expanded

```
┌───────────┬──────────────────┬──────────────────────────┬────────────────────────┐
│ Main Nav  │ KB Sidebar       │ ◀ Sources                │ 💬 Chat                │
│           │                  │                          │                        │
│           │                  │ 📝 Company Bio           │ (conversation          │
│           │                  │ Text · ✅ 2 chunks        │  continues here,       │
│           │                  │                          │  unaffected by         │
│           │                  │ Content:                 │  source browsing)      │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ "Doctify Corporation │ │                        │
│           │                  │ │ is a comprehensive   │ │                        │
│           │                  │ │ AI-powered document  │ │                        │
│           │                  │ │ intelligence..."     │ │                        │
│           │                  │ │          [Expand ▼]  │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │                        │
│           │                  │ Chunks (2):              │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ #1 "Doctify Corp..." │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ #2 "The platform..." │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │ ────────────────────── │
│           │                  │ [Edit] [Re-embed] [Del]  │ Ask about your docs 📤│
└───────────┴──────────────────┴──────────────────────────┴────────────────────────┘
```

**Section 1**: Full text content with expand/collapse. Directly editable.
**Section 2**: Chunks generated from the text.

---

#### 4.2.2 Q&A Pairs — Expanded

```
┌───────────┬──────────────────┬──────────────────────────┬────────────────────────┐
│ Main Nav  │ KB Sidebar       │ ◀ Sources                │ 💬 Chat                │
│           │                  │                          │                        │
│           │                  │ 💬 Product FAQ           │                        │
│           │                  │ Q&A · ✅ 15 pairs         │                        │
│           │                  │                          │                        │
│           │                  │ Q&A Pairs:               │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ Q: What is Doctify?  │ │                        │
│           │                  │ │ A: Doctify is an AI  │ │                        │
│           │                  │ │    powered platform. │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ Q: How to upload?    │ │                        │
│           │                  │ │ A: Go to Documents   │ │                        │
│           │                  │ │    and click +Add.   │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ ... +13 more pairs   │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │                        │
│           │                  │ Chunks (15):             │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ #1 "Q: What is..."   │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ #2 "Q: How to..."    │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │ ────────────────────── │
│           │                  │ [Edit] [Re-embed] [Del]  │ Ask about your docs 📤│
└───────────┴──────────────────┴──────────────────────────┴────────────────────────┘
```

**Section 1**: Q&A pairs list, scrollable. Each pair is editable.
**Section 2**: Chunks — each Q&A pair typically becomes one chunk.

---

#### 4.2.3 Uploaded Documents (PDF, .txt) — Expanded

```
┌───────────┬──────────────────┬──────────────────────────┬────────────────────────┐
│ Main Nav  │ KB Sidebar       │ ◀ Sources                │ 💬 Chat                │
│           │                  │                          │                        │
│           │                  │ 📄 Pipeline Test         │                        │
│           │                  │ Uploaded · ✅ 3 chunks    │                        │
│           │                  │                          │                        │
│           │                  │ Files (1):               │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ 📄 test-upload.txt   │ │                        │
│           │                  │ │ 2.4 KB · text/plain  │ │                        │
│           │                  │ │ Uploaded 2h ago       │ │                        │
│           │                  │ │          [View Raw ↗] │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │                        │
│           │                  │ Extracted Text:          │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ "Doctify is an AI-   │ │                        │
│           │                  │ │ powered document     │ │                        │
│           │                  │ │ intelligence plat.." │ │                        │
│           │                  │ │          [Expand ▼]  │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │                        │
│           │                  │ Chunks (3):              │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ #1 "Doctify is..."   │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ #2 "It supports..."  │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ #3 "The system..."   │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │ ────────────────────── │
│           │                  │ [View Raw] [Re-embed]    │ Ask about your docs 📤│
│           │                  │ [Delete]                 │                        │
└───────────┴──────────────────┴──────────────────────────┴────────────────────────┘
```

**Section 1**: File metadata (name, size, type, date) + extracted text preview.
"View Raw" opens the original file (PDF in browser viewer, .txt in new tab).
"Extracted Text" shows what the system actually extracted — builds user trust
by letting them verify extraction quality.
**Section 2**: Chunks generated from the extracted text.

---

#### 4.2.4 Website — Expanded (Two-Level Drill-Down)

**Level 1: Page list**

```
┌───────────┬──────────────────┬──────────────────────────┬────────────────────────┐
│ Main Nav  │ KB Sidebar       │ ◀ Sources                │ 💬 Chat                │
│           │                  │                          │                        │
│           │                  │ 🌐 Docs Site             │                        │
│           │                  │ Website · ✅ 12 pages     │                        │
│           │                  │                          │                        │
│           │                  │ Root: docs.doctify.com   │                        │
│           │                  │ Depth: 3 · Crawled 30m   │                        │
│           │                  │                          │                        │
│           │                  │ Crawled Pages:           │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ /getting-started     │ │                        │
│           │                  │ │ ✅ 4 chunks           │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ /api-reference       │ │                        │
│           │                  │ │ ✅ 8 chunks           │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ /tutorials           │ │                        │
│           │                  │ │ ✅ 3 chunks           │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ ... +9 more pages    │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │                        │
│           │                  │ Click page to see its    │ ────────────────────── │
│           │                  │ content and chunks.      │ Ask about your docs 📤│
│           │                  │                          │                        │
│           │                  │ [Re-crawl] [Re-embed]    │                        │
│           │                  │ [Delete]                 │                        │
└───────────┴──────────────────┴──────────────────────────┴────────────────────────┘
```

**Level 2: Page detail** (click a page)

```
┌───────────┬──────────────────┬──────────────────────────┬────────────────────────┐
│ Main Nav  │ KB Sidebar       │ ◀ Docs Site              │ 💬 Chat                │
│           │                  │                          │                        │
│           │                  │ /getting-started         │                        │
│           │                  │ ✅ 4 chunks · 2.1 KB      │                        │
│           │                  │                          │                        │
│           │                  │ Extracted Content:       │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ "Getting Started     │ │                        │
│           │                  │ │ with Doctify —       │ │                        │
│           │                  │ │ Upload your first    │ │                        │
│           │                  │ │ document to begin.." │ │                        │
│           │                  │ │          [Expand ▼]  │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │                        │
│           │                  │ Chunks (4):              │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ #1 "Getting start.." │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ #2 "First, upload.." │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ #3 "Then configure.."│ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ #4 "Finally, test.." │ │                        │
│           │                  │ └──────────────────────┘ │ ────────────────────── │
│           │                  │                          │ Ask about your docs 📤│
└───────────┴──────────────────┴──────────────────────────┴────────────────────────┘
```

**Section 1 (Level 1)**: Crawl metadata + paginated page list with per-page chunk counts.
**Section 1 (Level 2)**: Drill into a specific page's extracted content.
**Section 2**: Chunks for the selected page.

Website is the only type with **two-level navigation** (source → page → chunks)
because a single website source can contain many pages.

---

#### 4.2.5 Structured Data (Excel, CSV) — Expanded

```
┌───────────┬──────────────────┬──────────────────────────┬────────────────────────┐
│ Main Nav  │ KB Sidebar       │ ◀ Sources                │ 💬 Chat                │
│           │                  │                          │                        │
│           │                  │ 📊 Sales Data 2024       │                        │
│           │                  │ Structured · ✅ 500 rows  │                        │
│           │                  │                          │                        │
│           │                  │ Schema (8 columns):      │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ date     │ DATE      │ │                        │
│           │                  │ │ revenue  │ FLOAT     │ │                        │
│           │                  │ │ region   │ STRING    │ │                        │
│           │                  │ │ product  │ STRING    │ │                        │
│           │                  │ │ quantity │ INT       │ │                        │
│           │                  │ │ ... +3 more          │ │                        │
│           │                  │ └──────────────────────┘ │                        │
│           │                  │                          │                        │
│           │                  │ Sample (5 rows):         │                        │
│           │                  │ ┌──────┬────────┬──────┐ │                        │
│           │                  │ │ date │revenue │region│ │                        │
│           │                  │ ├──────┼────────┼──────┤ │                        │
│           │                  │ │01/01 │ 12,500 │ US   │ │                        │
│           │                  │ │01/02 │  8,300 │ EU   │ │                        │
│           │                  │ │01/03 │ 15,200 │ US   │ │                        │
│           │                  │ └──────┴────────┴──────┘ │                        │
│           │                  │        [View Full Data ↗]│                        │
│           │                  │                          │                        │
│           │                  │ Chunks (50):             │                        │
│           │                  │ ┌──────────────────────┐ │                        │
│           │                  │ │ #1 "Row 1-10: date,  │ │                        │
│           │                  │ │ revenue, region..."   │ │                        │
│           │                  │ ├──────────────────────┤ │                        │
│           │                  │ │ #2 "Row 11-20: ..."  │ │                        │
│           │                  │ └──────────────────────┘ │ ────────────────────── │
│           │                  │                          │ Ask about your docs 📤│
│           │                  │ [View Full] [Re-embed]   │                        │
│           │                  │ [Delete]                 │                        │
└───────────┴──────────────────┴──────────────────────────┴────────────────────────┘
```

**Section 1**: Schema table (column names + types) + sample data preview (5 rows).
"View Full Data" opens a full-width modal/sheet with the complete scrollable table.
**Section 2**: Chunks — typically row-batched text representations of the data.

---

#### 4.2.6 Design Rationale

**Why two sections?** Section 1 shows "what the user put in" (human-readable
representation), Section 2 shows "what the AI actually sees" (text chunks).
This builds trust — users can verify the system understood their content correctly.

**Why is this important for non-text types?**
- **PDF**: User needs to verify text extraction quality (OCR errors, formatting loss)
- **Website**: User needs to see which pages were crawled and what was extracted
- **Structured data**: User needs to confirm schema was interpreted correctly
- **All types**: Chunk viewer lets user understand why the AI answers the way it does

### 4.3 Option B: Evolutionary Approach (Keep Tabs, Drop Overview)

If the side-by-side redesign is too large, a smaller step that still aligns
with industry: drop Overview tab, keep Sources + Chat as tabs.

```
┌───────────┬──────────────────┬──────────────────────────────────────────────────┐
│ Main Nav  │ KB Sidebar       │ Content Area                                     │
│ Sidebar   │                  │                                                  │
│           │ Knowledge Bases  │ 📚 Product documentation                    ⚙️  │
│ Dashboard │  🔍 Search...   ├──────────────────────────────────────────────────┤
│ Documents │                  │ ┌──────────────┐  ┌──────────────┐              │
│ KB     ◀ │ Overall View     │ │  📄 Sources◀ │  │  💬 Chat     │              │
│ Chat      │  5 embeddings   │ └──────────────┘  └──────────────┘              │
│ AI Assist │                  │                                                  │
│ Templates │ Product docs  ◀ │ [+ Add Source]  🔍 Filter...  Type ▼            │
│ Settings  │  8 src · 5 emb  │                                                  │
│           │                  │ 📄 Uploaded Documents (3)                        │
│           │ + New KB         │ ┌──────────────────────┐  ┌────────────────────┐│
│           │                  │ │ 📄 Pipeline Test     │  │ 📄 Auto-Embed V3  ││
│    «      │                  │ │ ✅ 1 doc · 3 chunks  │  │ ✅ 1 doc · 1 chunk ││
│           │                  │ │ "Doctify is an AI.." │  │ "Doctify is a..."  ││
│           │                  │ │ 2h ago         [•••] │  │ 5h ago       [•••] ││
│           │                  │ └──────────────────────┘  └────────────────────┘│
│           │                  │                                                  │
│           │                  │ 💬 Q&A Pairs (2)                                 │
│           │                  │ ┌──────────────────────┐  ┌────────────────────┐│
│           │                  │ │ 💬 Product FAQ       │  │ 💬 Onboarding Q&A  ││
│           │                  │ │ ✅ 15 pairs          │  │ ✅ 8 pairs         ││
│           │                  │ │ "Q: What is Doc..."  │  │ "Q: How to start.."││
│           │                  │ │ 1d ago         [•••] │  │ 3d ago       [•••] ││
│           │                  │ └──────────────────────┘  └────────────────────┘│
│           │                  │                                                  │
│           │                  │ 📝 Text (1)   🌐 Website (1)   📊 Structured (1)│
│           │                  │ ...            ...              ...               │
└───────────┴──────────────────┴──────────────────────────────────────────────────┘
```

**Changes from current:**
- **Overview tab removed** — Sources tab becomes the landing view
- **2 tabs only**: Sources | Chat (renamed from "Query & Test")
- **Sources grouped by type** with section headers
- **Type-specific icons and inline status** (✅/⚠️/🔄)
- **Content preview on cards**
- **Relative timestamps**
- **Filter/search bar** at top of sources
- **Dual sidebar preserved** exactly as current (Main Nav + KB Sidebar)

### 4.4 Source Card Design System

```
  Type: Uploaded Document          Type: Q&A Pairs
  ┌─┬─────────────────────────┐   ┌─┬─────────────────────────┐
  │B│ 📄 Pipeline Test        │   │P│ 💬 Product FAQ          │
  │L│ ✅ 1 doc · 3 chunks     │   │U│ ✅ 15 pairs             │
  │U│                         │   │R│                         │
  │E│ "Doctify is an AI-      │   │P│ "Q: What is Doctify?    │
  │ │ powered document..."    │   │L│ A: Doctify is..."       │
  │ │                         │   │ │                         │
  │ │ 2h ago    [•••]        │   │ │ 1d ago    [•••]        │
  └─┴─────────────────────────┘   └─┴─────────────────────────┘

  Type: Text Input                 Type: Website Crawler
  ┌─┬─────────────────────────┐   ┌─┬─────────────────────────┐
  │G│ 📝 Company Bio          │   │O│ 🌐 docs.doctify.com     │
  │R│ ⚠️ not embedded         │   │R│ 🔄 crawling... 12 pages │
  │N│                         │   │A│                         │
  │ │ "Doctify Corporation    │   │N│ "https://docs.doctify   │
  │ │ is a comprehensive..."  │   │G│ .com/getting-started"   │
  │ │                         │   │E│                         │
  │ │ 3d ago    [•••]        │   │ │ 30m ago   [•••]        │
  └─┴─────────────────────────┘   └─┴─────────────────────────┘

  Type: Structured Data
  ┌─┬─────────────────────────┐
  │R│ 📊 Sales Data 2024      │
  │E│ ✅ 500 rows · 8 columns │
  │D│                         │
  │ │ "Revenue, Date, Region, │
  │ │ Product, Quantity..."   │
  │ │                         │
  │ │ 5h ago    [•••]        │
  └─┴─────────────────────────┘

  Color key (left border):
  BLUE = Uploaded   PURPLE = Q&A   GREEN = Text
  ORANGE = Website  RED = Structured
```

**Per-type metadata** — not generic "1 Entry, 1 Vectors":
- Uploaded: `{n} doc · {n} chunks`
- Q&A Pairs: `{n} pairs`
- Text Input: (no count needed, it's a single text)
- Website: `{n} pages` + crawl status
- Structured: `{n} rows · {n} columns`

### 4.5 KB List Page (Overall View — When No KB Selected)

```
┌───────────┬──────────────────┬──────────────────────────────────────────────────┐
│ Main Nav  │ KB Sidebar       │ Content Area                                     │
│ Sidebar   │                  │                                                  │
│           │ Knowledge Bases  │ Knowledge Bases                                  │
│ Dashboard │  🔍 Search...   │ Your AI-powered document repositories            │
│ Documents │                  │                        [+ New Knowledge Base]    │
│ KB     ◀ │ Overall View  ◀ │                                                  │
│ Chat      │  5 embeddings   │ ┌──────────────────────────────────────────────┐ │
│ AI Assist │                  │ │  📚 Product documentation                    │ │
│ Templates │ Product docs     │ │                                              │ │
│ Settings  │  8 src · 5 emb  │ │  8 sources · 5 embedded · Updated 2h ago     │ │
│           │                  │ │                                              │ │
│           │ + New KB         │ │  📄×3  💬×2  📝×1  🌐×1  📊×1              │ │
│    «      │                  │ │                                              │ │
│           │                  │ │  [Open]                    [Query] [Sources] │ │
│           │                  │ └──────────────────────────────────────────────┘ │
│           │                  │                                                  │
│           │                  │ ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐ │
│           │                  │   ➕ Create a new Knowledge Base                 │
│           │                  │ │ Upload documents, add Q&A, or connect URLs  │ │
│           │                  │ └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘ │
└───────────┴──────────────────┴──────────────────────────────────────────────────┘
```

**Changes from current:**
- No global stats bar (4 stat cards removed — low value)
- KB cards show: source count + embedded count + recency + type breakdown icons
- Quick action buttons on card: Open, Query, Sources
- Dashed-border CTA card for creating new KB
- Dual sidebar properly shown (Main Nav + KB Sidebar)

---

## 5. Answer Library & Q&A History

### 5.1 What These Features Are

**Answer Library** (Intercom calls "Saved Replies", Zendesk calls "Macros"):
- Curated, pre-approved answers for common questions
- Typically used in **customer-facing** chatbot scenarios
- AI gives priority to these "golden answers" over RAG-generated responses
- **In Doctify**: This is already covered by the **Q&A Pairs** data source type.
  Q&A Pairs are essentially an Answer Library — curated question-answer pairs
  that get embedded and retrieved with high priority.

**Q&A History / Conversation Analytics** (Voiceflow "Transcripts", Intercom
"Unanswered Questions", Dify "Run History"):
- Log of all queries asked and answers generated
- Tracks: successful answers, failed/low-confidence answers, unanswered queries
- User feedback (thumbs up/down, "Was this helpful?")
- Used to identify KB gaps and improve content

### 5.2 Who Offers What

| Platform | Answer Library | Q&A History | Unanswered Tracking | Feedback |
|----------|:-:|:-:|:-:|:-:|
| Intercom Fin | ✅ Saved Replies | ✅ | ✅ | ✅ |
| Botpress | ✅ via KB entries | ✅ Transcripts | ❌ | ✅ |
| Voiceflow | ✅ via KB entries | ✅ Transcripts + Evaluations | ✅ | ✅ |
| Dify | ❌ | ✅ Run History + Logs | ❌ | ✅ |
| NotebookLM | ❌ | ❌ (session only) | ❌ | ❌ |
| Claude Projects | ❌ | ❌ (session only) | ❌ | ❌ |
| Perplexity Spaces | ❌ | ✅ Threads persist | ❌ | ❌ |

### 5.3 Do We Need Them?

**Answer Library**: **No — we already have it.** Doctify's Q&A Pairs data
source type IS the answer library. Users create curated question-answer pairs
that get embedded and retrieved. No new feature needed.

**Q&A History**: **Depends on the product direction.**

| If Doctify KB is... | Q&A History value | Recommendation |
|---------------------|-------------------|----------------|
| **Internal/personal** (like NotebookLM) | Low — user remembers their own queries | Skip for now |
| **Team knowledge tool** (like Perplexity Spaces) | Medium — threads persist for collaboration | Nice to have |
| **Customer-facing chatbot** (like Intercom Fin) | **Critical** — must track quality & gaps | Must build |

For Doctify's current stage, Q&A History is a **P2/P3 feature** — useful but
not blocking. The priority should be:
1. First: Get Sources + Chat experience right (core product)
2. Then: Add persistent conversation threads (collaboration value)
3. Later: Add analytics/unanswered tracking (production chatbot value)

**Unanswered Questions Tracking**: This is the most valuable analytics feature
for KB improvement. It creates a **feedback loop**:

```
  User asks question
       ↓
  AI answers (or fails)
       ↓
  Track: was it answered? was it helpful?
       ↓
  Show KB owner: "These 5 questions couldn't be answered"
       ↓
  KB owner adds missing content
       ↓
  KB quality improves over time
```

This is valuable but only when the KB is serving real users at scale. For
a portfolio project or early-stage product, it's premature optimization.

---

## 6. Recommendations & Priority

### 6.1 Strategic Direction

**Option A (Recommended): NotebookLM-inspired side-by-side**
- Drop Overview tab entirely
- Sources + Chat visible simultaneously
- Chunk viewer on source click
- Most industry-aligned, but biggest redesign effort

**Option B (Pragmatic): Drop Overview, keep tabs**
- Remove Overview tab → 2 tabs: Sources | Chat
- Improve source cards (type grouping, icons, inline status)
- Smaller effort, still a major improvement

### 6.2 Implementation Priority

**Phase 1 — Remove Overhead (Quick, high impact)**
- [ ] Remove Overview tab — make Sources the default/landing tab
- [ ] Rename "Query & Test" → "Chat" (simpler, more honest)
- [ ] Remove "How It Works" permanent tutorial
- [ ] Remove bottom action buttons (Add Source / View Sources / Test Query)

**Phase 2 — Improve Sources (Medium effort, high impact)**
- [ ] Group sources by type with section headers
- [ ] Color-coded left borders per source type
- [ ] Type-specific metrics (chunks, pairs, pages, rows — not "Entries/Vectors")
- [ ] Inline status indicators (✅/⚠️/🔄 instead of badge)
- [ ] Add relative timestamps ("2h ago")
- [ ] Source filter/search bar

**Phase 3 — Content Depth (Medium effort, high impact)**
- [ ] Click source → expand to show chunks (Dify pattern)
- [ ] Or: full-page source detail view with chunk viewer
- [ ] Clickable example queries in Chat empty state

**Phase 4 — Side-by-Side Layout (Large effort, transformative)**
- [ ] Sources + Chat visible simultaneously (NotebookLM pattern)
- [ ] Chat citations link back to source chunks
- [ ] Responsive panels that resize/collapse

**Phase 5 — Analytics (Future, when serving real users)**
- [ ] Persistent conversation threads
- [ ] Q&A history with search
- [ ] Unanswered questions tracking
- [ ] User feedback (thumbs up/down)

---

## 7. Sources

### Product Design References
- [NotebookLM Redesign — Google Blog](https://blog.google/technology/google-labs/notebooklm-new-features-december-2024/)
- [Designing NotebookLM — Jason Spielman](https://jasonspielman.com/notebooklm)
- [NotebookLM UX Improvements — nembal](https://www.nembal.com/blog/notebooklm_fixes)
- [NotebookLM Chat — Google Support](https://support.google.com/notebooklm/answer/16179559)
- [NotebookLM Evolution 2023-2026 — Medium](https://medium.com/@jimmisound/the-cognitive-engine-a-comprehensive-analysis-of-notebooklms-evolution-2023-2026-90b7a7c2df36)
- [Perplexity Spaces — Help Center](https://www.perplexity.ai/help-center/en/articles/10352961-what-are-spaces)
- [NotebookLM vs Claude Projects vs Perplexity — Medium](https://medium.com/@haberlah/a-deep-dive-into-notebooklm-claude-projects-and-perplexity-spaces-8ca877d78c74)

### RAG Platform References
- [Dify Knowledge Base Docs](https://docs.dify.ai/en/guides/knowledge-base/readme)
- [Dify Knowledge Pipeline Blog](https://dify.ai/blog/introducing-knowledge-pipeline)
- [Dify v1.11.0 Release — Multimodal KB](https://github.com/langgenius/dify/releases/tag/1.11.0)
- [Intercom Knowledge Sources](https://www.intercom.com/help/en/articles/9440354-knowledge-sources-to-power-ai-agents-and-self-serve-support)
- [Intercom KB Best Practices](https://www.intercom.com/blog/knowledge-base-best-practices/)
- [Botpress Knowledge Base UI Guide](https://botpress.com/academy-lesson/studio-ui-knowledge-base)
- [Voiceflow Knowledge Base](https://www.voiceflow.com/features/knowledge-base-generative-ai)
- [Voiceflow Transcripts & Evaluations](https://docs.voiceflow.com/docs/transcripts)
- [Flowise Document Stores](https://docs.flowiseai.com/using-flowise/document-stores)

### UX & Analytics References
- [Chatbot KB Guide — Quickchat AI](https://quickchat.ai/post/chatbot-knowledge-base-guide)
- [KB Chatbot Best Practices — Tidio](https://www.tidio.com/blog/knowledge-base-chatbots/)
- [FAQ Chatbot Guide 2026 — Botpress](https://botpress.com/blog/faq-chatbot)
- [SaaS Knowledge Base Best Practices — Paddle](https://www.paddle.com/resources/saas-knowledge-base)
- [KB Structure Best Practices — Userpilot](https://userpilot.medium.com/12-knowledge-base-structure-best-practices-for-saas-companies-aef7ac7c34b9)
- [10 Best RAG Tools 2026 — Meilisearch](https://www.meilisearch.com/blog/rag-tools)
- [RAG Best Practices — kapa.ai](https://www.kapa.ai/blog/rag-best-practices)

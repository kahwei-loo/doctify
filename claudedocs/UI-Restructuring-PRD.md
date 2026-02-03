# Doctify UI Restructuring - Product Requirements Document

**Version**: 1.0
**Date**: January 25, 2025
**Status**: Draft for Implementation

---

## 1. Executive Summary

### 1.1 Background
Current Doctify implementation has 8 functional pages with overlapping functionality, causing user confusion:
- Separate RAG, Chat, and Insights pages serve similar AI purposes
- Projects vs Documents distinction unclear
- No centralized knowledge management

### 1.2 Goals
- **Consolidate**: Merge RAG + Chat + Insights into unified AI Assistant interface
- **Clarify**: Distinguish Documents (OCR processing) from Knowledge Base (structured data)
- **Simplify**: Reorganize frontend presentation without backend API changes
- **Enable**: Support chatbot platform capabilities (integrations, sharing, embedding)

### 1.3 Key Principles
- **Pragmatic**: Frontend reorganization only, reuse existing backend APIs
- **User-Centric**: Design around actual use cases (ABC Company invoices, customer service bots)
- **Minimal Changes**: Keep backend stable, focus on presentation layer

---

## 2. New Page Structure

### 2.1 Menu Sidebar

```
┌─────────────────────┐
│ 🏠 Home             │
│ 📄 Documents        │
│ 🧠 Knowledge Base   │  ← NEW
│ 🤖 AI Assistants    │  ← RENAMED (was: RAG/Chat/Insights)
│ ⚙️  Settings        │
└─────────────────────┘
```

### 2.2 Page Mapping

| Old Pages | New Pages | Purpose |
|-----------|-----------|---------|
| Dashboard | Home | Quick actions + overview |
| Documents + Projects | Documents | OCR processing (images/PDFs) |
| (none) | **Knowledge Base** | Structured data management |
| RAG + Chat + Insights | **AI Assistants** | Unified AI interface |
| Settings | Settings | User preferences |

**Removed Pages**:
- ProjectsPage (merged into Documents as folder view)
- ProjectDetailPage (merged into Documents folder view)
- RAGPage (merged into AI Assistants)
- ChatPage → Renamed to AI Assistants
- InsightsPage (merged into AI Assistants)

---

## 3. Documents Page Redesign

### 3.1 Conceptual Change

**Backend**: Continue using Projects API (`/api/v1/projects`)
**Frontend**: Display as "Folders" for better user understanding

**Example**:
- Backend: `project_id: "abc-123"`, `name: "ABC Company"`
- Frontend: Shows as "📁 ABC Company Invoices" folder

### 3.2 Two Upload Workflows

#### Workflow 1: Drag to "All Projects"

```
User Action: Drags files to "All Projects" view
  ↓
System: Detects file drop, shows preview (NO OCR yet)
  ↓
UI Dialog:
┌────────────────────────────┐
│ Uploading 3 files:         │
│ • invoice_001.pdf (2.1 MB) │
│ • receipt_002.jpg (1.5 MB) │
│ • contract_003.pdf (3.2 MB)│
│                             │
│ Save to which folder?       │
│ ○ ABC Company Invoices      │
│ ○ XYZ Company Invoices      │
│ ○ + Create New Folder       │
│                             │
│ [Cancel]  [Save & Process] │
└────────────────────────────┘
  ↓
User: Selects folder → Clicks "Save & Process"
  ↓
System: Stages files → Executes OCR (Celery parallel workers)
  ↓
UI: Shows progress "Processing 3 files... (2/3 completed)"
```

**Key Points**:
- Files staged temporarily, NOT processed immediately
- OCR only runs after folder selection
- Supports multi-file upload
- Progress tracking for parallel processing

#### Workflow 2: Upload to Specific Folder

```
User Action: Opens "XYZ Company Invoices" folder
  ↓
User: Drags files OR clicks Upload button
  ↓
UI Dialog:
┌────────────────────────────┐
│ Upload to "XYZ Company     │
│ Invoices"?                 │
│                             │
│ 3 files selected:          │
│ • invoice_004.pdf          │
│ • invoice_005.pdf          │
│ • invoice_006.jpg          │
│                             │
│ These files will be        │
│ processed with OCR.        │
│                             │
│ [Cancel]  [Confirm Upload] │
└────────────────────────────┘
  ↓
User: Confirms → System executes OCR
```

**Key Points**:
- Pre-selected target folder
- Confirmation required before OCR
- Immediate processing after confirmation

### 3.3 Technical Implementation

```typescript
interface PendingUpload {
  id: string;
  files: File[];
  status: 'pending' | 'confirmed' | 'processing';
  target_folder_id?: string;
  created_at: string;
}

async function handleFileDrop(files: File[], targetFolder?: string) {
  // Create pending upload record
  const pending = await createPendingUpload(files);

  if (!targetFolder) {
    // Workflow 1: Ask for folder
    showFolderSelectionDialog(pending.id);
  } else {
    // Workflow 2: Confirm directly
    showConfirmationDialog(pending.id, targetFolder);
  }
}

async function confirmUpload(pendingId: string, folderId: string) {
  // Upload files to temporary storage
  await uploadFilesToStaging(pendingId);

  // Trigger parallel Celery OCR tasks
  const tasks = files.map(file =>
    ocrQueue.enqueue({
      file_id: file.id,
      folder_id: folderId,
      pending_upload_id: pendingId
    })
  );

  // Track progress
  trackOCRProgress(tasks);
}
```

---

## 4. Knowledge Base Page (NEW)

### 4.1 Purpose

Distinguish between:
- **Documents**: Raw materials (images, scans, PDFs) requiring OCR
- **Knowledge Base**: Structured/processed knowledge sources ready for AI consumption

### 4.2 Supported Source Types

| Source Type | Examples | Purpose |
|-------------|----------|---------|
| 📁 Uploaded Files | PDF, DOCX, TXT, MD, CSV, XLSX, JSON | Direct upload |
| 📊 Google Sheets | Spreadsheet URLs | Live data sync |
| 🌐 Website | Any URL | Auto-scraping |
| 💾 Database | PostgreSQL, MySQL, MongoDB | Direct query |
| 🔗 REST API | Custom APIs | External data |
| 📝 Notion | Workspace pages | Documentation |
| 🗂️ Confluence | Wiki pages | Team knowledge |
| 💻 GitHub | Repository | Code documentation |

### 4.3 UI Layout

```
┌──────────────────────────────────────────────────────────┐
│ Knowledge Base                                + Add Source│
├──────────────────────────────────────────────────────────┤
│                                                           │
│ 📁 ABC Company Knowledge                      [Edit] [Del]│
│ ├─ 📄 Product Manual (Uploaded PDF)           Updated 2d │
│ ├─ 🌐 Documentation Site (https://docs.abc.com)  Live    │
│ ├─ 📊 Sales Data (Google Sheets)              Synced 1h  │
│ └─ 💾 Customer DB (PostgreSQL)                Connected  │
│    Status: ● 4/4 sources active                          │
│    Used by: Customer Service Bot, Invoice Bot            │
│                                                           │
│ 📁 XYZ Company Knowledge                      [Edit] [Del]│
│ ├─ 📄 Training Materials (Dataset)            Updated 5d │
│ ├─ 🔗 API Reference (Website)                 Cached 12h │
│ └─ 📊 Inventory Data (MySQL)                  Connected  │
│    Status: ● 3/3 sources active                          │
│    Used by: XYZ Support Bot                              │
│                                                           │
│ 📁 General Knowledge                          [Edit] [Del]│
│ └─ 🌐 Public Documentation (Web Scraping)     Cached 1d  │
│    Status: ● 1/1 source active                           │
│    Used by: General Assistant                            │
└──────────────────────────────────────────────────────────┘
```

### 4.4 Add Source Dialog

```
┌──────────────────────────────────────┐
│ Add Knowledge Source                  │
├──────────────────────────────────────┤
│ Select Source Type:                   │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ 📁 Upload Files                 │  │
│ │ Supported: PDF, DOCX, TXT, MD   │  │
│ │           CSV, XLSX, JSON       │  │
│ └─────────────────────────────────┘  │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ 📊 Google Sheets                │  │
│ │ Enter sheet URL with read access│  │
│ └─────────────────────────────────┘  │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ 🌐 Website                      │  │
│ │ Auto-crawl and extract content  │  │
│ └─────────────────────────────────┘  │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ 💾 Database                     │  │
│ │ PostgreSQL, MySQL, MongoDB      │  │
│ │ REST API                        │  │
│ └─────────────────────────────────┘  │
│                                       │
│ ┌─────────────────────────────────┐  │
│ │ 🔗 Other Integrations           │  │
│ │ Notion, Confluence, GitHub      │  │
│ └─────────────────────────────────┘  │
│                                       │
│ [Cancel]              [Next Step]     │
└──────────────────────────────────────┘
```

### 4.5 Database Connection Example

```
┌──────────────────────────────────────┐
│ Connect Database                      │
├──────────────────────────────────────┤
│ Database Type: [PostgreSQL ▼]        │
│                                       │
│ Connection Details:                   │
│ Host:     [sales-db.example.com]     │
│ Port:     [5432]                     │
│ Database: [sales_production]         │
│ Username: [readonly_user]            │
│ Password: [••••••••••••]             │
│                                       │
│ ☑ Use SSL/TLS                        │
│ ☐ SSH Tunnel                         │
│                                       │
│ [Test Connection]                     │
│                                       │
│ Connection Status: ✅ Connected       │
│                                       │
│ [Cancel]              [Save]          │
└──────────────────────────────────────┘
```

### 4.6 Data Structure

```typescript
interface KnowledgeBaseFolder {
  id: string;
  name: string;
  sources: KnowledgeSource[];
  used_by_assistants: string[];  // AI Assistant IDs
  created_at: string;
  updated_at: string;
}

interface KnowledgeSource {
  id: string;
  type: 'file' | 'google_sheets' | 'website' | 'database' | 'api' | 'notion' | 'confluence' | 'github';
  name: string;

  // Type-specific config
  config: {
    // For uploaded files
    file_path?: string;

    // For Google Sheets
    sheet_url?: string;

    // For websites
    url?: string;
    crawl_depth?: number;

    // For databases
    connection_string?: string;
    db_type?: 'postgresql' | 'mysql' | 'mongodb';

    // For APIs
    api_endpoint?: string;
    auth_type?: 'none' | 'api_key' | 'oauth';

    // For integrations
    integration_config?: Record<string, any>;
  };

  status: 'active' | 'error' | 'syncing' | 'disconnected';
  last_synced_at?: string;
  sync_frequency?: 'realtime' | 'hourly' | 'daily' | 'manual';

  metadata: {
    size?: number;
    record_count?: number;
    error_message?: string;
  };
}
```

---

## 5. AI Assistants Page (Unified Interface)

### 5.1 Overview

Consolidates three AI capabilities into one interface:
- **Knowledge Q&A** (formerly RAG page)
- **Data Analysis** (formerly Insights page)
- **Open Chat** (formerly Chat page)

### 5.2 Page Layout

```
┌────────────────────────────────────────────────────────────┐
│ AI Assistants                                              │
├───────────┬────────────────────────────────────────────────┤
│           │ Customer Service Bot                    [⚙️]   │
│ Sidebar   ├────────────────────────────────────────────────┤
│           │ [Conversations] [Analytics] [Settings]         │
│           ├────────────────────────────────────────────────┤
│ 📱 Customer│                                                │
│   Service  │ 💬 Active Conversation                        │
│   Bot      │ ┌────────────────────────────────────────┐   │
│ ───────────│ │ User: How do I track my order?         │   │
│ 🏢 AAA Co. │ │                                         │   │
│   Invoice  │ │ Bot: To track your order, please...    │   │
│   Bot      │ └────────────────────────────────────────┘   │
│            │                                                │
│ 💼 XYZ Co. │ ┌────────────────────────────────────────┐   │
│   Support  │ │ Type your message...                   │   │
│   Bot      │ └────────────────────────────────────────┘   │
│            │                                                │
│ 🌐 General │ Status: ● Online • WhatsApp Connected         │
│   Knowledge│ Knowledge: 3 sources • 1,245 documents        │
│            │                                                │
│ [+ Create] │                                                │
└────────────┴────────────────────────────────────────────────┘
```

### 5.3 AI Assistant Creation Flow

#### Step 1: Basic Information

```
┌──────────────────────────────────────┐
│ Create New AI Assistant               │
├──────────────────────────────────────┤
│ Name: [________________]              │
│       Customer Service Bot            │
│                                       │
│ Icon: [📱] [🏢] [💼] [🌐] [🤖]       │
│                                       │
│ Assistant Type:                       │
│ ○ Knowledge Q&A                      │
│   Answer questions using knowledge    │
│   base and documents                  │
│                                       │
│ ○ Data Analysis                      │
│   Analyze data and generate insights  │
│                                       │
│ ● Chatbot (External Integration)    │
│   Customer service bot with platform  │
│   integrations                        │
│                                       │
│ [Cancel]              [Next Step]     │
└──────────────────────────────────────┘
```

#### Step 2: Personality Configuration (for Chatbot type)

```
┌──────────────────────────────────────┐
│ Personality Configuration             │
├──────────────────────────────────────┤
│ Personality Style:                    │
│ ┌──────────────────────────────────┐ │
│ │ [Friendly ▼]                     │ │
│ │ • Friendly & Approachable        │ │
│ │ • Professional & Formal          │ │
│ │ • Technical & Precise            │ │
│ │ • Casual & Conversational        │ │
│ └──────────────────────────────────┘ │
│                                       │
│ Response Length:                      │
│ ┌──────────────────────────────────┐ │
│ │ [Moderate ▼]                     │ │
│ │ • Concise (1-2 sentences)        │ │
│ │ • Moderate (2-4 sentences)       │ │
│ │ • Detailed (full paragraphs)     │ │
│ └──────────────────────────────────┘ │
│                                       │
│ Custom System Prompt (Optional):      │
│ ┌──────────────────────────────────┐ │
│ │ You are a helpful customer       │ │
│ │ service assistant for ABC        │ │
│ │ Company. Always be polite and... │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                       │
│ [Back]                    [Next Step] │
└──────────────────────────────────────┘
```

#### Step 3: Knowledge Base Selection

```
┌──────────────────────────────────────┐
│ Select Knowledge Sources              │
├──────────────────────────────────────┤
│ This assistant will use these sources │
│ to answer questions:                  │
│                                       │
│ ☑ ABC Company Knowledge               │
│   ├─ Product Manual                   │
│   ├─ Documentation Site               │
│   └─ Customer Database                │
│                                       │
│ ☑ General Knowledge                   │
│   └─ Public Documentation             │
│                                       │
│ ☐ XYZ Company Knowledge               │
│   └─ Training Materials               │
│                                       │
│ ☐ All Knowledge Bases                 │
│                                       │
│ [Back]                    [Next Step] │
└──────────────────────────────────────┘
```

#### Step 4: Platform Integrations (Optional)

```
┌──────────────────────────────────────┐
│ Platform Integrations                 │
├──────────────────────────────────────┤
│ Connect external platforms:           │
│                                       │
│ ☐ Facebook Messenger                 │
│   ┌────────────────────────────────┐ │
│   │ Page ID: [________________]    │ │
│   │ Access Token: [____________]   │ │
│   │ [How to get credentials?]      │ │
│   └────────────────────────────────┘ │
│                                       │
│ ☐ WhatsApp Business                  │
│   ┌────────────────────────────────┐ │
│   │ Phone Number: [+60_________]   │ │
│   │ API Key: [_________________]   │ │
│   │ [Setup Guide]                  │ │
│   └────────────────────────────────┘ │
│                                       │
│ ☐ Telegram                           │
│   ┌────────────────────────────────┐ │
│   │ Bot Token: [_______________]   │ │
│   │ [Create Telegram Bot]          │ │
│   └────────────────────────────────┘ │
│                                       │
│ ☐ Shopee                             │
│   ┌────────────────────────────────┐ │
│   │ Shop ID: [_________________]   │ │
│   │ API Key: [_________________]   │ │
│   └────────────────────────────────┘ │
│                                       │
│ [Back]                    [Next Step] │
└──────────────────────────────────────┘
```

#### Step 5: Sharing & Embedding

```
┌──────────────────────────────────────┐
│ Sharing & Embedding                   │
├──────────────────────────────────────┤
│ ☑ Enable Public Access               │
│                                       │
│ Public URL:                           │
│ ┌────────────────────────────────┐   │
│ │ https://doctify.ai/chat/       │   │
│ │ customer-service-bot           │   │
│ │                   [Copy Link]  │   │
│ └────────────────────────────────┘   │
│                                       │
│ Embed Code:                           │
│ ┌────────────────────────────────┐   │
│ │ <iframe                        │   │
│ │   src="https://..."            │   │
│ │   width="400"                  │   │
│ │   height="600">                │   │
│ │ </iframe>         [Copy Code]  │   │
│ └────────────────────────────────┘   │
│                                       │
│ Allowed Domains (Whitelist):          │
│ ┌────────────────────────────────┐   │
│ │ example.com              [Add] │   │
│ │ shop.example.com         [×]   │   │
│ │ support.example.com      [×]   │   │
│ └────────────────────────────────┘   │
│                                       │
│ Widget Customization:                 │
│ Theme: [Light ▼]  Position: [BR ▼]   │
│                                       │
│ [Back]                    [Create]    │
└──────────────────────────────────────┘
```

### 5.4 Multi-Platform Conversation Management

**Key Concept**: 1 AI Assistant = Multiple Independent Conversation Instances

```
Customer Service Bot (Configuration)
├─ Knowledge Base: [ABC Products, FAQs]
├─ Personality: Friendly
└─ Conversation Instances (Isolated):
   ├─ Facebook (100+ threads)
   ├─ WhatsApp (50+ threads)
   ├─ Website (200+ threads)
   └─ Telegram (30+ threads)
```

#### Conversations Tab

```
┌──────────────────────────────────────────────────────────┐
│ Customer Service Bot - Conversations                     │
├───────────┬──────────────────────────────────────────────┤
│           │ [All] [Active] [Resolved] [Archived]         │
│ Channels  ├──────────────────────────────────────────────┤
│           │ Filter: [All Channels ▼]  Search: [______]  │
│ 📘 Facebook│ ─────────────────────────────────────────── │
│   (45)     │                                              │
│   23 unread│ 🔵 John Doe - Facebook - 5 min ago          │
│            │    "When will my order arrive?"             │
│ 💬 Website │    Last: Bot responded                      │
│   (120)    │                                              │
│   5 unread │ 🔵 Jane Smith - Website - 20 min ago        │
│            │    "Can I return this product?"             │
│ 💚 WhatsApp│    Last: Waiting for user                   │
│   (23)     │                                              │
│   12 unread│ ⚪ Mike Johnson - WhatsApp - 2h ago         │
│            │    "What are your store hours?"             │
│ 📱 Telegram│    Last: Resolved                           │
│   (8)      │                                              │
│   0 unread │ 🔵 Sarah Lee - Telegram - 30 min ago        │
│            │    "Do you ship internationally?"           │
│            │    Last: Bot responded                      │
│            │                                              │
│            │ [Load More...]                              │
└────────────┴──────────────────────────────────────────────┘
```

**Legend**:
- 🔵 Active conversation (user waiting for response)
- ⚪ Resolved (no pending actions)
- Number badges show unread count per channel

#### Conversation Detail View

```
┌──────────────────────────────────────────────────────────┐
│ ← Back to Conversations                                  │
├──────────────────────────────────────────────────────────┤
│ Conversation with John Doe                               │
│ Platform: Facebook Messenger                             │
│ Started: Jan 23, 2025 10:30 AM                          │
│ Status: ● Active                                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ 👤 John Doe (10:30 AM)                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ When will my order arrive?                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ 🤖 Customer Service Bot (10:30 AM)                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Hi John! Let me check your order status. Could you │ │
│ │ provide your order number?                          │ │
│ └─────────────────────────────────────────────────────┘ │
│ 📚 Knowledge Used: Order Tracking Guide                 │
│                                                           │
│ 👤 John Doe (10:32 AM)                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ It's #12345                                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ 🤖 Customer Service Bot (10:32 AM)                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Order #12345 is currently in transit.               │ │
│ │ Estimated delivery: Jan 25, 2025                    │ │
│ │ Tracking: [Track Order]                             │ │
│ └─────────────────────────────────────────────────────┘ │
│ 📚 Knowledge Used: Order Database (Live Query)          │
│                                                           │
│ ─────────────────────────────────────────────────────── │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Reply to John on Facebook...                        │ │
│ └─────────────────────────────────────────────────────┘ │
│ [Send]                                                   │
└──────────────────────────────────────────────────────────┘
```

**Key Features**:
- Shows platform origin (Facebook, WhatsApp, etc.)
- Displays knowledge sources used for each response
- Option to manually reply or let bot continue
- Conversation isolated per platform

### 5.5 Settings View

```
┌──────────────────────────────────────────────────┐
│ Customer Service Bot - Settings                  │
├──────────────────────────────────────────────────┤
│ [Basic] [Personality] [Knowledge] [Integrations] │
│  [Sharing] [Analytics]                           │
├──────────────────────────────────────────────────┤
│                                                   │
│ Platform Integrations Status:                    │
│                                                   │
│ ● WhatsApp Business                              │
│   Phone: +60123456789                            │
│   Status: Active                                 │
│   Today: 45 messages, 23 conversations           │
│   [Disconnect] [View Logs]                       │
│                                                   │
│ ● Facebook Messenger                             │
│   Page: ABC Company Support                      │
│   Status: Active                                 │
│   Today: 32 messages, 18 conversations           │
│   [Disconnect] [View Logs]                       │
│                                                   │
│ ○ Telegram                                       │
│   Status: Not Connected                          │
│   [Connect to Telegram]                          │
│                                                   │
│ ○ Shopee                                         │
│   Status: Not Connected                          │
│   [Connect to Shopee]                            │
│                                                   │
│ Webhook URLs (for platform configuration):       │
│ ┌──────────────────────────────────────────────┐│
│ │ https://api.doctify.ai/webhook/chatbot/      ││
│ │ customer-service-bot              [Copy]     ││
│ └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

### 5.6 Analytics View

```
┌──────────────────────────────────────────────────┐
│ Customer Service Bot - Analytics                 │
├──────────────────────────────────────────────────┤
│ Time Range: [Last 7 Days ▼]                     │
├──────────────────────────────────────────────────┤
│                                                   │
│ Overview:                                        │
│ ┌──────────┬──────────┬──────────┬──────────┐  │
│ │  Total   │ Resolved │  Active  │ Avg Time │  │
│ │   245    │   198    │    47    │  3.5 min │  │
│ └──────────┴──────────┴──────────┴──────────┘  │
│                                                   │
│ By Platform:                                     │
│ • Facebook:  120 conversations (49%)            │
│ • WhatsApp:   65 conversations (27%)            │
│ • Website:    50 conversations (20%)            │
│ • Telegram:   10 conversations (4%)             │
│                                                   │
│ Top Topics:                                      │
│ 1. Order Tracking (45%)                         │
│ 2. Product Questions (30%)                      │
│ 3. Returns & Refunds (15%)                      │
│ 4. Store Hours (10%)                            │
│                                                   │
│ Knowledge Base Usage:                            │
│ • Product Manual: 89 queries                    │
│ • FAQs: 67 queries                              │
│ • Order Database: 45 queries                    │
│                                                   │
│ User Satisfaction:                               │
│ 😊 Positive: 85%                                │
│ 😐 Neutral: 10%                                 │
│ 😞 Negative: 5%                                 │
└──────────────────────────────────────────────────┘
```

---

## 6. Data Structures

### 6.1 AI Assistant

```typescript
interface AIAssistant {
  id: string;
  name: string;
  icon: string;
  type: 'knowledge_qa' | 'data_analysis' | 'chatbot';

  // Personality configuration
  personality: {
    style: 'friendly' | 'professional' | 'technical' | 'casual';
    response_length: 'concise' | 'moderate' | 'detailed';
    system_prompt?: string;
  };

  // Knowledge sources
  knowledge_base_ids: string[];

  // Platform integrations (for chatbot type)
  integrations?: {
    facebook?: {
      page_id: string;
      access_token: string;
      status: 'active' | 'inactive' | 'error';
    };
    whatsapp?: {
      phone_number: string;
      api_key: string;
      status: 'active' | 'inactive' | 'error';
    };
    telegram?: {
      bot_token: string;
      status: 'active' | 'inactive' | 'error';
    };
    shopee?: {
      shop_id: string;
      api_key: string;
      status: 'active' | 'inactive' | 'error';
    };
  };

  // Sharing settings
  sharing: {
    enabled: boolean;
    public_url?: string;
    embed_code?: string;
    allowed_domains: string[];
    widget_config?: {
      theme: 'light' | 'dark';
      position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
      primary_color?: string;
    };
  };

  // Metadata
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
}
```

### 6.2 Conversation Thread

```typescript
interface ConversationThread {
  id: string;
  assistant_id: string;

  // Platform information
  platform: 'facebook' | 'whatsapp' | 'website' | 'telegram' | 'shopee';
  external_user_id: string;      // Platform's user ID
  external_thread_id?: string;   // Platform's conversation ID

  // Messages
  messages: ConversationMessage[];

  // Status
  status: 'active' | 'resolved' | 'archived';
  last_message_at: string;
  unread_count: number;

  // Metadata
  user_metadata?: {
    name?: string;
    email?: string;
    phone?: string;
  };

  created_at: string;
  updated_at: string;
}

interface ConversationMessage {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;

  // Knowledge sources used
  knowledge_sources?: {
    source_id: string;
    source_name: string;
    relevance_score: number;
  }[];

  // Platform-specific data
  platform_message_id?: string;

  created_at: string;
}
```

### 6.3 Pending Upload

```typescript
interface PendingUpload {
  id: string;
  user_id: string;
  files: {
    original_name: string;
    size: number;
    mime_type: string;
    staging_path: string;
  }[];
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'failed';
  target_folder_id?: string;
  created_at: string;
  expires_at: string;  // Auto-cleanup after 1 hour if not confirmed
}
```

---

## 7. API Requirements

### 7.1 New Endpoints

#### Knowledge Base Management
```
POST   /api/v1/knowledge-bases                   # Create folder
GET    /api/v1/knowledge-bases                   # List folders
GET    /api/v1/knowledge-bases/{id}              # Get details
PUT    /api/v1/knowledge-bases/{id}              # Update
DELETE /api/v1/knowledge-bases/{id}              # Delete

POST   /api/v1/knowledge-bases/{id}/sources      # Add source
GET    /api/v1/knowledge-bases/{id}/sources      # List sources
PUT    /api/v1/knowledge-bases/sources/{id}      # Update source
DELETE /api/v1/knowledge-bases/sources/{id}      # Remove source
POST   /api/v1/knowledge-bases/sources/{id}/sync # Trigger sync
```

#### AI Assistants
```
POST   /api/v1/ai-assistants                     # Create assistant
GET    /api/v1/ai-assistants                     # List assistants
GET    /api/v1/ai-assistants/{id}                # Get details
PUT    /api/v1/ai-assistants/{id}                # Update config
DELETE /api/v1/ai-assistants/{id}                # Delete

POST   /api/v1/ai-assistants/{id}/integrations   # Add integration
PUT    /api/v1/ai-assistants/{id}/integrations/{platform} # Update
DELETE /api/v1/ai-assistants/{id}/integrations/{platform} # Remove
```

#### Conversations
```
GET    /api/v1/ai-assistants/{id}/conversations  # List threads
GET    /api/v1/conversations/{thread_id}         # Get messages
POST   /api/v1/conversations/{thread_id}/messages # Send message
PUT    /api/v1/conversations/{thread_id}/status  # Update status
DELETE /api/v1/conversations/{thread_id}         # Archive thread

GET    /api/v1/ai-assistants/{id}/analytics      # Get analytics
```

#### Platform Webhooks
```
POST   /api/v1/webhook/chatbot/{assistant_id}    # Receive platform messages
```

#### Pending Uploads
```
POST   /api/v1/uploads/pending                   # Create pending upload
GET    /api/v1/uploads/pending/{id}              # Get status
POST   /api/v1/uploads/pending/{id}/confirm      # Confirm and process
DELETE /api/v1/uploads/pending/{id}              # Cancel
```

### 7.2 Reused Endpoints

```
# Documents (no changes needed)
GET    /api/v1/documents
POST   /api/v1/documents/upload

# Projects (used as "folders" in frontend)
GET    /api/v1/projects
POST   /api/v1/projects
PUT    /api/v1/projects/{id}

# RAG (add assistant_id parameter)
POST   /api/v1/rag/query?assistant_id=xxx
```

---

## 8. Implementation Priorities

### 8.1 Phase 1: Core Restructuring (Week 1-2)

**Must Have**:
1. ✅ New menu sidebar with 4 pages
2. ✅ Knowledge Base page with folder management
3. ✅ Documents upload workflow (both paths)
4. ✅ AI Assistants sidebar navigation
5. ✅ Basic AI Assistant creation (Steps 1-3)

**Backend**:
- Knowledge Base API endpoints
- Pending upload system
- AI Assistant CRUD APIs

### 8.2 Phase 2: Chatbot Platform (Week 3-4)

**Must Have**:
1. ✅ Platform integration configuration (Step 4)
2. ✅ Multi-platform conversation management
3. ✅ Webhook endpoints for platforms
4. ✅ Conversation thread isolation

**Backend**:
- Webhook handlers (Facebook, WhatsApp, Telegram)
- Conversation threading system
- Message routing logic

### 8.3 Phase 3: Sharing & Analytics (Week 5-6)

**Must Have**:
1. ✅ Public URL and embed code generation (Step 5)
2. ✅ Widget customization
3. ✅ Basic analytics dashboard
4. ✅ Conversation search and filtering

**Backend**:
- Public API for embedded widgets
- Analytics aggregation
- Usage tracking

### 8.4 Phase 4: Polish & Optimization (Week 7-8)

**Should Have**:
1. ✅ Knowledge Graph visualization (optional)
2. ✅ Advanced analytics
3. ✅ Bulk operations
4. ✅ Export features

---

## 9. Success Metrics

### 9.1 User Experience
- **Clarity**: Users understand the difference between Documents, Knowledge Base, and AI Assistants
- **Efficiency**: Upload workflow reduces steps by 40%
- **Satisfaction**: 80%+ users find chatbot platform features useful

### 9.2 Technical
- **Performance**: Page load time < 2s
- **Reliability**: 99.5% uptime for webhook endpoints
- **Scalability**: Support 10,000+ conversations per assistant

### 9.3 Business
- **Adoption**: 70%+ users create at least 1 AI Assistant
- **Engagement**: 50%+ users connect at least 1 platform integration
- **Retention**: 80%+ weekly active users

---

## 10. Risk Mitigation

### 10.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Webhook reliability | High | Implement retry logic, dead letter queues |
| Platform API changes | Medium | Version-specific handlers, fallback modes |
| Large file uploads | Medium | Chunked upload, progress tracking |
| Conversation threading | High | Robust ID mapping, deduplication |

### 10.2 UX Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex navigation | Medium | User testing, simplified flows |
| Feature overload | Medium | Progressive disclosure, onboarding |
| Platform confusion | High | Clear labels, help tooltips |

---

## 11. Open Questions

1. **Knowledge Base Sync Frequency**: Should we support real-time sync for databases or just periodic?
2. **Conversation Archive Policy**: Auto-archive after how many days of inactivity?
3. **Rate Limiting**: What are acceptable limits for public embedded widgets?
4. **Multi-language**: Should AI Assistants support multiple languages natively?

---

## Appendix A: Related Documents

- `WebSocket-Fix-Results.md` - Chat WebSocket implementation
- `Chat-WebSocket-Fix.md` - Chat-specific WebSocket patterns
- `WebSocket-Root-Cause-And-Fix.md` - StrictMode handling

---

**Document Control**:
- **Author**: Product Team
- **Reviewers**: Engineering Team
- **Approval**: Pending
- **Next Review**: After Phase 1 completion

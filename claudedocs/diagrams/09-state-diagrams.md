# State Diagrams

## Overview
Shows state transitions for three main entities in the system: Document, AssistantConversation, and DataSource.

---

## 1. Document State Diagram

### State Definitions

| State | Description | Available Actions |
|-------|-------------|-------------------|
| `pending` | Uploaded, waiting for processing | Start processing, Delete |
| `processing` | OCR processing in progress | Cancel processing |
| `processed` | Processing complete, pending confirmation | Confirm, Reprocess, Delete |
| `failed` | Processing failed | Retry, Delete |
| `confirmed` | User confirmed | Export, Delete, Reprocess |

### State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> pending: Upload document

    pending --> processing: Start processing
    pending --> [*]: Delete

    processing --> processed: Processing success
    processing --> failed: Processing failed
    processing --> pending: Cancel processing

    processed --> confirmed: User confirms
    processed --> processing: Reprocess
    processed --> [*]: Delete

    failed --> processing: Retry
    failed --> [*]: Delete

    confirmed --> processing: Reprocess
    confirmed --> [*]: Delete/Archive

    note right of pending
        Initial state
        File stored
        Waiting for OCR
    end note

    note right of processing
        Celery task executing
        Calling AI Provider
    end note

    note right of processed
        OCR complete
        Awaiting user review/correction
    end note

    note right of confirmed
        Final state
        Ready for export
    end note
```

### Detailed Transition Conditions

```mermaid
flowchart TB
    subgraph Transitions["State Transition Conditions"]
        T1["pending → processing<br/>Trigger: POST /documents/{id}/process<br/>Condition: File exists and valid"]
        T2["processing → processed<br/>Trigger: Celery task complete<br/>Condition: OCR returns result successfully"]
        T3["processing → failed<br/>Trigger: Celery task failed<br/>Condition: All AI Providers failed"]
        T4["processed → confirmed<br/>Trigger: POST /documents/{id}/confirm<br/>Condition: User submits confirmation"]
        T5["failed → processing<br/>Trigger: POST /documents/{id}/retry<br/>Condition: Retry count not exceeded"]
    end
```

---

## 2. AssistantConversation State Diagram

### State Definitions

| State | Description | Trigger Condition |
|-------|-------------|-------------------|
| `unresolved` | Unresolved, needs attention | New conversation, resolved conversation receives new message |
| `in_progress` | In progress | Staff starts handling |
| `resolved` | Resolved | Staff marks complete |

### State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> unresolved: New conversation created

    unresolved --> in_progress: Staff starts handling
    unresolved --> resolved: Mark resolved directly

    in_progress --> resolved: Mark resolved
    in_progress --> unresolved: User sends new message

    resolved --> unresolved: User sends new message
    resolved --> [*]: Delete/Archive

    note right of unresolved
        Red indicator
        Needs staff attention
        Shown in "Unresolved" list
    end note

    note right of in_progress
        Yellow indicator
        Staff handling
        Shown in "In Progress" list
    end note

    note right of resolved
        Green indicator
        Issue resolved
        Shown in "Resolved" list
    end note
```

### Detailed Transition Rules

```mermaid
flowchart TB
    subgraph Rules["Transition Rules"]
        R1["New conversation<br/>User sends first message → unresolved"]
        R2["Start handling<br/>Staff clicks 'Start Handling' → in_progress"]
        R3["Mark resolved<br/>Staff clicks 'Mark Resolved' → resolved<br/>Set resolved_at = now()"]
        R4["Reopen<br/>User sends new message to resolved conversation<br/>→ unresolved<br/>Clear resolved_at"]
        R5["Auto transition<br/>If in_progress conversation inactive for 30+ minutes<br/>Optional: auto-revert to unresolved"]
    end
```

### Inbox Display Logic

```mermaid
flowchart LR
    subgraph Filters["Filters"]
        All["All<br/>All conversations"]
        Unresolved["Unresolved<br/>status='unresolved'"]
        InProgress["In Progress<br/>status='in_progress'"]
        Resolved["Resolved<br/>status='resolved'"]
    end

    subgraph Sorting["Sorting Rules"]
        S1["Unresolved: last_message_at DESC<br/>Latest message first"]
        S2["In Progress: last_message_at DESC"]
        S3["Resolved: resolved_at DESC<br/>Recently resolved first"]
    end

    Unresolved --> S1
    InProgress --> S2
    Resolved --> S3
```

---

## 3. DataSource State Diagram

### State Definitions

| State | Description | Available Actions |
|-------|-------------|-------------------|
| `active` | Normal, queryable | Sync, Delete |
| `syncing` | Syncing/Updating | Cancel sync |
| `error` | Sync failed | Retry, Delete |
| `paused` | Paused | Resume, Delete |

### State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> active: Create data source

    active --> syncing: Start sync/update
    active --> paused: Pause data source
    active --> [*]: Delete

    syncing --> active: Sync success
    syncing --> error: Sync failed
    syncing --> active: Cancel sync

    error --> syncing: Retry sync
    error --> [*]: Delete

    paused --> active: Resume data source
    paused --> syncing: Resume and sync
    paused --> [*]: Delete

    note right of active
        Embeddings generated
        Available for RAG query
    end note

    note right of syncing
        Celery task executing
        • Crawling website content
        • Generating embeddings
        • Updating vector index
    end note

    note right of error
        Shows error_message
        Requires user action
    end note

    note right of paused
        Manually paused
        Not participating in RAG query
    end note
```

### Sync Process States

```mermaid
flowchart TB
    subgraph SyncProcess["Sync Process Detailed States"]
        S1["syncing: extracting<br/>Extracting content"]
        S2["syncing: chunking<br/>Chunking text"]
        S3["syncing: embedding<br/>Generating vectors"]
        S4["syncing: indexing<br/>Updating index"]
    end

    S1 --> S2 --> S3 --> S4
    S4 --> Active["active<br/>Sync complete"]

    S1 --> Error1["error: extraction_failed<br/>Content extraction failed"]
    S2 --> Error2["error: chunking_failed<br/>Chunking failed"]
    S3 --> Error3["error: embedding_failed<br/>Vector generation failed<br/>(API error/quota exceeded)"]
    S4 --> Error4["error: indexing_failed<br/>Index update failed"]
```

---

## 4. Combined State Relationship Diagram

```mermaid
flowchart TB
    subgraph DocStates["📄 Document States"]
        D_pending["pending"]
        D_processing["processing"]
        D_processed["processed"]
        D_failed["failed"]
        D_confirmed["confirmed"]
    end

    subgraph ConvStates["💬 Conversation States"]
        C_unresolved["unresolved"]
        C_in_progress["in_progress"]
        C_resolved["resolved"]
    end

    subgraph DSStates["📂 DataSource States"]
        DS_active["active"]
        DS_syncing["syncing"]
        DS_error["error"]
        DS_paused["paused"]
    end

    %% Document Flow
    D_pending --> D_processing
    D_processing --> D_processed
    D_processing --> D_failed
    D_processed --> D_confirmed

    %% Conversation Flow
    C_unresolved --> C_in_progress
    C_in_progress --> C_resolved
    C_resolved -.-> C_unresolved

    %% DataSource Flow
    DS_active --> DS_syncing
    DS_syncing --> DS_active
    DS_syncing --> DS_error
    DS_error --> DS_syncing

    style D_pending fill:#fff3e0
    style D_processing fill:#e3f2fd
    style D_processed fill:#e8f5e9
    style D_failed fill:#ffebee
    style D_confirmed fill:#c8e6c9

    style C_unresolved fill:#ffebee
    style C_in_progress fill:#fff3e0
    style C_resolved fill:#c8e6c9

    style DS_active fill:#c8e6c9
    style DS_syncing fill:#e3f2fd
    style DS_error fill:#ffebee
    style DS_paused fill:#f5f5f5
```

---

## State Color Specification

| State Type | Color | HEX | Meaning |
|------------|-------|-----|---------|
| Waiting/Initial | Orange | `#fff3e0` | Action required |
| Processing | Blue | `#e3f2fd` | System processing |
| Success/Complete | Green | `#c8e6c9` | Normal state |
| Error/Failed | Red | `#ffebee` | Needs attention |
| Paused/Disabled | Gray | `#f5f5f5` | Inactive |

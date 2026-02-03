# Entity Relationship Diagram

## Overview
Shows all core database models and their relationships in Doctify, demonstrating the independence of the three core modules.

## Mermaid ER Diagram

```mermaid
erDiagram
    %% ==========================================
    %% User Module (Foundation for all modules)
    %% ==========================================
    User {
        uuid id PK
        string email UK
        string hashed_password
        string full_name
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    %% ==========================================
    %% Documents/OCR Module (Independent)
    %% ==========================================
    Project {
        uuid id PK
        uuid user_id FK
        string name
        string description
        datetime created_at
    }

    Document {
        uuid id PK
        uuid user_id FK
        uuid project_id FK "Optional"
        string title
        string original_filename
        string file_path
        string file_type
        bigint file_size
        string status "pending|processing|processed|failed"
        text extracted_text
        json extracted_data
        json user_corrected_data
        datetime confirmed_at
        int tokens_used
        datetime created_at
    }

    EditHistory {
        uuid id PK
        uuid document_id FK
        json changes
        datetime created_at
    }

    %% ==========================================
    %% Knowledge Base Module (Independent)
    %% ==========================================
    KnowledgeBase {
        uuid id PK
        uuid user_id FK
        string name
        string description
        json config "chunk_size, overlap, etc."
        string status "active|processing|paused|error"
        datetime created_at
    }

    DataSource {
        uuid id PK
        uuid knowledge_base_id FK
        string type "uploaded_docs|website|text|qa_pairs"
        string name
        json config
        string status "active|syncing|error|paused"
        int document_count
        int embedding_count
        datetime last_synced_at
    }

    %% ==========================================
    %% AI Assistants Module (Independent)
    %% ==========================================
    Assistant {
        uuid id PK
        uuid user_id FK
        uuid knowledge_base_id FK "Optional KB integration"
        string name
        string description
        json model_config "provider, model, temperature"
        json widget_config "color, position, etc."
        boolean is_active
        datetime created_at
    }

    AssistantConversation {
        uuid id PK
        uuid assistant_id FK
        uuid user_id FK "Optional - authenticated user"
        string user_fingerprint "Anonymous user tracking"
        string session_id
        string status "unresolved|in_progress|resolved"
        string last_message_preview
        datetime last_message_at
        int message_count
        datetime resolved_at
    }

    AssistantMessage {
        uuid id PK
        uuid conversation_id FK
        string role "user|assistant|system"
        text content
        string model_used
        int tokens_used
        datetime created_at
    }

    %% ==========================================
    %% Technical Implementation Layer (RAG/Embeddings)
    %% ==========================================
    DocumentEmbedding {
        uuid id PK
        uuid document_id FK "Source 1: Direct document"
        uuid data_source_id FK "Source 2: KB data source"
        int chunk_index
        text chunk_text
        vector embedding "1536-dim vector"
        json metadata
        datetime created_at
    }

    RAGQuery {
        uuid id PK
        uuid user_id FK
        text question
        text answer
        json sources "Document chunk references"
        string model_used
        int tokens_used
        float confidence_score
        int feedback_rating
        datetime created_at
    }

    %% ==========================================
    %% Relationships
    %% ==========================================

    %% User owns resources in each module
    User ||--o{ Project : "owns"
    User ||--o{ Document : "owns"
    User ||--o{ KnowledgeBase : "owns"
    User ||--o{ Assistant : "owns"
    User ||--o{ RAGQuery : "queries"

    %% Documents/OCR Module internal relationships
    Project ||--o{ Document : "contains"
    Document ||--o{ EditHistory : "has"
    Document ||--o{ DocumentEmbedding : "has embeddings"

    %% Knowledge Base Module internal relationships
    KnowledgeBase ||--o{ DataSource : "contains"
    DataSource ||--o{ DocumentEmbedding : "has embeddings"

    %% AI Assistants Module internal relationships
    Assistant ||--o{ AssistantConversation : "has"
    AssistantConversation ||--o{ AssistantMessage : "contains"

    %% Optional connection (dashed line indicates optional)
    Assistant }o--o| KnowledgeBase : "optional connection"
```

## Module Independence Analysis

```mermaid
flowchart LR
    subgraph DocModule["Documents/OCR Module"]
        D[Document]
        P[Project]
        EH[EditHistory]
    end

    subgraph KBModule["Knowledge Base Module"]
        KB[KnowledgeBase]
        DS[DataSource]
    end

    subgraph AssistantModule["AI Assistants Module"]
        A[Assistant]
        AC[AssistantConversation]
        AM[AssistantMessage]
    end

    subgraph TechLayer["Technical Implementation"]
        DE[DocumentEmbedding]
        RQ[RAGQuery]
    end

    D -.-> DE
    DS -.-> DE
    A -.->|Optional| KB

    style DocModule fill:#e1f5fe
    style KBModule fill:#f3e5f5
    style AssistantModule fill:#e8f5e9
    style TechLayer fill:#fff3e0
```

## Key Points

### Module Independence Proof

| Module | Direct FK to Other Core Modules | Conclusion |
|--------|--------------------------------|------------|
| Documents/OCR | None | Fully independent |
| Knowledge Base | None | Fully independent |
| AI Assistants | Optional `knowledge_base_id` | Independent but can integrate |

### DocumentEmbedding Dual Source

```
DocumentEmbedding
├── document_id (Source 1) ─── Generated directly from Document
└── data_source_id (Source 2) ─── Generated from Knowledge Base DataSource

Constraint: Exactly one source must be set (XOR)
```

### User Ownership

All three core modules are directly owned by User, not dependent on each other:
- User → Documents
- User → KnowledgeBase
- User → Assistant

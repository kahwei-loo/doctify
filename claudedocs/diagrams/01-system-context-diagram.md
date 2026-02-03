# System Context Diagram

## Overview
Shows the overall architecture of the Doctify platform and its interactions with external systems.

## Mermaid Diagram

```mermaid
flowchart TB
    subgraph Users["Users"]
        Staff["Staff/Admin<br/>Internal users"]
        Public["Public User<br/>Anonymous users"]
    end

    subgraph Doctify["Doctify Platform"]
        subgraph DocModule["Documents/OCR Module"]
            DocUpload["Document Upload"]
            OCR["OCR Processing"]
            TextExtract["Text Extraction"]
        end

        subgraph KBModule["Knowledge Base Module"]
            KBManage["KB Management"]
            DataSource["Data Source Management"]
            Embedding["Embeddings Generation"]
            RAGQuery["RAG Query"]
        end

        subgraph AssistantModule["AI Assistants Module"]
            AssistantMgmt["Assistant Management"]
            PublicChat["Public Chat Widget"]
            Inbox["Conversation Inbox"]
        end
    end

    subgraph External["External Systems"]
        AI["AI Providers<br/>OpenAI/Anthropic/Google"]
        PG["PostgreSQL<br/>+ pgvector"]
        Redis["Redis<br/>Cache + Queue"]
        Storage["File Storage"]
    end

    Staff --> DocModule
    Staff --> KBModule
    Staff --> AssistantModule
    Public --> PublicChat

    DocModule --> AI
    KBModule --> AI
    AssistantModule --> AI

    AssistantModule -.->|Optional Integration| KBModule

    DocModule --> PG
    KBModule --> PG
    AssistantModule --> PG

    DocModule --> Redis
    KBModule --> Redis
    DocModule --> Storage
```

## C4 Model Version

```mermaid
C4Context
    title Doctify Platform - System Context Diagram

    Person(staff, "Staff/Admin", "Internal users managing documents, knowledge bases, and AI assistants")
    Person(public_user, "Public User", "Anonymous users chatting with AI assistants via widget")

    System_Boundary(doctify, "Doctify Platform") {
        System(doc_module, "Documents/OCR Module", "Document upload, OCR processing, text extraction")
        System(kb_module, "Knowledge Base Module", "KB management, data sources, embeddings, RAG queries")
        System(assistant_module, "AI Assistants Module", "AI assistants, public chat widget, conversation management")
    }

    System_Ext(ai_providers, "AI Providers", "OpenAI, Anthropic, Google AI - L25 Multi-AI Orchestration")
    System_Ext(postgres, "PostgreSQL + pgvector", "Primary database + vector search")
    System_Ext(redis, "Redis", "Cache + Celery message broker")
    System_Ext(storage, "File Storage", "Document file storage")

    Rel(staff, doc_module, "Upload/Process documents")
    Rel(staff, kb_module, "Manage knowledge bases")
    Rel(staff, assistant_module, "Manage AI assistants/View conversations")
    Rel(public_user, assistant_module, "Chat via widget")

    Rel(doc_module, ai_providers, "OCR/Text extraction")
    Rel(kb_module, ai_providers, "Generate embeddings/RAG answers")
    Rel(assistant_module, ai_providers, "AI response generation")
    Rel(assistant_module, kb_module, "Optional: RAG knowledge retrieval", "dashed")

    Rel(doc_module, postgres, "Store document metadata")
    Rel(kb_module, postgres, "Store KB/Embeddings")
    Rel(assistant_module, postgres, "Store conversation history")

    Rel(doc_module, redis, "Task queue")
    Rel(kb_module, redis, "Task queue/Cache")
    Rel(doc_module, storage, "Store files")
```

## Key Points

1. **Three Independent Modules**: Documents/OCR, Knowledge Base, and AI Assistants operate independently
2. **Optional Integration**: AI Assistants can optionally connect to Knowledge Base for RAG-enhanced responses
3. **Shared Infrastructure**: All modules share AI Providers, PostgreSQL, and Redis
4. **User Roles**: Staff can access all modules; Public Users can only interact with AI Assistants via widget

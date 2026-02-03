# Knowledge Base Module - Component Diagram

## Overview
Shows the internal architecture of the Knowledge Base module, including KB management, data source management, embeddings generation, and RAG query.

## Component Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend (React)"]
        KBPage["KnowledgeBasePage"]
        KBList["KnowledgeBaseList"]
        KBDetail["KnowledgeBaseDetail"]
        DSManager["DataSourceManager"]
        TestQuery["TestQueryPanel"]
    end

    subgraph API["API Layer (FastAPI)"]
        KBEndpoint["/api/v1/knowledge-bases/*"]
        DSEndpoint["/api/v1/data-sources/*"]
        EmbedEndpoint["/api/v1/embeddings/*"]
        RAGEndpoint["/api/v1/rag/*"]
    end

    subgraph KBServices["Knowledge Base Services"]
        KBService["KnowledgeBaseService<br/>- KB CRUD<br/>- Configuration management"]
        DSService["DataSourceService<br/>- Data source CRUD<br/>- Content extraction"]
    end

    subgraph EmbedServices["Embedding Services"]
        EmbedService["EmbeddingService<br/>- Text chunking<br/>- Vector generation"]
        ChunkService["ChunkingService<br/>- Smart chunking<br/>- Overlap handling"]
    end

    subgraph RAGServices["RAG Services"]
        RAGService["RAGService<br/>- Semantic search<br/>- Context assembly"]
        GenerationService["GenerationService<br/>- AI answer generation<br/>- Citation annotation"]
    end

    subgraph Tasks["Celery Tasks"]
        SyncTask["sync_data_source_task"]
        EmbedTask["generate_embeddings_task"]
        CrawlTask["crawl_website_task"]
    end

    subgraph Repository["Repository Layer"]
        KBRepo["KnowledgeBaseRepository"]
        DSRepo["DataSourceRepository"]
        EmbedRepo["DocumentEmbeddingRepository"]
        RAGRepo["RAGQueryRepository"]
    end

    subgraph Storage["Storage"]
        DB[(PostgreSQL<br/>knowledge_bases<br/>data_sources<br/>document_embeddings)]
        VectorDB[(pgvector<br/>Vector Index)]
        Cache[(Redis<br/>Query Cache)]
    end

    subgraph AI["AI Providers"]
        OpenAI["OpenAI<br/>text-embedding-3-small<br/>GPT-4"]
    end

    %% Frontend -> API
    Client --> API

    %% API -> Services
    KBEndpoint --> KBService
    DSEndpoint --> DSService
    EmbedEndpoint --> EmbedService
    RAGEndpoint --> RAGService

    %% Services -> Tasks
    DSService --> SyncTask
    EmbedService --> EmbedTask
    DSService --> CrawlTask

    %% Tasks -> Services
    EmbedTask --> ChunkService
    EmbedTask --> EmbedService

    %% Services -> AI
    EmbedService --> OpenAI
    GenerationService --> OpenAI
    RAGService --> GenerationService

    %% Services -> Repository
    KBService --> KBRepo
    DSService --> DSRepo
    EmbedService --> EmbedRepo
    RAGService --> EmbedRepo
    RAGService --> RAGRepo

    %% Repository -> Storage
    KBRepo --> DB
    DSRepo --> DB
    EmbedRepo --> DB
    EmbedRepo --> VectorDB
    RAGService --> Cache
```

## Data Source Type Processing

```mermaid
flowchart TB
    subgraph DataSourceTypes["Data Source Types"]
        UploadedDocs["uploaded_docs<br/>Uploaded documents"]
        Website["website<br/>Web crawling"]
        Text["text<br/>Direct text"]
        QAPairs["qa_pairs<br/>Q&A pairs"]
    end

    subgraph Processing["Processing Flow"]
        DocExtract["Document text extraction<br/>PDF/DOCX/TXT"]
        WebCrawl["Web page crawling<br/>Content extraction"]
        TextProcess["Text preprocessing"]
        QAProcess["QA formatting"]
    end

    subgraph Chunking["Chunking Process"]
        ChunkConfig["Chunking config<br/>- chunk_size: 1000<br/>- chunk_overlap: 200"]
        Chunker["Smart chunker<br/>- Semantic boundaries<br/>- Context preservation"]
    end

    subgraph Embedding["Vectorization"]
        EmbedModel["OpenAI<br/>text-embedding-3-small<br/>1536 dimensions"]
        BatchEmbed["Batch processing<br/>50 chunks/batch"]
    end

    subgraph Store["Storage"]
        EmbedTable["document_embeddings<br/>- chunk_text<br/>- embedding<br/>- metadata"]
    end

    UploadedDocs --> DocExtract
    Website --> WebCrawl
    Text --> TextProcess
    QAPairs --> QAProcess

    DocExtract --> Chunker
    WebCrawl --> Chunker
    TextProcess --> Chunker
    QAProcess --> Chunker

    ChunkConfig --> Chunker
    Chunker --> BatchEmbed
    BatchEmbed --> EmbedModel
    EmbedModel --> EmbedTable
```

## RAG Query Flow

```mermaid
flowchart LR
    subgraph Query["Query Phase"]
        Q1[User question] --> Q2[Question vectorization]
        Q2 --> Q3[Similarity search]
        Q3 --> Q4[Top-K retrieval<br/>Default: 5]
    end

    subgraph Context["Context Assembly"]
        C1[Retrieved results] --> C2[Relevance filtering<br/>Threshold: 0.7]
        C2 --> C3[Context concatenation]
        C3 --> C4[Prompt building]
    end

    subgraph Generation["Answer Generation"]
        G1[Call GPT-4] --> G2[Streaming response]
        G2 --> G3[Citation annotation]
        G3 --> G4[Return result]
    end

    subgraph Logging["Query Logging"]
        L1[Save to rag_queries]
        L2[Record sources]
        L3[User feedback]
    end

    Q4 --> C1
    C4 --> G1
    G4 --> L1
```

## Class Diagram

```mermaid
classDiagram
    class KnowledgeBaseService {
        +create_kb(user_id, name, config)
        +get_kb(kb_id)
        +list_kbs(user_id)
        +update_kb(kb_id, data)
        +delete_kb(kb_id)
        +get_stats(user_id)
    }

    class DataSourceService {
        +add_data_source(kb_id, type, config)
        +sync_data_source(ds_id)
        +get_data_source(ds_id)
        +delete_data_source(ds_id)
        -extract_from_docs(document_ids)
        -crawl_website(url, config)
    }

    class EmbeddingService {
        -chunk_size: int
        -chunk_overlap: int
        -embedding_model: str
        +generate_embeddings(ds_id)
        +chunk_text(text)
        +create_embedding(text)
        +batch_embed(texts)
    }

    class RAGService {
        -similarity_threshold: float
        -top_k: int
        +query(question, kb_ids)
        +semantic_search(query_vector, kb_ids)
        +build_context(chunks)
        +generate_answer(question, context)
    }

    class DocumentEmbeddingRepository {
        +create(embedding)
        +get_by_data_source(ds_id)
        +search_similar(vector, threshold, limit)
        +delete_by_data_source(ds_id)
        +count_by_kb(kb_id)
    }

    KnowledgeBaseService --> DataSourceService
    DataSourceService --> EmbeddingService
    RAGService --> DocumentEmbeddingRepository
    EmbeddingService --> DocumentEmbeddingRepository
```

## File Structure

```
backend/app/
├── api/v1/endpoints/
│   ├── knowledge_bases.py    # KB CRUD endpoints
│   ├── data_sources.py       # Data source endpoints
│   ├── embeddings.py         # Embedding endpoints
│   └── rag.py                # RAG query endpoints
├── services/
│   ├── knowledge_base/
│   │   ├── kb_service.py
│   │   └── data_source_service.py
│   ├── embedding/
│   │   ├── embedding_service.py
│   │   └── chunking_service.py
│   └── rag/
│       ├── rag_service.py
│       └── generation_service.py
├── tasks/
│   └── knowledge_base.py     # Celery tasks
└── db/repositories/
    ├── knowledge_base.py
    └── rag.py

frontend/src/features/knowledge-base/
├── pages/
│   └── KnowledgeBasePage.tsx
├── components/
│   ├── KnowledgeBaseList.tsx
│   ├── KnowledgeBaseDetail.tsx
│   ├── DataSourceManager.tsx
│   ├── DataSourceForm.tsx
│   └── TestQueryPanel.tsx
├── hooks/
│   └── useKnowledgeBase.ts
└── services/
    └── knowledgeBaseApi.ts   # RTK Query
```

## Key Technical Points

1. **Four Data Source Types**: uploaded_docs, website, text, qa_pairs
2. **Smart Chunking**: Configurable chunk_size and chunk_overlap
3. **pgvector**: PostgreSQL vector search extension with cosine similarity
4. **Batch Processing**: Embeddings generated in batches (50 chunks/batch) for efficiency
5. **RAG Relevance Filtering**: Default threshold 0.7 filters low-relevance results

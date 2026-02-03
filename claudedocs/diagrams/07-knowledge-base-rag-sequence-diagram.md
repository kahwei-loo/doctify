# Knowledge Base RAG Query Sequence Diagram

## Overview
Shows the complete lifecycle of a Knowledge Base from creation to RAG query.

## Knowledge Base Creation and Configuration

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant KBS as KBService
    participant DB as PostgreSQL

    rect rgb(230, 245, 255)
        Note over U, DB: Create Knowledge Base
        U->>FE: Click "Create Knowledge Base"
        U->>FE: Fill in name, description, config
        Note over FE: Config options:<br/>chunk_size: 1000<br/>chunk_overlap: 200<br/>embedding_model: text-embedding-3-small
        FE->>API: POST /knowledge-bases
        API->>KBS: create_kb(user_id, data)
        KBS->>DB: INSERT knowledge_base
        DB-->>KBS: kb_id
        KBS-->>API: knowledge_base
        API-->>FE: {id, name, status: 'active'}
        FE-->>U: Show new knowledge base
    end
```

## Adding Data Sources and Generating Embeddings

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant DSS as DataSourceService
    participant Queue as Redis Queue
    participant Celery as Celery Worker
    participant Chunk as ChunkingService
    participant Embed as EmbeddingService
    participant AI as OpenAI
    participant DB as PostgreSQL
    participant Vector as pgvector

    rect rgb(255, 243, 224)
        Note over U, DB: Phase 1: Add Data Source
        U->>FE: Select data source type
        alt uploaded_docs (Upload documents)
            U->>FE: Upload PDF/DOCX files
            FE->>API: POST /data-sources (type='uploaded_docs')
        else website (Web crawling)
            U->>FE: Enter URL and crawl config
            FE->>API: POST /data-sources (type='website')
        else text (Direct text)
            U->>FE: Enter text content
            FE->>API: POST /data-sources (type='text')
        else qa_pairs (Q&A pairs)
            U->>FE: Enter Q&A pairs
            FE->>API: POST /data-sources (type='qa_pairs')
        end

        API->>DSS: add_data_source(kb_id, type, config)
        DSS->>DB: INSERT data_source (status='active')
        DB-->>DSS: ds_id
        DSS-->>API: data_source
        API-->>FE: {id, type, status}
        FE-->>U: Show data source added
    end

    rect rgb(232, 245, 233)
        Note over U, Vector: Phase 2: Generate Embeddings
        U->>FE: Click "Sync/Generate Embeddings"
        FE->>API: POST /data-sources/{ds_id}/embeddings
        API->>DB: UPDATE status='syncing'
        API->>Queue: enqueue(generate_embeddings_task)
        API-->>FE: {task_id, status: 'syncing'}
        FE-->>U: Show syncing...

        Queue->>Celery: dequeue task
        Celery->>DSS: extract_content(ds_id)

        alt uploaded_docs
            DSS->>DSS: Parse PDF/DOCX
            DSS-->>Celery: text_content
        else website
            DSS->>DSS: Crawl web pages
            DSS-->>Celery: crawled_content
        else text/qa_pairs
            DSS->>DSS: Use content directly
            DSS-->>Celery: raw_content
        end

        Celery->>Chunk: chunk_text(content)
        Note over Chunk: chunk_size=1000<br/>chunk_overlap=200
        Chunk->>Chunk: Smart chunking (semantic boundaries)
        Chunk-->>Celery: chunks[]

        loop Every batch of 50 chunks
            Celery->>Embed: batch_embed(chunks[i:i+50])
            Embed->>AI: POST /embeddings (text-embedding-3-small)
            AI-->>Embed: vectors[] (1536 dimensions)
            Embed->>DB: BULK INSERT document_embeddings
            Embed->>Vector: Index vectors
        end

        Celery->>DB: UPDATE data_source status='active', embedding_count
        FE->>API: GET /data-sources/{ds_id}
        API-->>FE: {status: 'active', embedding_count: 150}
        FE-->>U: Show sync complete
    end
```

## RAG Query Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant RAG as RAGService
    participant Embed as EmbeddingService
    participant AI as OpenAI
    participant Vector as pgvector
    participant Gen as GenerationService
    participant DB as PostgreSQL
    participant Cache as Redis

    rect rgb(243, 229, 245)
        Note over U, Cache: RAG Query Flow
        U->>FE: Enter question in test panel
        FE->>API: POST /rag/query {question, kb_ids[]}
        API->>RAG: query(question, kb_ids)

        Note over RAG, AI: Step 1: Question Vectorization
        RAG->>Embed: create_embedding(question)
        Embed->>AI: POST /embeddings
        AI-->>Embed: question_vector (1536 dimensions)
        Embed-->>RAG: question_vector

        Note over RAG, Vector: Step 2: Similarity Search
        RAG->>Vector: cosine_similarity_search(question_vector)
        Note over Vector: SELECT * FROM document_embeddings<br/>ORDER BY embedding <=> query_vector<br/>LIMIT 10
        Vector-->>RAG: similar_chunks[] (top 10)

        Note over RAG: Step 3: Relevance Filtering
        RAG->>RAG: filter(chunks, threshold=0.7)
        RAG->>RAG: Keep chunks with score >= 0.7

        Note over RAG, Gen: Step 4: Context Assembly
        RAG->>Gen: build_context(filtered_chunks)
        Gen->>Gen: Concatenate chunk texts
        Gen->>Gen: Build prompt

        Note over Gen, AI: Step 5: Answer Generation
        Gen->>AI: POST /chat/completions (GPT-4)
        Note over AI: System: You are a knowledge assistant...<br/>Context: [relevant chunks]<br/>Question: [user question]
        AI-->>Gen: answer (streaming)
        Gen-->>RAG: answer + sources

        Note over RAG, DB: Step 6: Log Query
        RAG->>DB: INSERT rag_query
        RAG->>Cache: cache(question_hash, result)

        RAG-->>API: {answer, sources[], confidence}
        API-->>FE: Stream results
        FE-->>U: Show answer + source citations
    end
```

## Streaming Response Detailed Flow

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FastAPI
    participant Gen as GenerationService
    participant AI as OpenAI

    FE->>API: POST /rag/query (stream=true)

    API->>Gen: stream_answer(question, context)
    Gen->>AI: POST /chat/completions (stream=true)

    loop Streaming response
        AI-->>Gen: chunk: "Based"
        Gen-->>API: SSE: data: {"chunk": "Based"}
        API-->>FE: SSE event
        FE->>FE: Append to display

        AI-->>Gen: chunk: " on"
        Gen-->>API: SSE: data: {"chunk": " on"}
        API-->>FE: SSE event
        FE->>FE: Append to display

        AI-->>Gen: chunk: " the documents..."
        Gen-->>API: SSE: data: {"chunk": " the documents..."}
        API-->>FE: SSE event
        FE->>FE: Append to display
    end

    AI-->>Gen: [DONE]
    Gen-->>API: SSE: data: {"sources": [...], "done": true}
    API-->>FE: SSE event (final)
    FE->>FE: Show source citations
```

## Vector Search Details

```mermaid
sequenceDiagram
    autonumber
    participant RAG as RAGService
    participant PG as PostgreSQL
    participant pgvector as pgvector Extension

    RAG->>PG: Execute similarity query
    Note over PG: SELECT<br/>  id, chunk_text, metadata,<br/>  1 - (embedding <=> $1) as similarity<br/>FROM document_embeddings<br/>WHERE data_source_id IN (...)<br/>ORDER BY embedding <=> $1<br/>LIMIT 10

    PG->>pgvector: Vector index lookup
    Note over pgvector: Using IVFFlat or HNSW index<br/>Fast approximate nearest neighbor search
    pgvector-->>PG: Candidate results

    PG->>PG: Calculate exact similarity
    PG->>PG: Sort and limit results

    PG-->>RAG: results[]
    Note over RAG: Example results:<br/>[{id, chunk_text, similarity: 0.89},<br/> {id, chunk_text, similarity: 0.82},<br/> {id, chunk_text, similarity: 0.75}]
```

## Caching Strategy

```mermaid
sequenceDiagram
    autonumber
    participant API as FastAPI
    participant RAG as RAGService
    participant Cache as Redis
    participant Vector as pgvector

    API->>RAG: query(question, kb_ids)
    RAG->>RAG: hash = md5(question + kb_ids)

    RAG->>Cache: GET cache:{hash}

    alt Cache hit
        Cache-->>RAG: cached_result
        RAG-->>API: cached_result
        Note over API: Response time < 100ms
    else Cache miss
        Cache-->>RAG: null
        RAG->>Vector: Execute full query
        Vector-->>RAG: result
        RAG->>Cache: SET cache:{hash} EX 3600
        RAG-->>API: result
        Note over API: Response time ~2-5s
    end
```

## Key Performance Metrics

| Operation | Expected Duration | Notes |
|-----------|-------------------|-------|
| Question vectorization | 100-200ms | OpenAI API call |
| Vector search | 10-50ms | pgvector index query |
| Context assembly | <10ms | In-memory operation |
| AI answer generation | 1-5s | GPT-4 streaming response |
| Cache read | <10ms | Redis GET |
| Total response time | 1.5-6s | Complete flow |
| Cache hit response | <100ms | Direct return |

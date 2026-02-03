# Document OCR Sequence Diagram

## Overview
Shows the complete flow from document upload to OCR processing and user confirmation.

## Complete Flow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant Upload as UploadService
    participant Storage as FileStorage
    participant DB as PostgreSQL
    participant Queue as Redis Queue
    participant Celery as Celery Worker
    participant OCR as OCR Orchestrator
    participant AI as AI Provider

    rect rgb(230, 245, 255)
        Note over U, Storage: Phase 1: Document Upload
        U->>FE: Select file to upload
        FE->>FE: Frontend validation (type/size)
        FE->>API: POST /documents/upload
        API->>Upload: validate_file()
        Upload->>Upload: Check file type/size
        Upload->>Upload: Virus scan
        Upload->>Storage: save_file()
        Storage-->>Upload: file_path
        Upload->>DB: INSERT document (status='pending')
        DB-->>Upload: document_id
        Upload-->>API: document_id
        API-->>FE: {id, status: 'pending'}
        FE-->>U: Show upload success
    end

    rect rgb(255, 243, 224)
        Note over U, AI: Phase 2: OCR Processing
        U->>FE: Click "Start Processing"
        FE->>API: POST /documents/{id}/process
        API->>DB: UPDATE status='processing'
        API->>Queue: enqueue(process_document_task)
        API-->>FE: {status: 'processing', task_id}
        FE-->>U: Show processing...

        Queue->>Celery: dequeue task
        Celery->>OCR: process(document)
        OCR->>OCR: Select best AI provider

        alt Primary provider succeeds
            OCR->>AI: extract_text (OpenAI GPT-4V)
            AI-->>OCR: extracted_data
        else Primary provider fails
            OCR->>AI: fallback to Anthropic
            AI-->>OCR: extracted_data
        else All providers fail
            OCR-->>Celery: OCRError
            Celery->>DB: UPDATE status='failed', error_message
        end

        OCR-->>Celery: extraction_result
        Celery->>DB: UPDATE extracted_text, extracted_data
        Celery->>DB: UPDATE status='processed'

        Note over FE: Polling or WebSocket for status
        FE->>API: GET /documents/{id}
        API->>DB: SELECT document
        DB-->>API: document
        API-->>FE: {status: 'processed', extracted_data}
        FE-->>U: Show OCR results
    end

    rect rgb(232, 245, 233)
        Note over U, DB: Phase 3: User Confirmation/Correction
        U->>FE: Review OCR results
        U->>FE: Correct errors
        FE->>API: POST /documents/{id}/confirm
        API->>DB: UPDATE user_corrected_data, confirmed_at
        DB-->>API: success
        API-->>FE: {status: 'confirmed'}
        FE-->>U: Show confirmation success
    end

    rect rgb(243, 229, 245)
        Note over U, Storage: Phase 4: Export (Optional)
        U->>FE: Select export format
        FE->>API: GET /documents/{id}/export?format=json
        API->>DB: SELECT document
        DB-->>API: document with corrected_data
        API->>API: Format conversion
        API-->>FE: export_file
        FE-->>U: Download file
    end
```

## L25 OCR Orchestration Detailed Flow

```mermaid
sequenceDiagram
    autonumber
    participant Celery as Celery Worker
    participant Orch as OCR Orchestrator
    participant Select as Provider Selector
    participant OpenAI as OpenAI
    participant Anthropic as Anthropic
    participant Google as Google AI
    participant Validate as Validator

    Celery->>Orch: process(document)
    Orch->>Select: select_provider(doc_type)
    Select->>Select: Analyze document type/complexity
    Select->>Select: Check provider health status
    Select-->>Orch: provider_priority_list

    rect rgb(232, 245, 233)
        Note over Orch, OpenAI: Try primary provider (OpenAI)
        Orch->>OpenAI: extract(document)
        alt Success
            OpenAI-->>Orch: result
            Orch->>Validate: validate(result)
            Validate-->>Orch: valid
        else Failure/Timeout
            OpenAI-->>Orch: error
            Note over Orch: Log error, try next
        end
    end

    rect rgb(255, 243, 224)
        Note over Orch, Anthropic: Try backup provider (Anthropic)
        Orch->>Anthropic: extract(document)
        alt Success
            Anthropic-->>Orch: result
            Orch->>Validate: validate(result)
            Validate-->>Orch: valid
        else Failure/Timeout
            Anthropic-->>Orch: error
            Note over Orch: Log error, try next
        end
    end

    rect rgb(227, 242, 253)
        Note over Orch, Google: Try last provider (Google AI)
        Orch->>Google: extract(document)
        alt Success
            Google-->>Orch: result
            Orch->>Validate: validate(result)
            Validate-->>Orch: valid
        else Failure
            Google-->>Orch: error
            Note over Orch: All providers failed
            Orch-->>Celery: OCRError("All providers failed")
        end
    end

    Orch-->>Celery: final_result
```

## Status Polling Flow

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL

    Note over FE: Start polling (2-second interval)

    loop Every 2 seconds
        FE->>API: GET /documents/{id}/status
        API->>DB: SELECT status FROM documents
        DB-->>API: status

        alt status = 'processing'
            API-->>FE: {status: 'processing', progress: 45}
            FE->>FE: Update progress bar
        else status = 'processed'
            API-->>FE: {status: 'processed'}
            FE->>FE: Stop polling
            FE->>API: GET /documents/{id}
            API-->>FE: {document with extracted_data}
            FE->>FE: Show OCR results
        else status = 'failed'
            API-->>FE: {status: 'failed', error}
            FE->>FE: Stop polling
            FE->>FE: Show error message
        end
    end
```

## Error Handling Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant Celery as Celery Worker

    rect rgb(255, 235, 238)
        Note over U, Celery: Error Scenario Handling

        alt Upload Error: File too large
            FE->>API: POST /upload (50MB file)
            API-->>FE: 413 Payload Too Large
            FE-->>U: "File size exceeds 10MB limit"

        else Upload Error: Unsupported type
            FE->>API: POST /upload (.exe file)
            API-->>FE: 400 Bad Request
            FE-->>U: "Unsupported file type"

        else OCR Error: All AI failed
            Celery->>Celery: All providers failed
            Celery->>API: UPDATE status='failed'
            FE->>API: GET /status
            API-->>FE: {status: 'failed', error: 'OCR failed'}
            FE-->>U: "Processing failed, please retry"
            U->>FE: Click retry
            FE->>API: POST /documents/{id}/retry

        else Network Error
            FE->>API: POST /upload
            API--xFE: Network Error
            FE-->>U: "Network error, please check connection"
        end
    end
```

## Key Timing Metrics

| Phase | Expected Duration | Notes |
|-------|-------------------|-------|
| File upload | 1-5 seconds | Depends on file size and network |
| Task enqueue | <100ms | Redis queue operation |
| OCR processing | 5-30 seconds | Depends on document complexity |
| Result storage | <500ms | Database write |
| User confirmation | User action | Manual review and correction |
| Export generation | <1 second | Format conversion |

# Documents/OCR Module - Component Diagram

## Overview
Shows the internal architecture of the Documents/OCR module, including all service components, data flow, and dependencies.

## Component Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend (React)"]
        DocPage["DocumentsPage"]
        UploadComp["UploadComponent"]
        DocViewer["DocumentViewer"]
        OCREditor["OCRResultEditor"]
    end

    subgraph API["API Layer (FastAPI)"]
        DocEndpoint["/api/v1/documents/*"]
        UploadEndpoint["POST /upload"]
        ProcessEndpoint["POST /{id}/process"]
        ConfirmEndpoint["POST /{id}/confirm"]
        ExportEndpoint["GET /{id}/export"]
    end

    subgraph Services["Service Layer"]
        UploadService["DocumentUploadService<br/>- File validation<br/>- Virus scanning<br/>- File storage"]
        ProcessService["DocumentProcessingService<br/>- Schedule OCR tasks<br/>- Status management"]
        ExportService["DocumentExportService<br/>- Format conversion<br/>- Download generation"]
    end

    subgraph OCR["OCR Orchestration (L25)"]
        Orchestrator["OCROrchestrator<br/>- Multi-AI orchestration<br/>- Automatic failover"]
        OpenAI["OpenAI GPT-4V"]
        Anthropic["Anthropic Claude"]
        Google["Google AI"]
    end

    subgraph Tasks["Celery Tasks"]
        ProcessTask["process_document_task"]
        ExtractTask["extract_text_task"]
        CleanupTask["cleanup_temp_files_task"]
    end

    subgraph Repository["Repository Layer"]
        DocRepo["DocumentRepository<br/>- CRUD operations<br/>- Query methods"]
        ProjectRepo["ProjectRepository"]
        HistoryRepo["EditHistoryRepository"]
    end

    subgraph Storage["Storage"]
        FileStorage["File Storage<br/>- Original files<br/>- Processing results"]
        DB[(PostgreSQL<br/>documents table)]
        Cache[(Redis<br/>Cache/Queue)]
    end

    %% Frontend -> API
    Client --> API

    %% API -> Services
    UploadEndpoint --> UploadService
    ProcessEndpoint --> ProcessService
    ConfirmEndpoint --> DocRepo
    ExportEndpoint --> ExportService

    %% Services -> OCR/Tasks
    ProcessService --> ProcessTask
    ProcessTask --> Orchestrator
    Orchestrator --> OpenAI
    Orchestrator --> Anthropic
    Orchestrator --> Google

    %% Services -> Repository
    UploadService --> DocRepo
    ProcessService --> DocRepo
    ExportService --> DocRepo
    DocRepo --> HistoryRepo

    %% Repository -> Storage
    DocRepo --> DB
    UploadService --> FileStorage
    ProcessTask --> Cache
```

## Class Diagram

```mermaid
classDiagram
    class DocumentsEndpoint {
        +upload_document(file, project_id)
        +list_documents(project_id, status)
        +get_document(id)
        +process_document(id)
        +confirm_document(id, corrected_data)
        +export_document(id, format)
        +delete_document(id)
    }

    class DocumentUploadService {
        -allowed_types: List
        -max_size: int
        +validate_file(file)
        +scan_for_virus(file)
        +save_file(file)
        +create_document_record(metadata)
    }

    class DocumentProcessingService {
        +start_processing(document_id)
        +get_processing_status(document_id)
        +cancel_processing(document_id)
        +retry_processing(document_id)
    }

    class OCROrchestrator {
        -providers: List~AIProvider~
        -retry_config: RetryConfig
        +process(document)
        +extract_text(image)
        +extract_structured_data(document)
        -select_provider(document_type)
        -fallback_to_next(error)
    }

    class DocumentRepository {
        +create(document)
        +get_by_id(id)
        +list_by_user(user_id, filters)
        +update(id, data)
        +delete(id)
        +update_status(id, status)
    }

    DocumentsEndpoint --> DocumentUploadService
    DocumentsEndpoint --> DocumentProcessingService
    DocumentProcessingService --> OCROrchestrator
    DocumentsEndpoint --> DocumentRepository
    DocumentUploadService --> DocumentRepository
```

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Upload["Upload Phase"]
        A1[User selects file] --> A2[Frontend validation]
        A2 --> A3[Upload to backend]
        A3 --> A4[File storage]
        A4 --> A5[Create Document record]
        A5 --> A6[Status: pending]
    end

    subgraph Process["Processing Phase"]
        B1[Trigger processing] --> B2[Status: processing]
        B2 --> B3[Celery task]
        B3 --> B4[OCR Orchestrator]
        B4 --> B5[AI Provider processing]
        B5 --> B6[Extract text/data]
        B6 --> B7[Status: processed]
    end

    subgraph Confirm["Confirmation Phase"]
        C1[User reviews result] --> C2[Edit/Correct]
        C2 --> C3[Save corrected data]
        C3 --> C4[Status: confirmed]
    end

    subgraph Export["Export Phase"]
        D1[Select export format] --> D2[Generate export file]
        D2 --> D3[Download file]
    end

    A6 --> B1
    B7 --> C1
    C4 --> D1
```

## File Structure

```
backend/app/
├── api/v1/endpoints/
│   └── documents.py          # API endpoints
├── services/
│   └── document/
│       ├── upload.py         # Upload service
│       ├── processing.py     # Processing service
│       └── export.py         # Export service
├── services/ocr/
│   ├── orchestrator.py       # L25 OCR orchestration
│   ├── providers/
│   │   ├── openai.py
│   │   ├── anthropic.py
│   │   └── google.py
│   └── extractors/
│       ├── text.py
│       └── structured.py
├── tasks/
│   └── document_tasks.py     # Celery tasks
└── db/repositories/
    └── document.py           # Data access layer

frontend/src/features/documents/
├── pages/
│   └── DocumentsPage.tsx
├── components/
│   ├── DocumentList.tsx
│   ├── DocumentUpload.tsx
│   ├── DocumentViewer.tsx
│   └── OCRResultEditor.tsx
├── hooks/
│   └── useDocuments.ts
└── services/
    └── documentsApi.ts       # RTK Query
```

## Key Technical Points

1. **L25 OCR Orchestration**: Multi-AI provider with automatic failover (OpenAI → Anthropic → Google)
2. **Async Processing**: Uses Celery for time-consuming OCR tasks
3. **User Confirmation Flow**: OCR results require user confirmation/correction before finalization
4. **File Security**: Virus scanning and file type validation on upload

"""
Document Test Fixtures

Provides sample document data and factory functions for document-related tests.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# =============================================================================
# Document Status Constants
# =============================================================================

class DocumentStatus:
    """Document processing status constants."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# =============================================================================
# Sample Document Data
# =============================================================================

SAMPLE_DOCUMENT_DATA: Dict[str, Any] = {
    "original_filename": "test_document.pdf",
    "file_path": "/uploads/test_document.pdf",
    "file_size": 1024000,  # 1MB
    "file_hash": "abc123def456789xyz",
    "mime_type": "application/pdf",
    "status": DocumentStatus.PENDING,
    "page_count": 10,
}

SAMPLE_PROCESSED_DOCUMENT_DATA: Dict[str, Any] = {
    "original_filename": "processed_document.pdf",
    "file_path": "/uploads/processed_document.pdf",
    "file_size": 2048000,  # 2MB
    "file_hash": "xyz789abc123def456",
    "mime_type": "application/pdf",
    "status": DocumentStatus.COMPLETED,
    "page_count": 20,
    "extraction_result": {
        "text": "Sample extracted text from the document.",
        "confidence": 0.95,
        "metadata": {
            "author": "Test Author",
            "title": "Test Document Title",
            "creation_date": "2024-01-15",
        },
        "pages": [
            {"page_number": 1, "text": "Page 1 content", "confidence": 0.96},
            {"page_number": 2, "text": "Page 2 content", "confidence": 0.94},
        ],
    },
    "processing_time_ms": 5000,
    "provider_used": "openai",
}

SAMPLE_FAILED_DOCUMENT_DATA: Dict[str, Any] = {
    "original_filename": "failed_document.pdf",
    "file_path": "/uploads/failed_document.pdf",
    "file_size": 512000,  # 500KB
    "file_hash": "fail123xyz789abc",
    "mime_type": "application/pdf",
    "status": DocumentStatus.FAILED,
    "page_count": 5,
    "error_message": "OCR extraction failed: Invalid document format",
    "retry_count": 3,
}


# =============================================================================
# Document Factory Functions
# =============================================================================

def create_document_data(
    original_filename: Optional[str] = None,
    file_size: int = 1024000,
    mime_type: str = "application/pdf",
    status: str = DocumentStatus.PENDING,
    page_count: int = 10,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Create document data with customizable fields.

    Args:
        original_filename: Original filename (auto-generated if not provided)
        file_size: File size in bytes
        mime_type: MIME type of the document
        status: Document processing status
        page_count: Number of pages
        project_id: Associated project ID
        user_id: Owner user ID
        **kwargs: Additional fields

    Returns:
        Dictionary with document data
    """
    unique_id = uuid.uuid4().hex[:8]
    filename = original_filename or f"document_{unique_id}.pdf"

    return {
        "original_filename": filename,
        "file_path": f"/uploads/{filename}",
        "file_size": file_size,
        "file_hash": uuid.uuid4().hex,
        "mime_type": mime_type,
        "status": status,
        "page_count": page_count,
        "project_id": project_id,
        "user_id": user_id,
        **kwargs,
    }


class DocumentFactory:
    """
    Factory class for creating document test data with various configurations.
    """

    _counter = 0

    @classmethod
    def _next_id(cls) -> int:
        cls._counter += 1
        return cls._counter

    @classmethod
    def reset(cls) -> None:
        """Reset the counter (useful between tests)."""
        cls._counter = 0

    @classmethod
    def create(cls, **overrides) -> Dict[str, Any]:
        """Create a single document with default or overridden values."""
        idx = cls._next_id()
        defaults = {
            "original_filename": f"document_{idx}.pdf",
            "file_path": f"/uploads/document_{idx}.pdf",
            "file_size": 1024000 + (idx * 1000),
            "file_hash": uuid.uuid4().hex,
            "mime_type": "application/pdf",
            "status": DocumentStatus.PENDING,
            "page_count": 10,
        }
        return {**defaults, **overrides}

    @classmethod
    def create_batch(cls, count: int, **overrides) -> List[Dict[str, Any]]:
        """Create multiple documents with the same overrides."""
        return [cls.create(**overrides) for _ in range(count)]

    @classmethod
    def create_pending(cls, **overrides) -> Dict[str, Any]:
        """Create a pending document."""
        return cls.create(status=DocumentStatus.PENDING, **overrides)

    @classmethod
    def create_processing(cls, **overrides) -> Dict[str, Any]:
        """Create a document in processing state."""
        return cls.create(status=DocumentStatus.PROCESSING, **overrides)

    @classmethod
    def create_completed(cls, **overrides) -> Dict[str, Any]:
        """Create a completed/processed document."""
        return cls.create(
            status=DocumentStatus.COMPLETED,
            extraction_result={
                "text": "Extracted text content",
                "confidence": 0.95,
                "metadata": {},
            },
            processing_time_ms=3000,
            provider_used="openai",
            **overrides,
        )

    @classmethod
    def create_failed(cls, error_message: str = "Processing failed", **overrides) -> Dict[str, Any]:
        """Create a failed document."""
        return cls.create(
            status=DocumentStatus.FAILED,
            error_message=error_message,
            retry_count=overrides.pop("retry_count", 3),
            **overrides,
        )

    @classmethod
    def create_image(cls, **overrides) -> Dict[str, Any]:
        """Create an image document."""
        idx = cls._next_id()
        return cls.create(
            original_filename=f"image_{idx}.png",
            file_path=f"/uploads/image_{idx}.png",
            mime_type="image/png",
            page_count=1,
            **overrides,
        )

    @classmethod
    def create_with_extraction(cls, extraction_result: Dict[str, Any], **overrides) -> Dict[str, Any]:
        """Create a document with custom extraction results."""
        return cls.create(
            status=DocumentStatus.COMPLETED,
            extraction_result=extraction_result,
            **overrides,
        )

    @classmethod
    def create_for_project(cls, project_id: str, **overrides) -> Dict[str, Any]:
        """Create a document assigned to a specific project."""
        return cls.create(project_id=project_id, **overrides)


# =============================================================================
# Extraction Result Fixtures
# =============================================================================

SAMPLE_EXTRACTION_RESULT: Dict[str, Any] = {
    "text": "This is the full extracted text from the document.",
    "confidence": 0.92,
    "metadata": {
        "author": "John Doe",
        "title": "Sample Document",
        "creation_date": "2024-06-15",
        "page_count": 10,
    },
    "pages": [
        {
            "page_number": 1,
            "text": "Page 1 content here.",
            "confidence": 0.95,
            "tables": [],
            "images": [],
        },
        {
            "page_number": 2,
            "text": "Page 2 content here.",
            "confidence": 0.90,
            "tables": [
                {
                    "rows": [
                        ["Header 1", "Header 2"],
                        ["Value 1", "Value 2"],
                    ],
                    "confidence": 0.88,
                }
            ],
            "images": [],
        },
    ],
    "tables": [
        {
            "page_number": 2,
            "rows": [
                ["Header 1", "Header 2"],
                ["Value 1", "Value 2"],
            ],
            "confidence": 0.88,
        }
    ],
    "language": "en",
    "provider": "openai",
    "model": "gpt-4-vision-preview",
    "processing_time_ms": 4500,
}

SAMPLE_TABLE_EXTRACTION: Dict[str, Any] = {
    "page_number": 1,
    "table_index": 0,
    "rows": [
        ["Name", "Age", "City"],
        ["Alice", "30", "New York"],
        ["Bob", "25", "Los Angeles"],
        ["Carol", "35", "Chicago"],
    ],
    "headers": ["Name", "Age", "City"],
    "confidence": 0.91,
}


# =============================================================================
# Database Model Data
# =============================================================================

def create_document_db_data(
    document_id: Optional[str] = None,
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Create document data suitable for direct database insertion.

    Args:
        document_id: Document UUID (auto-generated if not provided)
        user_id: Owner user ID
        project_id: Associated project ID
        **kwargs: Additional fields

    Returns:
        Dictionary with database-ready document data
    """
    base_data = create_document_data(**kwargs)

    return {
        "id": document_id or str(uuid.uuid4()),
        "user_id": user_id or str(uuid.uuid4()),
        "project_id": project_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        **base_data,
    }

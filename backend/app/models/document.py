"""
Document Request/Response Models

Pydantic models for document-related API endpoints.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator

# Import DocumentStatus from domain entity (Single Source of Truth)
from app.domain.entities.document import DocumentStatus


class ExportFormat(str, Enum):
    """
    Supported export formats (enumeration for security).

    Using enum prevents path traversal and arbitrary format injection attacks.
    Only these specific formats are allowed.
    """
    JSON = "json"
    CSV = "csv"
    XML = "xml"
    PDF = "pdf"
    EXCEL = "excel"
    MARKDOWN = "markdown"
    HTML = "html"

    @classmethod
    def get_mime_type(cls, format: 'ExportFormat') -> str:
        """Get MIME type for export format."""
        mime_types = {
            cls.JSON: "application/json",
            cls.CSV: "text/csv",
            cls.XML: "application/xml",
            cls.PDF: "application/pdf",
            cls.EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            cls.MARKDOWN: "text/markdown",
            cls.HTML: "text/html",
        }
        return mime_types.get(format, "application/octet-stream")

    @classmethod
    def get_file_extension(cls, format: 'ExportFormat') -> str:
        """Get file extension for export format."""
        extensions = {
            cls.JSON: ".json",
            cls.CSV: ".csv",
            cls.XML: ".xml",
            cls.PDF: ".pdf",
            cls.EXCEL: ".xlsx",
            cls.MARKDOWN: ".md",
            cls.HTML: ".html",
        }
        return extensions.get(format, "")


# DocumentStatus is imported from app.domain.entities.document
# Removed duplicate definition to maintain Single Source of Truth


class DocumentCategory(str, Enum):
    """Document category classification."""
    INVOICE = "invoice"
    CONTRACT = "contract"
    RECEIPT = "receipt"
    PROPOSAL = "proposal"
    NOTES = "notes"
    REPORT = "report"
    OTHER = "other"


class DocumentUploadRequest(BaseModel):
    """Request model for document upload."""

    title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Document title"
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Document description"
    )
    category: Optional[DocumentCategory] = Field(
        None,
        description="Document category"
    )
    tags: Optional[List[str]] = Field(
        None,
        max_items=20,
        description="Document tags"
    )

    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags."""
        if v:
            # Limit tag length
            for tag in v:
                if not isinstance(tag, str) or len(tag) > 50:
                    raise ValueError("Each tag must be a string with max 50 characters")
                # Prevent dangerous characters
                if any(c in tag for c in ['<', '>', '{', '}', '$', '..', '/']):
                    raise ValueError("Tags cannot contain dangerous characters")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Invoice 2024-001",
                "description": "Q1 Invoice for services",
                "category": "invoice",
                "tags": ["q1", "2024", "services"]
            }
        }


class DocumentExportRequest(BaseModel):
    """Request model for document export."""

    export_format: ExportFormat = Field(
        ExportFormat.JSON,
        description="Export format (enum-validated for security)"
    )
    include_metadata: bool = Field(
        True,
        description="Whether to include metadata in export"
    )
    include_content: bool = Field(
        True,
        description="Whether to include document content"
    )

    class Config:
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "export_format": "pdf",
                "include_metadata": True,
                "include_content": True
            }
        }


class DocumentUpdateRequest(BaseModel):
    """Request model for updating document."""

    title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Document title"
    )
    description: Optional[str] = Field(
        None,
        max_length=1000,
        description="Document description"
    )
    category: Optional[DocumentCategory] = Field(
        None,
        description="Document category"
    )
    tags: Optional[List[str]] = Field(
        None,
        max_items=20,
        description="Document tags"
    )
    status: Optional[DocumentStatus] = Field(
        None,
        description="Document status"
    )

    @validator('tags')
    def validate_tags(cls, v):
        """Validate tags."""
        if v:
            for tag in v:
                if not isinstance(tag, str) or len(tag) > 50:
                    raise ValueError("Each tag must be a string with max 50 characters")
                if any(c in tag for c in ['<', '>', '{', '}', '$', '..', '/']):
                    raise ValueError("Tags cannot contain dangerous characters")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Updated Invoice 2024-001",
                "description": "Updated Q1 Invoice",
                "category": "invoice",
                "tags": ["q1", "2024", "updated"],
                "status": "completed"
            }
        }


class FieldChange(BaseModel):
    """Field change tracking for audit."""
    field: str = Field(..., description="Field path (e.g., 'metadata.invoice_number')")
    original_value: Any = Field(..., description="Original extracted value")
    new_value: Any = Field(..., description="User-corrected value")
    timestamp: str = Field(..., description="ISO timestamp of change")

    class Config:
        json_schema_extra = {
            "example": {
                "field": "metadata.invoice_number",
                "original_value": "INV-2024-001",
                "new_value": "INV-2024-001-CORRECTED",
                "timestamp": "2024-01-15T10:30:00Z"
            }
        }


class DocumentConfirmRequest(BaseModel):
    """
    Request schema for confirming OCR extraction.

    Used when user reviews and confirms (with optional corrections)
    the extracted OCR data.
    """
    ocr_data: Dict[str, Any] = Field(
        ...,
        description="User-corrected OCR data (complete extraction result)"
    )
    user_confirmed: bool = Field(
        default=True,
        description="Confirmation flag"
    )
    field_changes: Optional[List[FieldChange]] = Field(
        None,
        description="Optional list of field changes for audit trail"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "ocr_data": {
                    "invoice_number": "INV-2024-001",
                    "date": "2024-01-15",
                    "total": 1250.00,
                    "line_items": [
                        {"description": "Service A", "amount": 1000.00},
                        {"description": "Service B", "amount": 250.00}
                    ]
                },
                "user_confirmed": True,
                "field_changes": [
                    {
                        "field": "total",
                        "original_value": 1200.00,
                        "new_value": 1250.00,
                        "timestamp": "2024-01-15T10:30:00Z"
                    }
                ]
            }
        }


class DocumentResponse(BaseModel):
    """Document response model."""

    id: str = Field(..., description="Document ID")
    title: str = Field(..., description="Document title")
    description: Optional[str] = Field(None, description="Document description")
    category: str = Field(..., description="Document category")
    status: str = Field(..., description="Processing status")
    file_type: str = Field(..., description="File MIME type")
    file_size: int = Field(..., description="File size in bytes")
    page_count: Optional[int] = Field(None, description="Number of pages")
    tags: Optional[List[str]] = Field(None, description="Document tags")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "title": "Invoice 2024-001",
                "description": "Q1 Invoice for services",
                "category": "invoice",
                "status": "completed",
                "file_type": "application/pdf",
                "file_size": 245678,
                "page_count": 3,
                "tags": ["q1", "2024", "services"],
                "created_at": "2024-01-15T10:00:00Z",
                "updated_at": "2024-01-15T10:05:00Z"
            }
        }

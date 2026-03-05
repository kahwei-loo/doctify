"""
OCR Request/Response Models

Pydantic models for OCR-related API endpoints.
"""

from __future__ import annotations


from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, validator


class ExtractionConfig(BaseModel):
    """
    OCR extraction configuration schema with security validation.

    Only allows specific configuration fields to prevent injection
    attacks and unauthorized service configuration changes.
    """

    # Language configuration
    language: Optional[str] = Field(
        "en",
        pattern="^[a-z]{2}(-[A-Z]{2})?$",
        description="OCR language code (ISO 639-1, optional ISO 3166-1)",
    )

    # Feature toggles
    detect_tables: Optional[bool] = Field(
        True, description="Whether to detect and extract tables"
    )
    detect_forms: Optional[bool] = Field(
        True, description="Whether to detect and extract form fields"
    )
    detect_handwriting: Optional[bool] = Field(
        False, description="Whether to attempt handwriting recognition"
    )
    detect_barcodes: Optional[bool] = Field(
        False, description="Whether to detect barcodes and QR codes"
    )

    # Quality settings
    confidence_threshold: Optional[float] = Field(
        0.7, ge=0.0, le=1.0, description="Minimum confidence threshold for OCR results"
    )
    deskew_enabled: Optional[bool] = Field(
        True, description="Whether to apply deskewing to images"
    )
    denoise_enabled: Optional[bool] = Field(
        False, description="Whether to apply denoising to images"
    )

    # Page processing
    page_range: Optional[str] = Field(
        None,
        pattern="^[0-9,-]+$",
        max_length=100,
        description="Page range to process (e.g., '1-5,8,10-12')",
    )
    max_pages: Optional[int] = Field(
        None, ge=1, le=1000, description="Maximum number of pages to process"
    )

    # Output format
    include_coordinates: Optional[bool] = Field(
        False, description="Whether to include text coordinates in output"
    )
    include_confidence_scores: Optional[bool] = Field(
        False, description="Whether to include confidence scores for each text block"
    )

    class Config:
        # Forbid extra fields to prevent service configuration injection
        extra = "forbid"
        json_schema_extra = {
            "example": {
                "language": "en",
                "detect_tables": True,
                "detect_forms": True,
                "detect_handwriting": False,
                "confidence_threshold": 0.7,
                "deskew_enabled": True,
                "page_range": "1-10",
                "include_coordinates": False,
            }
        }

    @validator("language")
    def validate_language(cls, v):
        """Validate language code."""
        if v:
            # Whitelist common languages to prevent injection
            allowed_languages = [
                "en",
                "zh",
                "es",
                "fr",
                "de",
                "ja",
                "ko",
                "ru",
                "ar",
                "hi",
                "pt",
                "it",
                "nl",
                "pl",
                "tr",
                "vi",
                "th",
                "id",
                "ms",
                "tl",
                "en-US",
                "en-GB",
                "zh-CN",
                "zh-TW",
                "es-ES",
                "es-MX",
                "fr-FR",
                "de-DE",
                "ja-JP",
                "ko-KR",
                "pt-BR",
                "pt-PT",
            ]
            if v not in allowed_languages:
                raise ValueError(
                    f"Language '{v}' not supported. Must be one of: {', '.join(allowed_languages[:10])}..."
                )
        return v

    @validator("page_range")
    def validate_page_range(cls, v):
        """Validate page range format."""
        if v:
            # Ensure page range doesn't contain dangerous characters
            if not all(c.isdigit() or c in ["-", ","] for c in v):
                raise ValueError(
                    "Page range must only contain digits, hyphens, and commas"
                )
            # Prevent excessive ranges
            parts = v.replace(",", "-").split("-")
            if len(parts) > 100:
                raise ValueError("Page range too complex (max 100 range components)")
        return v

    @validator("confidence_threshold")
    def validate_confidence(cls, v):
        """Validate confidence threshold."""
        if v is not None and not (0.0 <= v <= 1.0):
            raise ValueError("Confidence threshold must be between 0.0 and 1.0")
        return v


class ProcessDocumentRequest(BaseModel):
    """Request model for document OCR processing."""

    document_id: str = Field(
        ..., min_length=1, max_length=100, description="Document ID to process"
    )
    extraction_config: Optional[ExtractionConfig] = Field(
        None, description="OCR extraction configuration (validated for security)"
    )
    priority: Optional[str] = Field(
        "normal", pattern="^(low|normal|high)$", description="Processing priority"
    )

    @validator("document_id")
    def validate_document_id(cls, v):
        """Validate document ID format."""
        # Ensure document ID doesn't contain path traversal or injection attempts
        if any(char in v for char in ["/", "\\", "..", "$", "{", "}"]):
            raise ValueError("Document ID contains invalid characters")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "507f1f77bcf86cd799439011",
                "extraction_config": {
                    "language": "en",
                    "detect_tables": True,
                    "confidence_threshold": 0.8,
                },
                "priority": "normal",
            }
        }


class OCRResult(BaseModel):
    """OCR extraction result model."""

    text: str = Field(..., description="Extracted text")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    language: str = Field(..., description="Detected language")
    page_count: int = Field(..., description="Number of pages processed")
    tables: Optional[List[Dict[str, Any]]] = Field(None, description="Extracted tables")
    forms: Optional[List[Dict[str, Any]]] = Field(
        None, description="Extracted form fields"
    )
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "Invoice #2024-001\nDate: 2024-01-15...",
                "confidence": 0.95,
                "language": "en",
                "page_count": 3,
                "tables": [{"page": 1, "rows": 5, "columns": 3, "data": [[]]}],
                "metadata": {"processing_time": 2.5, "engine": "tesseract"},
            }
        }


class OCRStatusResponse(BaseModel):
    """OCR processing status response."""

    document_id: str = Field(..., description="Document ID")
    status: str = Field(..., description="Processing status")
    progress: int = Field(
        ..., ge=0, le=100, description="Processing progress percentage"
    )
    result: Optional[OCRResult] = Field(None, description="OCR result if completed")
    error: Optional[str] = Field(None, description="Error message if failed")
    started_at: Optional[str] = Field(None, description="Processing start time")
    completed_at: Optional[str] = Field(None, description="Processing completion time")

    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "507f1f77bcf86cd799439011",
                "status": "processing",
                "progress": 65,
                "started_at": "2024-01-15T10:00:00Z",
            }
        }

"""
Data Source Schemas

Pydantic models for data source request/response validation.
Phase 1 - Knowledge Base Feature (Week 2-3)
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator
import uuid


# ===========================
# Request Models
# ===========================

class DataSourceCreate(BaseModel):
    """Request model for creating a data source."""

    knowledge_base_id: uuid.UUID = Field(..., description="Parent knowledge base UUID")
    type: str = Field(
        ...,
        description="Type: uploaded_docs, website, text, qa_pairs",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Data source name",
        examples=["API Documentation"],
    )
    config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Type-specific configuration",
    )

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        """Validate data source type."""
        allowed_types = ["uploaded_docs", "website", "text", "qa_pairs", "structured_data"]
        if v not in allowed_types:
            raise ValueError(f"Type must be one of: {', '.join(allowed_types)}")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "knowledge_base_id": "550e8400-e29b-41d4-a716-446655440000",
                "type": "website",
                "name": "Public API Docs",
                "config": {
                    "url": "https://example.com/docs",
                    "max_depth": 2,
                    "include_patterns": ["*/api/*"],
                    "exclude_patterns": ["*/auth/*"],
                },
            }
        }
    )


class DataSourceUpdate(BaseModel):
    """Request model for updating a data source."""

    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Data source name",
    )
    config: Optional[Dict[str, Any]] = Field(
        None,
        description="Type-specific configuration",
    )
    status: Optional[str] = Field(
        None,
        description="Status: active, syncing, error, paused",
    )
    error_message: Optional[str] = Field(
        None,
        description="Error message (set to null to clear)",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Updated API Docs",
                "config": {
                    "url": "https://example.com/docs/v2",
                    "max_depth": 3,
                },
            }
        }
    )


# ===========================
# Response Models
# ===========================

class DataSourceResponse(BaseModel):
    """Response model for a data source."""

    id: uuid.UUID = Field(..., description="Data source UUID")
    knowledge_base_id: uuid.UUID = Field(..., description="Parent knowledge base UUID")
    type: str = Field(..., description="Data source type")
    name: str = Field(..., description="Data source name")
    config: Dict[str, Any] = Field(..., description="Configuration")
    status: str = Field(..., description="Status")
    error_message: Optional[str] = Field(None, description="Error message if status=error")
    document_count: Optional[int] = Field(0, description="Number of documents")
    embedding_count: Optional[int] = Field(0, description="Number of embeddings")
    last_synced_at: Optional[str] = Field(None, description="Last sync timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "660e8400-e29b-41d4-a716-446655440001",
                "knowledge_base_id": "550e8400-e29b-41d4-a716-446655440000",
                "type": "website",
                "name": "Public API Docs",
                "config": {
                    "url": "https://example.com/docs",
                    "max_depth": 2,
                },
                "status": "active",
                "error_message": None,
                "document_count": 45,
                "embedding_count": 890,
                "last_synced_at": "2024-01-21T12:30:00Z",
                "created_at": "2024-01-21T10:00:00Z",
                "updated_at": "2024-01-21T12:30:00Z",
            }
        },
    )


class DataSourceListResponse(BaseModel):
    """Response model for data source list."""

    items: List[DataSourceResponse] = Field(..., description="Data sources")
    total: int = Field(..., description="Total number of data sources")
    limit: int = Field(..., description="Items per page")
    offset: int = Field(..., description="Pagination offset")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "id": "660e8400-e29b-41d4-a716-446655440001",
                        "knowledge_base_id": "550e8400-e29b-41d4-a716-446655440000",
                        "type": "website",
                        "name": "API Docs",
                        "config": {"url": "https://example.com/docs"},
                        "status": "active",
                        "document_count": 45,
                        "embedding_count": 890,
                        "created_at": "2024-01-21T10:00:00Z",
                        "updated_at": "2024-01-21T12:30:00Z",
                    }
                ],
                "total": 5,
                "limit": 50,
                "offset": 0,
            }
        }
    )


class CrawlStatusResponse(BaseModel):
    """Response model for website crawl status."""

    task_id: str = Field(..., description="Celery task ID")
    status: str = Field(..., description="Task status: pending, in_progress, completed, failed")
    pages_crawled: int = Field(0, description="Number of pages crawled so far")
    total_pages: Optional[int] = Field(None, description="Total pages to crawl (estimate)")
    error: Optional[str] = Field(None, description="Error message if failed")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "task_id": "abc123-task-id",
                "status": "in_progress",
                "pages_crawled": 25,
                "total_pages": 50,
                "error": None,
            }
        }
    )

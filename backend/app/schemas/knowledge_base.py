"""
Knowledge Base Schemas

Pydantic models for knowledge base request/response validation.
Phase 1 - Knowledge Base Feature (Week 2-3)
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
import uuid

# ===========================
# Request Models
# ===========================


class KnowledgeBaseCreate(BaseModel):
    """Request model for creating a knowledge base."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Knowledge base name",
        examples=["Product Documentation"],
    )
    description: Optional[str] = Field(
        None,
        max_length=2000,
        description="Knowledge base description",
    )
    config: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Configuration (embedding model, chunk size, overlap)",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Product Documentation",
                "description": "Technical documentation for Product X",
                "config": {
                    "embedding_model": "text-embedding-3-small",
                    "chunk_size": 1024,
                    "chunk_overlap": 128,
                },
            }
        }
    )


class KnowledgeBaseUpdate(BaseModel):
    """Request model for updating a knowledge base."""

    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        description="Knowledge base name",
    )
    description: Optional[str] = Field(
        None,
        max_length=2000,
        description="Knowledge base description",
    )
    config: Optional[Dict[str, Any]] = Field(
        None,
        description="Configuration (embedding model, chunk size, overlap)",
    )
    status: Optional[str] = Field(
        None,
        description="Status: active, processing, paused, error",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Updated Documentation",
                "config": {
                    "embedding_model": "text-embedding-3-large",
                    "chunk_size": 2048,
                },
            }
        }
    )


# ===========================
# Response Models
# ===========================


class KnowledgeBaseResponse(BaseModel):
    """Response model for a knowledge base."""

    id: uuid.UUID = Field(..., description="Knowledge base UUID")
    user_id: uuid.UUID = Field(..., description="Owner user UUID")
    name: str = Field(..., description="Knowledge base name")
    description: Optional[str] = Field(None, description="Description")
    config: Dict[str, Any] = Field(..., description="Configuration")
    status: str = Field(..., description="Status")
    data_source_count: Optional[int] = Field(0, description="Number of data sources")
    embedding_count: Optional[int] = Field(0, description="Number of embeddings")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "name": "Product Documentation",
                "description": "Technical docs for Product X",
                "config": {
                    "embedding_model": "text-embedding-3-small",
                    "chunk_size": 1024,
                    "chunk_overlap": 128,
                },
                "status": "active",
                "data_source_count": 5,
                "embedding_count": 1234,
                "created_at": "2024-01-21T10:00:00Z",
                "updated_at": "2024-01-21T10:00:00Z",
            }
        },
    )


class KnowledgeBaseListResponse(BaseModel):
    """Response model for knowledge base list."""

    items: List[KnowledgeBaseResponse] = Field(..., description="Knowledge bases")
    total: int = Field(..., description="Total number of KBs")
    limit: int = Field(..., description="Items per page")
    offset: int = Field(..., description="Pagination offset")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "user_id": "123e4567-e89b-12d3-a456-426614174000",
                        "name": "Product Docs",
                        "description": "Product documentation",
                        "config": {"embedding_model": "text-embedding-3-small"},
                        "status": "active",
                        "data_source_count": 3,
                        "embedding_count": 567,
                        "created_at": "2024-01-21T10:00:00Z",
                        "updated_at": "2024-01-21T10:00:00Z",
                    }
                ],
                "total": 10,
                "limit": 50,
                "offset": 0,
            }
        }
    )


class KnowledgeBaseStatsResponse(BaseModel):
    """Response model for knowledge base statistics."""

    total_knowledge_bases: int = Field(..., description="Total number of KBs")
    total_data_sources: int = Field(..., description="Total data sources")
    total_embeddings: int = Field(..., description="Total embeddings")
    processing_count: int = Field(..., description="KBs currently processing")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_knowledge_bases": 10,
                "total_data_sources": 45,
                "total_embeddings": 12340,
                "processing_count": 2,
            }
        }
    )

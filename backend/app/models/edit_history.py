"""
Edit History Pydantic Models

Request and response models for edit history API endpoints.
"""

from __future__ import annotations


from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator


class EditHistoryBase(BaseModel):
    """Base edit history model with common fields."""

    field_path: str = Field(..., min_length=1, max_length=255)
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    edit_type: str = Field(default="manual", max_length=50)
    source: str = Field(default="web", max_length=20)


class EditHistoryCreate(EditHistoryBase):
    """Model for creating a new edit history entry."""

    document_id: str
    user_id: Optional[str] = None

    @field_validator("edit_type")
    @classmethod
    def validate_edit_type(cls, v: str) -> str:
        valid_types = ["manual", "bulk", "rollback", "ai_correction"]
        if v not in valid_types:
            raise ValueError(f"edit_type must be one of: {', '.join(valid_types)}")
        return v

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        valid_sources = ["web", "api", "mobile"]
        if v not in valid_sources:
            raise ValueError(f"source must be one of: {', '.join(valid_sources)}")
        return v


class EditHistoryResponse(BaseModel):
    """Response model for a single edit history entry."""

    id: str
    document_id: str
    user_id: Optional[str]
    field_path: str
    old_value: Optional[dict]
    new_value: Optional[dict]
    edit_type: str
    source: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    # Include user info if available
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class EditHistoryListResponse(BaseModel):
    """Response model for paginated edit history list."""

    success: bool = True
    data: List[EditHistoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TrackModificationRequest(BaseModel):
    """Request model for tracking a modification."""

    field_path: str = Field(..., min_length=1, max_length=255)
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    edit_type: str = Field(default="manual", max_length=50)

    @field_validator("edit_type")
    @classmethod
    def validate_edit_type(cls, v: str) -> str:
        valid_types = ["manual", "bulk", "rollback", "ai_correction"]
        if v not in valid_types:
            raise ValueError(f"edit_type must be one of: {', '.join(valid_types)}")
        return v


class BulkTrackModificationRequest(BaseModel):
    """Request model for tracking multiple modifications at once."""

    modifications: List[TrackModificationRequest] = Field(..., min_length=1)


class RollbackRequest(BaseModel):
    """Request model for rollback operations."""

    entry_id: Optional[str] = None
    timestamp: Optional[datetime] = None

    @field_validator("entry_id", "timestamp")
    @classmethod
    def validate_at_least_one(cls, v, info):
        return v


class RollbackResponse(BaseModel):
    """Response model for rollback operations."""

    success: bool = True
    message: str
    entries_count: int
    entries: List[EditHistoryResponse]


class EditHistoryApiResponse(BaseModel):
    """Standard API response wrapper for edit history."""

    success: bool = True
    data: EditHistoryResponse

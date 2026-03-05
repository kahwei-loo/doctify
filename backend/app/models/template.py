"""
Template Pydantic Models

Request and response models for template API endpoints.
"""

from __future__ import annotations


from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator

# Valid values for template fields
VALID_VISIBILITIES = {"private", "public", "organization"}
VALID_DOCUMENT_TYPES = {"invoice", "receipt", "contract", "form", "report", "custom"}


class FieldDefinition(BaseModel):
    """Definition of a field to extract."""

    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(default="string")  # string, number, date, boolean, array
    description: Optional[str] = None
    required: bool = Field(default=False)
    default_value: Optional[Any] = None


class TableColumnDefinition(BaseModel):
    """Definition of a table column."""

    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(default="string")
    description: Optional[str] = None


class TableDefinition(BaseModel):
    """Definition of a table to extract."""

    name: str = Field(..., min_length=1, max_length=100)
    columns: List[TableColumnDefinition] = Field(default_factory=list)
    description: Optional[str] = None


class ExtractionConfig(BaseModel):
    """Configuration for document extraction."""

    fields: List[FieldDefinition] = Field(default_factory=list)
    tables: List[TableDefinition] = Field(default_factory=list)
    instructions: Optional[str] = None  # Additional instructions for the AI


class TemplateBase(BaseModel):
    """Base template model with common fields."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    document_type: Optional[str] = Field(default="custom")
    category: Optional[str] = Field(default=None, max_length=50)
    tags: Optional[List[str]] = Field(default_factory=list)

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_DOCUMENT_TYPES:
            raise ValueError(
                f"Invalid document_type. Must be one of: {', '.join(VALID_DOCUMENT_TYPES)}"
            )
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            # Limit number of tags and tag length
            if len(v) > 10:
                raise ValueError("Maximum 10 tags allowed")
            for tag in v:
                if len(tag) > 50:
                    raise ValueError("Tag length must be 50 characters or less")
        return v


class TemplateCreate(TemplateBase):
    """Model for creating a new template."""

    visibility: str = Field(default="private")
    extraction_config: ExtractionConfig = Field(default_factory=ExtractionConfig)

    @field_validator("visibility")
    @classmethod
    def validate_visibility(cls, v: str) -> str:
        if v not in VALID_VISIBILITIES:
            raise ValueError(
                f"Invalid visibility. Must be one of: {', '.join(VALID_VISIBILITIES)}"
            )
        return v


class TemplateUpdate(BaseModel):
    """Model for updating a template (partial update)."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    document_type: Optional[str] = None
    visibility: Optional[str] = None
    extraction_config: Optional[ExtractionConfig] = None
    category: Optional[str] = Field(default=None, max_length=50)
    tags: Optional[List[str]] = None

    @field_validator("visibility")
    @classmethod
    def validate_visibility(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_VISIBILITIES:
            raise ValueError(
                f"Invalid visibility. Must be one of: {', '.join(VALID_VISIBILITIES)}"
            )
        return v

    @field_validator("document_type")
    @classmethod
    def validate_document_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_DOCUMENT_TYPES:
            raise ValueError(
                f"Invalid document_type. Must be one of: {', '.join(VALID_DOCUMENT_TYPES)}"
            )
        return v

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            if len(v) > 10:
                raise ValueError("Maximum 10 tags allowed")
            for tag in v:
                if len(tag) > 50:
                    raise ValueError("Tag length must be 50 characters or less")
        return v


class TemplateResponse(BaseModel):
    """Full template response."""

    id: str
    name: str
    description: Optional[str]
    user_id: str
    visibility: str
    document_type: Optional[str]
    extraction_config: dict
    category: Optional[str]
    tags: Optional[List[str]]
    version: int
    usage_count: int
    average_rating: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TemplateListItem(BaseModel):
    """Simplified template for list views."""

    id: str
    name: str
    description: Optional[str]
    document_type: Optional[str]
    visibility: str
    category: Optional[str]
    tags: Optional[List[str]]
    usage_count: int
    average_rating: float
    created_at: datetime

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    """Paginated template list response."""

    success: bool = True
    data: List[TemplateListItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class TemplateApiResponse(BaseModel):
    """Single template API response."""

    success: bool = True
    data: TemplateResponse


class ApplyTemplateRequest(BaseModel):
    """Request to apply a template to a project."""

    project_id: str


class ApplyTemplateResponse(BaseModel):
    """Response after applying a template."""

    success: bool = True
    message: str
    project_id: str
    template_id: str

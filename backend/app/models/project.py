"""
Project Pydantic Models

Request/response models for project management and configuration.
Based on the old project's complete configuration system.
"""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator

# =============================================================================
# Field Configuration Models
# =============================================================================


class FieldDefinition(BaseModel):
    """
    Field definition for extraction configuration.

    Corresponds to the old project's ConfigField structure.
    """

    name: str = Field(..., description="Field name (required)")
    description: Optional[str] = Field(None, description="Field description")
    type: Literal["text", "number", "date", "boolean", "array", "object"] = Field(
        default="text", description="Data type for the field"
    )
    required: bool = Field(default=False, description="Whether field is mandatory")
    default_value: Optional[str] = Field(
        None, description="Default value if not extracted"
    )
    fixed_value: Optional[str] = Field(
        None, description="Fixed value (overrides extraction)"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field name cannot be empty")
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "name": "invoice_number",
                "description": "Invoice reference number",
                "type": "text",
                "required": True,
                "default_value": None,
                "fixed_value": None,
            }
        }


# =============================================================================
# Column Configuration Models
# =============================================================================


class ColumnDefinition(BaseModel):
    """
    Column definition for table extraction configuration.
    """

    name: str = Field(..., description="Column name (required)")
    description: Optional[str] = Field(None, description="Column description")
    type: Literal["text", "number", "date", "boolean"] = Field(
        default="text", description="Data type for the column"
    )
    required: bool = Field(default=False, description="Whether column is mandatory")
    default_value: Optional[str] = Field(
        None, description="Default value if not extracted"
    )
    fixed_value: Optional[str] = Field(
        None, description="Fixed value (overrides extraction)"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Column name cannot be empty")
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "name": "item_description",
                "description": "Description of the line item",
                "type": "text",
                "required": True,
            }
        }


# =============================================================================
# Table Configuration Models
# =============================================================================


class TableDefinition(BaseModel):
    """
    Table definition for extraction configuration.

    Used to configure line item extraction from documents.
    """

    name: str = Field(..., description="Table name (required)")
    description: Optional[str] = Field(None, description="Table description")
    columns: List[ColumnDefinition] = Field(
        default_factory=list, description="Column definitions for the table"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Table name cannot be empty")
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "name": "line_items",
                "description": "Invoice line items",
                "columns": [
                    {"name": "item_no", "type": "number", "required": True},
                    {"name": "description", "type": "text", "required": True},
                    {"name": "quantity", "type": "number", "required": True},
                    {"name": "unit_price", "type": "number", "required": True},
                    {"name": "total", "type": "number", "required": True},
                ],
            }
        }


# =============================================================================
# Project Configuration Model
# =============================================================================


class ProjectConfig(BaseModel):
    """
    Complete project configuration model.

    This is the main configuration structure that combines all settings
    for document processing and OCR extraction.
    """

    # Basic OCR settings
    ocr_enabled: bool = Field(default=True, description="Enable OCR processing")
    ai_model: str = Field(
        default="openai/gpt-4o-mini", description="AI model to use for extraction"
    )
    language: str = Field(default="en", description="Primary document language")
    output_format: Literal["json", "xml", "csv"] = Field(
        default="json", description="Output format for extracted data"
    )

    # Field configuration (legacy project core feature)
    fields: List[FieldDefinition] = Field(
        default_factory=list, description="Field definitions for extraction"
    )

    # Table configuration (legacy project core feature)
    tables: List[TableDefinition] = Field(
        default_factory=list, description="Table definitions for line item extraction"
    )

    # Custom prompt (Layer 3 - highest priority)
    message_content: Optional[str] = Field(
        None,
        description="Custom extraction prompt (Layer 3 - overrides field/table config)",
    )

    # Sample output for AI few-shot learning
    sample_output: Optional[Dict[str, Any]] = Field(
        None, description="Expected JSON output structure for AI reference"
    )

    # Validation rules
    validation_rules: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Custom validation rules for extracted data"
    )

    @classmethod
    def get_default_config(cls) -> "ProjectConfig":
        """Get default project configuration."""
        return cls()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return self.model_dump()

    class Config:
        json_schema_extra = {
            "example": {
                "ocr_enabled": True,
                "ai_model": "openai/gpt-4o-mini",
                "language": "en",
                "output_format": "json",
                "fields": [
                    {"name": "invoice_number", "type": "text", "required": True},
                    {"name": "invoice_date", "type": "date", "required": True},
                    {"name": "total_amount", "type": "number", "required": True},
                ],
                "tables": [
                    {
                        "name": "line_items",
                        "description": "Invoice line items",
                        "columns": [
                            {"name": "description", "type": "text", "required": True},
                            {"name": "quantity", "type": "number", "required": True},
                            {"name": "unit_price", "type": "number", "required": True},
                        ],
                    }
                ],
                "message_content": None,
                "sample_output": {
                    "invoice_number": "INV-001",
                    "invoice_date": "2024-01-15",
                    "total_amount": 1500.00,
                    "line_items": [
                        {"description": "Item 1", "quantity": 2, "unit_price": 500.00}
                    ],
                },
            }
        }


# =============================================================================
# API Request/Response Models
# =============================================================================


class ProjectCreate(BaseModel):
    """Request model for creating a project."""

    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    description: Optional[str] = Field(None, description="Project description")
    config: Optional[ProjectConfig] = Field(
        default_factory=ProjectConfig, description="Initial project configuration"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Project name cannot be empty")
        return v.strip()


class ProjectUpdate(BaseModel):
    """Request model for updating a project."""

    name: Optional[str] = Field(
        None, min_length=1, max_length=255, description="New project name"
    )
    description: Optional[str] = Field(None, description="New project description")


class ProjectConfigUpdate(BaseModel):
    """Request model for updating project configuration."""

    config: ProjectConfig = Field(..., description="Updated project configuration")


class FieldDefinitionCreate(BaseModel):
    """Request model for adding a single field."""

    field: FieldDefinition


class TableDefinitionCreate(BaseModel):
    """Request model for adding a single table."""

    table: TableDefinition


class ProjectResponse(BaseModel):
    """Response model for project data."""

    project_id: str
    name: str
    description: Optional[str] = None
    config: ProjectConfig
    is_archived: bool = False
    created_at: str
    updated_at: str


class ProjectListItem(BaseModel):
    """Response model for project list items."""

    project_id: str
    name: str
    description: Optional[str] = None
    document_count: int = 0
    is_archived: bool = False
    created_at: str
    updated_at: str


# =============================================================================
# Helper Functions
# =============================================================================


def get_default_config_dict() -> Dict[str, Any]:
    """Get default project configuration as dictionary."""
    return ProjectConfig.get_default_config().to_dict()


def validate_config(config: Dict[str, Any]) -> ProjectConfig:
    """Validate and parse configuration dictionary."""
    return ProjectConfig.model_validate(config)


def merge_config(existing: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge configuration updates with existing configuration.

    Preserves existing values not present in updates.
    """
    merged = {**existing}
    for key, value in updates.items():
        if value is not None:
            merged[key] = value
    return merged

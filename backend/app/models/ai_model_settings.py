"""
Pydantic schemas for AI Model Settings API.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class AIModelSettingResponse(BaseModel):
    """Single model-purpose assignment (DB row or env-var default)."""

    purpose: str
    model_name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    source: str = Field(description="'database' or 'env_default'")


class AIModelSettingUpdate(BaseModel):
    """Payload for updating a model assignment."""

    model_name: str = Field(min_length=1, max_length=200)
    display_name: Optional[str] = Field(default=None, max_length=100)


class AIModelSettingsListResponse(BaseModel):
    """List of settings + env defaults for reference."""

    settings: List[AIModelSettingResponse]
    env_defaults: Dict[str, str]


class ModelCatalogEntry(BaseModel):
    """A single model in the curated catalog."""

    model_id: str
    display_name: str
    provider: str
    purposes: List[str]


class AIModelSettingsApiResponse(BaseModel):
    """Top-level API response wrapper."""

    success: bool
    data: AIModelSettingsListResponse


class ModelCatalogApiResponse(BaseModel):
    """Top-level API response for model catalog."""

    success: bool
    data: List[ModelCatalogEntry]

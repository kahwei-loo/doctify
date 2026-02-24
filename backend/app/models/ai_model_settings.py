"""
Pydantic schemas for AI Model Settings API.
"""

import re
import uuid
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


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
    """A single model in the curated catalog (read response)."""

    id: Optional[uuid.UUID] = None
    model_id: str
    display_name: str
    provider: str
    purposes: List[str]
    is_active: bool = True


VALID_PURPOSES = {"chat", "chat_fast", "embedding", "vision", "classifier", "reranker"}
MODEL_ID_PATTERN = re.compile(r"^[a-zA-Z0-9/_.\-:]+$")


class CreateModelCatalogEntry(BaseModel):
    """Payload for adding a new model to the catalog."""

    model_id: str = Field(min_length=1, max_length=200)
    display_name: str = Field(min_length=1, max_length=100)
    provider: str = Field(min_length=1, max_length=50)
    purposes: List[str] = Field(min_length=1)

    @field_validator("model_id")
    @classmethod
    def validate_model_id_format(cls, v: str) -> str:
        v = v.strip()
        if not MODEL_ID_PATTERN.match(v):
            raise ValueError(
                "model_id may only contain letters, digits, '/', '_', '.', '-', ':'."
            )
        return v

    @field_validator("purposes")
    @classmethod
    def validate_purposes(cls, v: List[str]) -> List[str]:
        invalid = set(v) - VALID_PURPOSES
        if invalid:
            raise ValueError(
                f"Invalid purposes: {sorted(invalid)}. "
                f"Valid: {sorted(VALID_PURPOSES)}"
            )
        return v

    @field_validator("provider")
    @classmethod
    def normalize_provider(cls, v: str) -> str:
        return v.strip()


class UpdateModelCatalogEntry(BaseModel):
    """Payload for partially updating a catalog entry."""

    display_name: Optional[str] = Field(default=None, max_length=100)
    provider: Optional[str] = Field(default=None, max_length=50)
    purposes: Optional[List[str]] = None
    is_active: Optional[bool] = None

    @field_validator("purposes")
    @classmethod
    def validate_purposes(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            invalid = set(v) - VALID_PURPOSES
            if invalid:
                raise ValueError(
                    f"Invalid purposes: {sorted(invalid)}. "
                    f"Valid: {sorted(VALID_PURPOSES)}"
                )
        return v

    @field_validator("provider")
    @classmethod
    def normalize_provider(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v


class AIModelSettingsApiResponse(BaseModel):
    """Top-level API response wrapper."""

    success: bool
    data: AIModelSettingsListResponse


class ModelCatalogApiResponse(BaseModel):
    """Top-level API response for model catalog."""

    success: bool
    data: List[ModelCatalogEntry]


class ModelCatalogEntryApiResponse(BaseModel):
    """Top-level API response for a single catalog entry."""

    success: bool
    data: ModelCatalogEntry

"""
AI Model Settings Service — DB-first with env-var fallback.

Manages the mapping of ModelPurpose → model_name, merging DB overrides
with environment-variable defaults. Also provides CRUD for the model catalog.
"""

import logging
import uuid
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.repositories.ai_model_settings_repository import AIModelSettingsRepository
from app.db.repositories.model_catalog_repository import ModelCatalogRepository
from app.models.ai_model_settings import (
    AIModelSettingResponse,
    AIModelSettingsListResponse,
    ModelCatalogEntry,
    CreateModelCatalogEntry,
    UpdateModelCatalogEntry,
)
from app.services.ai.gateway import ModelPurpose

logger = logging.getLogger(__name__)

# Purpose → Settings field name
_PURPOSE_ENV_MAP: Dict[str, str] = {
    "chat": "AI_GATEWAY_CHAT_MODEL",
    "chat_fast": "AI_GATEWAY_CHAT_FAST_MODEL",
    "embedding": "AI_GATEWAY_EMBEDDING_MODEL",
    "vision": "AI_GATEWAY_VISION_MODEL",
    "classifier": "AI_GATEWAY_CLASSIFIER_MODEL",
    "reranker": "AI_GATEWAY_RERANKER_MODEL",
}


def _get_env_defaults() -> Dict[str, str]:
    """Return a dict of purpose → env-var model name."""
    settings = get_settings()
    return {
        purpose: getattr(settings, field)
        for purpose, field in _PURPOSE_ENV_MAP.items()
    }


class AIModelSettingsService:
    """Reads from DB with env-var fallback, writes back through gateway cache."""

    def __init__(self, session: AsyncSession):
        self._repo = AIModelSettingsRepository(session)
        self._catalog_repo = ModelCatalogRepository(session)

    async def get_all_settings(self) -> AIModelSettingsListResponse:
        """Merge DB rows + env defaults for all purposes."""
        db_rows = await self._repo.get_all_active()
        env_defaults = _get_env_defaults()

        db_by_purpose = {row.purpose: row for row in db_rows}

        settings_list: List[AIModelSettingResponse] = []
        for purpose in ModelPurpose:
            db_row = db_by_purpose.get(purpose.value)
            if db_row:
                settings_list.append(AIModelSettingResponse(
                    purpose=db_row.purpose,
                    model_name=db_row.model_name,
                    display_name=db_row.display_name,
                    description=db_row.description,
                    is_active=db_row.is_active,
                    source="database",
                ))
            else:
                settings_list.append(AIModelSettingResponse(
                    purpose=purpose.value,
                    model_name=env_defaults.get(purpose.value, ""),
                    source="env_default",
                ))

        return AIModelSettingsListResponse(
            settings=settings_list,
            env_defaults=env_defaults,
        )

    async def update_setting(
        self,
        purpose: str,
        model_name: str,
        display_name: Optional[str] = None,
    ) -> AIModelSettingResponse:
        """Upsert a purpose → model mapping and refresh the gateway cache."""
        from app.services.ai.gateway import update_model_cache, reset_gateway

        row = await self._repo.upsert(
            purpose=purpose,
            model_name=model_name,
            display_name=display_name,
        )

        # Push into the module-level sync cache so the gateway picks it up
        update_model_cache(purpose, model_name)
        reset_gateway()

        return AIModelSettingResponse(
            purpose=row.purpose,
            model_name=row.model_name,
            display_name=row.display_name,
            description=row.description,
            is_active=row.is_active,
            source="database",
        )

    # ------------------------------------------------------------------
    # Model Catalog CRUD
    # ------------------------------------------------------------------

    async def get_model_catalog(self) -> List[ModelCatalogEntry]:
        """Return all active models from the catalog table."""
        rows = await self._catalog_repo.get_all_active()
        return [
            ModelCatalogEntry(
                id=row.id,
                model_id=row.model_id,
                display_name=row.display_name,
                provider=row.provider,
                purposes=row.purposes,
                is_active=row.is_active,
            )
            for row in rows
        ]

    async def create_catalog_entry(self, data: CreateModelCatalogEntry) -> ModelCatalogEntry:
        """Add a new model to the catalog. Raises 409 on duplicate model_id."""
        existing = await self._catalog_repo.get_by_model_id(data.model_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Model '{data.model_id}' already exists in the catalog.",
            )

        row = await self._catalog_repo.create({
            "model_id": data.model_id,
            "display_name": data.display_name,
            "provider": data.provider,
            "purposes": data.purposes,
        })
        return ModelCatalogEntry(
            id=row.id,
            model_id=row.model_id,
            display_name=row.display_name,
            provider=row.provider,
            purposes=row.purposes,
            is_active=row.is_active,
        )

    async def update_catalog_entry(
        self, entry_id: uuid.UUID, data: UpdateModelCatalogEntry,
    ) -> ModelCatalogEntry:
        """Partially update a catalog entry."""
        update_fields = data.model_dump(exclude_unset=True)
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update.",
            )

        row = await self._catalog_repo.update(entry_id, update_fields)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Catalog entry not found.",
            )
        return ModelCatalogEntry(
            id=row.id,
            model_id=row.model_id,
            display_name=row.display_name,
            provider=row.provider,
            purposes=row.purposes,
            is_active=row.is_active,
        )

    async def delete_catalog_entry(self, entry_id: uuid.UUID) -> bool:
        """Hard-delete a catalog entry."""
        deleted = await self._catalog_repo.delete(entry_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Catalog entry not found.",
            )
        return True

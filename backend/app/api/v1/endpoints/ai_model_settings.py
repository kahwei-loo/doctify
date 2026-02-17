"""
AI Model Settings — Admin-only endpoints for managing model assignments.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db_session, get_current_superuser
from app.db.models.user import User
from app.models.ai_model_settings import (
    AIModelSettingUpdate,
    AIModelSettingsApiResponse,
    ModelCatalogApiResponse,
)
from app.services.ai.gateway import ModelPurpose
from app.services.ai.model_settings_service import AIModelSettingsService

logger = logging.getLogger(__name__)

router = APIRouter()

VALID_PURPOSES = {p.value for p in ModelPurpose}


@router.get(
    "",
    response_model=AIModelSettingsApiResponse,
    summary="List all AI model settings",
)
async def list_ai_model_settings(
    _admin: User = Depends(get_current_superuser),
    session: AsyncSession = Depends(get_db_session),
):
    """Return merged DB + env-default settings for every ModelPurpose."""
    service = AIModelSettingsService(session)
    data = await service.get_all_settings()
    return AIModelSettingsApiResponse(success=True, data=data)


@router.patch(
    "/{purpose}",
    response_model=AIModelSettingsApiResponse,
    summary="Update model for a specific purpose",
)
async def update_ai_model_setting(
    purpose: str,
    body: AIModelSettingUpdate,
    _admin: User = Depends(get_current_superuser),
    session: AsyncSession = Depends(get_db_session),
):
    """Upsert a model assignment and refresh the gateway singleton."""
    if purpose not in VALID_PURPOSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid purpose '{purpose}'. Valid: {sorted(VALID_PURPOSES)}",
        )

    service = AIModelSettingsService(session)
    await service.update_setting(
        purpose=purpose,
        model_name=body.model_name,
        display_name=body.display_name,
    )

    # Return the full refreshed list so the frontend can update in one call
    data = await service.get_all_settings()
    return AIModelSettingsApiResponse(success=True, data=data)


@router.get(
    "/catalog",
    response_model=ModelCatalogApiResponse,
    summary="Get curated model catalog",
)
async def get_model_catalog(
    _admin: User = Depends(get_current_superuser),
):
    """Return the hardcoded curated model catalog."""
    catalog = AIModelSettingsService.get_model_catalog()
    return ModelCatalogApiResponse(success=True, data=catalog)

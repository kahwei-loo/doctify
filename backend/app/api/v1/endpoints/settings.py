"""
User Settings API Endpoints

Provides endpoints for user settings management.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.deps import get_current_verified_user
from app.db.models.user import User
from app.db.database import get_db
from app.services.user.settings_service import SettingsService
from app.models.settings import (
    UserSettingsResponse,
    UserSettingsUpdate,
    SettingsApiResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# =============================================================================
# Dependencies
# =============================================================================


async def get_settings_service(
    db: AsyncSession = Depends(get_db),
) -> SettingsService:
    """Get settings service instance."""
    return SettingsService(db)


# =============================================================================
# Settings Endpoints
# =============================================================================


@router.get("", response_model=SettingsApiResponse)
async def get_settings(
    current_user: User = Depends(get_current_verified_user),
    settings_service: SettingsService = Depends(get_settings_service),
):
    """
    Get current user's settings.

    Returns the user's personalized settings including:
    - Theme preference (light/dark/system)
    - Language
    - Notification preferences
    - Display density
    - Date format
    - Timezone

    If no settings exist, default settings are created automatically.
    """
    settings = await settings_service.get_user_settings(str(current_user.id))

    return SettingsApiResponse(
        success=True,
        data=settings,
    )


@router.patch("", response_model=SettingsApiResponse)
async def update_settings(
    updates: UserSettingsUpdate,
    current_user: User = Depends(get_current_verified_user),
    settings_service: SettingsService = Depends(get_settings_service),
):
    """
    Update user settings (partial update).

    Only provided fields will be updated. Omit fields to keep
    their current values.

    **Valid Values:**
    - `theme`: "light", "dark", or "system"
    - `language`: "en", "zh-CN", "ms", "es", "fr", "de", "ja", "ko", "pt", "it", "ru"
    - `display_density`: "compact", "comfortable", or "spacious"
    - `date_format`: "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", or "DD-MM-YYYY"
    - `timezone`: Any valid IANA timezone (e.g., "Asia/Kuala_Lumpur")

    **Example Request:**
    ```json
    {
        "theme": "dark",
        "notifications_email": false
    }
    ```
    """
    try:
        updated_settings = await settings_service.update_settings(
            str(current_user.id),
            updates,
        )

        return SettingsApiResponse(
            success=True,
            data=updated_settings,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

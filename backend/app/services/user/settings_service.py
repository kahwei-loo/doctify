"""
User Settings Service

Provides user settings management with create/update operations.
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user_settings import UserSettings
from app.models.settings import UserSettingsResponse, UserSettingsUpdate

logger = logging.getLogger(__name__)


class SettingsService:
    """
    User settings service.

    Provides CRUD operations for user settings including:
    - Theme preferences
    - Language settings
    - Notification preferences
    - Display options
    """

    # Valid values for validation
    VALID_THEMES = {"light", "dark", "system"}
    VALID_LANGUAGES = {
        "en",
        "zh-CN",
        "ms",
        "es",
        "fr",
        "de",
        "ja",
        "ko",
        "pt",
        "it",
        "ru",
    }
    VALID_DENSITIES = {"compact", "comfortable", "spacious"}
    VALID_DATE_FORMATS = {"YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "DD-MM-YYYY"}

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_settings(
        self,
        user_id: str,
    ) -> UserSettingsResponse:
        """
        Get settings for a user.

        If settings don't exist, creates default settings.

        Args:
            user_id: User ID

        Returns:
            UserSettingsResponse with current settings
        """
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        # Query existing settings
        query = select(UserSettings).where(UserSettings.user_id == user_uuid)
        result = await self.session.execute(query)
        settings = result.scalar_one_or_none()

        # If no settings exist, create default settings
        if settings is None:
            settings = await self._create_default_settings(user_uuid)
            logger.info(f"Created default settings for user {user_id}")

        return self._to_response(settings)

    async def _create_default_settings(self, user_id: UUID) -> UserSettings:
        """Create default settings for a user."""
        settings = UserSettings(
            user_id=user_id,
            theme="system",
            language="en",
            notifications_email=True,
            notifications_push=True,
            display_density="comfortable",
            date_format="YYYY-MM-DD",
            timezone="Asia/Kuala_Lumpur",
        )
        self.session.add(settings)
        await self.session.commit()
        await self.session.refresh(settings)
        return settings

    async def update_settings(
        self,
        user_id: str,
        updates: UserSettingsUpdate,
    ) -> UserSettingsResponse:
        """
        Update user settings (partial update).

        Only updates fields that are provided (not None).

        Args:
            user_id: User ID
            updates: Partial settings update

        Returns:
            Updated UserSettingsResponse
        """
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        # Get or create settings
        query = select(UserSettings).where(UserSettings.user_id == user_uuid)
        result = await self.session.execute(query)
        settings = result.scalar_one_or_none()

        if settings is None:
            settings = await self._create_default_settings(user_uuid)

        # Apply updates (only non-None values)
        update_data = updates.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None:
                # Validate values
                if field == "theme" and value not in self.VALID_THEMES:
                    raise ValueError(
                        f"Invalid theme: {value}. Valid: {self.VALID_THEMES}"
                    )
                if field == "language" and value not in self.VALID_LANGUAGES:
                    raise ValueError(
                        f"Invalid language: {value}. Valid: {self.VALID_LANGUAGES}"
                    )
                if field == "display_density" and value not in self.VALID_DENSITIES:
                    raise ValueError(
                        f"Invalid density: {value}. Valid: {self.VALID_DENSITIES}"
                    )
                if field == "date_format" and value not in self.VALID_DATE_FORMATS:
                    raise ValueError(
                        f"Invalid date format: {value}. Valid: {self.VALID_DATE_FORMATS}"
                    )

                setattr(settings, field, value)

        await self.session.commit()
        await self.session.refresh(settings)

        logger.info(f"Updated settings for user {user_id}: {list(update_data.keys())}")
        return self._to_response(settings)

    def _to_response(self, settings: UserSettings) -> UserSettingsResponse:
        """Convert UserSettings model to response."""
        return UserSettingsResponse(
            theme=settings.theme,
            language=settings.language,
            notifications_email=settings.notifications_email,
            notifications_push=settings.notifications_push,
            display_density=settings.display_density,
            date_format=settings.date_format,
            timezone=settings.timezone,
        )

"""
Repository for AI Model Settings CRUD operations.
"""

from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.ai_model_setting import AIModelSetting
from app.db.repositories.base import BaseRepository


class AIModelSettingsRepository(BaseRepository[AIModelSetting]):
    """Repository for ai_model_settings table."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, AIModelSetting)

    async def get_by_purpose(self, purpose: str) -> Optional[AIModelSetting]:
        """Get a single setting by purpose key."""
        stmt = select(AIModelSetting).where(AIModelSetting.purpose == purpose)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_active(self) -> List[AIModelSetting]:
        """Get all active model settings."""
        stmt = (
            select(AIModelSetting)
            .where(AIModelSetting.is_active == True)  # noqa: E712
            .order_by(AIModelSetting.purpose)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def upsert(
        self,
        purpose: str,
        model_name: str,
        display_name: Optional[str] = None,
        description: Optional[str] = None,
    ) -> AIModelSetting:
        """Insert or update a model setting for the given purpose."""
        existing = await self.get_by_purpose(purpose)

        if existing:
            existing.model_name = model_name
            if display_name is not None:
                existing.display_name = display_name
            if description is not None:
                existing.description = description
            await self.session.flush()
            await self.session.refresh(existing)
            return existing

        return await self.create(
            {
                "purpose": purpose,
                "model_name": model_name,
                "display_name": display_name,
                "description": description,
            }
        )

"""
Repository for Model Catalog CRUD operations.
"""

from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.model_catalog import ModelCatalog
from app.db.repositories.base import BaseRepository


class ModelCatalogRepository(BaseRepository[ModelCatalog]):
    """Repository for model_catalog table."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, ModelCatalog)

    async def get_all_active(self) -> List[ModelCatalog]:
        """Get all active catalog entries ordered by provider, display_name."""
        stmt = (
            select(ModelCatalog)
            .where(ModelCatalog.is_active == True)  # noqa: E712
            .order_by(ModelCatalog.provider, ModelCatalog.display_name)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_model_id(self, model_id: str) -> Optional[ModelCatalog]:
        """Get a single entry by its unique model_id string."""
        stmt = select(ModelCatalog).where(ModelCatalog.model_id == model_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

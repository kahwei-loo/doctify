"""
Model Catalog — the menu of available AI models.

Each row represents one AI model that admins can assign to purposes
via the AI Model Settings system. Replaces the hardcoded MODEL_CATALOG list.
"""

from sqlalchemy import String, Boolean, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import BaseModel


class ModelCatalog(BaseModel):
    """A single AI model available for assignment to purposes."""

    __tablename__ = "model_catalog"

    model_id: Mapped[str] = mapped_column(
        String(200),
        unique=True,
        nullable=False,
        index=True,
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    purposes: Mapped[list] = mapped_column(
        JSONB, server_default="'[]'::jsonb", nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, server_default="true", nullable=False
    )

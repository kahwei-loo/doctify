"""
AI Model Setting — system-wide model assignment per purpose.

Each row overrides the env-var default for a single ModelPurpose.
"""

from sqlalchemy import String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base import BaseModel


class AIModelSetting(BaseModel):
    """Persisted model-per-purpose assignment (admin-managed)."""

    __tablename__ = "ai_model_settings"

    purpose: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    model_name: Mapped[str] = mapped_column(String(200), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)

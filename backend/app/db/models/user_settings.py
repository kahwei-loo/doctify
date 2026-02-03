"""
User Settings Model

Stores user preferences for theme, language, notifications, and display options.
"""

from __future__ import annotations

from typing import Optional
from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from .base import BaseModel


class UserSettings(BaseModel):
    """
    User settings and preferences.

    Stores per-user settings for:
    - Theme (light/dark/system)
    - Language preferences
    - Notification preferences
    - Display density
    - Date/time formatting
    """

    __tablename__ = "user_settings"

    # Foreign key to user (one-to-one relationship)
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Theme settings
    theme: Mapped[str] = mapped_column(
        String(20),
        default="system",
        nullable=False,
    )  # light | dark | system

    # Language settings
    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False,
    )  # en | zh-CN | ms | etc.

    # Notification preferences
    notifications_email: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    notifications_push: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Display preferences
    display_density: Mapped[str] = mapped_column(
        String(20),
        default="comfortable",
        nullable=False,
    )  # compact | comfortable | spacious

    # Date/time formatting
    date_format: Mapped[str] = mapped_column(
        String(20),
        default="YYYY-MM-DD",
        nullable=False,
    )

    timezone: Mapped[str] = mapped_column(
        String(50),
        default="Asia/Kuala_Lumpur",
        nullable=False,
    )

    # Relationship back to user
    user: Mapped["User"] = relationship(
        "User",
        back_populates="settings",
    )

    def __repr__(self) -> str:
        return f"<UserSettings(user_id={self.user_id}, theme={self.theme})>"

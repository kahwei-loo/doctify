"""
API Key SQLAlchemy Model

Database model for API key management.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.db.models.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.user import User


class ApiKey(BaseModel):
    """
    API Key model.

    Stores API keys for programmatic access to the application.
    """

    __tablename__ = "api_keys"

    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Key fields
    key_hash: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    key_prefix: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Status fields
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    # Timestamps
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Usage tracking
    usage_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Permissions/Scopes (comma-separated or JSON)
    scopes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        default="read,write",
    )

    # Relationship
    user: Mapped["User"] = relationship(
        "User",
        back_populates="api_keys",
    )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_api_keys_user_active", "user_id", "is_active"),
        Index("ix_api_keys_expires_at", "expires_at"),
    )

    def is_valid(self) -> bool:
        """Check if API key is valid and not expired."""
        if not self.is_active:
            return False
        if self.revoked_at is not None:
            return False
        if self.expires_at is not None:
            return datetime.utcnow() < self.expires_at.replace(tzinfo=None)
        return True

    def has_scope(self, scope: str) -> bool:
        """Check if API key has a specific scope."""
        if not self.scopes:
            return False
        return scope in self.scopes.split(",")

    def __repr__(self) -> str:
        return f"<ApiKey(id={self.id}, prefix={self.key_prefix}, user_id={self.user_id})>"

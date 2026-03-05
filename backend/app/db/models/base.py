"""
Base Model for SQLAlchemy ORM

Provides common fields and behaviors for all database models.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, declared_attr
from sqlalchemy.dialects.postgresql import UUID

from app.db.database import Base


class TimestampMixin:
    """
    Mixin providing created_at and updated_at timestamps.

    These fields are automatically managed by SQLAlchemy.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class UUIDMixin:
    """
    Mixin providing UUID primary key.

    Uses PostgreSQL's native UUID type for efficient storage.
    """

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )


class BaseModel(Base, UUIDMixin, TimestampMixin):
    """
    Abstract base model with UUID primary key and timestamps.

    All models should inherit from this class to get:
    - UUID primary key
    - created_at timestamp
    - updated_at timestamp (auto-updated)
    """

    __abstract__ = True

    @declared_attr
    def __tablename__(cls) -> str:
        """Generate table name from class name (snake_case)."""
        import re

        name = cls.__name__
        # Convert CamelCase to snake_case
        s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
        return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()

    def to_dict(self) -> dict[str, Any]:
        """
        Convert model instance to dictionary.

        Useful for serialization and API responses.
        """
        return {
            column.name: getattr(self, column.name) for column in self.__table__.columns
        }

    def __repr__(self) -> str:
        """Generate string representation."""
        return f"<{self.__class__.__name__}(id={self.id})>"

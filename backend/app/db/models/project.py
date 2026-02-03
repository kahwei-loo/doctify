"""
Project SQLAlchemy Model

Database model for project management and configuration.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON

from app.db.models.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.document import Document


class Project(BaseModel):
    """
    Project model.

    Stores project configuration and document processing settings.
    """

    __tablename__ = "projects"

    # Foreign key to user
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Project metadata
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Project configuration (JSONB for flexible schema)
    # Structure matches ProjectConfig Pydantic model in app.models.project
    config: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=lambda: {
            # Basic OCR settings
            "ocr_enabled": True,
            "ai_model": "openai/gpt-4o-mini",
            "language": "en",
            "output_format": "json",
            # Field configuration (core feature from old project)
            "fields": [],
            # Table configuration (core feature from old project)
            "tables": [],
            # Custom prompt (Layer 3 - highest priority)
            "message_content": None,
            # Sample output for AI few-shot learning
            "sample_output": None,
            # Validation rules
            "validation_rules": {},
        },
        nullable=True,
    )

    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    archived_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="projects",
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_projects_user_active", "user_id", "is_active"),
        Index("ix_projects_user_created", "user_id", "created_at"),
        Index("ix_projects_name", "name"),
    )

    def can_process_documents(self) -> bool:
        """Check if project can process documents."""
        return self.is_active

    def is_archived(self) -> bool:
        """Check if project is archived."""
        return not self.is_active and self.archived_at is not None

    def get_config_value(self, key: str, default=None):
        """Get a configuration value."""
        if self.config is None:
            return default
        return self.config.get(key, default)

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name={self.name}, is_active={self.is_active})>"

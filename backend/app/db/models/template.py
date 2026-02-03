"""
Template Model

SQLAlchemy model for extraction templates with schema configuration.
Templates allow users to save and reuse extraction configurations.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel

if TYPE_CHECKING:
    from .user import User


class Template(BaseModel):
    """
    Template model for reusable extraction configurations.

    Attributes:
        name: Template name (max 100 chars)
        description: Optional description of the template
        user_id: Owner of the template
        visibility: 'private' | 'public' | 'organization'
        document_type: Type of document (invoice, receipt, contract, custom)
        extraction_config: JSON schema defining fields and tables to extract
        category: Optional category for organization
        tags: Array of tags for filtering
        version: Template version number
        usage_count: Number of times template has been used
        rating_sum: Sum of all ratings (for calculating average)
        rating_count: Number of ratings received
    """

    __tablename__ = "templates"

    # Basic info
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Ownership and visibility
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    visibility: Mapped[str] = mapped_column(
        String(20),
        default="private",
        nullable=False,
        index=True,
    )

    # Template content
    document_type: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    extraction_config: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )

    # Organization
    category: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        index=True,
    )
    tags: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String(50)),
        nullable=True,
        default=list,
    )

    # Versioning
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    # Statistics
    usage_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    rating_sum: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    rating_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Soft delete support
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="templates",
    )

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_templates_user_visibility", "user_id", "visibility"),
        Index("ix_templates_document_type_category", "document_type", "category"),
    )

    @property
    def average_rating(self) -> float:
        """Calculate average rating."""
        if self.rating_count == 0:
            return 0.0
        return self.rating_sum / self.rating_count

    def __repr__(self) -> str:
        return f"<Template(id={self.id}, name='{self.name}', visibility='{self.visibility}')>"

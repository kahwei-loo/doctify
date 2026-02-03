"""
Edit History Model

SQLAlchemy model for tracking document extraction result modifications.
Provides audit trail and rollback capability.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import BaseModel

if TYPE_CHECKING:
    from .user import User
    from .document import Document


class EditHistory(BaseModel):
    """
    Edit history model for tracking extraction result modifications.

    Each record represents a single field change, enabling granular
    rollback and audit capabilities.

    Attributes:
        document_id: ID of the document whose results were modified
        user_id: ID of the user who made the modification
        field_path: JSON path to the modified field (e.g., "results.invoice_number")
        old_value: Previous value (can be any JSON-serializable type)
        new_value: New value (can be any JSON-serializable type)
        edit_type: Type of edit (manual, bulk, rollback, ai_correction)
        source: Source of the edit (web, api, mobile)
        ip_address: IP address of the client (for audit)
        user_agent: User agent string (for audit)
    """

    __tablename__ = "edit_history"

    # Foreign keys
    document_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,  # Allow null if user is deleted
        index=True,
    )

    # Change details
    field_path: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    old_value: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )
    new_value: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )

    # Metadata
    edit_type: Mapped[str] = mapped_column(
        String(50),
        default="manual",
        nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(20),
        default="web",
        nullable=False,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),  # IPv6 max length
        nullable=True,
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )

    # Relationships
    document: Mapped["Document"] = relationship(
        "Document",
        back_populates="edit_history",
    )
    user: Mapped[Optional["User"]] = relationship(
        "User",
        lazy="selectin",
    )

    # Indexes for efficient queries
    __table_args__ = (
        Index("ix_edit_history_document_created", "document_id", "created_at"),
        Index("ix_edit_history_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<EditHistory(id={self.id}, document_id={self.document_id}, field='{self.field_path}')>"

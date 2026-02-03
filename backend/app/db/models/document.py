"""
Document SQLAlchemy Model

Database model for document storage and processing metadata.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    String, Boolean, Integer, BigInteger, DateTime,
    ForeignKey, Text, Index, Enum as SQLEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSON, ARRAY

from app.db.models.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.project import Project
    from app.db.models.edit_history import EditHistory
    from app.db.models.rag import DocumentEmbedding


class Document(BaseModel):
    """
    Document model.

    Stores document metadata, processing status, and extracted content.
    """

    __tablename__ = "documents"

    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Document metadata
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # File information
    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    file_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    file_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    page_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    # Processing status
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
        index=True,
    )
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    processing_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Classification
    category: Mapped[str] = mapped_column(
        String(50),
        default="other",
        nullable=False,
    )
    tags: Mapped[Optional[list]] = mapped_column(
        ARRAY(String(50)),
        nullable=True,
    )

    # OCR/Extraction results (JSONB for flexible schema)
    extracted_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    extracted_data: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )
    extraction_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
    )

    # User confirmation fields
    user_corrected_data: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        comment="User-corrected OCR data after confirmation",
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
        comment="Timestamp when document was confirmed by user",
    )
    confirmed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who confirmed the document",
    )

    # Token usage tracking
    tokens_used: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Soft delete
    is_archived: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    archived_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="documents",
        foreign_keys=lambda: [Document.user_id],
    )
    project: Mapped[Optional["Project"]] = relationship(
        "Project",
        back_populates="documents",
    )
    edit_history: Mapped[list["EditHistory"]] = relationship(
        "EditHistory",
        back_populates="document",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    embeddings: Mapped[list["DocumentEmbedding"]] = relationship(
        "DocumentEmbedding",
        back_populates="document",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_documents_user_status", "user_id", "status"),
        Index("ix_documents_user_created", "user_id", "created_at"),
        Index("ix_documents_project_status", "project_id", "status"),
        Index("ix_documents_category", "category"),
    )

    def is_processed(self) -> bool:
        """Check if document has been processed."""
        return self.status == "processed"

    def is_processing(self) -> bool:
        """Check if document is currently being processed."""
        return self.status == "processing"

    def has_error(self) -> bool:
        """Check if document processing failed."""
        return self.status == "failed"

    def is_confirmed(self) -> bool:
        """Check if document has been confirmed by user."""
        return self.confirmed_at is not None

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, title={self.title}, status={self.status})>"

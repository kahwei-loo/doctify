"""
Knowledge Base SQLAlchemy Models

Models for knowledge bases and their data sources.
Phase 1 - Knowledge Base Feature (Week 2-3)
"""

from __future__ import annotations

import uuid
from typing import Optional, Dict, Any, TYPE_CHECKING

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.models.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.rag import DocumentEmbedding


class KnowledgeBase(BaseModel):
    """
    Knowledge Base for organizing and managing data sources.

    A knowledge base is a collection of data sources (documents, websites, text, Q&A pairs)
    that can be queried semantically using embeddings.
    """

    __tablename__ = "knowledge_bases"

    # Owner
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Basic information
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Configuration (embedding model, chunk size, overlap, etc.)
    config: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    # Status: active, processing, paused, error
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,
        index=True,
    )

    # Relationships
    user = relationship("User", back_populates="knowledge_bases")
    data_sources = relationship(
        "DataSource",
        back_populates="knowledge_base",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<KnowledgeBase(id={self.id}, name='{self.name}', user_id={self.user_id})>"
        )


class DataSource(BaseModel):
    """
    Data source within a knowledge base.

    Supports 4 types:
    - uploaded_docs: User-uploaded PDF/DOCX/TXT files
    - website: Crawled website content
    - text: Direct text input
    - qa_pairs: Question-answer pairs
    """

    __tablename__ = "data_sources"

    # Parent knowledge base
    knowledge_base_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_bases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Type: uploaded_docs, website, text, qa_pairs
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    # Basic information
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Type-specific configuration
    # For uploaded_docs: {document_ids: [uuid, ...]}
    # For website: {url: str, max_depth: int, include_patterns: [...], exclude_patterns: [...]}
    # For text: {content: str}
    # For qa_pairs: {pairs: [{question: str, answer: str}, ...]}
    config: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    # Status: active, syncing, error, paused
    status: Mapped[str] = mapped_column(
        String(50),
        default="active",
        nullable=False,
        index=True,
    )

    # Error message if status = error
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Statistics
    document_count: Mapped[Optional[int]] = mapped_column(
        default=0,
        nullable=True,
    )
    embedding_count: Mapped[Optional[int]] = mapped_column(
        default=0,
        nullable=True,
    )

    # Last sync timestamp
    last_synced_at: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    # Relationships
    knowledge_base = relationship("KnowledgeBase", back_populates="data_sources")
    embeddings = relationship(
        "DocumentEmbedding",
        back_populates="data_source",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<DataSource(id={self.id}, name='{self.name}', type='{self.type}', kb_id={self.knowledge_base_id})>"

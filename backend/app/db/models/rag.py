"""
RAG (Retrieval Augmented Generation) SQLAlchemy Models

Models for document embeddings and query history.
Phase 11 - RAG Implementation
"""

from __future__ import annotations

import uuid
from typing import Optional, Dict, Any, List, TYPE_CHECKING
from datetime import datetime

from sqlalchemy import String, Integer, Float, Text, ForeignKey, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from pgvector.sqlalchemy import Vector

from app.db.models.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.user import User
    from app.db.models.document import Document
    from app.db.models.knowledge_base import DataSource


class DocumentEmbedding(BaseModel):
    """
    Document chunk embeddings for semantic search.

    Stores text chunks with their vector embeddings for RAG retrieval.
    Uses pgvector for efficient similarity search.
    """

    __tablename__ = "document_embeddings"

    # Foreign key to document (for document-based embeddings)
    document_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Foreign key to data source (for knowledge base embeddings)
    data_source_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data_sources.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Chunk information
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    chunk_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Vector embedding (1536 dimensions for text-embedding-3-small)
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        Vector(1536),
        nullable=True,
    )

    # Full-text search vector (auto-maintained by trigger)
    search_vector = mapped_column(
        TSVECTOR,
        nullable=True,
    )

    # Metadata (page number, token count, confidence, etc.)
    # Note: renamed from 'metadata' to 'chunk_metadata' as 'metadata' is reserved in SQLAlchemy
    chunk_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        "metadata",  # Database column name is still 'metadata'
        JSONB,
        default=dict,
        nullable=True,
    )

    # Relationships
    document = relationship("Document", back_populates="embeddings")
    data_source = relationship("DataSource", back_populates="embeddings")

    # Table constraints
    __table_args__ = (
        # Ensure exactly one of document_id or data_source_id is set
        CheckConstraint(
            "(document_id IS NOT NULL AND data_source_id IS NULL) OR "
            "(document_id IS NULL AND data_source_id IS NOT NULL)",
            name="check_embedding_source"
        ),
        # Chunk index must be non-negative
        CheckConstraint(
            "chunk_index >= 0",
            name="check_chunk_index_valid"
        ),
        # Vector index for similarity search (created in migration)
        Index('ix_embeddings_document_id', 'document_id'),
    )

    def __repr__(self) -> str:
        return f"<DocumentEmbedding(id={self.id}, document_id={self.document_id}, chunk={self.chunk_index})>"


class RAGConversation(BaseModel):
    """
    Multi-turn RAG conversation session.

    Groups related RAG queries into a conversation thread.
    P1.3 - Conversational RAG
    """

    __tablename__ = "rag_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    # Relationships
    user = relationship("User")
    queries = relationship("RAGQuery", back_populates="conversation", order_by="RAGQuery.created_at")

    def __repr__(self) -> str:
        return f"<RAGConversation(id={self.id}, title='{self.title[:30]}')>"


class RAGQuery(BaseModel):
    """
    RAG query history for audit and analytics.

    Tracks user questions, AI-generated answers, sources, and feedback.
    """

    __tablename__ = "rag_queries"

    # User who asked the question
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Optional conversation link (P1.3)
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rag_conversations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Question and answer
    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    answer: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Sources: list of {document_id, chunk_index, similarity_score, chunk_text}
    sources: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSONB,
        nullable=True,
    )

    # AI metadata
    model_used: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    tokens_used: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    confidence_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )

    # Groundedness / hallucination detection (P2.2)
    groundedness_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    unsupported_claims: Mapped[Optional[List[str]]] = mapped_column(
        JSONB,
        nullable=True,
    )

    # User feedback
    feedback_rating: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    feedback_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    user = relationship("User", back_populates="rag_queries")
    conversation = relationship("RAGConversation", back_populates="queries")

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            'feedback_rating IS NULL OR (feedback_rating BETWEEN 1 AND 5)',
            name='check_feedback_rating'
        ),
        Index('ix_rag_queries_created_at', 'created_at'),
    )

    def __repr__(self) -> str:
        return f"<RAGQuery(id={self.id}, user_id={self.user_id}, question='{self.question[:30]}...')>"


class RAGEvaluation(BaseModel):
    """
    RAG quality evaluation results.

    Stores periodic evaluation metrics computed from sampled queries.
    P3.2 - RAGAS Evaluation
    """

    __tablename__ = "rag_evaluations"

    # Evaluation metrics (0.0 - 1.0)
    faithfulness: Mapped[float] = mapped_column(Float, nullable=False)
    answer_relevancy: Mapped[float] = mapped_column(Float, nullable=False)
    context_precision: Mapped[float] = mapped_column(Float, nullable=False)
    context_recall: Mapped[float] = mapped_column(Float, nullable=False)

    # Evaluation metadata
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    queries_with_feedback: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    average_groundedness: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Optional: user scope (None = system-wide)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Evaluation run details
    evaluation_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
    )

    def __repr__(self) -> str:
        return (
            f"<RAGEvaluation(id={self.id}, faithfulness={self.faithfulness:.2f}, "
            f"relevancy={self.answer_relevancy:.2f})>"
        )

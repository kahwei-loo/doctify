"""
Insights SQLAlchemy Models

Database models for NL-to-Insight feature: datasets, conversations, and queries.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import (
    String, Text, Integer, BigInteger, DateTime,
    ForeignKey, Index, Float
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.models.base import BaseModel

if TYPE_CHECKING:
    from app.db.models.user import User


class InsightsDataset(BaseModel):
    """
    Dataset model for NL-to-Insights.

    Stores uploaded data files (CSV/XLSX converted to Parquet) with schema information.
    """

    __tablename__ = "insights_datasets"

    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Dataset metadata
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # File information (JSONB)
    # Structure: {original_name, storage_path, size_bytes, row_count, uploaded_at}
    file_info: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )

    # Schema information (JSONB)
    # Structure: {columns: [{name, dtype, aliases, description, is_metric, is_dimension, default_agg, sample_values, unique_values}]}
    schema_definition: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )

    # Status and statistics
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
        index=True,
    )
    row_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="insights_datasets",
    )
    conversations: Mapped[list["InsightsConversation"]] = relationship(
        "InsightsConversation",
        back_populates="dataset",
        cascade="all, delete-orphan",
    )

    # Indexes
    __table_args__ = (
        Index("ix_insights_datasets_user_status", "user_id", "status"),
        Index("ix_insights_datasets_user_created", "user_id", "created_at"),
    )

    def is_ready(self) -> bool:
        """Check if dataset is ready for queries."""
        return self.status == "ready"

    def has_error(self) -> bool:
        """Check if dataset processing failed."""
        return self.status == "error"

    def __repr__(self) -> str:
        return f"<InsightsDataset(id={self.id}, name={self.name}, status={self.status})>"


class InsightsConversation(BaseModel):
    """
    Conversation model for NL-to-Insights.

    Represents a conversation session for querying a dataset.
    Maintains context for multi-turn conversations.
    """

    __tablename__ = "insights_conversations"

    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("insights_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Conversation metadata
    title: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # Conversation context (JSONB)
    # Structure: {last_query_intent, referenced_entities: {time, metric, dimension}}
    context: Mapped[dict] = mapped_column(
        JSONB,
        default=dict,
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="insights_conversations",
    )
    dataset: Mapped["InsightsDataset"] = relationship(
        "InsightsDataset",
        back_populates="conversations",
    )
    queries: Mapped[list["InsightsQuery"]] = relationship(
        "InsightsQuery",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="InsightsQuery.created_at",
    )

    # Indexes
    __table_args__ = (
        Index("ix_insights_conversations_user_dataset", "user_id", "dataset_id"),
        Index("ix_insights_conversations_updated", "updated_at"),
    )

    def __repr__(self) -> str:
        return f"<InsightsConversation(id={self.id}, title={self.title})>"


class InsightsQuery(BaseModel):
    """
    Query model for NL-to-Insights.

    Stores individual queries within a conversation, including:
    - User input (natural language)
    - Parsed intent
    - Generated SQL
    - Query results
    - AI response
    """

    __tablename__ = "insights_queries"

    # Foreign keys
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("insights_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("insights_datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # User input
    user_input: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False,
    )

    # AI parsing results (JSONB)
    # Structure: {query_type, metrics, dimensions, time_range, filters, sort, limit, chart_suggestion}
    parsed_intent: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )
    generated_sql: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # Query results (JSONB)
    # Structure: {data: [...], row_count, execution_time_ms}
    result: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )

    # AI response
    response_text: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    # Structure: {type, config: {...}}
    response_chart: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )
    # List of insight strings
    response_insights: Mapped[Optional[list]] = mapped_column(
        JSONB,
        nullable=True,
    )

    # Token usage (JSONB)
    # Structure: {prompt_tokens, completion_tokens, total_tokens}
    token_usage: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
    )

    # Status
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
        index=True,
    )

    # Execution metrics
    execution_time_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    # Relationships
    conversation: Mapped["InsightsConversation"] = relationship(
        "InsightsConversation",
        back_populates="queries",
    )

    # Indexes
    __table_args__ = (
        Index("ix_insights_queries_conversation_created", "conversation_id", "created_at"),
        Index("ix_insights_queries_user_status", "user_id", "status"),
    )

    def is_completed(self) -> bool:
        """Check if query completed successfully."""
        return self.status == "completed"

    def has_error(self) -> bool:
        """Check if query failed."""
        return self.status == "error"

    def __repr__(self) -> str:
        return f"<InsightsQuery(id={self.id}, status={self.status})>"

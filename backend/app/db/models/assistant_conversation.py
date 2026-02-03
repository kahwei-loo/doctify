"""
Assistant Conversation Database Models

SQLAlchemy models for AI Assistant conversations and messages.
Week 5 - Backend API Development (Day 11-12)

Note: This is separate from chat.py which handles document chatbot conversations.
These models handle AI Assistant inbox conversations (Intercom-style).
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import (
    String,
    Text,
    Integer,
    Boolean,
    ForeignKey,
    Index,
    CheckConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.models.base import BaseModel


class AssistantConversation(BaseModel):
    """
    Conversation with an AI Assistant.

    Represents a conversation thread in the AI Assistant inbox.
    Supports status management (unresolved, in_progress, resolved).
    """

    __tablename__ = "assistant_conversations"

    # Assistant relationship
    assistant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assistants.id", ondelete="CASCADE"),
        nullable=False,
    )

    # User identification for anonymous/public users
    user_fingerprint: Mapped[Optional[str]] = mapped_column(
        String(256),
        nullable=True,
        comment="Hash of IP + session_id for anonymous tracking",
    )
    session_id: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        comment="Session ID from localStorage for anonymous users",
    )

    # For authenticated users (optional)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Conversation status
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="unresolved",
        server_default=text("'unresolved'"),
    )

    # Message metadata
    last_message_preview: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        default="",
        server_default=text("''"),
    )
    last_message_at: Mapped[datetime] = mapped_column(
        nullable=False,
        server_default=text("now()"),
    )
    message_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )

    # Context (e.g., page URL where chat was initiated)
    context: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )

    # Resolution timestamp
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
    )

    # Relationships
    assistant = relationship("Assistant", back_populates="conversations")
    messages = relationship(
        "AssistantMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AssistantMessage.created_at",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('unresolved', 'in_progress', 'resolved')",
            name="check_conversation_status",
        ),
        Index("ix_assistant_conversations_assistant_id", "assistant_id"),
        Index("ix_assistant_conversations_status", "status"),
        Index("ix_assistant_conversations_user_id", "user_id"),
        Index("ix_assistant_conversations_session_id", "session_id"),
        Index(
            "ix_assistant_conversations_assistant_status",
            "assistant_id",
            "status",
        ),
        Index(
            "ix_assistant_conversations_last_message",
            "last_message_at",
            postgresql_ops={"last_message_at": "DESC"},
        ),
    )

    def __repr__(self) -> str:
        return f"<AssistantConversation(id={self.id}, assistant_id={self.assistant_id}, status='{self.status}')>"

    def to_response_dict(self) -> Dict[str, Any]:
        """Convert to API response dictionary."""
        return {
            "conversation_id": str(self.id),
            "assistant_id": str(self.assistant_id),
            "user_fingerprint": self.user_fingerprint,
            "session_id": self.session_id,
            "user_id": str(self.user_id) if self.user_id else None,
            "status": self.status,
            "last_message_preview": self.last_message_preview,
            "last_message_at": self.last_message_at.isoformat(),
            "message_count": self.message_count,
            "context": self.context,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }


class AssistantMessage(BaseModel):
    """
    Individual message in an assistant conversation.

    Represents a single message from either the user or the assistant.
    """

    __tablename__ = "assistant_messages"

    # Conversation relationship
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assistant_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Message content
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # AI metadata (for assistant messages)
    model_used: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    tokens_used: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    # Relationships
    conversation = relationship("AssistantConversation", back_populates="messages")

    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'assistant', 'system')",
            name="check_message_role_assistant",
        ),
        Index(
            "ix_assistant_messages_conversation_id",
            "conversation_id",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"<AssistantMessage(id={self.id}, role='{self.role}', content='{content_preview}')>"

    def to_response_dict(self) -> Dict[str, Any]:
        """Convert to API response dictionary."""
        return {
            "message_id": str(self.id),
            "conversation_id": str(self.conversation_id),
            "role": self.role,
            "content": self.content,
            "model_used": self.model_used,
            "tokens_used": self.tokens_used,
            "created_at": self.created_at.isoformat(),
        }

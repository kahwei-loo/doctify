"""
Chat Domain Entities

Domain models for chatbot functionality.
Phase 13 - Chatbot Implementation
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    ForeignKey,
    CheckConstraint,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from datetime import datetime
from uuid import uuid4
from typing import Optional, Dict, Any, List

from app.db.database import Base


class ChatConversation(Base):
    """
    Chat conversation with context management.

    Represents a multi-turn conversation between user and chatbot assistant.
    Maintains conversation context across multiple messages.
    """

    __tablename__ = "chat_conversations"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    context: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()"), onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="chat_conversations")
    messages = relationship(
        "ChatMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )

    __table_args__ = (
        Index("ix_chat_conversations_user_id", "user_id"),
        Index(
            "ix_chat_conversations_updated_at",
            "updated_at",
            postgresql_ops={"updated_at": "DESC"},
        ),
    )

    def __repr__(self) -> str:
        return f"<ChatConversation(id={self.id}, user_id={self.user_id}, title='{self.title}')>"


class ChatMessage(Base):
    """
    Individual chat message with tool execution metadata.

    Represents a single message in a conversation, including:
    - User input messages
    - Assistant response messages
    - System messages
    - Tool execution metadata (which tools were used, parameters, results)
    - AI model metadata (model used, token usage)
    """

    __tablename__ = "chat_messages"

    id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )
    conversation_id: Mapped[UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Tool execution metadata
    tool_used: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tool_params: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    tool_result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    # AI metadata
    model_used: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )

    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")

    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'assistant', 'system')", name="check_message_role"
        ),
        Index("ix_chat_messages_conversation_id", "conversation_id", "created_at"),
    )

    def __repr__(self) -> str:
        content_preview = (
            self.content[:50] + "..." if len(self.content) > 50 else self.content
        )
        return f"<ChatMessage(id={self.id}, role='{self.role}', content='{content_preview}')>"

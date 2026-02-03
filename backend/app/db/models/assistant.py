"""
Assistant Database Model

SQLAlchemy model for AI Assistants.
Week 5 - Backend API Development (Day 11-12)
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import String, Text, Boolean, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.db.models.base import BaseModel


class Assistant(BaseModel):
    """
    AI Assistant database model.

    Represents an AI assistant that can handle conversations
    with users through the public chat widget or internal inbox.
    """

    __tablename__ = "assistants"

    # Owner relationship
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Basic info
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Model configuration (provider, model, temperature, etc.)
    model_config: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{\"provider\": \"openai\", \"model\": \"gpt-4\", \"temperature\": 0.7, \"max_tokens\": 2048}'::jsonb"),
    )

    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    # Knowledge base integration (optional)
    knowledge_base_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("knowledge_bases.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Widget customization (primary_color, welcome_message, position, etc.)
    widget_config: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{\"primary_color\": \"#3b82f6\", \"position\": \"bottom-right\"}'::jsonb"),
    )

    # Relationships
    user = relationship("User", back_populates="assistants")
    conversations = relationship(
        "AssistantConversation",
        back_populates="assistant",
        cascade="all, delete-orphan",
        order_by="desc(AssistantConversation.last_message_at)",
    )

    __table_args__ = (
        Index("ix_assistants_user_id", "user_id"),
        Index("ix_assistants_is_active", "is_active"),
        Index(
            "ix_assistants_user_id_is_active",
            "user_id",
            "is_active",
        ),
    )

    def __repr__(self) -> str:
        return f"<Assistant(id={self.id}, name='{self.name}', is_active={self.is_active})>"

    def to_response_dict(
        self,
        total_conversations: int = 0,
        unresolved_count: int = 0,
    ) -> Dict[str, Any]:
        """
        Convert to API response dictionary with computed fields.

        Args:
            total_conversations: Total number of conversations for this assistant
            unresolved_count: Number of unresolved conversations

        Returns:
            Dictionary suitable for API response
        """
        return {
            "assistant_id": str(self.id),
            "user_id": str(self.user_id),
            "name": self.name,
            "description": self.description,
            "model_config": self.model_config,
            "is_active": self.is_active,
            "knowledge_base_id": str(self.knowledge_base_id) if self.knowledge_base_id else None,
            "widget_config": self.widget_config,
            "total_conversations": total_conversations,
            "unresolved_count": unresolved_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

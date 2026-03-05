"""
Assistant Conversation Domain Entity

Domain model for conversations with AI Assistants.
Week 5 - Backend API Development (Day 11-12)

Note: This is separate from chat.py which handles document chatbot conversations.
This module handles AI Assistant inbox conversations (Intercom-style).
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List, Literal
from uuid import UUID, uuid4
from enum import Enum


class ConversationStatus(str, Enum):
    """Status of a conversation."""

    UNRESOLVED = "unresolved"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


@dataclass
class AssistantMessageEntity:
    """
    Individual message in an assistant conversation.

    Represents a single message from either the user or the assistant.
    """

    id: UUID = field(default_factory=uuid4)
    conversation_id: UUID = field(default_factory=uuid4)
    role: Literal["user", "assistant", "system"] = "user"
    content: str = ""

    # AI metadata (for assistant messages)
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "message_id": str(self.id),
            "conversation_id": str(self.conversation_id),
            "role": self.role,
            "content": self.content,
            "model_used": self.model_used,
            "tokens_used": self.tokens_used,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class AssistantConversationEntity:
    """
    Conversation with an AI Assistant.

    Represents a conversation thread in the AI Assistant inbox.
    Supports status management (unresolved, in_progress, resolved).
    """

    id: UUID = field(default_factory=uuid4)
    assistant_id: UUID = field(default_factory=uuid4)

    # User identification (for anonymous/public users)
    user_fingerprint: Optional[str] = None  # IP + session_id hash
    session_id: Optional[str] = None

    # For authenticated users
    user_id: Optional[UUID] = None

    # Conversation metadata
    status: ConversationStatus = ConversationStatus.UNRESOLVED
    last_message_preview: str = ""
    last_message_at: datetime = field(default_factory=datetime.utcnow)
    message_count: int = 0

    # Context (e.g., page URL where chat was initiated)
    context: Dict[str, Any] = field(default_factory=dict)

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

    def resolve(self) -> None:
        """Mark conversation as resolved."""
        self.status = ConversationStatus.RESOLVED
        self.resolved_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def reopen(self) -> None:
        """Reopen a resolved conversation."""
        self.status = ConversationStatus.UNRESOLVED
        self.resolved_at = None
        self.updated_at = datetime.utcnow()

    def set_in_progress(self) -> None:
        """Mark conversation as in progress."""
        self.status = ConversationStatus.IN_PROGRESS
        self.updated_at = datetime.utcnow()

    def add_message(self, content: str, role: str = "user") -> None:
        """Update conversation after a new message."""
        self.message_count += 1
        self.last_message_preview = content[:200] if len(content) > 200 else content
        self.last_message_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

        # If conversation was resolved and user sends a message, reopen it
        if self.status == ConversationStatus.RESOLVED and role == "user":
            self.reopen()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "conversation_id": str(self.id),
            "assistant_id": str(self.assistant_id),
            "user_fingerprint": self.user_fingerprint,
            "session_id": self.session_id,
            "user_id": str(self.user_id) if self.user_id else None,
            "status": self.status.value,
            "last_message_preview": self.last_message_preview,
            "last_message_at": self.last_message_at.isoformat(),
            "message_count": self.message_count,
            "context": self.context,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }


@dataclass
class ConversationFilters:
    """Filters for querying conversations."""

    assistant_id: Optional[UUID] = None
    status: Optional[ConversationStatus] = None
    user_id: Optional[UUID] = None
    search: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for query building."""
        filters = {}
        if self.assistant_id:
            filters["assistant_id"] = self.assistant_id
        if self.status:
            filters["status"] = self.status.value
        if self.user_id:
            filters["user_id"] = self.user_id
        return filters

"""
User SQLAlchemy Model

Database model for user accounts with authentication and authorization.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import String, Boolean, Integer, DateTime, JSON, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import BaseModel
from app.domain.entities.chat import ChatConversation

if TYPE_CHECKING:
    from app.db.models.api_key import ApiKey
    from app.db.models.document import Document
    from app.db.models.project import Project
    from app.db.models.user_settings import UserSettings
    from app.db.models.template import Template
    from app.db.models.insights import InsightsDataset, InsightsConversation
    from app.db.models.rag import RAGQuery
    from app.db.models.knowledge_base import KnowledgeBase
    from app.domain.entities.chat import ChatConversation
    from app.db.models.assistant import Assistant


class User(BaseModel):
    """
    User account model.

    Stores user authentication, profile, and settings information.
    """

    __tablename__ = "users"

    # Authentication fields
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    username: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # Profile fields
    full_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )

    # Status flags
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Timestamps
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Account lockout fields
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_failed_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # User preferences (JSONB for flexible schema)
    preferences: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=dict,
        nullable=True,
    )

    # Usage statistics (JSONB for flexible schema)
    usage_statistics: Mapped[Optional[dict]] = mapped_column(
        JSON,
        default=lambda: {
            "documents_processed": 0,
            "tokens_used": 0,
            "api_calls": 0,
        },
        nullable=True,
    )

    # Role field for authorization
    role: Mapped[str] = mapped_column(
        String(20),
        default="user",
        nullable=False,
    )

    # Relationships
    api_keys: Mapped[list["ApiKey"]] = relationship(
        "ApiKey",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="user",
        foreign_keys="Document.user_id",  # Specify which FK to use (owner, not confirmer)
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    settings: Mapped[Optional["UserSettings"]] = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    templates: Mapped[list["Template"]] = relationship(
        "Template",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    insights_datasets: Mapped[list["InsightsDataset"]] = relationship(
        "InsightsDataset",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    insights_conversations: Mapped[list["InsightsConversation"]] = relationship(
        "InsightsConversation",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    rag_queries: Mapped[list["RAGQuery"]] = relationship(
        "RAGQuery",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    chat_conversations: Mapped[list["ChatConversation"]] = relationship(
        "ChatConversation",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    knowledge_bases: Mapped[list["KnowledgeBase"]] = relationship(
        "KnowledgeBase",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    assistants: Mapped[list["Assistant"]] = relationship(
        "Assistant",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Indexes for common queries
    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
        Index("ix_users_created_at", "created_at"),
    )

    def is_locked(self) -> bool:
        """Check if account is currently locked."""
        if self.locked_until is None:
            return False
        return datetime.utcnow() < self.locked_until.replace(tzinfo=None)

    def can_login(self) -> bool:
        """Check if user can login."""
        return self.is_active and not self.is_locked()

    def record_failed_login_attempt(
        self, max_attempts: int = 5, lockout_minutes: int = 15
    ) -> bool:
        """
        Record a failed login attempt.

        Args:
            max_attempts: Maximum failed attempts before lockout
            lockout_minutes: Minutes to lock account after max attempts

        Returns:
            True if account was locked, False otherwise
        """
        from datetime import timedelta

        self.failed_login_attempts += 1
        self.last_failed_login = datetime.utcnow()

        if self.failed_login_attempts >= max_attempts:
            self.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
            return True

        return False

    def reset_failed_attempts(self) -> None:
        """Reset failed login attempts after successful login."""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.last_failed_login = None

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"

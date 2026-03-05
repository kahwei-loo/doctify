"""
Assistant Conversation Repository

Data access layer for AI Assistant conversations with filtering and status management.
Week 5 - Backend API Development (Day 11-12)
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy import select, func, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.repositories.base import BaseRepository
from app.db.models.assistant_conversation import AssistantConversation, AssistantMessage
from app.core.exceptions import ValidationError


class AssistantConversationRepository(BaseRepository[AssistantConversation]):
    """
    Repository for AI Assistant conversation operations.

    Provides CRUD operations plus filtering, status management, and search.
    """

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(session, AssistantConversation)

    async def get_by_assistant(
        self,
        assistant_id: uuid.UUID,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[AssistantConversation]:
        """
        Get conversations for an assistant with optional filtering.

        Args:
            assistant_id: Assistant ID
            status: Filter by status (unresolved, in_progress, resolved)
            search: Search in last_message_preview
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of AssistantConversation instances
        """
        conditions = [AssistantConversation.assistant_id == assistant_id]

        if status:
            if status not in ("unresolved", "in_progress", "resolved"):
                raise ValidationError(f"Invalid status: {status}")
            conditions.append(AssistantConversation.status == status)

        if search:
            conditions.append(
                AssistantConversation.last_message_preview.ilike(f"%{search}%")
            )

        stmt = (
            select(AssistantConversation)
            .where(and_(*conditions))
            .order_by(AssistantConversation.last_message_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_or_create_public_conversation(
        self,
        assistant_id: uuid.UUID,
        user_fingerprint: str,
        session_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> AssistantConversation:
        """
        Get existing conversation for anonymous user or create new one.

        Args:
            assistant_id: Assistant ID
            user_fingerprint: Hash of IP + session_id
            session_id: Session ID from localStorage
            context: Optional context (page URL, etc.)

        Returns:
            Existing or new AssistantConversation instance
        """
        # Look for existing conversation
        stmt = (
            select(AssistantConversation)
            .where(
                and_(
                    AssistantConversation.assistant_id == assistant_id,
                    AssistantConversation.session_id == session_id,
                    AssistantConversation.status != "resolved",
                )
            )
            .order_by(AssistantConversation.created_at.desc())
        )

        result = await self.session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            return existing

        # Create new conversation
        conversation = AssistantConversation(
            assistant_id=assistant_id,
            user_fingerprint=user_fingerprint,
            session_id=session_id,
            status="unresolved",
            context=context or {},
        )
        self.session.add(conversation)
        await self.session.flush()
        await self.session.refresh(conversation)

        return conversation

    async def update_status(
        self,
        conversation_id: uuid.UUID,
        status: str,
    ) -> Optional[AssistantConversation]:
        """
        Update conversation status.

        Args:
            conversation_id: Conversation ID
            status: New status (unresolved, in_progress, resolved)

        Returns:
            Updated conversation or None if not found
        """
        if status not in ("unresolved", "in_progress", "resolved"):
            raise ValidationError(f"Invalid status: {status}")

        conversation = await self.get_by_id(conversation_id)
        if not conversation:
            return None

        conversation.status = status
        conversation.updated_at = datetime.utcnow()

        if status == "resolved":
            conversation.resolved_at = datetime.utcnow()
        else:
            conversation.resolved_at = None

        await self.session.flush()
        await self.session.refresh(conversation)

        return conversation

    async def get_with_messages(
        self,
        conversation_id: uuid.UUID,
    ) -> Optional[AssistantConversation]:
        """
        Get conversation with all messages eagerly loaded.

        Args:
            conversation_id: Conversation ID

        Returns:
            AssistantConversation with messages or None if not found
        """
        stmt = (
            select(AssistantConversation)
            .where(AssistantConversation.id == conversation_id)
            .options(selectinload(AssistantConversation.messages))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_last_message(
        self,
        conversation_id: uuid.UUID,
        preview: str,
    ) -> None:
        """
        Update conversation's last message preview and timestamp.

        Args:
            conversation_id: Conversation ID
            preview: Preview text of the last message
        """
        stmt = (
            update(AssistantConversation)
            .where(AssistantConversation.id == conversation_id)
            .values(
                last_message_preview=preview[:500] if len(preview) > 500 else preview,
                last_message_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                message_count=AssistantConversation.message_count + 1,
            )
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def count_by_assistant(
        self,
        assistant_id: uuid.UUID,
        status: Optional[str] = None,
    ) -> int:
        """
        Count conversations for an assistant.

        Args:
            assistant_id: Assistant ID
            status: Optional status filter

        Returns:
            Number of conversations
        """
        conditions = [AssistantConversation.assistant_id == assistant_id]
        if status:
            conditions.append(AssistantConversation.status == status)

        stmt = (
            select(func.count())
            .select_from(AssistantConversation)
            .where(and_(*conditions))
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0


class AssistantMessageRepository(BaseRepository[AssistantMessage]):
    """
    Repository for AI Assistant message operations.
    """

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(session, AssistantMessage)

    async def get_by_conversation(
        self,
        conversation_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AssistantMessage]:
        """
        Get messages for a conversation.

        Args:
            conversation_id: Conversation ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of AssistantMessage instances
        """
        stmt = (
            select(AssistantMessage)
            .where(AssistantMessage.conversation_id == conversation_id)
            .order_by(AssistantMessage.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        model_used: Optional[str] = None,
        tokens_used: Optional[int] = None,
    ) -> AssistantMessage:
        """
        Create a new message in a conversation.

        Args:
            conversation_id: Conversation ID
            role: Message role (user, assistant, system)
            content: Message content
            model_used: AI model used (for assistant messages)
            tokens_used: Token count (for assistant messages)

        Returns:
            Created AssistantMessage instance
        """
        if role not in ("user", "assistant", "system"):
            raise ValidationError(f"Invalid role: {role}")

        message = AssistantMessage(
            conversation_id=conversation_id,
            role=role,
            content=content,
            model_used=model_used,
            tokens_used=tokens_used,
        )
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)

        return message

    async def count_by_conversation(
        self,
        conversation_id: uuid.UUID,
    ) -> int:
        """
        Count messages in a conversation.

        Args:
            conversation_id: Conversation ID

        Returns:
            Number of messages
        """
        stmt = (
            select(func.count())
            .select_from(AssistantMessage)
            .where(AssistantMessage.conversation_id == conversation_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

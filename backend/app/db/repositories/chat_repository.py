"""
Chat Repository

Repository layer for chat conversations and messages.
Phase 13 - Chatbot Implementation
"""

from typing import List
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.domain.entities.chat import ChatConversation, ChatMessage


class ChatConversationRepository(BaseRepository[ChatConversation]):
    """Repository for chat conversations."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, ChatConversation)

    async def get_by_user_id(
        self, user_id: UUID, limit: int = 50
    ) -> List[ChatConversation]:
        """Get user's conversations ordered by most recent."""
        stmt = (
            select(ChatConversation)
            .where(ChatConversation.user_id == user_id)
            .order_by(ChatConversation.updated_at.desc())
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class ChatMessageRepository(BaseRepository[ChatMessage]):
    """Repository for chat messages."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, ChatMessage)

    async def get_by_conversation_id(
        self, conversation_id: UUID, limit: int = 100
    ) -> List[ChatMessage]:
        """Get messages for a conversation ordered by time."""
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at)
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

"""
Assistant Repository

Data access layer for AI Assistants with CRUD and analytics operations.
Week 5 - Backend API Development (Day 11-12)
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.db.models.assistant import Assistant
from app.db.models.assistant_conversation import AssistantConversation


class AssistantRepository(BaseRepository[Assistant]):
    """
    Repository for AI Assistant operations.

    Provides CRUD operations plus analytics queries for conversation statistics.
    """

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(session, Assistant)

    async def get_by_user(
        self,
        user_id: uuid.UUID,
        include_inactive: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Assistant]:
        """
        Get all assistants for a user.

        Args:
            user_id: Owner's user ID
            include_inactive: Whether to include inactive assistants
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of Assistant instances
        """
        conditions = [Assistant.user_id == user_id]
        if not include_inactive:
            conditions.append(Assistant.is_active == True)

        stmt = (
            select(Assistant)
            .where(and_(*conditions))
            .order_by(Assistant.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_user_with_stats(
        self,
        user_id: uuid.UUID,
        include_inactive: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Get all assistants for a user with conversation statistics.

        Args:
            user_id: Owner's user ID
            include_inactive: Whether to include inactive assistants

        Returns:
            List of dictionaries with assistant data and stats
        """
        # Build base query
        conditions = [Assistant.user_id == user_id]
        if not include_inactive:
            conditions.append(Assistant.is_active == True)

        # Get assistants
        assistants = await self.get_by_user(user_id, include_inactive)

        # Get conversation counts for each assistant
        result = []
        for assistant in assistants:
            # Total conversations
            total_stmt = select(func.count()).select_from(AssistantConversation).where(
                AssistantConversation.assistant_id == assistant.id
            )
            total_result = await self.session.execute(total_stmt)
            total_conversations = total_result.scalar() or 0

            # Unresolved conversations
            unresolved_stmt = select(func.count()).select_from(AssistantConversation).where(
                and_(
                    AssistantConversation.assistant_id == assistant.id,
                    AssistantConversation.status == "unresolved",
                )
            )
            unresolved_result = await self.session.execute(unresolved_stmt)
            unresolved_count = unresolved_result.scalar() or 0

            result.append(
                assistant.to_response_dict(
                    total_conversations=total_conversations,
                    unresolved_count=unresolved_count,
                )
            )

        return result

    async def get_user_stats(self, user_id: uuid.UUID) -> Dict[str, int]:
        """
        Get aggregate statistics for all assistants owned by a user.

        Args:
            user_id: Owner's user ID

        Returns:
            Dictionary with aggregate stats
        """
        # Total assistants
        total_stmt = select(func.count()).select_from(Assistant).where(
            Assistant.user_id == user_id
        )
        total_result = await self.session.execute(total_stmt)
        total_assistants = total_result.scalar() or 0

        # Active assistants
        active_stmt = select(func.count()).select_from(Assistant).where(
            and_(
                Assistant.user_id == user_id,
                Assistant.is_active == True,
            )
        )
        active_result = await self.session.execute(active_stmt)
        active_assistants = active_result.scalar() or 0

        # Get all assistant IDs for this user
        assistant_ids_stmt = select(Assistant.id).where(Assistant.user_id == user_id)
        assistant_ids_result = await self.session.execute(assistant_ids_stmt)
        assistant_ids = [row[0] for row in assistant_ids_result.fetchall()]

        # Total conversations across all assistants
        total_conversations = 0
        unresolved_conversations = 0

        if assistant_ids:
            total_conv_stmt = select(func.count()).select_from(AssistantConversation).where(
                AssistantConversation.assistant_id.in_(assistant_ids)
            )
            total_conv_result = await self.session.execute(total_conv_stmt)
            total_conversations = total_conv_result.scalar() or 0

            unresolved_conv_stmt = select(func.count()).select_from(AssistantConversation).where(
                and_(
                    AssistantConversation.assistant_id.in_(assistant_ids),
                    AssistantConversation.status == "unresolved",
                )
            )
            unresolved_conv_result = await self.session.execute(unresolved_conv_stmt)
            unresolved_conversations = unresolved_conv_result.scalar() or 0

        return {
            "total_assistants": total_assistants,
            "active_assistants": active_assistants,
            "total_conversations": total_conversations,
            "unresolved_conversations": unresolved_conversations,
        }

    async def get_assistant_analytics(
        self,
        assistant_id: uuid.UUID,
        period_days: int = 30,
    ) -> Dict[str, Any]:
        """
        Get detailed analytics for a specific assistant.

        Args:
            assistant_id: Assistant ID
            period_days: Number of days to look back for analytics

        Returns:
            Dictionary with analytics data
        """
        from datetime import timedelta

        period_start = datetime.utcnow() - timedelta(days=period_days)

        # Conversations in period
        conversations_stmt = select(func.count()).select_from(AssistantConversation).where(
            and_(
                AssistantConversation.assistant_id == assistant_id,
                AssistantConversation.created_at >= period_start,
            )
        )
        conversations_result = await self.session.execute(conversations_stmt)
        conversations_in_period = conversations_result.scalar() or 0

        # Resolved conversations in period
        resolved_stmt = select(func.count()).select_from(AssistantConversation).where(
            and_(
                AssistantConversation.assistant_id == assistant_id,
                AssistantConversation.created_at >= period_start,
                AssistantConversation.status == "resolved",
            )
        )
        resolved_result = await self.session.execute(resolved_stmt)
        resolved_in_period = resolved_result.scalar() or 0

        # Average messages per conversation
        avg_messages_stmt = select(func.avg(AssistantConversation.message_count)).where(
            and_(
                AssistantConversation.assistant_id == assistant_id,
                AssistantConversation.created_at >= period_start,
            )
        )
        avg_messages_result = await self.session.execute(avg_messages_stmt)
        avg_messages = avg_messages_result.scalar() or 0

        # Resolution rate
        resolution_rate = (
            (resolved_in_period / conversations_in_period * 100)
            if conversations_in_period > 0
            else 0
        )

        return {
            "period_days": period_days,
            "conversations_in_period": conversations_in_period,
            "resolved_in_period": resolved_in_period,
            "resolution_rate": round(resolution_rate, 2),
            "avg_messages_per_conversation": round(float(avg_messages), 2),
        }

    async def check_ownership(
        self,
        assistant_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """
        Check if a user owns an assistant.

        Args:
            assistant_id: Assistant ID
            user_id: User ID

        Returns:
            True if user owns the assistant, False otherwise
        """
        stmt = select(Assistant.id).where(
            and_(
                Assistant.id == assistant_id,
                Assistant.user_id == user_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def get_active_by_id(
        self,
        assistant_id: uuid.UUID,
    ) -> Optional[Assistant]:
        """
        Get an active assistant by ID.

        Args:
            assistant_id: Assistant ID

        Returns:
            Assistant if found and active, None otherwise
        """
        stmt = select(Assistant).where(
            and_(
                Assistant.id == assistant_id,
                Assistant.is_active == True,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

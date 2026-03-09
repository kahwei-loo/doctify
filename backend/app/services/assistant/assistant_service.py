"""
AI Assistant Service

Business logic for AI Assistant operations including CRUD, analytics, and conversation management.
Week 5 - Backend API Development (Day 13-14)
"""

import logging
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.assistant_repository import AssistantRepository
from app.db.repositories.assistant_conversation_repository import (
    AssistantConversationRepository,
    AssistantMessageRepository,
)
from app.db.models.assistant import Assistant
from app.db.models.assistant_conversation import AssistantConversation, AssistantMessage
from app.core.exceptions import ValidationError, NotFoundError, AuthorizationError
from app.models.assistant import (
    AssistantCreate,
    AssistantUpdate,
    AssistantResponse,
    AssistantWithStats,
    AssistantListResponse,
    AssistantStatsResponse,
    AssistantAnalyticsResponse,
    ConversationResponse,
    ConversationListResponse,
    MessageResponse,
    MessageListResponse,
    ConversationStatus,
    MessageRole,
)

logger = logging.getLogger(__name__)


class AssistantService:
    """
    Service for AI Assistant business operations.

    Handles assistant CRUD, analytics, and conversation management.
    """

    def __init__(self, session: AsyncSession):
        """Initialize with database session."""
        self.session = session
        self.assistant_repo = AssistantRepository(session)
        self.conversation_repo = AssistantConversationRepository(session)
        self.message_repo = AssistantMessageRepository(session)

    # =========================================================================
    # Assistant CRUD Operations
    # =========================================================================

    async def create_assistant(
        self,
        user_id: uuid.UUID,
        data: AssistantCreate,
    ) -> AssistantResponse:
        """
        Create a new assistant.

        Args:
            user_id: Owner user ID
            data: Assistant creation data

        Returns:
            Created assistant response
        """
        # Build model config dict
        model_config_dict = {
            "provider": "openai",
            "model": "gpt-4",
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        if data.ai_model_config:
            model_config_dict.update(data.ai_model_config.model_dump())

        # Build widget config dict
        widget_config_dict = {
            "primary_color": "#3b82f6",
            "position": "bottom-right",
        }
        if data.widget_config:
            widget_config_dict.update(data.widget_config.model_dump())

        # Create assistant
        assistant = await self.assistant_repo.create(
            {
                "user_id": user_id,
                "name": data.name.strip(),
                "description": data.description.strip() if data.description else None,
                "model_config": model_config_dict,
                "widget_config": widget_config_dict,
                "knowledge_base_id": (
                    uuid.UUID(data.knowledge_base_id)
                    if data.knowledge_base_id
                    else None
                ),
                "is_active": True,
            }
        )

        logger.info(f"Created assistant {assistant.id} for user {user_id}")

        return self._to_response(assistant)

    async def get_assistant(
        self,
        assistant_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> AssistantResponse:
        """
        Get assistant by ID.

        Args:
            assistant_id: Assistant ID
            user_id: Requesting user ID (for ownership verification)

        Returns:
            Assistant response

        Raises:
            NotFoundError: If assistant not found
            AuthorizationError: If user doesn't own the assistant
        """
        assistant = await self.assistant_repo.get_by_id(assistant_id)

        if not assistant:
            raise NotFoundError("Assistant not found")

        if assistant.user_id != user_id:
            raise AuthorizationError("Not authorized to access this assistant")

        return self._to_response(assistant)

    async def list_assistants(
        self,
        user_id: uuid.UUID,
        include_inactive: bool = False,
    ) -> AssistantListResponse:
        """
        List user's assistants with stats.

        Args:
            user_id: Owner user ID
            include_inactive: Include inactive assistants

        Returns:
            List of assistants with stats
        """
        assistants_with_stats = await self.assistant_repo.get_by_user_with_stats(
            user_id=user_id,
            include_inactive=include_inactive,
        )

        assistant_list = []
        for item in assistants_with_stats:
            assistant_list.append(
                AssistantWithStats(
                    id=str(item["assistant_id"]),
                    user_id=str(item["user_id"]),
                    name=item["name"],
                    description=item["description"],
                    model_configuration=item["model_config"],
                    widget_config=item["widget_config"],
                    is_active=item["is_active"],
                    knowledge_base_id=(
                        str(item["knowledge_base_id"])
                        if item["knowledge_base_id"]
                        else None
                    ),
                    total_conversations=item["total_conversations"],
                    unresolved_count=item["unresolved_count"],
                    created_at=item["created_at"],
                    updated_at=item["updated_at"],
                )
            )

        return AssistantListResponse(
            assistants=assistant_list,
            total=len(assistant_list),
        )

    async def update_assistant(
        self,
        assistant_id: uuid.UUID,
        user_id: uuid.UUID,
        data: AssistantUpdate,
    ) -> AssistantResponse:
        """
        Update an assistant.

        Args:
            assistant_id: Assistant ID
            user_id: Requesting user ID
            data: Update data

        Returns:
            Updated assistant response

        Raises:
            NotFoundError: If assistant not found
            AuthorizationError: If user doesn't own the assistant
        """
        # Verify ownership
        assistant = await self.assistant_repo.get_by_id(assistant_id)

        if not assistant:
            raise NotFoundError("Assistant not found")

        if assistant.user_id != user_id:
            raise AuthorizationError("Not authorized to update this assistant")

        # Build update dict
        update_data = {}

        if data.name is not None:
            update_data["name"] = data.name.strip()

        if data.description is not None:
            update_data["description"] = data.description.strip()

        if data.ai_model_config is not None:
            # Merge with existing config
            current_config = assistant.model_config or {}
            current_config.update(data.ai_model_config.model_dump())
            update_data["model_config"] = current_config

        if data.widget_config is not None:
            # Merge with existing config
            current_config = assistant.widget_config or {}
            current_config.update(data.widget_config.model_dump())
            update_data["widget_config"] = current_config

        if data.knowledge_base_id is not None:
            update_data["knowledge_base_id"] = uuid.UUID(data.knowledge_base_id)

        if data.is_active is not None:
            update_data["is_active"] = data.is_active

        if not update_data:
            raise ValidationError("No update data provided")

        # Update
        updated = await self.assistant_repo.update(assistant_id, update_data)

        logger.info(f"Updated assistant {assistant_id}")

        return self._to_response(updated)

    async def delete_assistant(
        self,
        assistant_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """
        Delete an assistant.

        Args:
            assistant_id: Assistant ID
            user_id: Requesting user ID

        Returns:
            True if deleted

        Raises:
            NotFoundError: If assistant not found
            AuthorizationError: If user doesn't own the assistant
        """
        # Verify ownership
        assistant = await self.assistant_repo.get_by_id(assistant_id)

        if not assistant:
            raise NotFoundError("Assistant not found")

        if assistant.user_id != user_id:
            raise AuthorizationError("Not authorized to delete this assistant")

        await self.assistant_repo.delete(assistant_id)

        logger.info(f"Deleted assistant {assistant_id}")

        return True

    # =========================================================================
    # Statistics & Analytics
    # =========================================================================

    async def get_stats(
        self,
        user_id: uuid.UUID,
    ) -> AssistantStatsResponse:
        """
        Get aggregate statistics for user's assistants.

        Args:
            user_id: User ID

        Returns:
            Aggregate statistics
        """
        stats = await self.assistant_repo.get_user_stats(user_id)

        return AssistantStatsResponse(
            total_assistants=stats["total_assistants"],
            active_assistants=stats["active_assistants"],
            total_conversations=stats["total_conversations"],
            unresolved_conversations=stats["unresolved_conversations"],
        )

    async def get_analytics(
        self,
        assistant_id: uuid.UUID,
        user_id: uuid.UUID,
        period_days: int = 30,
    ) -> AssistantAnalyticsResponse:
        """
        Get analytics for a specific assistant.

        Args:
            assistant_id: Assistant ID
            user_id: Requesting user ID
            period_days: Analytics period in days

        Returns:
            Analytics data

        Raises:
            NotFoundError: If assistant not found
            AuthorizationError: If user doesn't own the assistant
        """
        # Verify ownership
        if not await self.assistant_repo.check_ownership(assistant_id, user_id):
            raise AuthorizationError("Not authorized to access this assistant")

        analytics = await self.assistant_repo.get_assistant_analytics(
            assistant_id=assistant_id,
            period_days=period_days,
        )

        return AssistantAnalyticsResponse(
            assistant_id=str(assistant_id),
            period_days=period_days,
            total_conversations=analytics["conversations_in_period"],
            resolved_conversations=analytics["resolved_in_period"],
            resolution_rate=analytics["resolution_rate"],
            avg_messages_per_conversation=analytics["avg_messages_per_conversation"],
            total_messages=0,  # Not tracked currently
        )

    # =========================================================================
    # Conversation Operations
    # =========================================================================

    async def list_conversations(
        self,
        assistant_id: uuid.UUID,
        user_id: uuid.UUID,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> ConversationListResponse:
        """
        List conversations for an assistant.

        Args:
            assistant_id: Assistant ID
            user_id: Requesting user ID
            status: Filter by status
            search: Search in last_message_preview
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            List of conversations
        """
        # Verify ownership
        if not await self.assistant_repo.check_ownership(assistant_id, user_id):
            raise AuthorizationError("Not authorized to access this assistant")

        conversations = await self.conversation_repo.get_by_assistant(
            assistant_id=assistant_id,
            status=status,
            search=search,
            skip=skip,
            limit=limit,
        )

        total = await self.conversation_repo.count_by_assistant(
            assistant_id=assistant_id,
            status=status,
        )

        conversation_list = [self._conversation_to_response(c) for c in conversations]

        return ConversationListResponse(
            conversations=conversation_list,
            total=total,
        )

    async def get_conversation(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> ConversationResponse:
        """
        Get a specific conversation with messages.

        Args:
            conversation_id: Conversation ID
            user_id: Requesting user ID

        Returns:
            Conversation response

        Raises:
            NotFoundError: If conversation not found
            AuthorizationError: If user doesn't own the assistant
        """
        conversation = await self.conversation_repo.get_with_messages(conversation_id)

        if not conversation:
            raise NotFoundError("Conversation not found")

        # Verify ownership of the assistant
        if not await self.assistant_repo.check_ownership(
            conversation.assistant_id, user_id
        ):
            raise AuthorizationError("Not authorized to access this conversation")

        return self._conversation_to_response(conversation)

    async def update_conversation_status(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        status: str,
    ) -> ConversationResponse:
        """
        Update conversation status.

        Args:
            conversation_id: Conversation ID
            user_id: Requesting user ID
            status: New status

        Returns:
            Updated conversation

        Raises:
            NotFoundError: If conversation not found
            AuthorizationError: If user doesn't own the assistant
        """
        conversation = await self.conversation_repo.get_by_id(conversation_id)

        if not conversation:
            raise NotFoundError("Conversation not found")

        # Verify ownership of the assistant
        if not await self.assistant_repo.check_ownership(
            conversation.assistant_id, user_id
        ):
            raise AuthorizationError("Not authorized to update this conversation")

        updated = await self.conversation_repo.update_status(conversation_id, status)

        logger.info(f"Updated conversation {conversation_id} status to {status}")

        return self._conversation_to_response(updated)

    async def delete_conversation(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """
        Delete a conversation.

        Args:
            conversation_id: Conversation ID
            user_id: Requesting user ID

        Returns:
            True if deleted
        """
        conversation = await self.conversation_repo.get_by_id(conversation_id)

        if not conversation:
            raise NotFoundError("Conversation not found")

        # Verify ownership of the assistant
        if not await self.assistant_repo.check_ownership(
            conversation.assistant_id, user_id
        ):
            raise AuthorizationError("Not authorized to delete this conversation")

        await self.conversation_repo.delete(conversation_id)

        logger.info(f"Deleted conversation {conversation_id}")

        return True

    # =========================================================================
    # Message Operations
    # =========================================================================

    async def list_messages(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> MessageListResponse:
        """
        List messages for a conversation.

        Args:
            conversation_id: Conversation ID
            user_id: Requesting user ID
            skip: Pagination offset
            limit: Pagination limit

        Returns:
            List of messages
        """
        conversation = await self.conversation_repo.get_by_id(conversation_id)

        if not conversation:
            raise NotFoundError("Conversation not found")

        # Verify ownership of the assistant
        if not await self.assistant_repo.check_ownership(
            conversation.assistant_id, user_id
        ):
            raise AuthorizationError("Not authorized to access this conversation")

        messages = await self.message_repo.get_by_conversation(
            conversation_id=conversation_id,
            skip=skip,
            limit=limit,
        )

        total = await self.message_repo.count_by_conversation(conversation_id)

        message_list = [self._message_to_response(m) for m in messages]

        return MessageListResponse(
            messages=message_list,
            total=total,
        )

    async def send_staff_message(
        self,
        conversation_id: uuid.UUID,
        user_id: uuid.UUID,
        content: str,
    ) -> MessageResponse:
        """
        Send a message from staff to the conversation.

        Args:
            conversation_id: Conversation ID
            user_id: Staff user ID
            content: Message content

        Returns:
            Created message

        Raises:
            NotFoundError: If conversation not found
            AuthorizationError: If user doesn't own the assistant
        """
        conversation = await self.conversation_repo.get_by_id(conversation_id)

        if not conversation:
            raise NotFoundError("Conversation not found")

        # Verify ownership of the assistant
        if not await self.assistant_repo.check_ownership(
            conversation.assistant_id, user_id
        ):
            raise AuthorizationError(
                "Not authorized to send messages to this conversation"
            )

        # Create the message
        message = await self.message_repo.create_message(
            conversation_id=conversation_id,
            role="assistant",  # Staff messages appear as assistant
            content=content,
            model_used=None,  # Manual message, not AI
            tokens_used=None,
        )

        # Update conversation's last message
        await self.conversation_repo.update_last_message(
            conversation_id=conversation_id,
            preview=content,
        )

        # Set conversation to in_progress if it was unresolved
        if conversation.status == "unresolved":
            await self.conversation_repo.update_status(conversation_id, "in_progress")

        logger.info(f"Staff sent message to conversation {conversation_id}")

        return self._message_to_response(message)

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _to_response(self, assistant: Assistant) -> AssistantResponse:
        """Convert assistant model to response."""
        return AssistantResponse(
            id=str(assistant.id),
            user_id=str(assistant.user_id),
            name=assistant.name,
            description=assistant.description,
            model_configuration=assistant.model_config or {},
            widget_config=assistant.widget_config or {},
            is_active=assistant.is_active,
            knowledge_base_id=(
                str(assistant.knowledge_base_id)
                if assistant.knowledge_base_id
                else None
            ),
            created_at=assistant.created_at,
            updated_at=assistant.updated_at,
        )

    def _conversation_to_response(
        self, conversation: AssistantConversation
    ) -> ConversationResponse:
        """Convert conversation model to response."""
        return ConversationResponse(
            id=str(conversation.id),
            assistant_id=str(conversation.assistant_id),
            user_id=str(conversation.user_id) if conversation.user_id else None,
            session_id=conversation.session_id,
            status=ConversationStatus(conversation.status),
            last_message_preview=conversation.last_message_preview or "",
            last_message_at=conversation.last_message_at,
            message_count=conversation.message_count,
            context=conversation.context or {},
            resolved_at=conversation.resolved_at,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )

    def _message_to_response(self, message: AssistantMessage) -> MessageResponse:
        """Convert message model to response."""
        return MessageResponse(
            id=str(message.id),
            conversation_id=str(message.conversation_id),
            role=MessageRole(message.role),
            content=message.content,
            model_used=message.model_used,
            tokens_used=message.tokens_used,
            created_at=message.created_at,
        )

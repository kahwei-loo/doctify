"""
Public Chat Service for AI Assistants

Handles anonymous public chat interactions with rate limiting and session tracking.
Week 5 - Backend API Development (Day 17)
"""

import logging
import uuid
from typing import Optional, Dict, Any, AsyncGenerator
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.assistant_repository import AssistantRepository
from app.db.repositories.assistant_conversation_repository import (
    AssistantConversationRepository,
    AssistantMessageRepository,
)
from app.db.repositories.knowledge_base import KnowledgeBaseRepository, DataSourceRepository
from app.services.rag.generation_service import GenerationService
from app.core.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class PublicChatService:
    """
    Service for public (anonymous) chat interactions with AI assistants.

    Features:
    - Anonymous session tracking via session_id
    - Knowledge base integration for RAG responses
    - Streaming response generation
    """

    def __init__(self, session: AsyncSession):
        """Initialize with database session."""
        self.session = session
        self.assistant_repo = AssistantRepository(session)
        self.conversation_repo = AssistantConversationRepository(session)
        self.message_repo = AssistantMessageRepository(session)
        self.kb_repo = KnowledgeBaseRepository(session)
        self.datasource_repo = DataSourceRepository(session)
        self.generation_service = GenerationService(session)

    async def get_or_create_conversation(
        self,
        assistant_id: uuid.UUID,
        session_id: str,
        user_fingerprint: str,
        context: Optional[Dict[str, Any]] = None,
    ):
        """
        Get existing conversation or create new one for anonymous session.

        Args:
            assistant_id: Assistant UUID
            session_id: Client session ID (from localStorage)
            user_fingerprint: IP + session_id hash for tracking
            context: Optional context (page URL, etc.)

        Returns:
            Conversation object
        """
        # Verify assistant exists and is active
        assistant = await self.assistant_repo.get_by_id(assistant_id)
        if not assistant:
            raise NotFoundError("Assistant not found")
        if not assistant.is_active:
            raise ValidationError("Assistant is not active")

        # Use repository method to get or create conversation
        conversation = await self.conversation_repo.get_or_create_public_conversation(
            assistant_id=assistant_id,
            user_fingerprint=user_fingerprint,
            session_id=session_id,
            context=context,
        )

        return conversation

    async def _get_knowledge_base_document_ids(
        self,
        knowledge_base_id: uuid.UUID,
    ) -> list[uuid.UUID]:
        """
        Get document IDs from knowledge base's data sources.

        Args:
            knowledge_base_id: Knowledge base UUID

        Returns:
            List of document UUIDs associated with the knowledge base
        """
        document_ids = []

        # Get all data sources for the knowledge base
        data_sources = await self.datasource_repo.list_by_kb(knowledge_base_id)

        for ds in data_sources:
            if ds.type == "uploaded_docs" and ds.config:
                # Extract document_ids from config
                doc_ids = ds.config.get("document_ids", [])
                for doc_id in doc_ids:
                    if isinstance(doc_id, str):
                        document_ids.append(uuid.UUID(doc_id))
                    elif isinstance(doc_id, uuid.UUID):
                        document_ids.append(doc_id)

        return document_ids

    async def process_message(
        self,
        assistant_id: uuid.UUID,
        session_id: str,
        user_fingerprint: str,
        content: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Process a public chat message and generate response.

        Args:
            assistant_id: Assistant UUID
            session_id: Client session ID
            user_fingerprint: IP + session_id for tracking
            content: User message content
            context: Optional context (page URL, etc.)

        Returns:
            Dict with conversation_id, message_id, response content, model_used
        """
        # Get or create conversation
        conversation = await self.get_or_create_conversation(
            assistant_id=assistant_id,
            session_id=session_id,
            user_fingerprint=user_fingerprint,
            context=context,
        )

        # Get assistant config
        assistant = await self.assistant_repo.get_by_id(assistant_id)

        # Save user message
        user_message = await self.message_repo.create_message(
            conversation_id=conversation.id,
            role="user",
            content=content,
            model_used=None,
            tokens_used=None,
        )

        # Generate AI response using RAG
        try:
            # Get document IDs from assistant's knowledge base
            document_ids = None
            if assistant.knowledge_base_id:
                document_ids = await self._get_knowledge_base_document_ids(
                    assistant.knowledge_base_id
                )

            # Get model config
            model_config = assistant.model_config or {}
            model_name = model_config.get("model", "gpt-4")

            # Generate response using RAG
            rag_response = await self.generation_service.generate_answer(
                question=content,
                document_ids=document_ids,
                model=model_name,
            )

            response_content = rag_response.answer
            model_used = rag_response.model_used
            tokens_used = rag_response.tokens_used

        except Exception as e:
            logger.error(f"RAG generation failed: {e}")
            response_content = "I'm sorry, I couldn't process your request. Please try again."
            model_used = None
            tokens_used = None

        # Save assistant response
        assistant_message = await self.message_repo.create_message(
            conversation_id=conversation.id,
            role="assistant",
            content=response_content,
            model_used=model_used,
            tokens_used=tokens_used,
        )

        # Update conversation metadata
        await self.conversation_repo.update_last_message(
            conversation_id=conversation.id,
            preview=response_content[:200] if response_content else "",
        )

        await self.session.commit()

        return {
            "conversation_id": str(conversation.id),
            "message_id": str(assistant_message.id),
            "content": response_content,
            "model_used": model_used,
        }

    async def process_message_streaming(
        self,
        assistant_id: uuid.UUID,
        session_id: str,
        user_fingerprint: str,
        content: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process a public chat message with streaming response.

        Args:
            assistant_id: Assistant UUID
            session_id: Client session ID
            user_fingerprint: IP + session_id for tracking
            content: User message content
            context: Optional context (page URL, etc.)

        Yields:
            Stream chunks: {"type": "chunk"|"complete"|"error", "data": ...}
        """
        # Get or create conversation
        conversation = await self.get_or_create_conversation(
            assistant_id=assistant_id,
            session_id=session_id,
            user_fingerprint=user_fingerprint,
            context=context,
        )

        # Get assistant config
        assistant = await self.assistant_repo.get_by_id(assistant_id)

        # Save user message
        user_message = await self.message_repo.create_message(
            conversation_id=conversation.id,
            role="user",
            content=content,
            model_used=None,
            tokens_used=None,
        )
        await self.session.flush()

        yield {"type": "message_saved", "data": str(user_message.id)}

        # Generate AI response using RAG
        try:
            # Get document IDs from assistant's knowledge base
            document_ids = None
            if assistant.knowledge_base_id:
                document_ids = await self._get_knowledge_base_document_ids(
                    assistant.knowledge_base_id
                )

            # Get model config
            model_config = assistant.model_config or {}
            model_name = model_config.get("model", "gpt-4")

            # Generate response using RAG (non-streaming for now)
            rag_response = await self.generation_service.generate_answer(
                question=content,
                document_ids=document_ids,
                model=model_name,
            )

            response_content = rag_response.answer
            model_used = rag_response.model_used
            tokens_used = rag_response.tokens_used

            # Simulate streaming by yielding word by word
            words = response_content.split()
            for i, word in enumerate(words):
                chunk = word + (" " if i < len(words) - 1 else "")
                yield {"type": "chunk", "data": chunk}

        except Exception as e:
            logger.error(f"RAG generation failed: {e}")
            response_content = "I'm sorry, I couldn't process your request. Please try again."
            model_used = None
            tokens_used = None
            yield {"type": "chunk", "data": response_content}

        # Save assistant response
        assistant_message = await self.message_repo.create_message(
            conversation_id=conversation.id,
            role="assistant",
            content=response_content,
            model_used=model_used,
            tokens_used=tokens_used,
        )

        # Update conversation metadata
        await self.conversation_repo.update_last_message(
            conversation_id=conversation.id,
            preview=response_content[:200] if response_content else "",
        )

        await self.session.commit()

        yield {
            "type": "complete",
            "data": {
                "conversation_id": str(conversation.id),
                "message_id": str(assistant_message.id),
                "model_used": model_used,
            }
        }

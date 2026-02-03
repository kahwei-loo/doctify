"""
Chat Service

Service for managing chatbot conversations.
Phase 13 - Chatbot Implementation
"""

from typing import List, Dict, Any, AsyncGenerator
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.chat_repository import ChatConversationRepository, ChatMessageRepository
from app.domain.entities.chat import ChatConversation, ChatMessage
from app.services.chat.intent_classifier import IntentClassifier, IntentType
from app.services.rag.generation_service import GenerationService
from app.services.chat.tool_router import ToolRouter


class ChatService:
    """Service for managing chatbot conversations."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.conversation_repo = ChatConversationRepository(session)
        self.message_repo = ChatMessageRepository(session)
        self.intent_classifier = IntentClassifier()
        self.tool_router = ToolRouter(session)
        self.generation_service = GenerationService(session)

    async def create_conversation(self, user_id: UUID, title: str = None) -> ChatConversation:
        """Create a new conversation."""
        return await self.conversation_repo.create({
            "user_id": user_id,
            "title": title or "New Conversation"
        })

    async def get_conversation_history(
        self,
        conversation_id: UUID,
        limit: int = 50
    ) -> List[ChatMessage]:
        """Get conversation message history."""
        return await self.message_repo.get_by_conversation_id(conversation_id, limit)

    def _build_context_window(
        self,
        conversation_history: List[ChatMessage],
        window_size: int = 10
    ) -> List[Dict[str, str]]:
        """
        Build context window for LLM from recent messages.

        Args:
            conversation_history: Full conversation history
            window_size: Number of recent messages to include

        Returns:
            List of {"role": "user"|"assistant", "content": str}
        """
        recent_messages = conversation_history[-window_size:] if len(conversation_history) > window_size else conversation_history

        return [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in recent_messages
        ]

    async def process_message_streaming(
        self,
        conversation_id: UUID,
        user_message: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Process user message with streaming response.

        Workflow:
        1. Save user message
        2. Classify intent
        3. Route to appropriate tool
        4. Generate response with streaming
        5. Save assistant response

        Yields:
        - {"type": "intent", "data": intent}
        - {"type": "tool_start", "data": tool_name}
        - {"type": "chunk", "data": text_chunk}
        - {"type": "tool_result", "data": tool_result}
        - {"type": "complete", "data": message_id}
        """
        # Step 1: Save user message
        user_msg = await self.message_repo.create({
            "conversation_id": conversation_id,
            "role": "user",
            "content": user_message
        })
        await self.session.flush()

        # Step 2: Get conversation history for context
        history = await self.get_conversation_history(conversation_id)
        context_window = self._build_context_window(history)

        # Step 3: Classify intent
        intent: IntentType = await self.intent_classifier.classify_intent(
            user_message,
            conversation_context={"history": context_window}
        )

        yield {"type": "intent", "data": intent}

        # Step 4: Route to tool based on intent
        if intent == "greeting":
            response_text = "Hello! How can I help you with your documents today?"
            tool_result = None

        elif intent == "rag_query" or intent == "clarification":
            yield {"type": "tool_start", "data": "rag_query"}

            # Use RAG service
            rag_response = await self.generation_service.generate_answer(user_message)
            response_text = rag_response.answer
            tool_result = {
                "sources": rag_response.sources,
                "model": rag_response.model_used,
                "tokens": rag_response.tokens_used
            }

            yield {"type": "tool_result", "data": tool_result}

        else:
            # Route to appropriate tool via ToolRouter
            yield {"type": "tool_start", "data": intent}
            tool_result = await self.tool_router.execute_tool(intent, user_message, context_window)
            response_text = tool_result.get("response", "I've completed that action.")

            yield {"type": "tool_result", "data": tool_result}

        # Step 5: Stream response (simulate streaming for now, integrate with L25 streaming later)
        words = response_text.split()
        for i, word in enumerate(words):
            chunk = word + (" " if i < len(words) - 1 else "")
            yield {"type": "chunk", "data": chunk}

        # Step 6: Save assistant response
        assistant_msg = await self.message_repo.create({
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": response_text,
            "tool_used": intent,
            "tool_result": tool_result
        })
        await self.session.commit()

        yield {"type": "complete", "data": str(assistant_msg.id)}

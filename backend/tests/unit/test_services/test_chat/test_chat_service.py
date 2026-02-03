"""
Unit tests for Chat Service.

Phase 13 - Chatbot Implementation
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime

from app.services.chat.chat_service import ChatService
from app.domain.entities.chat import ChatConversation, ChatMessage


@pytest.mark.asyncio
class TestChatService:
    """Test suite for ChatService."""

    @pytest.fixture
    def mock_session(self):
        """Create mock database session."""
        session = AsyncMock()
        session.commit = AsyncMock()
        session.flush = AsyncMock()
        return session

    @pytest.fixture
    def chat_service(self, mock_session):
        """Create ChatService instance with mocked dependencies."""
        with patch(
            "app.services.chat.chat_service.ChatConversationRepository"
        ) as MockConvRepo, patch(
            "app.services.chat.chat_service.ChatMessageRepository"
        ) as MockMsgRepo, patch(
            "app.services.chat.chat_service.IntentClassifier"
        ) as MockClassifier, patch(
            "app.services.chat.chat_service.ToolRouter"
        ) as MockRouter, patch(
            "app.services.chat.chat_service.GenerationService"
        ) as MockGenService:

            service = ChatService(mock_session)

            # Setup mocks
            service.conversation_repo = MockConvRepo.return_value
            service.message_repo = MockMsgRepo.return_value
            service.intent_classifier = MockClassifier.return_value
            service.tool_router = MockRouter.return_value
            service.generation_service = MockGenService.return_value

            return service

    async def test_create_conversation(self, chat_service):
        """Test conversation creation."""
        user_id = uuid4()
        title = "Test Conversation"

        # Mock repository response
        mock_conversation = ChatConversation(
            id=uuid4(),
            user_id=user_id,
            title=title,
            context={},
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        chat_service.conversation_repo.create = AsyncMock(return_value=mock_conversation)

        result = await chat_service.create_conversation(user_id, title)

        assert result.id == mock_conversation.id
        assert result.user_id == user_id
        assert result.title == title
        chat_service.conversation_repo.create.assert_called_once()

    async def test_get_conversation_history(self, chat_service):
        """Test retrieving conversation message history."""
        conversation_id = uuid4()
        mock_messages = [
            ChatMessage(
                id=uuid4(),
                conversation_id=conversation_id,
                role="user",
                content="Hello",
                created_at=datetime.utcnow(),
            ),
            ChatMessage(
                id=uuid4(),
                conversation_id=conversation_id,
                role="assistant",
                content="Hi there!",
                created_at=datetime.utcnow(),
            ),
        ]

        chat_service.message_repo.get_by_conversation_id = AsyncMock(
            return_value=mock_messages
        )

        result = await chat_service.get_conversation_history(conversation_id, limit=50)

        assert len(result) == 2
        assert result[0].role == "user"
        assert result[1].role == "assistant"
        chat_service.message_repo.get_by_conversation_id.assert_called_once_with(
            conversation_id, 50
        )

    async def test_build_context_window(self, chat_service):
        """Test context window construction from message history."""
        messages = [
            ChatMessage(
                id=uuid4(),
                conversation_id=uuid4(),
                role="user",
                content="First message",
                created_at=datetime.utcnow(),
            ),
            ChatMessage(
                id=uuid4(),
                conversation_id=uuid4(),
                role="assistant",
                content="First response",
                created_at=datetime.utcnow(),
            ),
            ChatMessage(
                id=uuid4(),
                conversation_id=uuid4(),
                role="user",
                content="Second message",
                created_at=datetime.utcnow(),
            ),
        ]

        context_window = chat_service._build_context_window(messages, window_size=10)

        assert len(context_window) == 3
        assert context_window[0]["role"] == "user"
        assert context_window[0]["content"] == "First message"
        assert context_window[1]["role"] == "assistant"
        assert context_window[2]["role"] == "user"

    async def test_build_context_window_limit(self, chat_service):
        """Test context window respects size limit."""
        # Create 15 messages
        messages = [
            ChatMessage(
                id=uuid4(),
                conversation_id=uuid4(),
                role="user" if i % 2 == 0 else "assistant",
                content=f"Message {i}",
                created_at=datetime.utcnow(),
            )
            for i in range(15)
        ]

        context_window = chat_service._build_context_window(messages, window_size=10)

        # Should only include last 10 messages
        assert len(context_window) == 10
        assert context_window[0]["content"] == "Message 5"
        assert context_window[-1]["content"] == "Message 14"

    async def test_process_message_streaming_greeting_intent(self, chat_service):
        """Test message processing with greeting intent."""
        conversation_id = uuid4()
        user_message = "Hello"

        # Mock dependencies
        mock_user_msg = ChatMessage(
            id=uuid4(),
            conversation_id=conversation_id,
            role="user",
            content=user_message,
            created_at=datetime.utcnow(),
        )
        mock_assistant_msg = ChatMessage(
            id=uuid4(),
            conversation_id=conversation_id,
            role="assistant",
            content="Hello! How can I help you with your documents today?",
            created_at=datetime.utcnow(),
        )

        chat_service.message_repo.create = AsyncMock(
            side_effect=[mock_user_msg, mock_assistant_msg]
        )
        chat_service.message_repo.get_by_conversation_id = AsyncMock(return_value=[])
        chat_service.intent_classifier.classify_intent = AsyncMock(
            return_value="greeting"
        )

        # Collect streaming chunks
        chunks = []
        async for chunk in chat_service.process_message_streaming(
            conversation_id, user_message
        ):
            chunks.append(chunk)

        # Verify streaming sequence
        assert chunks[0]["type"] == "intent"
        assert chunks[0]["data"] == "greeting"

        # Find complete chunk
        complete_chunks = [c for c in chunks if c["type"] == "complete"]
        assert len(complete_chunks) == 1
        assert complete_chunks[0]["data"] == str(mock_assistant_msg.id)

        # Verify database operations
        assert chat_service.message_repo.create.call_count == 2
        chat_service.session.commit.assert_called_once()

    async def test_process_message_streaming_rag_query_intent(self, chat_service):
        """Test message processing with RAG query intent."""
        conversation_id = uuid4()
        user_message = "What does the contract say?"

        # Mock dependencies
        mock_user_msg = ChatMessage(
            id=uuid4(),
            conversation_id=conversation_id,
            role="user",
            content=user_message,
            created_at=datetime.utcnow(),
        )
        mock_assistant_msg = ChatMessage(
            id=uuid4(),
            conversation_id=conversation_id,
            role="assistant",
            content="The contract states...",
            created_at=datetime.utcnow(),
        )

        # Mock RAG response
        from app.services.rag.generation_service import RAGResponse

        mock_rag_response = RAGResponse(
            answer="The contract states...",
            sources=[],
            model_used="gpt-4",
            tokens_used=150,
            confidence_score=0.85,
        )

        chat_service.message_repo.create = AsyncMock(
            side_effect=[mock_user_msg, mock_assistant_msg]
        )
        chat_service.message_repo.get_by_conversation_id = AsyncMock(return_value=[])
        chat_service.intent_classifier.classify_intent = AsyncMock(
            return_value="rag_query"
        )
        chat_service.generation_service.generate_answer = AsyncMock(
            return_value=mock_rag_response
        )

        # Collect streaming chunks
        chunks = []
        async for chunk in chat_service.process_message_streaming(
            conversation_id, user_message
        ):
            chunks.append(chunk)

        # Verify streaming sequence
        assert chunks[0]["type"] == "intent"
        assert chunks[0]["data"] == "rag_query"

        tool_start_chunks = [c for c in chunks if c["type"] == "tool_start"]
        assert len(tool_start_chunks) == 1
        assert tool_start_chunks[0]["data"] == "rag_query"

        tool_result_chunks = [c for c in chunks if c["type"] == "tool_result"]
        assert len(tool_result_chunks) == 1

        # Verify RAG service was called
        chat_service.generation_service.generate_answer.assert_called_once_with(
            user_message
        )

    async def test_process_message_empty_input(self, chat_service):
        """Test handling of empty message input."""
        conversation_id = uuid4()
        user_message = ""

        mock_user_msg = ChatMessage(
            id=uuid4(),
            conversation_id=conversation_id,
            role="user",
            content=user_message,
            created_at=datetime.utcnow(),
        )

        chat_service.message_repo.create = AsyncMock(return_value=mock_user_msg)
        chat_service.message_repo.get_by_conversation_id = AsyncMock(return_value=[])
        chat_service.intent_classifier.classify_intent = AsyncMock(
            return_value="unknown"
        )

        # Process should complete even with empty input
        chunks = []
        async for chunk in chat_service.process_message_streaming(
            conversation_id, user_message
        ):
            chunks.append(chunk)

        assert len(chunks) > 0
        assert chunks[0]["type"] == "intent"

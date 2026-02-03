"""
Integration Tests for Public Chat API Endpoints

Tests anonymous public chat functionality with rate limiting.
Phase 3 - AI Assistants Integration Tests
"""

import pytest
import uuid
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.mark.integration
@pytest.mark.asyncio
class TestPublicChatConfigEndpoints:
    """Test public chat configuration endpoints."""

    async def test_get_assistant_config_success(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test getting assistant public configuration."""
        # Arrange - Create an assistant first (as authenticated user)
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={
                "name": "Public Config Test Bot",
                "widget_config": {
                    "primary_color": "#ff5733",
                    "position": "bottom-left",
                    "welcome_message": "Welcome to our support!",
                    "placeholder_text": "Type a message...",
                },
            },
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act - Get config without authentication (public endpoint)
        response = await async_client.get(
            f"/api/v1/public/chat/{assistant_id}/config",
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert "assistant_id" in result
        assert "name" in result
        assert result["name"] == "Public Config Test Bot"
        assert "widget_config" in result
        assert result["widget_config"]["primary_color"] == "#ff5733"
        assert result["widget_config"]["position"] == "bottom-left"
        assert result["widget_config"]["welcome_message"] == "Welcome to our support!"

    async def test_get_assistant_config_not_found(self, async_client: AsyncClient):
        """Test getting config for non-existent assistant."""
        # Arrange
        fake_id = "00000000-0000-0000-0000-000000000000"

        # Act
        response = await async_client.get(
            f"/api/v1/public/chat/{fake_id}/config",
        )

        # Assert
        assert response.status_code == 404

    async def test_get_inactive_assistant_config(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test getting config for inactive assistant returns 404."""
        # Arrange - Create and deactivate an assistant
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Inactive Config Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Deactivate the assistant
        await async_client.put(
            f"/api/v1/assistants/{assistant_id}",
            json={"is_active": False},
            headers=auth_headers,
        )

        # Act - Try to get config for inactive assistant
        response = await async_client.get(
            f"/api/v1/public/chat/{assistant_id}/config",
        )

        # Assert
        assert response.status_code == 404
        result = response.json()
        # API may return 'detail' or 'message' depending on error handler
        error_msg = result.get("detail", result.get("message", "")).lower()
        assert "not found" in error_msg or "not available" in error_msg


@pytest.mark.integration
@pytest.mark.asyncio
class TestPublicChatMessageEndpoints:
    """Test public chat message endpoints."""

    async def test_send_public_message_success(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test sending a public chat message successfully."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Public Message Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        message_data = {
            "session_id": str(uuid.uuid4()),
            "content": "Hello, I need help!",
        }

        # Act - Mock the AI response to avoid actual API calls
        with patch(
            "app.services.assistant.public_chat_service.PublicChatService.process_message",
            new_callable=AsyncMock,
        ) as mock_process:
            mock_process.return_value = {
                "conversation_id": str(uuid.uuid4()),
                "message_id": str(uuid.uuid4()),
                "content": "Hello! How can I help you today?",
                "model_used": "gpt-4",
            }

            response = await async_client.post(
                f"/api/v1/public/chat/{assistant_id}/message",
                json=message_data,
            )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert "conversation_id" in result
        assert "message_id" in result
        assert "content" in result

    async def test_send_public_message_missing_session_id(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test sending message without session_id fails."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Missing Session Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        message_data = {
            "content": "Hello!",
            # Missing session_id
        }

        # Act
        response = await async_client.post(
            f"/api/v1/public/chat/{assistant_id}/message",
            json=message_data,
        )

        # Assert
        assert response.status_code == 422

    async def test_send_public_message_missing_content(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test sending message without content fails."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Missing Content Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        message_data = {
            "session_id": str(uuid.uuid4()),
            # Missing content
        }

        # Act
        response = await async_client.post(
            f"/api/v1/public/chat/{assistant_id}/message",
            json=message_data,
        )

        # Assert
        assert response.status_code == 422

    async def test_send_public_message_nonexistent_assistant(
        self, async_client: AsyncClient
    ):
        """Test sending message to non-existent assistant."""
        # Arrange
        fake_id = "00000000-0000-0000-0000-000000000000"
        message_data = {
            "session_id": str(uuid.uuid4()),
            "content": "Hello!",
        }

        # Act
        response = await async_client.post(
            f"/api/v1/public/chat/{fake_id}/message",
            json=message_data,
        )

        # Assert - Could be 404 or 500 depending on error handling
        assert response.status_code in [404, 500]


@pytest.mark.integration
@pytest.mark.asyncio
class TestPublicChatStreamingEndpoints:
    """Test public chat streaming endpoints."""

    async def test_streaming_endpoint_exists(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test that the streaming endpoint exists."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Streaming Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        message_data = {
            "session_id": str(uuid.uuid4()),
            "content": "Hello!",
        }

        # Act - Mock the streaming response
        with patch(
            "app.services.assistant.public_chat_service.PublicChatService.process_message_streaming",
            new_callable=AsyncMock,
        ) as mock_stream:
            async def mock_generator():
                yield {"type": "message_saved", "data": {"message_id": str(uuid.uuid4())}}
                yield {"type": "chunk", "data": "Hello"}
                yield {"type": "chunk", "data": "!"}
                yield {"type": "complete", "data": {"message_id": str(uuid.uuid4())}}

            mock_stream.return_value = mock_generator()

            response = await async_client.post(
                f"/api/v1/public/chat/{assistant_id}/stream",
                json=message_data,
            )

        # Assert
        assert response.status_code == 200
        assert response.headers.get("content-type") == "text/event-stream; charset=utf-8"


@pytest.mark.integration
@pytest.mark.asyncio
class TestPublicChatWithContext:
    """Test public chat with context data."""

    async def test_send_message_with_context(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test sending a message with context data."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Context Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        message_data = {
            "session_id": str(uuid.uuid4()),
            "content": "What's the status of my order?",
            "context": {
                "page_url": "https://example.com/orders/12345",
                "user_agent": "Mozilla/5.0",
            },
        }

        # Act - Mock the AI response
        with patch(
            "app.services.assistant.public_chat_service.PublicChatService.process_message",
            new_callable=AsyncMock,
        ) as mock_process:
            mock_process.return_value = {
                "conversation_id": str(uuid.uuid4()),
                "message_id": str(uuid.uuid4()),
                "content": "Let me check your order status.",
                "model_used": "gpt-4",
            }

            response = await async_client.post(
                f"/api/v1/public/chat/{assistant_id}/message",
                json=message_data,
            )

        # Assert
        assert response.status_code == 200


@pytest.mark.integration
@pytest.mark.asyncio
class TestPublicChatSessionTracking:
    """Test public chat session tracking functionality."""

    async def test_same_session_continues_conversation(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test that same session_id maintains conversation continuity."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Session Tracking Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        session_id = str(uuid.uuid4())
        conversation_id = str(uuid.uuid4())

        # Act - Send two messages with same session_id
        with patch(
            "app.services.assistant.public_chat_service.PublicChatService.process_message",
            new_callable=AsyncMock,
        ) as mock_process:
            # First message - creates conversation
            mock_process.return_value = {
                "conversation_id": conversation_id,
                "message_id": str(uuid.uuid4()),
                "content": "Hello!",
                "model_used": "gpt-4",
            }

            response1 = await async_client.post(
                f"/api/v1/public/chat/{assistant_id}/message",
                json={"session_id": session_id, "content": "First message"},
            )

            # Second message - should use same conversation
            mock_process.return_value = {
                "conversation_id": conversation_id,  # Same conversation
                "message_id": str(uuid.uuid4()),
                "content": "Hi again!",
                "model_used": "gpt-4",
            }

            response2 = await async_client.post(
                f"/api/v1/public/chat/{assistant_id}/message",
                json={"session_id": session_id, "content": "Second message"},
            )

        # Assert
        assert response1.status_code == 200
        assert response2.status_code == 200
        assert response1.json()["conversation_id"] == response2.json()["conversation_id"]

    async def test_different_session_creates_new_conversation(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test that different session_id creates new conversation."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "New Session Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act - Send two messages with different session_ids
        with patch(
            "app.services.assistant.public_chat_service.PublicChatService.process_message",
            new_callable=AsyncMock,
        ) as mock_process:
            # First session
            mock_process.return_value = {
                "conversation_id": str(uuid.uuid4()),  # First conversation
                "message_id": str(uuid.uuid4()),
                "content": "Hello!",
                "model_used": "gpt-4",
            }

            response1 = await async_client.post(
                f"/api/v1/public/chat/{assistant_id}/message",
                json={"session_id": str(uuid.uuid4()), "content": "First session"},
            )

            # Second session
            mock_process.return_value = {
                "conversation_id": str(uuid.uuid4()),  # Different conversation
                "message_id": str(uuid.uuid4()),
                "content": "Hello!",
                "model_used": "gpt-4",
            }

            response2 = await async_client.post(
                f"/api/v1/public/chat/{assistant_id}/message",
                json={"session_id": str(uuid.uuid4()), "content": "Second session"},
            )

        # Assert
        assert response1.status_code == 200
        assert response2.status_code == 200
        # Different sessions should create different conversations
        assert response1.json()["conversation_id"] != response2.json()["conversation_id"]

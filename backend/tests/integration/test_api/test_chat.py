"""
Integration tests for Chat API endpoints.

Phase 13 - Chatbot Implementation
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.services.chat.intent_classifier import IntentType


@pytest.mark.asyncio
class TestChatAPI:
    """Test suite for Chat API endpoints."""

    async def test_create_conversation(self, client: AsyncClient, auth_headers):
        """Test conversation creation endpoint."""
        response = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "Test Conversation"},
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["title"] == "Test Conversation"
        assert "created_at" in data
        assert "updated_at" in data

    async def test_create_conversation_without_title(
        self, client: AsyncClient, auth_headers
    ):
        """Test conversation creation without title."""
        response = await client.post(
            "/api/v1/chat/conversations", json={}, headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["title"] is None

    async def test_create_conversation_unauthorized(self, client: AsyncClient):
        """Test conversation creation without authentication."""
        response = await client.post(
            "/api/v1/chat/conversations", json={"title": "Test"}
        )

        assert response.status_code == 401

    async def test_list_conversations(self, client: AsyncClient, auth_headers):
        """Test listing user's conversations."""
        # Create some conversations first
        for i in range(3):
            await client.post(
                "/api/v1/chat/conversations",
                json={"title": f"Conversation {i}"},
                headers=auth_headers,
            )

        # List conversations
        response = await client.get(
            "/api/v1/chat/conversations", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3

    async def test_list_conversations_with_limit(
        self, client: AsyncClient, auth_headers
    ):
        """Test listing conversations with limit parameter."""
        # Create 5 conversations
        for i in range(5):
            await client.post(
                "/api/v1/chat/conversations",
                json={"title": f"Conversation {i}"},
                headers=auth_headers,
            )

        # List with limit
        response = await client.get(
            "/api/v1/chat/conversations?limit=2", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2

    async def test_get_conversation_messages(self, client: AsyncClient, auth_headers):
        """Test retrieving conversation messages."""
        # Create conversation
        conv_response = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "Test Conversation"},
            headers=auth_headers,
        )
        conversation_id = conv_response.json()["id"]

        # Get messages (should be empty for new conversation)
        response = await client.get(
            f"/api/v1/chat/conversations/{conversation_id}/messages",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    async def test_get_conversation_messages_not_found(
        self, client: AsyncClient, auth_headers
    ):
        """Test getting messages for non-existent conversation."""
        fake_id = str(uuid4())
        response = await client.get(
            f"/api/v1/chat/conversations/{fake_id}/messages", headers=auth_headers
        )

        assert response.status_code == 404

    async def test_get_conversation_messages_unauthorized(
        self, client: AsyncClient, auth_headers, other_user_headers
    ):
        """Test getting messages from another user's conversation."""
        # Create conversation with first user
        conv_response = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "User 1 Conversation"},
            headers=auth_headers,
        )
        conversation_id = conv_response.json()["id"]

        # Try to access with second user
        response = await client.get(
            f"/api/v1/chat/conversations/{conversation_id}/messages",
            headers=other_user_headers,
        )

        assert response.status_code == 404

    async def test_conversation_ordering(self, client: AsyncClient, auth_headers):
        """Test conversations are ordered by most recent first."""
        # Create conversations with delays
        import asyncio

        conv_ids = []
        for i in range(3):
            response = await client.post(
                "/api/v1/chat/conversations",
                json={"title": f"Conversation {i}"},
                headers=auth_headers,
            )
            conv_ids.append(response.json()["id"])
            await asyncio.sleep(0.1)  # Small delay to ensure different timestamps

        # List conversations
        response = await client.get(
            "/api/v1/chat/conversations", headers=auth_headers
        )

        data = response.json()
        # Most recent should be first
        assert data[0]["title"] == "Conversation 2"


@pytest.mark.asyncio
class TestChatWebSocket:
    """Test suite for Chat WebSocket endpoint."""

    async def test_websocket_connection(self, client: AsyncClient, auth_headers):
        """Test WebSocket connection establishment."""
        # Create conversation
        conv_response = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "WebSocket Test"},
            headers=auth_headers,
        )
        conversation_id = conv_response.json()["id"]

        # Note: WebSocket testing requires special setup
        # This is a placeholder for WebSocket integration tests
        # which would typically use a WebSocket test client
        pass

    # Additional WebSocket tests would require a WebSocket test client
    # which is more complex to set up in integration tests
    # For now, we'll focus on REST API tests


@pytest.mark.asyncio
class TestChatIntegration:
    """Integration tests for complete chat workflows."""

    async def test_complete_chat_workflow(self, client: AsyncClient, auth_headers):
        """
        Test complete chat workflow:
        1. Create conversation
        2. Verify conversation exists
        3. Send message (via WebSocket in real scenario)
        4. Retrieve conversation history
        """
        # Step 1: Create conversation
        conv_response = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "Integration Test Chat"},
            headers=auth_headers,
        )

        assert conv_response.status_code == 201
        conversation_id = conv_response.json()["id"]

        # Step 2: Verify conversation exists
        list_response = await client.get(
            "/api/v1/chat/conversations", headers=auth_headers
        )

        conversations = list_response.json()
        assert any(conv["id"] == conversation_id for conv in conversations)

        # Step 3: Get initial messages (should be empty)
        messages_response = await client.get(
            f"/api/v1/chat/conversations/{conversation_id}/messages",
            headers=auth_headers,
        )

        assert messages_response.status_code == 200
        messages = messages_response.json()
        assert len(messages) == 0

        # Note: Actual message sending would happen via WebSocket
        # and would require WebSocket test client setup

    async def test_multiple_conversations_isolation(
        self, client: AsyncClient, auth_headers
    ):
        """Test that conversations are properly isolated."""
        # Create two conversations
        conv1_response = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "Conversation 1"},
            headers=auth_headers,
        )
        conv1_id = conv1_response.json()["id"]

        conv2_response = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "Conversation 2"},
            headers=auth_headers,
        )
        conv2_id = conv2_response.json()["id"]

        # Verify both exist and are separate
        assert conv1_id != conv2_id

        # Get messages for each (should be empty and separate)
        msg1_response = await client.get(
            f"/api/v1/chat/conversations/{conv1_id}/messages", headers=auth_headers
        )
        msg2_response = await client.get(
            f"/api/v1/chat/conversations/{conv2_id}/messages", headers=auth_headers
        )

        assert msg1_response.status_code == 200
        assert msg2_response.status_code == 200
        assert msg1_response.json() == []
        assert msg2_response.json() == []

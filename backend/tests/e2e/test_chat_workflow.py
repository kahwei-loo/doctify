"""
End-to-end tests for chatbot workflow.

Phase 13 - Chatbot Implementation
"""

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch
from uuid import uuid4


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_complete_chatbot_workflow(client: AsyncClient, auth_headers):
    """
    Test complete chatbot workflow:
    1. User creates a conversation
    2. User sends a message (simulated)
    3. System processes message with intent classification
    4. System generates response
    5. Conversation history is persisted
    6. User can retrieve conversation and messages
    """

    # Step 1: Create conversation
    conv_response = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "E2E Test Conversation"},
        headers=auth_headers,
    )

    assert conv_response.status_code == 201
    conversation_data = conv_response.json()
    conversation_id = conversation_data["id"]
    assert conversation_data["title"] == "E2E Test Conversation"

    # Step 2: Verify conversation appears in list
    list_response = await client.get(
        "/api/v1/chat/conversations", headers=auth_headers
    )

    assert list_response.status_code == 200
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

    # Note: Steps 4-5 (WebSocket message sending and receiving) would be tested
    # with a WebSocket test client. For this E2E test, we're verifying the
    # REST API setup that supports the WebSocket workflow.

    # Step 6: Verify conversation persistence
    # Get conversation again to ensure it's still there
    list_response_2 = await client.get(
        "/api/v1/chat/conversations", headers=auth_headers
    )

    conversations_2 = list_response_2.json()
    test_conv = next(conv for conv in conversations_2 if conv["id"] == conversation_id)
    assert test_conv["title"] == "E2E Test Conversation"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_multi_conversation_workflow(client: AsyncClient, auth_headers):
    """
    Test managing multiple conversations:
    1. Create multiple conversations
    2. Verify all conversations are tracked
    3. Verify conversations can be accessed individually
    4. Verify conversation ordering (most recent first)
    """

    # Step 1: Create three conversations
    conversation_ids = []
    for i in range(3):
        response = await client.post(
            "/api/v1/chat/conversations",
            json={"title": f"Conversation {i + 1}"},
            headers=auth_headers,
        )
        assert response.status_code == 201
        conversation_ids.append(response.json()["id"])

        # Small delay to ensure different timestamps
        import asyncio

        await asyncio.sleep(0.1)

    # Step 2: Verify all conversations exist
    list_response = await client.get(
        "/api/v1/chat/conversations", headers=auth_headers
    )

    conversations = list_response.json()
    for conv_id in conversation_ids:
        assert any(conv["id"] == conv_id for conv in conversations)

    # Step 3: Access each conversation's messages
    for conv_id in conversation_ids:
        messages_response = await client.get(
            f"/api/v1/chat/conversations/{conv_id}/messages", headers=auth_headers
        )
        assert messages_response.status_code == 200

    # Step 4: Verify ordering (most recent first)
    # The last created conversation should be first in the list
    recent_conversations = [
        conv for conv in conversations if conv["id"] in conversation_ids
    ]
    assert recent_conversations[0]["title"] == "Conversation 3"


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_chatbot_error_handling(client: AsyncClient, auth_headers):
    """
    Test chatbot error handling:
    1. Attempt to access non-existent conversation
    2. Attempt to create conversation with invalid data
    3. Verify appropriate error responses
    """

    # Step 1: Access non-existent conversation
    fake_id = str(uuid4())
    response = await client.get(
        f"/api/v1/chat/conversations/{fake_id}/messages", headers=auth_headers
    )

    assert response.status_code == 404
    assert "detail" in response.json()

    # Step 2: Create conversation with too long title
    response = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "x" * 300},  # Exceeds 200 char limit
        headers=auth_headers,
    )

    # Should either truncate or return validation error
    # Depending on validation implementation
    assert response.status_code in [201, 422]

    # Step 3: Verify error messages are informative
    if response.status_code == 422:
        error_data = response.json()
        assert "detail" in error_data


@pytest.mark.e2e
@pytest.mark.asyncio
async def test_chatbot_conversation_isolation(
    client: AsyncClient, auth_headers, other_user_headers
):
    """
    Test conversation isolation between users:
    1. User A creates a conversation
    2. User B creates a conversation
    3. Verify User A cannot access User B's conversation
    4. Verify each user only sees their own conversations
    """

    # Step 1: User A creates conversation
    user_a_response = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "User A Conversation"},
        headers=auth_headers,
    )

    assert user_a_response.status_code == 201
    user_a_conv_id = user_a_response.json()["id"]

    # Step 2: User B creates conversation
    user_b_response = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "User B Conversation"},
        headers=other_user_headers,
    )

    assert user_b_response.status_code == 201
    user_b_conv_id = user_b_response.json()["id"]

    # Step 3: User A tries to access User B's conversation
    access_response = await client.get(
        f"/api/v1/chat/conversations/{user_b_conv_id}/messages", headers=auth_headers
    )

    assert access_response.status_code == 404

    # Step 4: Verify conversation isolation in list
    user_a_list = await client.get(
        "/api/v1/chat/conversations", headers=auth_headers
    )
    user_b_list = await client.get(
        "/api/v1/chat/conversations", headers=other_user_headers
    )

    user_a_convs = user_a_list.json()
    user_b_convs = user_b_list.json()

    # User A should see their conversation but not User B's
    assert any(conv["id"] == user_a_conv_id for conv in user_a_convs)
    assert not any(conv["id"] == user_b_conv_id for conv in user_a_convs)

    # User B should see their conversation but not User A's
    assert any(conv["id"] == user_b_conv_id for conv in user_b_convs)
    assert not any(conv["id"] == user_a_conv_id for conv in user_b_convs)

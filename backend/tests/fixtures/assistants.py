"""
AI Assistant Test Fixtures

Provides reusable fixtures for assistant-related tests.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient


@pytest.fixture
def test_assistant_data():
    """
    Test assistant data.
    """
    return {
        "name": "Test Support Assistant",
        "description": "An AI assistant for customer support",
        "model_config": {
            "provider": "openai",
            "model": "gpt-4",
            "temperature": 0.7,
            "max_tokens": 2000,
        },
        "widget_config": {
            "primary_color": "#3b82f6",
            "position": "bottom-right",
            "welcome_message": "Hello! How can I help you today?",
            "placeholder_text": "Type your message...",
        },
    }


@pytest.fixture
def test_assistant_update_data():
    """
    Test assistant update data.
    """
    return {
        "name": "Updated Assistant Name",
        "description": "Updated description",
        "model_config": {
            "provider": "anthropic",
            "model": "claude-3",
            "temperature": 0.5,
            "max_tokens": 4000,
        },
        "is_active": False,
    }


@pytest_asyncio.fixture
async def test_assistant(
    async_client: AsyncClient,
    auth_headers: dict,
    test_assistant_data: dict,
):
    """
    Create a test assistant.
    Returns the assistant data including assistant_id.
    """
    response = await async_client.post(
        "/api/v1/assistants/",
        json=test_assistant_data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()["data"]


@pytest_asyncio.fixture
async def test_inactive_assistant(
    async_client: AsyncClient,
    auth_headers: dict,
):
    """
    Create an inactive test assistant.
    """
    # Create assistant
    create_response = await async_client.post(
        "/api/v1/assistants/",
        json={"name": "Inactive Test Assistant"},
        headers=auth_headers,
    )
    assert create_response.status_code == 201
    assistant_id = create_response.json()["data"]["assistant_id"]

    # Deactivate it
    update_response = await async_client.put(
        f"/api/v1/assistants/{assistant_id}",
        json={"is_active": False},
        headers=auth_headers,
    )
    assert update_response.status_code == 200
    return update_response.json()["data"]


@pytest.fixture
def test_conversation_data():
    """
    Test conversation data.
    """
    return {
        "status": "unresolved",
        "last_message_preview": "How do I reset my password?",
        "message_count": 3,
    }


@pytest.fixture
def test_message_data():
    """
    Test message data.
    """
    return {
        "content": "Hello, I need help with my account.",
        "role": "user",
    }


@pytest.fixture
def test_staff_message_data():
    """
    Test staff message data.
    """
    return {
        "content": "Hi! I'd be happy to help you with your account. What seems to be the issue?",
    }


@pytest.fixture
def test_public_chat_data():
    """
    Test public chat request data.
    """
    import uuid
    return {
        "session_id": str(uuid.uuid4()),
        "content": "Hello, I have a question about your product.",
        "context": {
            "page_url": "https://example.com/products",
            "referrer": "https://google.com",
        },
    }

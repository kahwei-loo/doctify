"""
Integration Tests for AI Assistants API Endpoints

Tests assistant CRUD, conversations, messages, and analytics endpoints.
Phase 3 - AI Assistants Integration Tests
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.integration
@pytest.mark.asyncio
class TestAssistantStatsEndpoints:
    """Test assistant stats endpoints."""

    async def test_get_stats_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test getting assistant stats successfully."""
        # Act
        response = await async_client.get(
            "/api/v1/assistants/stats",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert "total_assistants" in result["data"]
        assert "active_assistants" in result["data"]
        assert "total_conversations" in result["data"]
        assert "unresolved_conversations" in result["data"]

    async def test_get_stats_unauthorized(self, async_client: AsyncClient):
        """Test getting stats without authentication."""
        # Act
        response = await async_client.get("/api/v1/assistants/stats")

        # Assert
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
class TestAssistantCRUDEndpoints:
    """Test assistant CRUD endpoints."""

    async def test_create_assistant_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating an assistant successfully."""
        # Arrange
        assistant_data = {
            "name": "Test Support Bot",
            "description": "A test assistant for customer support",
            "model_config": {
                "provider": "openai",
                "model": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 2000,
            },
            "widget_config": {
                "primary_color": "#3b82f6",
                "position": "bottom-right",
                "welcome_message": "Hello! How can I help you?",
            },
        }

        # Act
        response = await async_client.post(
            "/api/v1/assistants/",
            json=assistant_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 201
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert result["data"]["name"] == assistant_data["name"]
        assert result["data"]["description"] == assistant_data["description"]
        assert "id" in result["data"]
        assert result["data"]["is_active"] is True

    async def test_create_assistant_minimal(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating an assistant with minimal data."""
        # Arrange
        assistant_data = {
            "name": "Minimal Bot",
        }

        # Act
        response = await async_client.post(
            "/api/v1/assistants/",
            json=assistant_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 201
        result = response.json()
        assert result["success"] is True
        assert result["data"]["name"] == assistant_data["name"]

    async def test_create_assistant_missing_name(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating an assistant without required name fails."""
        # Arrange
        assistant_data = {
            "description": "No name provided",
        }

        # Act
        response = await async_client.post(
            "/api/v1/assistants/",
            json=assistant_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 422

    async def test_create_assistant_unauthorized(self, async_client: AsyncClient):
        """Test creating assistant without authentication."""
        # Arrange
        assistant_data = {"name": "Unauthorized Bot"}

        # Act
        response = await async_client.post(
            "/api/v1/assistants/",
            json=assistant_data,
        )

        # Assert
        assert response.status_code == 401

    async def test_list_assistants_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test listing assistants successfully."""
        # Arrange - Create an assistant first
        await async_client.post(
            "/api/v1/assistants/",
            json={"name": "List Test Bot"},
            headers=auth_headers,
        )

        # Act
        response = await async_client.get(
            "/api/v1/assistants/",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert "assistants" in result["data"]
        assert "total" in result["data"]
        assert len(result["data"]["assistants"]) >= 1

    async def test_list_assistants_include_inactive(self, async_client: AsyncClient, auth_headers: dict):
        """Test listing assistants including inactive ones."""
        # Act
        response = await async_client.get(
            "/api/v1/assistants/?include_inactive=true",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

    async def test_get_assistant_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test getting a specific assistant."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Get Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["id"] == assistant_id
        assert result["data"]["name"] == "Get Test Bot"

    async def test_get_assistant_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test getting a non-existent assistant."""
        # Arrange
        fake_id = "00000000-0000-0000-0000-000000000000"

        # Act
        response = await async_client.get(
            f"/api/v1/assistants/{fake_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404

    async def test_update_assistant_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test updating an assistant."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Update Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        update_data = {
            "name": "Updated Bot Name",
            "description": "Updated description",
            "is_active": False,
        }

        # Act
        response = await async_client.put(
            f"/api/v1/assistants/{assistant_id}",
            json=update_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["name"] == update_data["name"]
        assert result["data"]["description"] == update_data["description"]
        assert result["data"]["is_active"] is False

    async def test_update_assistant_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test updating a non-existent assistant."""
        # Arrange
        fake_id = "00000000-0000-0000-0000-000000000000"
        update_data = {"name": "New Name"}

        # Act
        response = await async_client.put(
            f"/api/v1/assistants/{fake_id}",
            json=update_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404

    async def test_delete_assistant_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test deleting an assistant."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Delete Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.delete(
            f"/api/v1/assistants/{assistant_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 204

        # Verify deletion
        get_response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404

    async def test_delete_assistant_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test deleting a non-existent assistant."""
        # Arrange
        fake_id = "00000000-0000-0000-0000-000000000000"

        # Act
        response = await async_client.delete(
            f"/api/v1/assistants/{fake_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
class TestAssistantAnalyticsEndpoints:
    """Test assistant analytics endpoints."""

    async def test_get_analytics_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test getting assistant analytics."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Analytics Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}/analytics?period=30",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert "total_conversations" in result["data"]
        assert "resolved_conversations" in result["data"]
        assert "resolution_rate" in result["data"]
        assert "avg_messages_per_conversation" in result["data"]
        assert "total_messages" in result["data"]

    async def test_get_analytics_custom_period(self, async_client: AsyncClient, auth_headers: dict):
        """Test getting analytics with custom period."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Analytics Period Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}/analytics?period=90",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200

    async def test_get_analytics_invalid_period(self, async_client: AsyncClient, auth_headers: dict):
        """Test getting analytics with invalid period."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Invalid Period Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act - Period exceeds max 365
        response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}/analytics?period=500",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 422

    async def test_get_analytics_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test getting analytics for non-existent assistant."""
        # Arrange
        fake_id = "00000000-0000-0000-0000-000000000000"

        # Act
        response = await async_client.get(
            f"/api/v1/assistants/{fake_id}/analytics",
            headers=auth_headers,
        )

        # Assert - API returns 403 Forbidden for security (doesn't reveal existence)
        # or 404 Not Found depending on implementation
        assert response.status_code in [403, 404]


@pytest.mark.integration
@pytest.mark.asyncio
class TestConversationEndpoints:
    """Test conversation endpoints."""

    async def test_list_conversations_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test listing conversations for an assistant."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Conversations List Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}/conversations",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert "conversations" in result["data"]
        assert "total" in result["data"]

    async def test_list_conversations_with_status_filter(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test listing conversations with status filter."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Status Filter Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}/conversations?status=unresolved",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200

    async def test_list_conversations_with_pagination(
        self, async_client: AsyncClient, auth_headers: dict
    ):
        """Test listing conversations with pagination."""
        # Arrange - Create an assistant first
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Pagination Test Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}/conversations?skip=0&limit=10",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.slow  # These tests require multiple user authentication which can trigger rate limiting
class TestAssistantAccessControl:
    """Test assistant access control across users.

    Note: These tests use the other_user_headers fixture which creates a second
    user and logs in. When running the full test suite, rate limiting may block
    these tests. Run separately with: pytest -m slow --no-cov
    """

    async def test_cannot_access_other_users_assistant(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        other_user_headers: dict,
    ):
        """Test that a user cannot access another user's assistant."""
        # Arrange - Create an assistant as first user
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Private Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act - Try to access as other user
        response = await async_client.get(
            f"/api/v1/assistants/{assistant_id}",
            headers=other_user_headers,
        )

        # Assert
        assert response.status_code == 403

    async def test_cannot_update_other_users_assistant(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        other_user_headers: dict,
    ):
        """Test that a user cannot update another user's assistant."""
        # Arrange - Create an assistant as first user
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Private Update Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act - Try to update as other user
        response = await async_client.put(
            f"/api/v1/assistants/{assistant_id}",
            json={"name": "Hacked Name"},
            headers=other_user_headers,
        )

        # Assert
        assert response.status_code == 403

    async def test_cannot_delete_other_users_assistant(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        other_user_headers: dict,
    ):
        """Test that a user cannot delete another user's assistant."""
        # Arrange - Create an assistant as first user
        create_response = await async_client.post(
            "/api/v1/assistants/",
            json={"name": "Private Delete Bot"},
            headers=auth_headers,
        )
        assistant_id = create_response.json()["data"]["id"]

        # Act - Try to delete as other user
        response = await async_client.delete(
            f"/api/v1/assistants/{assistant_id}",
            headers=other_user_headers,
        )

        # Assert
        assert response.status_code == 403

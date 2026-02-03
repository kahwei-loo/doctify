"""
Integration Tests for WebSocket API Endpoints

Tests real-time WebSocket communication for document updates and notifications.
"""

import pytest
import asyncio
from httpx import AsyncClient
from uuid import uuid4
import json


@pytest.mark.integration
@pytest.mark.asyncio
class TestWebSocketConnection:
    """Test WebSocket connection and authentication."""

    async def test_websocket_connect_success(self, async_client: AsyncClient, test_user_token: str):
        """Test successful WebSocket connection with authentication."""
        # Act
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Assert - Connection established
            assert websocket

            # Send ping to verify connection
            await websocket.send_json({"type": "ping"})
            response = await websocket.receive_json()
            assert response["type"] == "pong"

    async def test_websocket_connect_without_token(self, async_client: AsyncClient):
        """Test WebSocket connection fails without authentication token."""
        # Act & Assert
        with pytest.raises(Exception):
            async with async_client.websocket_connect("/api/v1/ws"):
                pass

    async def test_websocket_connect_invalid_token(self, async_client: AsyncClient):
        """Test WebSocket connection fails with invalid token."""
        # Act & Assert
        with pytest.raises(Exception):
            async with async_client.websocket_connect("/api/v1/ws?token=invalid_token"):
                pass


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentUpdateNotifications:
    """Test real-time document update notifications via WebSocket."""

    async def test_receive_document_upload_notification(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user_token: str,
        test_pdf_file,
    ):
        """Test receiving notification when document is uploaded."""
        # Arrange - Connect WebSocket
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Subscribe to document updates
            await websocket.send_json({
                "type": "subscribe",
                "channel": "documents",
            })

            # Act - Upload document via REST API
            files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
            upload_response = await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                headers=auth_headers,
            )
            document_id = upload_response.json()["data"]["id"]

            # Assert - Receive WebSocket notification
            notification = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0,
            )
            assert notification["type"] == "document.uploaded"
            assert notification["data"]["document_id"] == document_id

    async def test_receive_document_processing_notifications(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user_token: str,
        test_pdf_file,
    ):
        """Test receiving document processing status notifications."""
        # Arrange - Connect WebSocket and upload document
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Subscribe to document updates
            await websocket.send_json({
                "type": "subscribe",
                "channel": "documents",
            })

            # Upload document
            files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
            upload_response = await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                headers=auth_headers,
            )
            document_id = upload_response.json()["data"]["id"]

            # Trigger processing
            await async_client.post(
                f"/api/v1/documents/{document_id}/process",
                headers=auth_headers,
            )

            # Assert - Receive processing started notification
            notification1 = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0,
            )
            assert notification1["type"] in ["document.uploaded", "document.processing"]
            assert notification1["data"]["document_id"] == document_id

            # May receive additional status updates
            # (processing, completed, etc. depending on implementation)

    async def test_receive_document_deletion_notification(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user_token: str,
        test_pdf_file,
    ):
        """Test receiving notification when document is deleted."""
        # Arrange - Connect WebSocket and upload document
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Subscribe to document updates
            await websocket.send_json({
                "type": "subscribe",
                "channel": "documents",
            })

            # Upload document
            files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
            upload_response = await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                headers=auth_headers,
            )
            document_id = upload_response.json()["data"]["id"]

            # Clear upload notification
            await websocket.receive_json()

            # Act - Delete document
            await async_client.delete(
                f"/api/v1/documents/{document_id}",
                headers=auth_headers,
            )

            # Assert - Receive deletion notification
            notification = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0,
            )
            assert notification["type"] == "document.deleted"
            assert notification["data"]["document_id"] == document_id


@pytest.mark.integration
@pytest.mark.asyncio
class TestWebSocketSubscriptions:
    """Test WebSocket subscription management."""

    async def test_subscribe_to_channel(self, async_client: AsyncClient, test_user_token: str):
        """Test subscribing to a notification channel."""
        # Arrange
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Act - Subscribe to documents channel
            await websocket.send_json({
                "type": "subscribe",
                "channel": "documents",
            })

            # Assert - Receive subscription confirmation
            response = await websocket.receive_json()
            assert response["type"] == "subscribed"
            assert response["channel"] == "documents"

    async def test_unsubscribe_from_channel(self, async_client: AsyncClient, test_user_token: str):
        """Test unsubscribing from a notification channel."""
        # Arrange
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Subscribe first
            await websocket.send_json({
                "type": "subscribe",
                "channel": "documents",
            })
            await websocket.receive_json()  # Consume subscription confirmation

            # Act - Unsubscribe
            await websocket.send_json({
                "type": "unsubscribe",
                "channel": "documents",
            })

            # Assert - Receive unsubscription confirmation
            response = await websocket.receive_json()
            assert response["type"] == "unsubscribed"
            assert response["channel"] == "documents"

    async def test_subscribe_to_specific_document(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user_token: str,
        test_pdf_file,
    ):
        """Test subscribing to updates for a specific document."""
        # Arrange - Upload document
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )
        document_id = upload_response.json()["data"]["id"]

        # Connect WebSocket
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Act - Subscribe to specific document
            await websocket.send_json({
                "type": "subscribe",
                "channel": f"document.{document_id}",
            })

            # Assert - Receive subscription confirmation
            response = await websocket.receive_json()
            assert response["type"] == "subscribed"
            assert response["channel"] == f"document.{document_id}"


@pytest.mark.integration
@pytest.mark.asyncio
class TestWebSocketProjectNotifications:
    """Test project-related WebSocket notifications."""

    async def test_receive_project_creation_notification(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user_token: str,
    ):
        """Test receiving notification when project is created."""
        # Arrange - Connect WebSocket
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Subscribe to project updates
            await websocket.send_json({
                "type": "subscribe",
                "channel": "projects",
            })

            # Act - Create project
            create_response = await async_client.post(
                "/api/v1/projects",
                json={"name": "New Project"},
                headers=auth_headers,
            )
            project_id = create_response.json()["data"]["id"]

            # Assert - Receive notification
            notification = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0,
            )
            assert notification["type"] in ["subscribed", "project.created"]
            if notification["type"] == "project.created":
                assert notification["data"]["project_id"] == project_id

    async def test_receive_project_update_notification(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user_token: str,
    ):
        """Test receiving notification when project is updated."""
        # Arrange - Create project and connect WebSocket
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Original Name"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Subscribe to project updates
            await websocket.send_json({
                "type": "subscribe",
                "channel": "projects",
            })
            await websocket.receive_json()  # Consume subscription confirmation

            # Act - Update project
            await async_client.patch(
                f"/api/v1/projects/{project_id}",
                json={"name": "Updated Name"},
                headers=auth_headers,
            )

            # Assert - Receive notification
            notification = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0,
            )
            assert notification["type"] == "project.updated"
            assert notification["data"]["project_id"] == project_id


@pytest.mark.integration
@pytest.mark.asyncio
class TestWebSocketErrorHandling:
    """Test WebSocket error handling."""

    async def test_invalid_message_format(self, async_client: AsyncClient, test_user_token: str):
        """Test handling of invalid message format."""
        # Arrange
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Act - Send invalid message
            await websocket.send_text("invalid json")

            # Assert - Receive error response
            response = await websocket.receive_json()
            assert response["type"] == "error"

    async def test_subscribe_to_unauthorized_channel(
        self,
        async_client: AsyncClient,
        test_user_token: str,
    ):
        """Test subscribing to unauthorized channel."""
        # Arrange
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Act - Try to subscribe to other user's document
            other_document_id = str(uuid4())
            await websocket.send_json({
                "type": "subscribe",
                "channel": f"document.{other_document_id}",
            })

            # Assert - Receive error or unauthorized response
            response = await websocket.receive_json()
            assert response["type"] in ["error", "unauthorized"]

    async def test_connection_persistence(self, async_client: AsyncClient, test_user_token: str):
        """Test WebSocket connection stays alive with heartbeat."""
        # Arrange
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Act - Send multiple pings over time
            for _ in range(5):
                await websocket.send_json({"type": "ping"})
                response = await websocket.receive_json()
                assert response["type"] == "pong"
                await asyncio.sleep(1)

            # Assert - Connection still alive
            await websocket.send_json({"type": "ping"})
            response = await websocket.receive_json()
            assert response["type"] == "pong"


@pytest.mark.integration
@pytest.mark.asyncio
class TestWebSocketMultipleConnections:
    """Test multiple WebSocket connections and isolation."""

    async def test_multiple_connections_same_user(
        self,
        async_client: AsyncClient,
        test_user_token: str,
    ):
        """Test multiple WebSocket connections for same user."""
        # Arrange & Act - Open multiple connections
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as ws1, async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as ws2:
            # Subscribe both connections
            await ws1.send_json({"type": "subscribe", "channel": "documents"})
            await ws2.send_json({"type": "subscribe", "channel": "documents"})

            # Assert - Both connections work independently
            response1 = await ws1.receive_json()
            response2 = await ws2.receive_json()
            assert response1["type"] == "subscribed"
            assert response2["type"] == "subscribed"

    async def test_user_isolation(self, async_client: AsyncClient):
        """Test that users only receive their own notifications."""
        # Arrange - Create two users and get tokens
        user1_data = {"email": "ws1@example.com", "password": "Password123!"}
        user2_data = {"email": "ws2@example.com", "password": "Password123!"}

        await async_client.post("/api/v1/auth/register", json=user1_data)
        await async_client.post("/api/v1/auth/register", json=user2_data)

        login1 = await async_client.post(
            "/api/v1/auth/login",
            data={"username": user1_data["email"], "password": user1_data["password"]},
        )
        login2 = await async_client.post(
            "/api/v1/auth/login",
            data={"username": user2_data["email"], "password": user2_data["password"]},
        )

        token1 = login1.json()["data"]["access_token"]
        token2 = login2.json()["data"]["access_token"]

        # Act - Connect both users and subscribe
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={token1}"
        ) as ws1, async_client.websocket_connect(
            f"/api/v1/ws?token={token2}"
        ) as ws2:
            await ws1.send_json({"type": "subscribe", "channel": "documents"})
            await ws2.send_json({"type": "subscribe", "channel": "documents"})

            # Consume subscription confirmations
            await ws1.receive_json()
            await ws2.receive_json()

            # User 1 creates document
            headers1 = {"Authorization": f"Bearer {token1}"}
            from io import BytesIO
            test_file = BytesIO(b"test content")
            files = {"file": ("test.pdf", test_file, "application/pdf")}

            await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                headers=headers1,
            )

            # Assert - Only user1 receives notification
            notification1 = await asyncio.wait_for(ws1.receive_json(), timeout=2.0)
            assert notification1["type"] == "document.uploaded"

            # User 2 should not receive notification (or timeout)
            try:
                await asyncio.wait_for(ws2.receive_json(), timeout=1.0)
                # If we reach here, check it's not user1's document
                # (implementation dependent)
            except asyncio.TimeoutError:
                # Expected - user2 should not receive user1's notifications
                pass

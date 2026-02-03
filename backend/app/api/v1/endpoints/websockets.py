"""
WebSocket endpoints for real-time document and notification updates.

Provides WebSocket connections for:
- Document list updates (document creation, updates, deletion)
- Document status updates (processing status for specific document)
- General notifications

Phase 11 - Real-time Updates
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from typing import Optional, Tuple
import uuid
from datetime import datetime

from app.api.v1.deps import authenticate_websocket, get_websocket_manager
from app.services.notification.websocket import WebSocketManager
from app.db.models.user import User
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/documents")
async def websocket_documents(
    websocket: WebSocket,
    auth_result: Tuple[str, User] = Depends(authenticate_websocket),
    manager: WebSocketManager = Depends(get_websocket_manager),
    project_id: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for document list updates.

    Broadcasts when documents are created, updated, or deleted.
    Clients can optionally filter by project_id.

    Args:
        websocket: WebSocket connection
        auth_result: Authenticated user tuple (user_id, User)
        manager: WebSocket manager singleton
        project_id: Optional project filter

    Connection URL:
        ws://localhost:50080/api/v1/ws/documents?token=<jwt_token>&project_id=<uuid>

    Message Format:
        {
            "type": "heartbeat" | "document_created" | "document_updated" | "document_deleted",
            "timestamp": "2025-01-24T10:00:00Z",
            "data": {...}  // Document data for non-heartbeat messages
        }
    """
    logger.info("🌐 [WS ENDPOINT] /ws/documents endpoint handler REACHED")
    logger.info(f"🌐 [WS ENDPOINT] Dependencies resolved - auth_result received")

    user_id, user = auth_result
    logger.info(f"🌐 [WS ENDPOINT] User: {user.email}, Project: {project_id}")
    logger.info(f"🌐 [WS ENDPOINT] WebSocket state before manager.connect(): {websocket.client_state}")

    try:
        # Register connection with WebSocket manager (will accept the connection)
        logger.info("🌐 [WS ENDPOINT] CALLING manager.connect()...")
        await manager.connect(
            websocket,
            user_id,
            project_id=project_id
        )
        logger.info(f"✅ [WS ENDPOINT] manager.connect() completed successfully")
        logger.info(f"✅ [WS ENDPOINT] WebSocket state after manager.connect(): {websocket.client_state}")

        logger.info(f"✅ [WS ENDPOINT] WebSocket connected: documents (user={user.email}, project={project_id})")

        # Keep connection alive and handle incoming messages
        try:
            while True:
                # Wait for messages (ping/pong to keep alive)
                logger.debug(f"🔄 [WS ENDPOINT] Waiting for message from client...")
                data = await websocket.receive_text()
                logger.debug(f"🔄 [WS ENDPOINT] Received message: {data}")

                # Echo back as heartbeat
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                })
                logger.debug(f"🔄 [WS ENDPOINT] Sent heartbeat response")

        except WebSocketDisconnect:
            logger.info(f"👋 [WS ENDPOINT] WebSocket disconnected: documents (user={user.email})")

    except Exception as e:
        logger.error(f"❌ [WS ENDPOINT] WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass

    finally:
        # Clean up connection
        logger.info(f"🧹 [WS ENDPOINT] Cleaning up connection (user={user.email}, project={project_id})")
        manager.disconnect(websocket, user_id, project_id=project_id)
        logger.info(f"🧹 [WS ENDPOINT] Connection cleanup completed")


@router.websocket("/ws/documents/{document_id}/status")
async def websocket_document_status(
    websocket: WebSocket,
    document_id: uuid.UUID,
    auth_result: Tuple[str, User] = Depends(authenticate_websocket),
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    WebSocket endpoint for specific document status updates.

    Broadcasts processing status changes for a single document.
    Useful for showing real-time progress during OCR processing.

    Args:
        websocket: WebSocket connection
        document_id: Document UUID
        auth_result: Authenticated user tuple (user_id, User)
        manager: WebSocket manager singleton

    Connection URL:
        ws://localhost:50080/api/v1/ws/documents/{document_id}/status?token=<jwt_token>

    Message Format:
        {
            "type": "status_update" | "progress_update" | "heartbeat",
            "timestamp": "2025-01-24T10:00:00Z",
            "status": "pending" | "processing" | "processed" | "failed",
            "progress": 0-100,  // For progress_update type
            "message": "Processing page 1 of 10..."  // Optional status message
        }
    """
    user_id, user = auth_result

    try:
        # Register connection for document-specific updates
        await manager.connect(
            websocket,
            user_id,
            document_id=str(document_id)
        )

        logger.info(f"WebSocket connected: document status (user={user.email}, doc={document_id})")

        try:
            while True:
                data = await websocket.receive_text()
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                })

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: document status (doc={document_id})")

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass

    finally:
        manager.disconnect(websocket, user_id, document_id=str(document_id))


@router.websocket("/ws/assistants/{assistant_id}")
async def websocket_assistant(
    websocket: WebSocket,
    assistant_id: uuid.UUID,
    auth_result: Tuple[str, User] = Depends(authenticate_websocket),
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    WebSocket endpoint for assistant conversation updates.

    Broadcasts when conversations are created, updated, or have new messages.
    Staff users subscribe to receive real-time updates for an assistant's conversations.

    Args:
        websocket: WebSocket connection
        assistant_id: Assistant UUID
        auth_result: Authenticated user tuple (user_id, User)
        manager: WebSocket manager singleton

    Connection URL:
        ws://localhost:50080/api/v1/ws/assistants/{assistant_id}?token=<jwt_token>

    Message Format:
        {
            "type": "conversation.created" | "conversation.updated" | "message.created" | "heartbeat",
            "timestamp": "2025-01-24T10:00:00Z",
            "data": {...}  // Event-specific data
        }
    """
    user_id, user = auth_result

    try:
        # Register connection for assistant-specific updates
        await manager.connect(
            websocket,
            user_id,
            assistant_id=str(assistant_id)
        )

        logger.info(f"WebSocket connected: assistant (user={user.email}, assistant={assistant_id})")

        try:
            while True:
                data = await websocket.receive_text()
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                })

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: assistant (assistant={assistant_id})")

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass

    finally:
        manager.disconnect(websocket, user_id, assistant_id=str(assistant_id))


@router.websocket("/ws/conversations/{conversation_id}")
async def websocket_conversation(
    websocket: WebSocket,
    conversation_id: uuid.UUID,
    auth_result: Tuple[str, User] = Depends(authenticate_websocket),
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    WebSocket endpoint for specific conversation updates.

    Broadcasts new messages and status changes for a specific conversation.
    Staff users subscribe to receive real-time message updates.

    Args:
        websocket: WebSocket connection
        conversation_id: Conversation UUID
        auth_result: Authenticated user tuple (user_id, User)
        manager: WebSocket manager singleton

    Connection URL:
        ws://localhost:50080/api/v1/ws/conversations/{conversation_id}?token=<jwt_token>

    Message Format:
        {
            "type": "message.created" | "conversation.updated" | "heartbeat",
            "timestamp": "2025-01-24T10:00:00Z",
            "data": {...}  // Event-specific data
        }
    """
    user_id, user = auth_result

    try:
        # Register connection for conversation-specific updates
        await manager.connect(
            websocket,
            user_id,
            conversation_id=str(conversation_id)
        )

        logger.info(f"WebSocket connected: conversation (user={user.email}, conversation={conversation_id})")

        try:
            while True:
                data = await websocket.receive_text()
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                })

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: conversation (conversation={conversation_id})")

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass

    finally:
        manager.disconnect(websocket, user_id, conversation_id=str(conversation_id))


@router.websocket("/ws/notifications")
async def websocket_notifications(
    websocket: WebSocket,
    auth_result: Tuple[str, User] = Depends(authenticate_websocket),
    manager: WebSocketManager = Depends(get_websocket_manager)
):
    """
    WebSocket endpoint for general user notifications.

    Receives system notifications, alerts, and general updates
    not specific to documents.

    Args:
        websocket: WebSocket connection
        auth_result: Authenticated user tuple (user_id, User)
        manager: WebSocket manager singleton

    Connection URL:
        ws://localhost:50080/api/v1/ws/notifications?token=<jwt_token>

    Message Format:
        {
            "type": "notification" | "alert" | "heartbeat",
            "timestamp": "2025-01-24T10:00:00Z",
            "level": "info" | "warning" | "error",  // For notification/alert types
            "title": "Notification Title",
            "message": "Notification message",
            "action_url": "/documents/123"  // Optional action link
        }
    """
    await websocket.accept()

    user_id, user = auth_result
    connection_id = str(uuid.uuid4())

    try:
        await manager.connect(
            websocket,
            connection_id,
            user_id,
            metadata={"type": "notifications"}
        )

        logger.info(f"WebSocket connected: notifications (user={user.email})")

        try:
            while True:
                data = await websocket.receive_text()
                await websocket.send_json({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat()
                })

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: notifications (user={user.email})")

    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close(code=1011, reason="Internal error")
        except:
            pass

    finally:
        await manager.disconnect(connection_id)

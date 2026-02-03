"""
WebSocket Notification Service

Handles real-time WebSocket connections and event broadcasting.
"""

from typing import Dict, Set, Any, Optional
import json
import logging
from datetime import datetime

from fastapi import WebSocket
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts messages.

    Provides connection lifecycle management and targeted message delivery.
    """

    def __init__(self):
        """Initialize WebSocket manager."""
        # Active connections: user_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

        # Project-specific connections: project_id -> set of WebSocket connections
        self.project_connections: Dict[str, Set[WebSocket]] = {}

        # Document-specific connections: document_id -> set of WebSocket connections
        self.document_connections: Dict[str, Set[WebSocket]] = {}

        # Assistant-specific connections: assistant_id -> set of WebSocket connections
        self.assistant_connections: Dict[str, Set[WebSocket]] = {}

        # Conversation-specific connections: conversation_id -> set of WebSocket connections
        self.conversation_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: str,
        project_id: Optional[str] = None,
        document_id: Optional[str] = None,
        assistant_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
    ) -> None:
        """
        Accept and register new WebSocket connection.

        Args:
            websocket: WebSocket connection
            user_id: User ID
            project_id: Optional project ID for project-specific updates
            document_id: Optional document ID for document-specific updates
            assistant_id: Optional assistant ID for assistant-specific updates
            conversation_id: Optional conversation ID for conversation-specific updates
        """
        logger.info("🔌 [WS MANAGER] connect() method called")
        logger.info(f"🔌 [WS MANAGER] Parameters - user_id: {user_id}, project_id: {project_id}, document_id: {document_id}")
        logger.info(f"🔌 [WS MANAGER] WebSocket state BEFORE accept(): {websocket.client_state}")

        logger.info("🔌 [WS MANAGER] CALLING websocket.accept()...")
        await websocket.accept()
        logger.info(f"✅ [WS MANAGER] websocket.accept() COMPLETED successfully")
        logger.info(f"✅ [WS MANAGER] WebSocket state AFTER accept(): {websocket.client_state}")

        # Register user connection
        logger.info(f"🔌 [WS MANAGER] Registering user connection for user_id: {user_id}")
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"✅ [WS MANAGER] User connection registered. Total connections for user: {len(self.active_connections[user_id])}")

        # Register project connection if provided
        if project_id:
            logger.info(f"🔌 [WS MANAGER] Registering project connection for project_id: {project_id}")
            if project_id not in self.project_connections:
                self.project_connections[project_id] = set()
            self.project_connections[project_id].add(websocket)
            logger.info(f"✅ [WS MANAGER] Project connection registered. Total connections for project: {len(self.project_connections[project_id])}")

        # Register document connection if provided
        if document_id:
            logger.info(f"🔌 [WS MANAGER] Registering document connection for document_id: {document_id}")
            if document_id not in self.document_connections:
                self.document_connections[document_id] = set()
            self.document_connections[document_id].add(websocket)
            logger.info(f"✅ [WS MANAGER] Document connection registered. Total connections for document: {len(self.document_connections[document_id])}")

        # Register assistant connection if provided
        if assistant_id:
            logger.info(f"🔌 [WS MANAGER] Registering assistant connection for assistant_id: {assistant_id}")
            if assistant_id not in self.assistant_connections:
                self.assistant_connections[assistant_id] = set()
            self.assistant_connections[assistant_id].add(websocket)
            logger.info(f"✅ [WS MANAGER] Assistant connection registered. Total connections for assistant: {len(self.assistant_connections[assistant_id])}")

        # Register conversation connection if provided
        if conversation_id:
            logger.info(f"🔌 [WS MANAGER] Registering conversation connection for conversation_id: {conversation_id}")
            if conversation_id not in self.conversation_connections:
                self.conversation_connections[conversation_id] = set()
            self.conversation_connections[conversation_id].add(websocket)
            logger.info(f"✅ [WS MANAGER] Conversation connection registered. Total connections for conversation: {len(self.conversation_connections[conversation_id])}")

        logger.info("✅ [WS MANAGER] connect() method completed successfully")

    def disconnect(
        self,
        websocket: WebSocket,
        user_id: str,
        project_id: Optional[str] = None,
        document_id: Optional[str] = None,
        assistant_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
    ) -> None:
        """
        Remove WebSocket connection from all registries.

        Args:
            websocket: WebSocket connection
            user_id: User ID
            project_id: Optional project ID
            document_id: Optional document ID
            assistant_id: Optional assistant ID
            conversation_id: Optional conversation ID
        """
        logger.info("🔌 [WS MANAGER] disconnect() method called")
        logger.info(f"🔌 [WS MANAGER] Parameters - user_id: {user_id}, project_id: {project_id}, document_id: {document_id}")

        # Remove from user connections
        if user_id in self.active_connections:
            logger.info(f"🔌 [WS MANAGER] Removing connection from user: {user_id}")
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                logger.info(f"🔌 [WS MANAGER] No more connections for user {user_id}, removing user entry")
                del self.active_connections[user_id]
            else:
                logger.info(f"🔌 [WS MANAGER] User {user_id} still has {len(self.active_connections[user_id])} connections")

        # Remove from project connections
        if project_id and project_id in self.project_connections:
            logger.info(f"🔌 [WS MANAGER] Removing connection from project: {project_id}")
            self.project_connections[project_id].discard(websocket)
            if not self.project_connections[project_id]:
                logger.info(f"🔌 [WS MANAGER] No more connections for project {project_id}, removing project entry")
                del self.project_connections[project_id]

        # Remove from document connections
        if document_id and document_id in self.document_connections:
            logger.info(f"🔌 [WS MANAGER] Removing connection from document: {document_id}")
            self.document_connections[document_id].discard(websocket)
            if not self.document_connections[document_id]:
                logger.info(f"🔌 [WS MANAGER] No more connections for document {document_id}, removing document entry")
                del self.document_connections[document_id]

        # Remove from assistant connections
        if assistant_id and assistant_id in self.assistant_connections:
            logger.info(f"🔌 [WS MANAGER] Removing connection from assistant: {assistant_id}")
            self.assistant_connections[assistant_id].discard(websocket)
            if not self.assistant_connections[assistant_id]:
                logger.info(f"🔌 [WS MANAGER] No more connections for assistant {assistant_id}, removing assistant entry")
                del self.assistant_connections[assistant_id]

        # Remove from conversation connections
        if conversation_id and conversation_id in self.conversation_connections:
            logger.info(f"🔌 [WS MANAGER] Removing connection from conversation: {conversation_id}")
            self.conversation_connections[conversation_id].discard(websocket)
            if not self.conversation_connections[conversation_id]:
                logger.info(f"🔌 [WS MANAGER] No more connections for conversation {conversation_id}, removing conversation entry")
                del self.conversation_connections[conversation_id]

        logger.info("✅ [WS MANAGER] disconnect() method completed")

    async def send_personal_message(
        self,
        message: Dict[str, Any],
        user_id: str,
    ) -> int:
        """
        Send message to specific user's connections.

        Args:
            message: Message data
            user_id: Target user ID

        Returns:
            Number of connections message was sent to
        """
        if user_id not in self.active_connections:
            return 0

        connections = self.active_connections[user_id].copy()
        sent_count = 0

        for connection in connections:
            try:
                await connection.send_json(message)
                sent_count += 1
            except Exception:
                # Connection broken, remove it
                self.disconnect(connection, user_id)

        return sent_count

    async def send_project_message(
        self,
        message: Dict[str, Any],
        project_id: str,
    ) -> int:
        """
        Send message to all connections subscribed to project.

        Args:
            message: Message data
            project_id: Target project ID

        Returns:
            Number of connections message was sent to
        """
        if project_id not in self.project_connections:
            return 0

        connections = self.project_connections[project_id].copy()
        sent_count = 0

        for connection in connections:
            try:
                await connection.send_json(message)
                sent_count += 1
            except Exception:
                # Connection broken, remove it
                self.project_connections[project_id].discard(connection)

        return sent_count

    async def send_document_message(
        self,
        message: Dict[str, Any],
        document_id: str,
    ) -> int:
        """
        Send message to all connections subscribed to document.

        Args:
            message: Message data
            document_id: Target document ID

        Returns:
            Number of connections message was sent to
        """
        if document_id not in self.document_connections:
            return 0

        connections = self.document_connections[document_id].copy()
        sent_count = 0

        for connection in connections:
            try:
                await connection.send_json(message)
                sent_count += 1
            except Exception:
                # Connection broken, remove it
                self.document_connections[document_id].discard(connection)

        return sent_count

    async def send_assistant_message(
        self,
        message: Dict[str, Any],
        assistant_id: str,
    ) -> int:
        """
        Send message to all connections subscribed to assistant.

        Args:
            message: Message data
            assistant_id: Target assistant ID

        Returns:
            Number of connections message was sent to
        """
        if assistant_id not in self.assistant_connections:
            return 0

        connections = self.assistant_connections[assistant_id].copy()
        sent_count = 0

        for connection in connections:
            try:
                await connection.send_json(message)
                sent_count += 1
            except Exception:
                # Connection broken, remove it
                self.assistant_connections[assistant_id].discard(connection)

        return sent_count

    async def send_conversation_message(
        self,
        message: Dict[str, Any],
        conversation_id: str,
    ) -> int:
        """
        Send message to all connections subscribed to conversation.

        Args:
            message: Message data
            conversation_id: Target conversation ID

        Returns:
            Number of connections message was sent to
        """
        if conversation_id not in self.conversation_connections:
            return 0

        connections = self.conversation_connections[conversation_id].copy()
        sent_count = 0

        for connection in connections:
            try:
                await connection.send_json(message)
                sent_count += 1
            except Exception:
                # Connection broken, remove it
                self.conversation_connections[conversation_id].discard(connection)

        return sent_count

    async def broadcast_message(
        self,
        message: Dict[str, Any],
    ) -> int:
        """
        Broadcast message to all connected users.

        Args:
            message: Message data

        Returns:
            Number of connections message was sent to
        """
        sent_count = 0

        for user_connections in self.active_connections.values():
            for connection in user_connections.copy():
                try:
                    await connection.send_json(message)
                    sent_count += 1
                except Exception:
                    # Connection broken, skip
                    pass

        return sent_count

    def get_active_connections_count(self) -> Dict[str, int]:
        """
        Get count of active connections.

        Returns:
            Dictionary with connection statistics
        """
        total_user_connections = sum(len(conns) for conns in self.active_connections.values())
        total_project_connections = sum(len(conns) for conns in self.project_connections.values())
        total_document_connections = sum(len(conns) for conns in self.document_connections.values())
        total_assistant_connections = sum(len(conns) for conns in self.assistant_connections.values())
        total_conversation_connections = sum(len(conns) for conns in self.conversation_connections.values())

        return {
            "total_users": len(self.active_connections),
            "total_user_connections": total_user_connections,
            "total_projects": len(self.project_connections),
            "total_project_connections": total_project_connections,
            "total_documents": len(self.document_connections),
            "total_document_connections": total_document_connections,
            "total_assistants": len(self.assistant_connections),
            "total_assistant_connections": total_assistant_connections,
            "total_conversations": len(self.conversation_connections),
            "total_conversation_connections": total_conversation_connections,
        }


class WebSocketNotificationService:
    """
    Service for sending structured WebSocket notifications.

    Provides high-level notification methods for common events.
    """

    def __init__(self, manager: WebSocketManager):
        """
        Initialize notification service.

        Args:
            manager: WebSocket manager instance
        """
        self.manager = manager

    def _create_message(
        self,
        event_type: str,
        data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Create structured notification message.

        Args:
            event_type: Event type identifier
            data: Event data

        Returns:
            Structured message dictionary
        """
        return {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def notify_document_status_change(
        self,
        document_id: str,
        status: str,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> int:
        """
        Notify document status change.

        Args:
            document_id: Document ID
            status: New status
            user_id: Optional user ID for personal notification
            project_id: Optional project ID for project notification

        Returns:
            Number of connections notified
        """
        message = self._create_message(
            "document.status_change",
            {
                "document_id": document_id,
                "status": status,
            },
        )

        sent_count = 0

        # Send to document subscribers
        sent_count += await self.manager.send_document_message(message, document_id)

        # Send to user if specified
        if user_id:
            sent_count += await self.manager.send_personal_message(message, user_id)

        # Send to project if specified
        if project_id:
            sent_count += await self.manager.send_project_message(message, project_id)

        return sent_count

    async def notify_document_completed(
        self,
        document_id: str,
        result: Dict[str, Any],
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> int:
        """
        Notify document processing completion.

        Args:
            document_id: Document ID
            result: Processing result
            user_id: Optional user ID
            project_id: Optional project ID

        Returns:
            Number of connections notified
        """
        message = self._create_message(
            "document.completed",
            {
                "document_id": document_id,
                "result": result,
            },
        )

        sent_count = 0
        sent_count += await self.manager.send_document_message(message, document_id)

        if user_id:
            sent_count += await self.manager.send_personal_message(message, user_id)

        if project_id:
            sent_count += await self.manager.send_project_message(message, project_id)

        return sent_count

    async def notify_document_failed(
        self,
        document_id: str,
        error_message: str,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
    ) -> int:
        """
        Notify document processing failure.

        Args:
            document_id: Document ID
            error_message: Error description
            user_id: Optional user ID
            project_id: Optional project ID

        Returns:
            Number of connections notified
        """
        message = self._create_message(
            "document.failed",
            {
                "document_id": document_id,
                "error_message": error_message,
            },
        )

        sent_count = 0
        sent_count += await self.manager.send_document_message(message, document_id)

        if user_id:
            sent_count += await self.manager.send_personal_message(message, user_id)

        if project_id:
            sent_count += await self.manager.send_project_message(message, project_id)

        return sent_count

    async def notify_export_ready(
        self,
        export_id: str,
        download_url: str,
        user_id: str,
    ) -> int:
        """
        Notify export is ready for download.

        Args:
            export_id: Export ID
            download_url: Download URL
            user_id: User ID

        Returns:
            Number of connections notified
        """
        message = self._create_message(
            "export.ready",
            {
                "export_id": export_id,
                "download_url": download_url,
            },
        )

        return await self.manager.send_personal_message(message, user_id)

    async def notify_usage_limit_reached(
        self,
        limit_type: str,
        user_id: str,
    ) -> int:
        """
        Notify usage limit reached.

        Args:
            limit_type: Type of limit (documents, tokens, api_calls)
            user_id: User ID

        Returns:
            Number of connections notified
        """
        message = self._create_message(
            "usage.limit_reached",
            {
                "limit_type": limit_type,
            },
        )

        return await self.manager.send_personal_message(message, user_id)

    async def notify_system_message(
        self,
        message_text: str,
        severity: str = "info",
    ) -> int:
        """
        Broadcast system message to all users.

        Args:
            message_text: Message text
            severity: Message severity (info, warning, error)

        Returns:
            Number of connections notified
        """
        message = self._create_message(
            "system.message",
            {
                "message": message_text,
                "severity": severity,
            },
        )

        return await self.manager.broadcast_message(message)

    # =========================================================================
    # Assistant & Conversation Notifications
    # =========================================================================

    async def notify_conversation_created(
        self,
        assistant_id: str,
        conversation_id: str,
        preview: str,
        user_id: Optional[str] = None,
    ) -> int:
        """
        Notify new conversation created for assistant.

        Args:
            assistant_id: Assistant ID
            conversation_id: Conversation ID
            preview: Last message preview
            user_id: Optional user ID for personal notification

        Returns:
            Number of connections notified
        """
        message = self._create_message(
            "conversation.created",
            {
                "assistant_id": assistant_id,
                "conversation_id": conversation_id,
                "preview": preview,
            },
        )

        sent_count = await self.manager.send_assistant_message(message, assistant_id)

        if user_id:
            sent_count += await self.manager.send_personal_message(message, user_id)

        return sent_count

    async def notify_conversation_updated(
        self,
        assistant_id: str,
        conversation_id: str,
        status: str,
        preview: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> int:
        """
        Notify conversation status or content update.

        Args:
            assistant_id: Assistant ID
            conversation_id: Conversation ID
            status: Conversation status
            preview: Optional last message preview
            user_id: Optional user ID

        Returns:
            Number of connections notified
        """
        data = {
            "assistant_id": assistant_id,
            "conversation_id": conversation_id,
            "status": status,
        }
        if preview:
            data["preview"] = preview

        message = self._create_message("conversation.updated", data)

        sent_count = await self.manager.send_assistant_message(message, assistant_id)
        sent_count += await self.manager.send_conversation_message(message, conversation_id)

        if user_id:
            sent_count += await self.manager.send_personal_message(message, user_id)

        return sent_count

    async def notify_new_message(
        self,
        conversation_id: str,
        message_id: str,
        role: str,
        content: str,
        assistant_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> int:
        """
        Notify new message in conversation.

        Args:
            conversation_id: Conversation ID
            message_id: Message ID
            role: Message role (user/assistant)
            content: Message content
            assistant_id: Optional assistant ID
            user_id: Optional user ID

        Returns:
            Number of connections notified
        """
        message = self._create_message(
            "message.created",
            {
                "conversation_id": conversation_id,
                "message_id": message_id,
                "role": role,
                "content": content,
            },
        )

        sent_count = await self.manager.send_conversation_message(message, conversation_id)

        if assistant_id:
            sent_count += await self.manager.send_assistant_message(message, assistant_id)

        if user_id:
            sent_count += await self.manager.send_personal_message(message, user_id)

        return sent_count

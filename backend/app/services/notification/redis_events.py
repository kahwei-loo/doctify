"""
Redis Event Notification Service

Handles distributed event publishing and subscription using Redis pub/sub.
"""

from typing import Dict, Any, Callable, Awaitable, Optional
import json
import asyncio
from datetime import datetime

from redis import asyncio as aioredis
from app.core.config import get_settings
from app.core.exceptions import ExternalServiceError

settings = get_settings()


class RedisEventService:
    """
    Redis pub/sub service for distributed event handling.

    Enables communication between multiple application instances.
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
    ):
        """
        Initialize Redis event service.

        Args:
            redis_url: Optional Redis URL (defaults to settings)
        """
        self.redis_url = redis_url or settings.REDIS_URL
        self.redis: Optional[aioredis.Redis] = None
        self.pubsub: Optional[aioredis.client.PubSub] = None
        self.subscribers: Dict[str, Callable[[Dict[str, Any]], Awaitable[None]]] = {}
        self.listener_task: Optional[asyncio.Task] = None

    async def connect(self) -> None:
        """
        Connect to Redis and initialize pub/sub.

        Raises:
            ExternalServiceError: If connection fails
        """
        try:
            self.redis = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            self.pubsub = self.redis.pubsub()

        except Exception as e:
            raise ExternalServiceError(
                f"Failed to connect to Redis: {str(e)}",
                details={"redis_url": self.redis_url, "error": str(e)},
            )

    async def disconnect(self) -> None:
        """Disconnect from Redis and cleanup resources."""
        if self.listener_task:
            self.listener_task.cancel()
            try:
                await self.listener_task
            except asyncio.CancelledError:
                pass

        if self.pubsub:
            await self.pubsub.close()

        if self.redis:
            await self.redis.close()

    async def publish(
        self,
        channel: str,
        event_type: str,
        data: Dict[str, Any],
    ) -> int:
        """
        Publish event to Redis channel.

        Args:
            channel: Channel name
            event_type: Event type identifier
            data: Event data

        Returns:
            Number of subscribers that received the message

        Raises:
            ExternalServiceError: If publish fails
        """
        if not self.redis:
            raise ExternalServiceError("Redis not connected")

        try:
            message = {
                "type": event_type,
                "data": data,
                "timestamp": datetime.utcnow().isoformat(),
            }

            message_json = json.dumps(message)
            receivers = await self.redis.publish(channel, message_json)

            return receivers

        except Exception as e:
            raise ExternalServiceError(
                f"Failed to publish event to Redis: {str(e)}",
                details={"channel": channel, "event_type": event_type, "error": str(e)},
            )

    async def subscribe(
        self,
        channel: str,
        handler: Callable[[Dict[str, Any]], Awaitable[None]],
    ) -> None:
        """
        Subscribe to Redis channel and register handler.

        Args:
            channel: Channel name
            handler: Async callback function for handling messages

        Raises:
            ExternalServiceError: If subscription fails
        """
        if not self.pubsub:
            raise ExternalServiceError("Redis pub/sub not initialized")

        try:
            await self.pubsub.subscribe(channel)
            self.subscribers[channel] = handler

            # Start listener if not already running
            if not self.listener_task or self.listener_task.done():
                self.listener_task = asyncio.create_task(self._listen())

        except Exception as e:
            raise ExternalServiceError(
                f"Failed to subscribe to Redis channel: {str(e)}",
                details={"channel": channel, "error": str(e)},
            )

    async def unsubscribe(
        self,
        channel: str,
    ) -> None:
        """
        Unsubscribe from Redis channel.

        Args:
            channel: Channel name

        Raises:
            ExternalServiceError: If unsubscribe fails
        """
        if not self.pubsub:
            raise ExternalServiceError("Redis pub/sub not initialized")

        try:
            await self.pubsub.unsubscribe(channel)
            if channel in self.subscribers:
                del self.subscribers[channel]

        except Exception as e:
            raise ExternalServiceError(
                f"Failed to unsubscribe from Redis channel: {str(e)}",
                details={"channel": channel, "error": str(e)},
            )

    async def _listen(self) -> None:
        """
        Listen for Redis pub/sub messages and dispatch to handlers.

        Runs in background task until cancelled.
        """
        if not self.pubsub:
            return

        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    channel = message["channel"]
                    data = message["data"]

                    # Parse message
                    try:
                        parsed_data = json.loads(data)

                        # Call handler if registered
                        if channel in self.subscribers:
                            handler = self.subscribers[channel]
                            await handler(parsed_data)

                    except json.JSONDecodeError:
                        # Invalid JSON, skip
                        pass
                    except Exception as e:
                        # Handler error, log but continue
                        print(f"Error in message handler: {str(e)}")

        except asyncio.CancelledError:
            # Task cancelled, exit gracefully
            pass


class RedisNotificationService:
    """
    High-level notification service using Redis pub/sub.

    Provides structured event publishing for common application events.
    """

    # Channel names
    DOCUMENT_CHANNEL = "doctify:documents"
    PROJECT_CHANNEL = "doctify:projects"
    USER_CHANNEL = "doctify:users"
    SYSTEM_CHANNEL = "doctify:system"

    def __init__(self, redis_service: RedisEventService):
        """
        Initialize notification service.

        Args:
            redis_service: Redis event service instance
        """
        self.redis_service = redis_service

    async def notify_document_event(
        self,
        event_type: str,
        document_id: str,
        data: Dict[str, Any],
    ) -> int:
        """
        Publish document event.

        Args:
            event_type: Event type (status_change, completed, failed, etc.)
            document_id: Document ID
            data: Additional event data

        Returns:
            Number of subscribers notified
        """
        event_data = {
            "document_id": document_id,
            **data,
        }

        return await self.redis_service.publish(
            self.DOCUMENT_CHANNEL,
            event_type,
            event_data,
        )

    async def notify_project_event(
        self,
        event_type: str,
        project_id: str,
        data: Dict[str, Any],
    ) -> int:
        """
        Publish project event.

        Args:
            event_type: Event type
            project_id: Project ID
            data: Additional event data

        Returns:
            Number of subscribers notified
        """
        event_data = {
            "project_id": project_id,
            **data,
        }

        return await self.redis_service.publish(
            self.PROJECT_CHANNEL,
            event_type,
            event_data,
        )

    async def notify_user_event(
        self,
        event_type: str,
        user_id: str,
        data: Dict[str, Any],
    ) -> int:
        """
        Publish user event.

        Args:
            event_type: Event type
            user_id: User ID
            data: Additional event data

        Returns:
            Number of subscribers notified
        """
        event_data = {
            "user_id": user_id,
            **data,
        }

        return await self.redis_service.publish(
            self.USER_CHANNEL,
            event_type,
            event_data,
        )

    async def notify_system_event(
        self,
        event_type: str,
        data: Dict[str, Any],
    ) -> int:
        """
        Publish system-wide event.

        Args:
            event_type: Event type
            data: Event data

        Returns:
            Number of subscribers notified
        """
        return await self.redis_service.publish(
            self.SYSTEM_CHANNEL,
            event_type,
            data,
        )

    async def subscribe_to_document_events(
        self,
        handler: Callable[[Dict[str, Any]], Awaitable[None]],
    ) -> None:
        """
        Subscribe to document events.

        Args:
            handler: Async callback function
        """
        await self.redis_service.subscribe(self.DOCUMENT_CHANNEL, handler)

    async def subscribe_to_project_events(
        self,
        handler: Callable[[Dict[str, Any]], Awaitable[None]],
    ) -> None:
        """
        Subscribe to project events.

        Args:
            handler: Async callback function
        """
        await self.redis_service.subscribe(self.PROJECT_CHANNEL, handler)

    async def subscribe_to_user_events(
        self,
        handler: Callable[[Dict[str, Any]], Awaitable[None]],
    ) -> None:
        """
        Subscribe to user events.

        Args:
            handler: Async callback function
        """
        await self.redis_service.subscribe(self.USER_CHANNEL, handler)

    async def subscribe_to_system_events(
        self,
        handler: Callable[[Dict[str, Any]], Awaitable[None]],
    ) -> None:
        """
        Subscribe to system events.

        Args:
            handler: Async callback function
        """
        await self.redis_service.subscribe(self.SYSTEM_CHANNEL, handler)

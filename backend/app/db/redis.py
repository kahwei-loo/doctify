"""
Redis Client Module

Provides async Redis connection management with connection pooling
and caching utilities for the Doctify application.
"""

import json
import logging
from typing import Any, Optional, TypeVar, Type
from datetime import timedelta

import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

T = TypeVar("T", bound=BaseModel)


class RedisClient:
    """
    Async Redis client with connection pooling and caching utilities.

    Features:
    - Connection pooling for efficient resource usage
    - JSON serialization/deserialization for complex types
    - Pydantic model support for type-safe caching
    - Automatic TTL management
    """

    def __init__(self):
        self._pool: Optional[ConnectionPool] = None
        self._client: Optional[redis.Redis] = None

    async def connect(self) -> None:
        """Initialize Redis connection pool."""
        if self._pool is None:
            try:
                self._pool = ConnectionPool.from_url(
                    settings.REDIS_URL,
                    max_connections=settings.REDIS_MAX_CONNECTIONS,
                    decode_responses=True,
                )
                self._client = redis.Redis(connection_pool=self._pool)
                # Test connection
                await self._client.ping()
                logger.info("Redis connection established")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self._pool = None
                self._client = None
                raise

    async def disconnect(self) -> None:
        """Close Redis connections."""
        if self._client:
            await self._client.aclose()
            self._client = None
        if self._pool:
            await self._pool.disconnect()
            self._pool = None
        logger.info("Redis connection closed")

    @property
    def client(self) -> redis.Redis:
        """Get Redis client instance."""
        if self._client is None:
            raise RuntimeError("Redis client not initialized. Call connect() first.")
        return self._client

    async def get(self, key: str) -> Optional[str]:
        """
        Get string value from Redis.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        try:
            return await self.client.get(key)
        except Exception as e:
            logger.warning(f"Redis GET error for key {key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: str,
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Set string value in Redis.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (uses default if not specified)

        Returns:
            True if successful
        """
        try:
            expire = ttl or settings.CACHE_TTL
            await self.client.setex(key, expire, value)
            return True
        except Exception as e:
            logger.warning(f"Redis SET error for key {key}: {e}")
            return False

    async def get_json(self, key: str) -> Optional[dict]:
        """
        Get JSON value from Redis.

        Args:
            key: Cache key

        Returns:
            Parsed JSON dict or None if not found
        """
        try:
            value = await self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except json.JSONDecodeError as e:
            logger.warning(f"Redis JSON decode error for key {key}: {e}")
            return None
        except Exception as e:
            logger.warning(f"Redis GET JSON error for key {key}: {e}")
            return None

    async def set_json(
        self,
        key: str,
        value: dict,
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Set JSON value in Redis.

        Args:
            key: Cache key
            value: Dict to cache as JSON
            ttl: Time-to-live in seconds

        Returns:
            True if successful
        """
        try:
            expire = ttl or settings.CACHE_TTL
            json_str = json.dumps(value, default=str)
            await self.client.setex(key, expire, json_str)
            return True
        except Exception as e:
            logger.warning(f"Redis SET JSON error for key {key}: {e}")
            return False

    async def get_model(self, key: str, model_class: Type[T]) -> Optional[T]:
        """
        Get Pydantic model from Redis.

        Args:
            key: Cache key
            model_class: Pydantic model class

        Returns:
            Parsed model instance or None if not found
        """
        data = await self.get_json(key)
        if data:
            try:
                return model_class.model_validate(data)
            except Exception as e:
                logger.warning(f"Redis model validation error for key {key}: {e}")
                return None
        return None

    async def set_model(
        self,
        key: str,
        model: BaseModel,
        ttl: Optional[int] = None,
    ) -> bool:
        """
        Set Pydantic model in Redis.

        Args:
            key: Cache key
            model: Pydantic model instance
            ttl: Time-to-live in seconds

        Returns:
            True if successful
        """
        return await self.set_json(key, model.model_dump(mode="json"), ttl)

    async def delete(self, key: str) -> bool:
        """
        Delete key from Redis.

        Args:
            key: Cache key

        Returns:
            True if key was deleted
        """
        try:
            result = await self.client.delete(key)
            return result > 0
        except Exception as e:
            logger.warning(f"Redis DELETE error for key {key}: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern.

        Args:
            pattern: Redis key pattern (e.g., "dashboard:*")

        Returns:
            Number of keys deleted
        """
        try:
            keys = []
            async for key in self.client.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                return await self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Redis DELETE PATTERN error for pattern {pattern}: {e}")
            return 0

    async def exists(self, key: str) -> bool:
        """
        Check if key exists in Redis.

        Args:
            key: Cache key

        Returns:
            True if key exists
        """
        try:
            return await self.client.exists(key) > 0
        except Exception as e:
            logger.warning(f"Redis EXISTS error for key {key}: {e}")
            return False

    async def ttl(self, key: str) -> int:
        """
        Get TTL for key.

        Args:
            key: Cache key

        Returns:
            TTL in seconds, -1 if no TTL, -2 if key doesn't exist
        """
        try:
            return await self.client.ttl(key)
        except Exception as e:
            logger.warning(f"Redis TTL error for key {key}: {e}")
            return -2

    async def incr(self, key: str, amount: int = 1) -> int:
        """
        Increment counter.

        Args:
            key: Counter key
            amount: Amount to increment

        Returns:
            New counter value
        """
        try:
            return await self.client.incrby(key, amount)
        except Exception as e:
            logger.warning(f"Redis INCR error for key {key}: {e}")
            return 0

    async def health_check(self) -> bool:
        """
        Check Redis connection health.

        Returns:
            True if Redis is healthy
        """
        try:
            await self.client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False


# =============================================================================
# Singleton Instance
# =============================================================================

redis_client: Optional[RedisClient] = None


async def get_redis() -> RedisClient:
    """
    Get Redis client singleton.

    Returns:
        RedisClient instance

    Raises:
        RuntimeError if Redis is not initialized
    """
    global redis_client

    if redis_client is None:
        redis_client = RedisClient()
        await redis_client.connect()

    return redis_client


async def init_redis() -> RedisClient:
    """
    Initialize Redis connection.

    Call this on application startup.
    """
    global redis_client
    redis_client = RedisClient()
    await redis_client.connect()
    return redis_client


async def close_redis() -> None:
    """
    Close Redis connection.

    Call this on application shutdown.
    """
    global redis_client
    if redis_client:
        await redis_client.disconnect()
        redis_client = None


# =============================================================================
# Cache Key Generators
# =============================================================================


class CacheKeys:
    """Cache key generators for consistent key naming."""

    @staticmethod
    def dashboard_stats(user_id: str) -> str:
        """Dashboard stats cache key."""
        return f"dashboard:stats:{user_id}"

    @staticmethod
    def dashboard_unified(user_id: str) -> str:
        """Dashboard unified stats cache key (includes KB, Assistant, trends)."""
        return f"dashboard:unified:{user_id}"

    @staticmethod
    def dashboard_trends(user_id: str, days: int) -> str:
        """Dashboard trends cache key."""
        return f"dashboard:trends:{user_id}:{days}"

    @staticmethod
    def project_stats(project_id: str) -> str:
        """Project stats cache key."""
        return f"project:stats:{project_id}"

    @staticmethod
    def user_settings(user_id: str) -> str:
        """User settings cache key."""
        return f"user:settings:{user_id}"

    @staticmethod
    def document_result(document_id: str) -> str:
        """Document extraction result cache key."""
        return f"document:result:{document_id}"

    @staticmethod
    def rate_limit(identifier: str, endpoint: str) -> str:
        """Rate limit cache key."""
        return f"rate_limit:{identifier}:{endpoint}"


# =============================================================================
# Cache TTL Constants
# =============================================================================


class CacheTTL:
    """Cache TTL constants in seconds."""

    DASHBOARD_STATS = 300  # 5 minutes
    DASHBOARD_TRENDS = 600  # 10 minutes
    PROJECT_STATS = 300  # 5 minutes
    USER_SETTINGS = 3600  # 1 hour
    DOCUMENT_RESULT = 1800  # 30 minutes
    SHORT = 60  # 1 minute
    MEDIUM = 300  # 5 minutes
    LONG = 3600  # 1 hour

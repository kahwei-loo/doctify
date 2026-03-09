"""
Token Blacklist Service

Redis-based JWT token revocation system with user token tracking for bulk revocation.
"""

from datetime import datetime
from typing import Optional, List
import logging

from app.db.redis import get_redis
from app.core.security import decode_token
from app.core.exceptions import AuthenticationError

logger = logging.getLogger(__name__)

# Key prefix for user token sets
USER_TOKENS_KEY_PREFIX = "user_tokens:"
# Default TTL for user token tracking (matches max token lifetime)
USER_TOKEN_TRACK_TTL = 86400 * 7  # 7 days


class TokenBlacklistService:
    """
    Service for managing revoked JWT tokens using Redis.

    Stores revoked token JTIs (JWT IDs) in Redis with TTL matching token expiration.
    This ensures tokens cannot be reused after revocation (logout, password change, etc.)
    """

    @staticmethod
    def _get_blacklist_key(jti: str) -> str:
        """
        Generate Redis key for blacklisted token.

        Args:
            jti: JWT ID (unique token identifier)

        Returns:
            Redis key string
        """
        return f"token_blacklist:{jti}"

    @staticmethod
    def _get_user_tokens_key(user_id: str) -> str:
        """
        Generate Redis key for user's active tokens set.

        Args:
            user_id: User ID

        Returns:
            Redis key string for user's token set
        """
        return f"{USER_TOKENS_KEY_PREFIX}{user_id}"

    @staticmethod
    async def track_user_token(user_id: str, jti: str, exp: int) -> None:
        """
        Track a token for a user to enable bulk revocation.

        Args:
            user_id: User ID who owns the token
            jti: JWT ID (unique token identifier)
            exp: Token expiration timestamp
        """
        try:
            redis_client = await get_redis()
            key = TokenBlacklistService._get_user_tokens_key(user_id)

            # Store token JTI with expiration timestamp as score in a sorted set
            # This allows us to efficiently query and clean up expired tokens
            await redis_client.zadd(key, {jti: exp})

            # Set TTL on the user tokens set to match max token lifetime
            await redis_client.expire(key, USER_TOKEN_TRACK_TTL)

            logger.debug(f"Tracked token {jti} for user {user_id}")

        except Exception as e:
            logger.warning(f"Failed to track user token: {e}")
            # Don't fail token issuance if tracking fails

    @staticmethod
    async def untrack_user_token(user_id: str, jti: str) -> None:
        """
        Remove a token from user's tracked tokens (after revocation or expiration).

        Args:
            user_id: User ID
            jti: JWT ID to untrack
        """
        try:
            redis_client = await get_redis()
            key = TokenBlacklistService._get_user_tokens_key(user_id)
            await redis_client.zrem(key, jti)
        except Exception as e:
            logger.warning(f"Failed to untrack user token: {e}")

    @staticmethod
    async def revoke_token(token: str) -> bool:
        """
        Revoke a token by adding its JTI to the blacklist.

        Args:
            token: JWT token string to revoke

        Returns:
            True if token was revoked, False if already revoked or invalid

        Raises:
            AuthenticationError: If token cannot be decoded
        """
        try:
            # Decode token to extract JTI and expiration
            payload = decode_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")

            if not jti:
                raise AuthenticationError(
                    "Token missing JTI field - cannot revoke",
                    details={"token_version": "legacy (no jti)"},
                )

            if not exp:
                raise AuthenticationError(
                    "Token missing expiration - cannot revoke", details={"jti": jti}
                )

            # Calculate remaining TTL for token
            current_time = datetime.utcnow().timestamp()
            remaining_ttl = int(exp - current_time)

            # If token already expired, no need to blacklist
            if remaining_ttl <= 0:
                logger.info(f"Token {jti} already expired, skipping blacklist")
                return True

            # Add to Redis blacklist with TTL
            redis_client = await get_redis()
            key = TokenBlacklistService._get_blacklist_key(jti)

            await redis_client.setex(key, remaining_ttl, "revoked")

            logger.info(f"Token {jti} revoked, blacklist TTL: {remaining_ttl}s")
            return True

        except Exception as e:
            logger.error(f"Failed to revoke token: {str(e)}")
            raise

    @staticmethod
    async def is_token_revoked(token: str) -> bool:
        """
        Check if a token has been revoked.

        Args:
            token: JWT token string to check

        Returns:
            True if token is revoked, False otherwise

        Raises:
            AuthenticationError: If token cannot be decoded
        """
        try:
            # Decode token to extract JTI
            payload = decode_token(token)
            jti = payload.get("jti")

            if not jti:
                # Legacy token without JTI - cannot be revoked via blacklist
                # Consider as not revoked (backward compatibility)
                logger.warning("Token missing JTI field - treating as not revoked")
                return False

            # Check if JTI exists in Redis blacklist
            redis_client = await get_redis()
            key = TokenBlacklistService._get_blacklist_key(jti)

            exists = await redis_client.exists(key)
            return bool(exists)

        except Exception as e:
            logger.error(f"Failed to check token revocation: {str(e)}")
            # On error, fail closed (treat as revoked for security)
            return True

    @staticmethod
    async def revoke_user_tokens(user_id: str, reason: str = "user_action") -> int:
        """
        Revoke all active tokens for a specific user.

        This function retrieves all tracked token JTIs for the user,
        adds them to the blacklist, and cleans up the tracking set.

        Args:
            user_id: User ID whose tokens should be revoked
            reason: Reason for revocation (password_change, security_breach, etc.)

        Returns:
            Number of tokens revoked
        """
        try:
            redis_client = await get_redis()
            key = TokenBlacklistService._get_user_tokens_key(user_id)

            # Get current timestamp to filter out already-expired tokens
            current_time = datetime.utcnow().timestamp()

            # Get all tracked tokens for user (jti -> exp score)
            # Only get tokens that haven't expired yet
            tokens = await redis_client.zrangebyscore(
                key,
                current_time,  # min score (tokens expiring after now)
                "+inf",  # max score (no upper limit)
                withscores=True,
            )

            if not tokens:
                logger.info(f"No active tokens found for user {user_id}")
                return 0

            revoked_count = 0

            # Revoke each token by adding to blacklist
            for jti, exp in tokens:
                # Decode bytes if needed
                if isinstance(jti, bytes):
                    jti = jti.decode("utf-8")

                # Calculate remaining TTL
                remaining_ttl = int(exp - current_time)

                if remaining_ttl > 0:
                    blacklist_key = TokenBlacklistService._get_blacklist_key(jti)
                    await redis_client.setex(
                        blacklist_key, remaining_ttl, f"revoked:{reason}"
                    )
                    revoked_count += 1

            # Clear the user's token tracking set
            await redis_client.delete(key)

            logger.info(
                f"Revoked {revoked_count} tokens for user {user_id} (reason: {reason})"
            )
            return revoked_count

        except Exception as e:
            logger.error(f"Failed to revoke user tokens: {e}")
            raise

    @staticmethod
    async def get_user_active_tokens(user_id: str) -> List[str]:
        """
        Get list of active (non-expired) token JTIs for a user.

        Args:
            user_id: User ID

        Returns:
            List of active token JTIs
        """
        try:
            redis_client = await get_redis()
            key = TokenBlacklistService._get_user_tokens_key(user_id)

            current_time = datetime.utcnow().timestamp()

            # Get only non-expired tokens
            tokens = await redis_client.zrangebyscore(
                key,
                current_time,
                "+inf",
            )

            # Decode bytes if needed and return as list
            return [t.decode("utf-8") if isinstance(t, bytes) else t for t in tokens]

        except Exception as e:
            logger.error(f"Failed to get user tokens: {e}")
            return []

    @staticmethod
    async def cleanup_expired_user_tokens(user_id: str) -> int:
        """
        Clean up expired tokens from a user's tracking set.

        Args:
            user_id: User ID

        Returns:
            Number of expired tokens removed
        """
        try:
            redis_client = await get_redis()
            key = TokenBlacklistService._get_user_tokens_key(user_id)

            current_time = datetime.utcnow().timestamp()

            # Remove all tokens with expiration time less than current time
            removed = await redis_client.zremrangebyscore(key, "-inf", current_time)

            if removed:
                logger.debug(f"Cleaned up {removed} expired tokens for user {user_id}")

            return removed

        except Exception as e:
            logger.warning(f"Failed to cleanup expired user tokens: {e}")
            return 0

    @staticmethod
    async def cleanup_expired_blacklist() -> int:
        """
        Clean up expired blacklist entries.

        Note: Redis handles this automatically via TTL, so this is a no-op.
        Provided for completeness and monitoring purposes.

        Returns:
            Number of entries cleaned (always 0 for Redis TTL)
        """
        logger.info("Redis TTL handles blacklist cleanup automatically")
        return 0

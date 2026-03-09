"""
Unit tests for TokenBlacklistService.

Tests the Redis-based JWT token revocation system including single token
revocation, bulk user token revocation, token tracking, and cleanup.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime

from app.services.auth.token_blacklist import (
    TokenBlacklistService,
    USER_TOKEN_TRACK_TTL,
)
from app.core.exceptions import AuthenticationError


@pytest.fixture
def mock_redis():
    """Create a mock async Redis client with all required methods."""
    client = AsyncMock()
    client.setex = AsyncMock()
    client.exists = AsyncMock(return_value=0)
    client.zadd = AsyncMock()
    client.expire = AsyncMock()
    client.zrangebyscore = AsyncMock(return_value=[])
    client.zrem = AsyncMock()
    client.zremrangebyscore = AsyncMock(return_value=0)
    client.delete = AsyncMock()
    return client


@pytest.fixture
def patch_redis(mock_redis):
    """Patch get_redis to return the mock Redis client."""
    with patch(
        "app.services.auth.token_blacklist.get_redis",
        new_callable=AsyncMock,
        return_value=mock_redis,
    ) as _mock:
        yield mock_redis


@pytest.fixture
def patch_decode_token():
    """Patch decode_token with a configurable mock."""
    with patch("app.services.auth.token_blacklist.decode_token") as mock:
        yield mock


@pytest.mark.unit
@pytest.mark.asyncio
class TestRevokeToken:
    """Tests for TokenBlacklistService.revoke_token."""

    async def test_revoke_token_success(self, patch_redis, patch_decode_token):
        """Successfully revoke a valid, non-expired token."""
        future_exp = datetime.utcnow().timestamp() + 3600
        patch_decode_token.return_value = {
            "jti": "test-jti-123",
            "exp": future_exp,
            "sub": "user-1",
        }

        result = await TokenBlacklistService.revoke_token("valid.jwt.token")

        assert result is True
        patch_redis.setex.assert_awaited_once()
        call_args = patch_redis.setex.call_args
        assert call_args[0][0] == "token_blacklist:test-jti-123"
        assert call_args[0][1] > 0  # TTL should be positive
        assert call_args[0][2] == "revoked"

    async def test_revoke_token_already_expired_returns_true(
        self, patch_redis, patch_decode_token
    ):
        """An already-expired token returns True without hitting Redis."""
        past_exp = datetime.utcnow().timestamp() - 100
        patch_decode_token.return_value = {
            "jti": "expired-jti",
            "exp": past_exp,
            "sub": "user-1",
        }

        result = await TokenBlacklistService.revoke_token("expired.jwt.token")

        assert result is True
        patch_redis.setex.assert_not_awaited()

    async def test_revoke_token_missing_jti_raises_error(
        self, patch_redis, patch_decode_token
    ):
        """Token without JTI field raises AuthenticationError."""
        patch_decode_token.return_value = {
            "exp": datetime.utcnow().timestamp() + 3600,
            "sub": "user-1",
        }

        with pytest.raises(AuthenticationError, match="Token missing JTI"):
            await TokenBlacklistService.revoke_token("no-jti.jwt.token")

    async def test_revoke_token_missing_exp_raises_error(
        self, patch_redis, patch_decode_token
    ):
        """Token without exp field raises AuthenticationError."""
        patch_decode_token.return_value = {
            "jti": "test-jti",
            "sub": "user-1",
        }

        with pytest.raises(AuthenticationError, match="Token missing expiration"):
            await TokenBlacklistService.revoke_token("no-exp.jwt.token")


@pytest.mark.unit
@pytest.mark.asyncio
class TestIsTokenRevoked:
    """Tests for TokenBlacklistService.is_token_revoked."""

    async def test_revoked_token_returns_true(self, patch_redis, patch_decode_token):
        """Token present in Redis blacklist returns True."""
        patch_decode_token.return_value = {"jti": "revoked-jti", "sub": "user-1"}
        patch_redis.exists.return_value = 1

        result = await TokenBlacklistService.is_token_revoked("revoked.jwt.token")

        assert result is True
        patch_redis.exists.assert_awaited_once_with("token_blacklist:revoked-jti")

    async def test_valid_token_returns_false(self, patch_redis, patch_decode_token):
        """Token not in Redis blacklist returns False."""
        patch_decode_token.return_value = {"jti": "valid-jti", "sub": "user-1"}
        patch_redis.exists.return_value = 0

        result = await TokenBlacklistService.is_token_revoked("valid.jwt.token")

        assert result is False

    async def test_missing_jti_returns_false_for_legacy_compat(
        self, patch_redis, patch_decode_token
    ):
        """Legacy token without JTI is treated as not revoked."""
        patch_decode_token.return_value = {"sub": "user-1"}

        result = await TokenBlacklistService.is_token_revoked("legacy.jwt.token")

        assert result is False
        patch_redis.exists.assert_not_awaited()

    async def test_redis_error_returns_true_fail_closed(
        self, patch_redis, patch_decode_token
    ):
        """On Redis error, fail closed by returning True (revoked)."""
        patch_decode_token.return_value = {"jti": "test-jti", "sub": "user-1"}
        patch_redis.exists.side_effect = ConnectionError("Redis unavailable")

        result = await TokenBlacklistService.is_token_revoked("some.jwt.token")

        assert result is True


@pytest.mark.unit
@pytest.mark.asyncio
class TestRevokeUserTokens:
    """Tests for TokenBlacklistService.revoke_user_tokens."""

    async def test_revoke_multiple_user_tokens(self, patch_redis, patch_decode_token):
        """Revoke all active tokens for a user and clean up tracking set."""
        future_exp = datetime.utcnow().timestamp() + 3600
        patch_redis.zrangebyscore.return_value = [
            (b"jti-1", future_exp),
            (b"jti-2", future_exp + 1000),
        ]

        result = await TokenBlacklistService.revoke_user_tokens(
            "user-42", reason="password_change"
        )

        assert result == 2
        assert patch_redis.setex.await_count == 2

        # Verify first token blacklisted
        first_call = patch_redis.setex.call_args_list[0]
        assert first_call[0][0] == "token_blacklist:jti-1"
        assert "revoked:password_change" in first_call[0][2]

        # Verify tracking set deleted
        patch_redis.delete.assert_awaited_once_with("user_tokens:user-42")

    async def test_revoke_user_tokens_none_active(
        self, patch_redis, patch_decode_token
    ):
        """Returns 0 when user has no active tokens."""
        patch_redis.zrangebyscore.return_value = []

        result = await TokenBlacklistService.revoke_user_tokens("user-99")

        assert result == 0
        patch_redis.setex.assert_not_awaited()
        patch_redis.delete.assert_not_awaited()


@pytest.mark.unit
@pytest.mark.asyncio
class TestTrackUserToken:
    """Tests for TokenBlacklistService.track_user_token."""

    async def test_track_token_success(self, patch_redis):
        """Track a token in the user's sorted set with expiration score."""
        exp_timestamp = int(datetime.utcnow().timestamp()) + 1800

        await TokenBlacklistService.track_user_token("user-1", "jti-abc", exp_timestamp)

        patch_redis.zadd.assert_awaited_once_with(
            "user_tokens:user-1", {"jti-abc": exp_timestamp}
        )
        patch_redis.expire.assert_awaited_once_with(
            "user_tokens:user-1", USER_TOKEN_TRACK_TTL
        )

    async def test_track_token_redis_failure_does_not_raise(self, patch_redis):
        """Tracking failure is swallowed so token issuance is not blocked."""
        patch_redis.zadd.side_effect = ConnectionError("Redis down")

        # Should not raise
        await TokenBlacklistService.track_user_token("user-1", "jti-xyz", 9999999999)


@pytest.mark.unit
@pytest.mark.asyncio
class TestGetUserActiveTokens:
    """Tests for TokenBlacklistService.get_user_active_tokens."""

    async def test_returns_decoded_token_list(self, patch_redis):
        """Returns list of JTI strings, decoding bytes if necessary."""
        patch_redis.zrangebyscore.return_value = [b"jti-1", b"jti-2", "jti-3"]

        result = await TokenBlacklistService.get_user_active_tokens("user-5")

        assert result == ["jti-1", "jti-2", "jti-3"]
        patch_redis.zrangebyscore.assert_awaited_once()

    async def test_returns_empty_list_on_error(self, patch_redis):
        """Returns empty list on Redis failure."""
        patch_redis.zrangebyscore.side_effect = ConnectionError("Redis down")

        result = await TokenBlacklistService.get_user_active_tokens("user-5")

        assert result == []


@pytest.mark.unit
@pytest.mark.asyncio
class TestCleanupExpiredUserTokens:
    """Tests for TokenBlacklistService.cleanup_expired_user_tokens."""

    async def test_cleanup_removes_expired_tokens(self, patch_redis):
        """Removes expired tokens from the sorted set."""
        patch_redis.zremrangebyscore.return_value = 3

        result = await TokenBlacklistService.cleanup_expired_user_tokens("user-7")

        assert result == 3
        patch_redis.zremrangebyscore.assert_awaited_once()
        call_args = patch_redis.zremrangebyscore.call_args[0]
        assert call_args[0] == "user_tokens:user-7"
        assert call_args[1] == "-inf"

    async def test_cleanup_returns_zero_on_error(self, patch_redis):
        """Returns 0 on Redis failure."""
        patch_redis.zremrangebyscore.side_effect = ConnectionError("Redis down")

        result = await TokenBlacklistService.cleanup_expired_user_tokens("user-7")

        assert result == 0

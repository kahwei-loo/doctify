"""
Unit tests for RedisRateLimiter.

Tests the sorted-set sliding window rate limiter used by the Insights QueryService.
"""

import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.insights.query_service import (
    RedisRateLimiter,
    RATE_LIMIT_REQUESTS_PER_MINUTE,
    RATE_LIMIT_REQUESTS_PER_HOUR,
    RATE_LIMIT_WINDOW_MINUTE,
    RATE_LIMIT_WINDOW_HOUR,
)


USER_ID = "user-abc-123"


# ── Fixtures ──────────────────────────────────────────────────────────


def _make_redis_mock():
    """Create a mock RedisClient with an inner .client mock."""
    redis_client = MagicMock()
    redis_client.client = AsyncMock()
    # Default: all operations succeed, counts return 0
    redis_client.client.zremrangebyscore = AsyncMock(return_value=0)
    redis_client.client.zcard = AsyncMock(return_value=0)
    redis_client.client.zrange = AsyncMock(return_value=[])
    redis_client.client.zadd = AsyncMock(return_value=1)
    redis_client.client.expire = AsyncMock(return_value=True)
    return redis_client


# ── Test Suite ────────────────────────────────────────────────────────


@pytest.mark.asyncio
class TestRedisRateLimiter:
    """Test suite for RedisRateLimiter."""

    @pytest.fixture
    def limiter(self):
        return RedisRateLimiter()

    @pytest.fixture
    def mock_redis(self):
        return _make_redis_mock()

    # ── check_rate_limit: allowed ─────────────────────────────────

    async def test_allows_request_under_limits(self, limiter, mock_redis):
        """Request under both minute and hour limits should be allowed."""
        mock_redis.client.zcard = AsyncMock(return_value=3)

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            allowed, error = await limiter.check_rate_limit(USER_ID)

        assert allowed is True
        assert error is None

    async def test_allows_request_at_boundary(self, limiter, mock_redis):
        """Request at limit-1 should still be allowed (limit is exclusive)."""
        # First zcard call = minute check, second = hour check
        mock_redis.client.zcard = AsyncMock(
            side_effect=[RATE_LIMIT_REQUESTS_PER_MINUTE - 1, RATE_LIMIT_REQUESTS_PER_HOUR - 1]
        )

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            allowed, error = await limiter.check_rate_limit(USER_ID)

        assert allowed is True
        assert error is None

    # ── check_rate_limit: minute limit exceeded ───────────────────

    async def test_blocks_when_minute_limit_exceeded(self, limiter, mock_redis):
        """Request at minute limit should be blocked with wait time message."""
        mock_redis.client.zcard = AsyncMock(return_value=RATE_LIMIT_REQUESTS_PER_MINUTE)
        oldest_ts = time.time() - 30  # 30 seconds ago
        mock_redis.client.zrange = AsyncMock(
            return_value=[(b"member", oldest_ts)]
        )

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            allowed, error = await limiter.check_rate_limit(USER_ID)

        assert allowed is False
        assert "Rate limit exceeded" in error
        assert "seconds" in error

    async def test_minute_limit_wait_time_calculation(self, limiter, mock_redis):
        """Wait time should reflect how long until oldest request exits the window."""
        mock_redis.client.zcard = AsyncMock(return_value=RATE_LIMIT_REQUESTS_PER_MINUTE)
        # Oldest request was 50 seconds ago → ~10 seconds wait
        oldest_ts = time.time() - 50
        mock_redis.client.zrange = AsyncMock(
            return_value=[(b"member", oldest_ts)]
        )

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            allowed, error = await limiter.check_rate_limit(USER_ID)

        assert allowed is False
        # Wait time should be approximately 10 seconds (60 - 50)
        assert "10" in error or "9" in error or "11" in error

    async def test_minute_limit_empty_zrange_defaults_to_60(self, limiter, mock_redis):
        """If zrange returns empty list, default wait time should be 60."""
        mock_redis.client.zcard = AsyncMock(return_value=RATE_LIMIT_REQUESTS_PER_MINUTE)
        mock_redis.client.zrange = AsyncMock(return_value=[])

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            allowed, error = await limiter.check_rate_limit(USER_ID)

        assert allowed is False
        assert "60" in error

    # ── check_rate_limit: hour limit exceeded ─────────────────────

    async def test_blocks_when_hour_limit_exceeded(self, limiter, mock_redis):
        """Request at hour limit should be blocked."""
        # Minute check passes, hour check fails
        mock_redis.client.zcard = AsyncMock(
            side_effect=[5, RATE_LIMIT_REQUESTS_PER_HOUR]
        )

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            allowed, error = await limiter.check_rate_limit(USER_ID)

        assert allowed is False
        assert "Hourly rate limit exceeded" in error

    # ── check_rate_limit: sliding window cleanup ──────────────────

    async def test_cleans_expired_entries_before_counting(self, limiter, mock_redis):
        """Old entries outside the window should be removed before counting."""
        mock_redis.client.zcard = AsyncMock(return_value=0)

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            with patch("app.services.insights.query_service.time") as mock_time:
                mock_time.time.return_value = 1000.0

                await limiter.check_rate_limit(USER_ID)

        # Verify minute window cleanup called with correct cutoff
        minute_call = mock_redis.client.zremrangebyscore.call_args_list[0]
        assert minute_call[0][0] == f"insights_rate_limit:{USER_ID}:minute"
        assert minute_call[0][1] == 0
        assert minute_call[0][2] == 1000.0 - RATE_LIMIT_WINDOW_MINUTE

        # Verify hour window cleanup called with correct cutoff
        hour_call = mock_redis.client.zremrangebyscore.call_args_list[1]
        assert hour_call[0][0] == f"insights_rate_limit:{USER_ID}:hour"
        assert hour_call[0][1] == 0
        assert hour_call[0][2] == 1000.0 - RATE_LIMIT_WINDOW_HOUR

    # ── check_rate_limit: key format ──────────────────────────────

    async def test_uses_correct_redis_keys(self, limiter, mock_redis):
        """Keys should follow the pattern {prefix}:{user_id}:{window}."""
        mock_redis.client.zcard = AsyncMock(return_value=0)

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            await limiter.check_rate_limit(USER_ID)

        expected_minute_key = f"insights_rate_limit:{USER_ID}:minute"
        expected_hour_key = f"insights_rate_limit:{USER_ID}:hour"

        # zremrangebyscore is called with minute key first, then hour key
        keys_used = [call[0][0] for call in mock_redis.client.zremrangebyscore.call_args_list]
        assert expected_minute_key in keys_used
        assert expected_hour_key in keys_used

    # ── check_rate_limit: graceful degradation ────────────────────

    async def test_allows_when_redis_unavailable(self, limiter):
        """When Redis is unavailable, requests should be allowed (graceful degradation)."""
        with patch.object(limiter, "_get_redis", return_value=None):
            allowed, error = await limiter.check_rate_limit(USER_ID)

        assert allowed is True
        assert error is None

    async def test_allows_when_redis_throws_during_check(self, limiter, mock_redis):
        """When Redis throws during check, requests should be allowed."""
        mock_redis.client.zremrangebyscore = AsyncMock(side_effect=Exception("Connection lost"))

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            allowed, error = await limiter.check_rate_limit(USER_ID)

        assert allowed is True
        assert error is None

    async def test_allows_when_get_redis_throws(self, limiter):
        """When get_redis itself throws, requests should be allowed."""
        with patch(
            "app.services.insights.query_service.get_redis",
            side_effect=Exception("Redis down"),
        ):
            limiter_fresh = RedisRateLimiter()
            allowed, error = await limiter_fresh.check_rate_limit(USER_ID)

        assert allowed is True
        assert error is None

    # ── record_request ────────────────────────────────────────────

    async def test_record_request_adds_to_both_keys(self, limiter, mock_redis):
        """Recording should add entries to both minute and hour sorted sets."""
        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            await limiter.record_request(USER_ID)

        assert mock_redis.client.zadd.call_count == 2
        assert mock_redis.client.expire.call_count == 2

        # First zadd = minute key
        minute_zadd = mock_redis.client.zadd.call_args_list[0]
        assert f"insights_rate_limit:{USER_ID}:minute" == minute_zadd[0][0]

        # Second zadd = hour key
        hour_zadd = mock_redis.client.zadd.call_args_list[1]
        assert f"insights_rate_limit:{USER_ID}:hour" == hour_zadd[0][0]

    async def test_record_request_sets_ttl(self, limiter, mock_redis):
        """TTL should be set slightly beyond the window to allow cleanup."""
        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            await limiter.record_request(USER_ID)

        minute_expire = mock_redis.client.expire.call_args_list[0]
        hour_expire = mock_redis.client.expire.call_args_list[1]

        assert minute_expire[0][1] == RATE_LIMIT_WINDOW_MINUTE + 10
        assert hour_expire[0][1] == RATE_LIMIT_WINDOW_HOUR + 60

    async def test_record_request_unique_members_across_calls(self, limiter, mock_redis):
        """Each record_request call should generate a unique member across calls."""
        members = []

        async def capture_zadd(key, mapping):
            members.extend(mapping.keys())
            return 1

        mock_redis.client.zadd = AsyncMock(side_effect=capture_zadd)

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            await limiter.record_request(USER_ID)
            await limiter.record_request(USER_ID)

        # 4 zadd calls total (2 calls × 2 keys each)
        assert len(members) == 4
        # Same member is reused for minute+hour within one call,
        # but different members across calls → 2 unique members
        unique = set(members)
        assert len(unique) == 2

    async def test_record_request_noop_when_redis_unavailable(self, limiter):
        """Recording should silently succeed when Redis is unavailable."""
        with patch.object(limiter, "_get_redis", return_value=None):
            # Should not raise
            await limiter.record_request(USER_ID)

    async def test_record_request_graceful_on_error(self, limiter, mock_redis):
        """Recording should silently handle Redis errors."""
        mock_redis.client.zadd = AsyncMock(side_effect=Exception("Write failed"))

        with patch.object(limiter, "_get_redis", return_value=mock_redis):
            # Should not raise
            await limiter.record_request(USER_ID)

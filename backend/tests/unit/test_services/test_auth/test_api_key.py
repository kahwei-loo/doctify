"""
Unit tests for ApiKeyService.

Tests API key creation, validation, revocation, rotation, and statistics.
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ValidationError,
)
from app.services.auth.api_key import ApiKeyService


def _make_api_key_mock(
    *,
    id: str | None = None,
    user_id: str = "user-1",
    name: str = "Test Key",
    is_active: bool = True,
    expires_at: datetime | None = None,
    last_used_at: datetime | None = None,
    created_at: datetime | None = None,
    key_prefix: str = "dk_test1",
) -> MagicMock:
    """Create a MagicMock that behaves like an ApiKey model instance."""
    mock = MagicMock()
    mock.id = id or str(uuid.uuid4())
    mock.user_id = user_id
    mock.name = name
    mock.is_active = is_active
    mock.expires_at = expires_at
    mock.last_used_at = last_used_at
    mock.created_at = created_at or datetime.utcnow()
    mock.key_prefix = key_prefix
    return mock


@pytest.fixture
def mock_repository() -> AsyncMock:
    """Create an AsyncMock repository with standard method signatures."""
    repo = AsyncMock()
    repo.create_api_key = AsyncMock()
    repo.is_key_valid = AsyncMock()
    repo.get_by_key_hash = AsyncMock()
    repo.revoke_key = AsyncMock()
    repo.list = AsyncMock()
    repo.get_by_id = AsyncMock()
    repo.update = AsyncMock()
    return repo


@pytest.fixture
def service(mock_repository: AsyncMock) -> ApiKeyService:
    """Create an ApiKeyService instance with mocked repository."""
    return ApiKeyService(repository=mock_repository)


PLAIN_KEY = "dk_test1234567890abcdef"
HASHED_KEY = "hashed_abc123"


@pytest.mark.unit
@pytest.mark.asyncio
class TestCreateApiKey:
    """Tests for ApiKeyService.create_api_key."""

    @patch("app.services.auth.api_key.hash_api_key", return_value=HASHED_KEY)
    @patch("app.services.auth.api_key.generate_api_key", return_value=PLAIN_KEY)
    async def test_create_api_key_success(
        self,
        mock_generate: MagicMock,
        mock_hash: MagicMock,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Successful creation returns dict with plain key and metadata."""
        # Arrange
        api_key_record = _make_api_key_mock(
            id="key-1",
            user_id="user-1",
            name="My Key",
        )
        mock_repository.create_api_key.return_value = api_key_record

        # Act
        result = await service.create_api_key(
            user_id="user-1",
            name="My Key",
            expires_in_days=30,
        )

        # Assert
        assert result["api_key"] == PLAIN_KEY
        assert result["api_key_id"] == "key-1"
        assert result["name"] == "My Key"
        assert result["is_active"] is True
        assert result["created_at"] is not None
        mock_generate.assert_called_once()
        mock_hash.assert_called_once_with(PLAIN_KEY)
        mock_repository.create_api_key.assert_called_once()
        call_kwargs = mock_repository.create_api_key.call_args.kwargs
        assert call_kwargs["user_id"] == "user-1"
        assert call_kwargs["key_hash"] == HASHED_KEY
        assert call_kwargs["key_prefix"] == PLAIN_KEY[:8]
        assert call_kwargs["name"] == "My Key"
        assert call_kwargs["expires_at"] is not None

    async def test_create_api_key_empty_name_raises_validation_error(
        self,
        service: ApiKeyService,
    ) -> None:
        """Empty name raises ValidationError."""
        # Act / Assert
        with pytest.raises(ValidationError, match="API key name cannot be empty"):
            await service.create_api_key(user_id="user-1", name="")

    async def test_create_api_key_whitespace_name_raises_validation_error(
        self,
        service: ApiKeyService,
    ) -> None:
        """Whitespace-only name raises ValidationError."""
        with pytest.raises(ValidationError, match="API key name cannot be empty"):
            await service.create_api_key(user_id="user-1", name="   ")

    @patch("app.services.auth.api_key.hash_api_key", return_value=HASHED_KEY)
    @patch("app.services.auth.api_key.generate_api_key", return_value=PLAIN_KEY)
    async def test_create_api_key_negative_expires_raises_validation_error(
        self,
        mock_generate: MagicMock,
        mock_hash: MagicMock,
        service: ApiKeyService,
    ) -> None:
        """Negative expires_in_days raises ValidationError."""
        with pytest.raises(ValidationError, match="Expiration days must be positive"):
            await service.create_api_key(
                user_id="user-1",
                name="Key",
                expires_in_days=-5,
            )


@pytest.mark.unit
@pytest.mark.asyncio
class TestValidateApiKey:
    """Tests for ApiKeyService.validate_api_key."""

    @patch("app.services.auth.api_key.hash_api_key", return_value=HASHED_KEY)
    async def test_validate_valid_key_returns_record(
        self,
        mock_hash: MagicMock,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Valid, active, non-expired key returns the ApiKey record."""
        # Arrange
        api_key_record = _make_api_key_mock(is_active=True, expires_at=None)
        mock_repository.is_key_valid.return_value = True
        mock_repository.get_by_key_hash.return_value = api_key_record

        # Act
        result = await service.validate_api_key(PLAIN_KEY)

        # Assert
        assert result is api_key_record
        mock_hash.assert_called_once_with(PLAIN_KEY)
        mock_repository.is_key_valid.assert_called_once_with(HASHED_KEY)
        mock_repository.get_by_key_hash.assert_called_once_with(HASHED_KEY)

    @patch("app.services.auth.api_key.hash_api_key", return_value=HASHED_KEY)
    async def test_validate_invalid_key_raises_authentication_error(
        self,
        mock_hash: MagicMock,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Key that fails is_key_valid raises AuthenticationError."""
        # Arrange
        mock_repository.is_key_valid.return_value = False

        # Act / Assert
        with pytest.raises(AuthenticationError, match="Invalid or expired API key"):
            await service.validate_api_key(PLAIN_KEY)

    @patch("app.services.auth.api_key.hash_api_key", return_value=HASHED_KEY)
    async def test_validate_revoked_key_raises_authentication_error(
        self,
        mock_hash: MagicMock,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Active key that is marked is_active=False raises AuthenticationError."""
        # Arrange
        api_key_record = _make_api_key_mock(is_active=False)
        mock_repository.is_key_valid.return_value = True
        mock_repository.get_by_key_hash.return_value = api_key_record

        # Act / Assert
        with pytest.raises(AuthenticationError, match="API key has been revoked"):
            await service.validate_api_key(PLAIN_KEY)


@pytest.mark.unit
@pytest.mark.asyncio
class TestRevokeApiKey:
    """Tests for ApiKeyService.revoke_api_key."""

    async def test_revoke_own_key_succeeds(
        self,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Owner can revoke their own API key."""
        # Arrange
        api_key_record = _make_api_key_mock(id="key-1", user_id="user-1")
        mock_repository.get_by_id.return_value = api_key_record

        # Act
        result = await service.revoke_api_key(api_key_id="key-1", user_id="user-1")

        # Assert
        assert result is True
        mock_repository.revoke_key.assert_called_once_with("key-1")

    async def test_revoke_other_users_key_raises_authorization_error(
        self,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Non-owner attempting to revoke raises AuthorizationError."""
        # Arrange
        api_key_record = _make_api_key_mock(id="key-1", user_id="user-1")
        mock_repository.get_by_id.return_value = api_key_record

        # Act / Assert
        with pytest.raises(AuthorizationError, match="Not authorized to revoke"):
            await service.revoke_api_key(api_key_id="key-1", user_id="user-2")

    async def test_revoke_nonexistent_key_raises_not_found(
        self,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Revoking a key that does not exist raises NotFoundError via BaseService.get_by_id."""
        # Arrange
        mock_repository.get_by_id.return_value = None

        # Act / Assert
        with pytest.raises(NotFoundError):
            await service.revoke_api_key(api_key_id="nonexistent", user_id="user-1")


@pytest.mark.unit
@pytest.mark.asyncio
class TestRotateApiKey:
    """Tests for ApiKeyService.rotate_api_key."""

    @patch("app.services.auth.api_key.hash_api_key", return_value=HASHED_KEY)
    @patch("app.services.auth.api_key.generate_api_key", return_value=PLAIN_KEY)
    async def test_rotate_key_revokes_old_and_creates_new(
        self,
        mock_generate: MagicMock,
        mock_hash: MagicMock,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Rotation revokes old key and returns a new key dict."""
        # Arrange
        old_key = _make_api_key_mock(
            id="key-old",
            user_id="user-1",
            name="Original Key",
            expires_at=datetime.utcnow() + timedelta(days=60),
        )
        new_key_record = _make_api_key_mock(
            id="key-new",
            user_id="user-1",
            name="Original Key (rotated)",
        )
        mock_repository.get_by_id.return_value = old_key
        mock_repository.create_api_key.return_value = new_key_record

        # Act
        result = await service.rotate_api_key(api_key_id="key-old", user_id="user-1")

        # Assert
        assert result["api_key"] == PLAIN_KEY
        assert result["api_key_id"] == "key-new"
        assert result["name"] == "Original Key (rotated)"
        mock_repository.revoke_key.assert_called_once_with("key-old")
        mock_repository.create_api_key.assert_called_once()

    async def test_rotate_other_users_key_raises_authorization_error(
        self,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Rotating another user's key raises AuthorizationError."""
        # Arrange
        old_key = _make_api_key_mock(id="key-old", user_id="user-1")
        mock_repository.get_by_id.return_value = old_key

        # Act / Assert
        with pytest.raises(AuthorizationError, match="Not authorized to rotate"):
            await service.rotate_api_key(api_key_id="key-old", user_id="user-2")


@pytest.mark.unit
@pytest.mark.asyncio
class TestGetApiKeyStatistics:
    """Tests for ApiKeyService.get_api_key_statistics."""

    async def test_statistics_returns_correct_counts(
        self,
        service: ApiKeyService,
        mock_repository: AsyncMock,
    ) -> None:
        """Statistics dict contains correct counts for each category."""
        # Arrange
        now = datetime.utcnow()
        keys = [
            _make_api_key_mock(
                name="active-recent",
                is_active=True,
                expires_at=None,
                last_used_at=now - timedelta(days=1),
            ),
            _make_api_key_mock(
                name="active-stale",
                is_active=True,
                expires_at=None,
                last_used_at=now - timedelta(days=30),
            ),
            _make_api_key_mock(
                name="expired",
                is_active=True,
                expires_at=now - timedelta(days=5),
                last_used_at=None,
            ),
            _make_api_key_mock(
                name="revoked",
                is_active=False,
                expires_at=None,
                last_used_at=None,
            ),
        ]
        mock_repository.list.return_value = keys

        # Act
        result = await service.get_api_key_statistics(user_id="user-1")

        # Assert
        assert result["total_keys"] == 4
        assert result["active_keys"] == 3  # 2 active + 1 expired-but-active
        assert result["expired_keys"] == 1
        assert result["revoked_keys"] == 1
        assert result["recently_used"] == 1  # only active-recent used within 7 days

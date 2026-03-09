"""
Unit tests for AuthenticationService.

Tests cover registration, authentication (with lockout), login,
token refresh, and password change flows.
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import AuthenticationError, ValidationError
from app.services.auth.authentication import AuthenticationService


# ── Helpers ──────────────────────────────────────────────────────────


def _make_user(**overrides) -> MagicMock:
    """Create a mock User with sensible defaults."""
    user = MagicMock()
    user.id = overrides.get("id", uuid.uuid4())
    user.email = overrides.get("email", "test@example.com")
    user.username = overrides.get("username", "testuser")
    user.full_name = overrides.get("full_name", "Test User")
    user.is_active = overrides.get("is_active", True)
    user.is_verified = overrides.get("is_verified", True)
    user.is_superuser = overrides.get("is_superuser", False)
    user.hashed_password = overrides.get("hashed_password", "hashed_pw")
    user.failed_login_attempts = overrides.get("failed_login_attempts", 0)
    user.locked_until = overrides.get("locked_until", None)
    user.last_failed_login = overrides.get("last_failed_login", None)
    user.updated_at = overrides.get("updated_at", datetime.utcnow())

    # Domain methods
    user.is_locked = MagicMock(return_value=overrides.get("is_locked_val", False))
    user.record_failed_login_attempt = MagicMock(
        return_value=overrides.get("record_failed_returns", False)
    )
    user.reset_failed_attempts = MagicMock()

    return user


def _make_service(repo: MagicMock) -> AuthenticationService:
    """Instantiate AuthenticationService with a mocked repository."""
    return AuthenticationService(repository=repo)


# ── Shared patch target prefix ───────────────────────────────────────

_MOD = "app.services.auth.authentication"


# ── Test Class ───────────────────────────────────────────────────────


@pytest.mark.unit
@pytest.mark.asyncio
class TestAuthenticationService:
    """Unit tests for AuthenticationService."""

    # ── register_user ────────────────────────────────────────────────

    @patch(f"{_MOD}.get_password_hash", return_value="hashed_new_pw")
    @patch(f"{_MOD}.validate_password_strength", return_value=(True, ""))
    async def test_register_user_success(self, mock_validate, mock_hash):
        """Successful registration creates user via repository."""
        repo = MagicMock()
        repo.email_exists = AsyncMock(return_value=False)
        expected_user = _make_user()
        repo.create_user = AsyncMock(return_value=expected_user)
        service = _make_service(repo)

        result = await service.register_user(
            email="new@example.com",
            username="newuser",
            password="StrongP@ss1",
            full_name="New User",
        )

        assert result is expected_user
        repo.email_exists.assert_awaited_once_with("new@example.com")
        repo.create_user.assert_awaited_once_with(
            email="new@example.com",
            username="newuser",
            hashed_password="hashed_new_pw",
            full_name="New User",
        )

    async def test_register_user_duplicate_email_raises_validation_error(self):
        """Registration with existing email raises ValidationError."""
        repo = MagicMock()
        repo.email_exists = AsyncMock(return_value=True)
        service = _make_service(repo)

        with pytest.raises(ValidationError, match="Email already registered"):
            await service.register_user(
                email="existing@example.com",
                username="user",
                password="AnyP@ss1",
            )

    @patch(
        f"{_MOD}.validate_password_strength",
        return_value=(False, "Must be at least 8 characters"),
    )
    async def test_register_user_weak_password_raises_validation_error(
        self, mock_validate
    ):
        """Registration with weak password raises ValidationError."""
        repo = MagicMock()
        repo.email_exists = AsyncMock(return_value=False)
        service = _make_service(repo)

        with pytest.raises(ValidationError, match="Password validation failed"):
            await service.register_user(
                email="new@example.com",
                username="user",
                password="weak",
            )

    # ── authenticate_user ────────────────────────────────────────────

    @patch(f"{_MOD}.AuditLogger")
    @patch(f"{_MOD}.verify_password", return_value=True)
    async def test_authenticate_user_success(self, mock_verify_pw, mock_audit):
        """Valid credentials return the authenticated user."""
        mock_audit.log_authentication = AsyncMock()
        user = _make_user()
        repo = MagicMock()
        repo.get_by_email = AsyncMock(return_value=user)
        repo.update = AsyncMock()
        service = _make_service(repo)

        result = await service.authenticate_user("test@example.com", "correct_pw")

        assert result is user
        mock_verify_pw.assert_called_once_with("correct_pw", user.hashed_password)
        user.reset_failed_attempts.assert_called_once()

    @patch(f"{_MOD}.AuditLogger")
    async def test_authenticate_user_not_found_raises_auth_error(self, mock_audit):
        """Non-existent email raises AuthenticationError."""
        mock_audit.log_authentication = AsyncMock()
        repo = MagicMock()
        repo.get_by_email = AsyncMock(return_value=None)
        service = _make_service(repo)

        with pytest.raises(AuthenticationError, match="Invalid email or password"):
            await service.authenticate_user("nobody@example.com", "password")

    @patch(f"{_MOD}.AuditLogger")
    @patch(f"{_MOD}.settings")
    @patch(f"{_MOD}.verify_password", return_value=False)
    async def test_authenticate_user_wrong_password_raises_auth_error(
        self, mock_verify_pw, mock_settings, mock_audit
    ):
        """Wrong password records failed attempt and raises AuthenticationError."""
        mock_audit.log_authentication = AsyncMock()
        mock_settings.MAX_LOGIN_ATTEMPTS = 5
        mock_settings.LOGIN_LOCKOUT_MINUTES = 15
        user = _make_user(failed_login_attempts=1, record_failed_returns=False)
        repo = MagicMock()
        repo.get_by_email = AsyncMock(return_value=user)
        repo.update = AsyncMock()
        service = _make_service(repo)

        with pytest.raises(AuthenticationError, match="attempt.*remaining"):
            await service.authenticate_user("test@example.com", "wrong_pw")

        user.record_failed_login_attempt.assert_called_once_with(
            max_attempts=5, lockout_minutes=15
        )
        repo.update.assert_awaited_once()

    @patch(f"{_MOD}.AuditLogger")
    async def test_authenticate_user_locked_account_raises_auth_error(self, mock_audit):
        """Locked account raises AuthenticationError before password check."""
        mock_audit.log_authentication = AsyncMock()
        locked_until = datetime.utcnow() + timedelta(minutes=10)
        user = _make_user(
            is_locked_val=True,
            locked_until=locked_until,
            failed_login_attempts=5,
        )
        repo = MagicMock()
        repo.get_by_email = AsyncMock(return_value=user)
        service = _make_service(repo)

        with pytest.raises(AuthenticationError, match="Account is locked"):
            await service.authenticate_user("test@example.com", "any_pw")

    @patch(f"{_MOD}.AuditLogger")
    @patch(f"{_MOD}.verify_password", return_value=True)
    async def test_authenticate_user_inactive_raises_auth_error(
        self, mock_verify_pw, mock_audit
    ):
        """Inactive user raises AuthenticationError after password verification."""
        mock_audit.log_authentication = AsyncMock()
        user = _make_user(is_active=False)
        repo = MagicMock()
        repo.get_by_email = AsyncMock(return_value=user)
        repo.update = AsyncMock()
        service = _make_service(repo)

        with pytest.raises(AuthenticationError, match="inactive"):
            await service.authenticate_user("test@example.com", "correct_pw")

    # ── login ────────────────────────────────────────────────────────

    @patch(f"{_MOD}.AuditLogger")
    @patch(f"{_MOD}.settings")
    @patch(f"{_MOD}.create_refresh_token", return_value="refresh_tok")
    @patch(f"{_MOD}.create_access_token", return_value="access_tok")
    @patch(f"{_MOD}.verify_password", return_value=True)
    async def test_login_returns_tokens_and_user_info(
        self,
        mock_verify_pw,
        mock_access,
        mock_refresh,
        mock_settings,
        mock_audit,
    ):
        """Successful login returns access token, refresh token, and user dict."""
        mock_audit.log_authentication = AsyncMock()
        mock_settings.ACCESS_TOKEN_EXPIRE_MINUTES = 30
        mock_settings.REFRESH_TOKEN_EXPIRE_DAYS = 7
        mock_settings.MAX_LOGIN_ATTEMPTS = 5
        mock_settings.LOGIN_LOCKOUT_MINUTES = 15

        user = _make_user(
            id=uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
            email="login@example.com",
            username="loginuser",
            full_name="Login User",
            is_verified=True,
            is_superuser=False,
        )
        repo = MagicMock()
        repo.get_by_email = AsyncMock(return_value=user)
        repo.update = AsyncMock()
        service = _make_service(repo)

        result = await service.login("login@example.com", "correct_pw")

        assert result["access_token"] == "access_tok"
        assert result["refresh_token"] == "refresh_tok"
        assert result["token_type"] == "bearer"
        assert result["user"]["email"] == "login@example.com"
        assert result["user"]["username"] == "loginuser"
        assert result["user"]["id"] == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

    # ── refresh_access_token ─────────────────────────────────────────

    @patch(f"{_MOD}.settings")
    @patch(f"{_MOD}.create_access_token", return_value="new_access_tok")
    @patch(
        f"{_MOD}.verify_token",
        return_value={
            "sub": "user-123",
            "email": "test@example.com",
            "type": "refresh",
        },
    )
    async def test_refresh_access_token_success(
        self, mock_verify, mock_create, mock_settings
    ):
        """Valid refresh token returns a new access token."""
        mock_settings.ACCESS_TOKEN_EXPIRE_MINUTES = 30
        user = _make_user(is_active=True)
        repo = MagicMock()
        repo.get_by_id = AsyncMock(return_value=user)
        service = _make_service(repo)

        result = await service.refresh_access_token("valid_refresh_token")

        assert result["access_token"] == "new_access_tok"
        assert result["token_type"] == "bearer"

    @patch(
        f"{_MOD}.verify_token",
        return_value={
            "sub": "user-123",
            "email": "test@example.com",
            "type": "access",
        },
    )
    async def test_refresh_access_token_wrong_type_raises_auth_error(self, mock_verify):
        """Using an access token for refresh raises AuthenticationError."""
        repo = MagicMock()
        service = _make_service(repo)

        with pytest.raises(AuthenticationError, match="token"):
            await service.refresh_access_token("access_token_instead")

    # ── change_password ──────────────────────────────────────────────

    @patch(f"{_MOD}.AuditLogger")
    @patch(f"{_MOD}.get_password_hash", return_value="new_hashed_pw")
    @patch(f"{_MOD}.validate_password_strength", return_value=(True, ""))
    @patch(f"{_MOD}.verify_password", return_value=True)
    async def test_change_password_success(
        self, mock_verify, mock_validate, mock_hash, mock_audit
    ):
        """Successful password change updates repository and returns True."""
        mock_audit.log_event = AsyncMock()
        user = _make_user()
        user_id = str(user.id)
        repo = MagicMock()
        repo.get_by_id = AsyncMock(return_value=user)
        repo.update = AsyncMock()
        service = _make_service(repo)

        result = await service.change_password(user_id, "old_pw", "NewStr0ng!")

        assert result is True
        mock_verify.assert_called_once_with("old_pw", user.hashed_password)
        repo.update.assert_awaited_once()
        call_args = repo.update.call_args
        assert call_args[0][0] == user_id
        assert call_args[0][1]["hashed_password"] == "new_hashed_pw"

    @patch(f"{_MOD}.verify_password", return_value=False)
    async def test_change_password_wrong_current_raises_auth_error(self, mock_verify):
        """Wrong current password raises AuthenticationError."""
        user = _make_user()
        repo = MagicMock()
        repo.get_by_id = AsyncMock(return_value=user)
        service = _make_service(repo)

        with pytest.raises(AuthenticationError, match="Current password is incorrect"):
            await service.change_password(str(user.id), "wrong_pw", "NewStr0ng!")

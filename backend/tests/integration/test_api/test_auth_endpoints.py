"""
Integration Tests for Authentication API Endpoints

Tests authentication and user management API endpoints.
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.integration
@pytest.mark.asyncio
class TestUserRegistrationEndpoints:
    """Test user registration endpoints."""

    async def test_register_user_success(self, async_client: AsyncClient):
        """Test successful user registration."""
        # Arrange
        user_data = {
            "email": "newuser@example.com",
            "password": "SecurePassword123!",
            "full_name": "New User",
        }

        # Act
        response = await async_client.post("/api/v1/auth/register", json=user_data)

        # Assert
        assert response.status_code == 201
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert result["data"]["email"] == user_data["email"]
        assert result["data"]["full_name"] == user_data["full_name"]
        assert "password" not in result["data"]
        assert "hashed_password" not in result["data"]

    async def test_register_user_duplicate_email(self, async_client: AsyncClient):
        """Test registration with duplicate email fails."""
        # Arrange
        user_data = {
            "email": "duplicate@example.com",
            "password": "SecurePassword123!",
        }

        # Act - Register first time
        response1 = await async_client.post("/api/v1/auth/register", json=user_data)

        # Act - Register second time with same email
        response2 = await async_client.post("/api/v1/auth/register", json=user_data)

        # Assert
        assert response1.status_code == 201
        assert response2.status_code == 400
        result2 = response2.json()
        assert result2["success"] is False
        assert "email" in result2["error"]["message"].lower()

    async def test_register_user_invalid_email(self, async_client: AsyncClient):
        """Test registration with invalid email format."""
        # Arrange
        user_data = {
            "email": "invalid-email",
            "password": "SecurePassword123!",
        }

        # Act
        response = await async_client.post("/api/v1/auth/register", json=user_data)

        # Assert
        assert response.status_code == 422
        result = response.json()
        assert result["success"] is False

    async def test_register_user_weak_password(self, async_client: AsyncClient):
        """Test registration with weak password."""
        # Arrange
        user_data = {
            "email": "user@example.com",
            "password": "weak",  # Too short, no special chars, no numbers
        }

        # Act
        response = await async_client.post("/api/v1/auth/register", json=user_data)

        # Assert
        assert response.status_code == 400
        result = response.json()
        assert result["success"] is False
        assert "password" in result["error"]["message"].lower()

    async def test_register_user_missing_fields(self, async_client: AsyncClient):
        """Test registration with missing required fields."""
        # Arrange
        user_data = {"email": "user@example.com"}  # Missing password

        # Act
        response = await async_client.post("/api/v1/auth/register", json=user_data)

        # Assert
        assert response.status_code == 422
        result = response.json()
        assert result["success"] is False


@pytest.mark.integration
@pytest.mark.asyncio
class TestUserLoginEndpoints:
    """Test user login endpoints."""

    async def test_login_success(self, async_client: AsyncClient):
        """Test successful user login."""
        # Arrange - Register a user first
        user_data = {
            "email": "logintest@example.com",
            "password": "SecurePassword123!",
        }
        await async_client.post("/api/v1/auth/register", json=user_data)

        # Act
        login_data = {
            "username": user_data["email"],
            "password": user_data["password"],
        }
        response = await async_client.post("/api/v1/auth/login", data=login_data)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert "access_token" in result["data"]
        assert "refresh_token" in result["data"]
        assert result["data"]["token_type"] == "bearer"

    async def test_login_wrong_password(self, async_client: AsyncClient):
        """Test login with incorrect password."""
        # Arrange - Register a user
        user_data = {
            "email": "wrongpass@example.com",
            "password": "CorrectPassword123!",
        }
        await async_client.post("/api/v1/auth/register", json=user_data)

        # Act - Login with wrong password
        login_data = {
            "username": user_data["email"],
            "password": "WrongPassword123!",
        }
        response = await async_client.post("/api/v1/auth/login", data=login_data)

        # Assert
        assert response.status_code == 401
        result = response.json()
        assert result["success"] is False

    async def test_login_nonexistent_user(self, async_client: AsyncClient):
        """Test login with non-existent user."""
        # Arrange
        login_data = {
            "username": "nonexistent@example.com",
            "password": "SomePassword123!",
        }

        # Act
        response = await async_client.post("/api/v1/auth/login", data=login_data)

        # Assert
        assert response.status_code == 401
        result = response.json()
        assert result["success"] is False

    async def test_login_inactive_user(self, async_client: AsyncClient):
        """Test login with inactive user account."""
        # This test requires setting up an inactive user
        # Implementation depends on user activation logic
        pass


@pytest.mark.integration
@pytest.mark.asyncio
class TestTokenRefreshEndpoints:
    """Test token refresh endpoints."""

    async def test_refresh_token_success(self, async_client: AsyncClient):
        """Test successful token refresh."""
        # Arrange - Register and login to get tokens
        user_data = {
            "email": "refreshtest@example.com",
            "password": "SecurePassword123!",
        }
        await async_client.post("/api/v1/auth/register", json=user_data)

        login_response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": user_data["email"],
                "password": user_data["password"],
            },
        )
        refresh_token = login_response.json()["data"]["refresh_token"]

        # Act
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "access_token" in result["data"]
        assert result["data"]["token_type"] == "bearer"

    async def test_refresh_token_invalid(self, async_client: AsyncClient):
        """Test refresh with invalid token."""
        # Arrange
        invalid_token = "invalid.token.here"

        # Act
        response = await async_client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": invalid_token},
        )

        # Assert
        assert response.status_code == 401
        result = response.json()
        assert result["success"] is False

    async def test_refresh_token_expired(self, async_client: AsyncClient):
        """Test refresh with expired token."""
        # This test requires generating an expired token
        # Implementation depends on token generation utilities
        pass


@pytest.mark.integration
@pytest.mark.asyncio
class TestUserProfileEndpoints:
    """Test user profile management endpoints."""

    async def test_get_current_user(self, async_client: AsyncClient, auth_headers: dict):
        """Test retrieving current user profile."""
        # Act
        response = await async_client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert "email" in result["data"]
        assert "password" not in result["data"]
        assert "hashed_password" not in result["data"]

    async def test_get_current_user_unauthorized(self, async_client: AsyncClient):
        """Test getting profile without authentication."""
        # Act
        response = await async_client.get("/api/v1/auth/me")

        # Assert
        assert response.status_code == 401

    async def test_update_user_profile(self, async_client: AsyncClient, auth_headers: dict):
        """Test updating user profile."""
        # Arrange
        update_data = {
            "full_name": "Updated Name",
            "phone": "+1234567890",
        }

        # Act
        response = await async_client.patch(
            "/api/v1/auth/me",
            json=update_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["full_name"] == update_data["full_name"]
        assert result["data"]["phone"] == update_data["phone"]

    async def test_update_profile_unauthorized(self, async_client: AsyncClient):
        """Test updating profile without authentication."""
        # Arrange
        update_data = {"full_name": "New Name"}

        # Act
        response = await async_client.patch("/api/v1/auth/me", json=update_data)

        # Assert
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
class TestPasswordChangeEndpoints:
    """Test password change endpoints."""

    async def test_change_password_success(self, async_client: AsyncClient):
        """Test successful password change."""
        # Arrange - Register and login
        user_data = {
            "email": "passchange@example.com",
            "password": "OldPassword123!",
        }
        await async_client.post("/api/v1/auth/register", json=user_data)

        login_response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": user_data["email"],
                "password": user_data["password"],
            },
        )
        token = login_response.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Act - Change password
        change_data = {
            "old_password": "OldPassword123!",
            "new_password": "NewPassword123!",
        }
        response = await async_client.post(
            "/api/v1/auth/change-password",
            json=change_data,
            headers=headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

        # Verify new password works
        new_login_response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": user_data["email"],
                "password": "NewPassword123!",
            },
        )
        assert new_login_response.status_code == 200

    async def test_change_password_wrong_old_password(self, async_client: AsyncClient, auth_headers: dict):
        """Test password change with incorrect old password."""
        # Arrange
        change_data = {
            "old_password": "WrongOldPassword123!",
            "new_password": "NewPassword123!",
        }

        # Act
        response = await async_client.post(
            "/api/v1/auth/change-password",
            json=change_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 400
        result = response.json()
        assert result["success"] is False

    async def test_change_password_weak_new_password(self, async_client: AsyncClient, auth_headers: dict):
        """Test password change with weak new password."""
        # Arrange
        change_data = {
            "old_password": "OldPassword123!",
            "new_password": "weak",
        }

        # Act
        response = await async_client.post(
            "/api/v1/auth/change-password",
            json=change_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 400
        result = response.json()
        assert result["success"] is False


@pytest.mark.integration
@pytest.mark.asyncio
class TestPasswordResetEndpoints:
    """Test password reset endpoints."""

    async def test_request_password_reset(self, async_client: AsyncClient):
        """Test requesting password reset."""
        # Arrange - Register a user
        user_data = {
            "email": "resettest@example.com",
            "password": "SecurePassword123!",
        }
        await async_client.post("/api/v1/auth/register", json=user_data)

        # Act
        response = await async_client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": user_data["email"]},
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        # Note: Actual email would be sent in production

    async def test_request_reset_nonexistent_email(self, async_client: AsyncClient):
        """Test password reset for non-existent email."""
        # Act
        response = await async_client.post(
            "/api/v1/auth/password-reset/request",
            json={"email": "nonexistent@example.com"},
        )

        # Assert
        # Should return 200 to prevent email enumeration
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

    async def test_confirm_password_reset(self, async_client: AsyncClient):
        """Test confirming password reset with token."""
        # This test requires generating a valid reset token
        # Implementation depends on token generation logic
        pass


@pytest.mark.integration
@pytest.mark.asyncio
class TestLogoutEndpoints:
    """Test logout endpoints."""

    async def test_logout_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test successful logout."""
        # Act
        response = await async_client.post(
            "/api/v1/auth/logout",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

        # Verify token no longer works
        protected_response = await async_client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )
        assert protected_response.status_code == 401

    async def test_logout_unauthorized(self, async_client: AsyncClient):
        """Test logout without authentication."""
        # Act
        response = await async_client.post("/api/v1/auth/logout")

        # Assert
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
class TestEmailVerificationEndpoints:
    """Test email verification endpoints."""

    async def test_verify_email_success(self, async_client: AsyncClient):
        """Test successful email verification."""
        # This test requires generating a valid verification token
        # Implementation depends on verification token logic
        pass

    async def test_verify_email_invalid_token(self, async_client: AsyncClient):
        """Test email verification with invalid token."""
        # Arrange
        invalid_token = "invalid_verification_token"

        # Act
        response = await async_client.post(
            "/api/v1/auth/verify-email",
            json={"token": invalid_token},
        )

        # Assert
        assert response.status_code == 400
        result = response.json()
        assert result["success"] is False

    async def test_resend_verification_email(self, async_client: AsyncClient, auth_headers: dict):
        """Test resending verification email."""
        # Act
        response = await async_client.post(
            "/api/v1/auth/resend-verification",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

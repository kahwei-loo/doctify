"""
User Test Fixtures

Provides sample user data and factory functions for user-related tests.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional


# =============================================================================
# Sample User Data
# =============================================================================

SAMPLE_USER_DATA: Dict[str, Any] = {
    "email": "test@example.com",
    "password": "TestPassword123!",
    "full_name": "Test User",
    "is_active": True,
    "is_superuser": False,
    "is_verified": True,
}

SAMPLE_SUPERUSER_DATA: Dict[str, Any] = {
    "email": "admin@example.com",
    "password": "AdminPassword123!",
    "full_name": "Admin User",
    "is_active": True,
    "is_superuser": True,
    "is_verified": True,
}

SAMPLE_INACTIVE_USER_DATA: Dict[str, Any] = {
    "email": "inactive@example.com",
    "password": "InactivePass123!",
    "full_name": "Inactive User",
    "is_active": False,
    "is_superuser": False,
    "is_verified": True,
}

SAMPLE_UNVERIFIED_USER_DATA: Dict[str, Any] = {
    "email": "unverified@example.com",
    "password": "UnverifiedPass123!",
    "full_name": "Unverified User",
    "is_active": True,
    "is_superuser": False,
    "is_verified": False,
}


# =============================================================================
# User Factory Functions
# =============================================================================

def create_user_data(
    email: Optional[str] = None,
    password: str = "TestPassword123!",
    full_name: Optional[str] = None,
    is_active: bool = True,
    is_superuser: bool = False,
    is_verified: bool = True,
    **kwargs,
) -> Dict[str, Any]:
    """
    Create user data with customizable fields.

    Args:
        email: User email (auto-generated if not provided)
        password: User password
        full_name: User's full name (auto-generated if not provided)
        is_active: Whether user is active
        is_superuser: Whether user is superuser
        is_verified: Whether user email is verified
        **kwargs: Additional fields to include

    Returns:
        Dictionary with user data
    """
    unique_id = uuid.uuid4().hex[:8]

    return {
        "email": email or f"user_{unique_id}@example.com",
        "password": password,
        "full_name": full_name or f"Test User {unique_id}",
        "is_active": is_active,
        "is_superuser": is_superuser,
        "is_verified": is_verified,
        **kwargs,
    }


class UserFactory:
    """
    Factory class for creating user test data with various configurations.
    """

    _counter = 0

    @classmethod
    def _next_id(cls) -> int:
        cls._counter += 1
        return cls._counter

    @classmethod
    def reset(cls) -> None:
        """Reset the counter (useful between tests)."""
        cls._counter = 0

    @classmethod
    def create(cls, **overrides) -> Dict[str, Any]:
        """Create a single user with default or overridden values."""
        idx = cls._next_id()
        defaults = {
            "email": f"user{idx}@example.com",
            "password": "TestPassword123!",
            "full_name": f"Test User {idx}",
            "is_active": True,
            "is_superuser": False,
            "is_verified": True,
        }
        return {**defaults, **overrides}

    @classmethod
    def create_batch(cls, count: int, **overrides) -> list[Dict[str, Any]]:
        """Create multiple users with the same overrides."""
        return [cls.create(**overrides) for _ in range(count)]

    @classmethod
    def create_active(cls, **overrides) -> Dict[str, Any]:
        """Create an active, verified user."""
        return cls.create(is_active=True, is_verified=True, **overrides)

    @classmethod
    def create_inactive(cls, **overrides) -> Dict[str, Any]:
        """Create an inactive user."""
        return cls.create(is_active=False, **overrides)

    @classmethod
    def create_unverified(cls, **overrides) -> Dict[str, Any]:
        """Create an unverified user."""
        return cls.create(is_verified=False, **overrides)

    @classmethod
    def create_superuser(cls, **overrides) -> Dict[str, Any]:
        """Create a superuser."""
        return cls.create(is_superuser=True, **overrides)

    @classmethod
    def create_with_preferences(cls, preferences: Dict[str, Any], **overrides) -> Dict[str, Any]:
        """Create a user with custom preferences."""
        return cls.create(preferences=preferences, **overrides)


# =============================================================================
# Database Model Data
# =============================================================================

def create_user_db_data(
    user_id: Optional[str] = None,
    hashed_password: str = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGQ1hWZ0Xj2",  # TestPassword123!
    **kwargs,
) -> Dict[str, Any]:
    """
    Create user data suitable for direct database insertion.

    Args:
        user_id: User UUID (auto-generated if not provided)
        hashed_password: Bcrypt hashed password
        **kwargs: Additional fields

    Returns:
        Dictionary with database-ready user data
    """
    base_data = create_user_data(**kwargs)
    base_data.pop("password", None)  # Remove plain password

    return {
        "id": user_id or str(uuid.uuid4()),
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        **base_data,
    }

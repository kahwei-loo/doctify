"""
API Key Test Fixtures

Provides sample API key data and factory functions for API key-related tests.
"""

import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional


# =============================================================================
# Sample API Key Data
# =============================================================================

SAMPLE_API_KEY_DATA: Dict[str, Any] = {
    "name": "Test API Key",
    "key_prefix": "dk_test",
    "is_active": True,
    "expires_at": None,
    "scopes": ["read", "write"],
}


# =============================================================================
# API Key Factory Functions
# =============================================================================

def create_api_key_data(
    name: Optional[str] = None,
    key_prefix: str = "dk_test",
    is_active: bool = True,
    expires_at: Optional[datetime] = None,
    scopes: Optional[List[str]] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Create API key data with customizable fields.

    Args:
        name: API key name (auto-generated if not provided)
        key_prefix: Prefix for the API key
        is_active: Whether key is active
        expires_at: Expiration datetime
        scopes: List of scopes/permissions
        user_id: Owner user ID
        **kwargs: Additional fields

    Returns:
        Dictionary with API key data
    """
    unique_id = uuid.uuid4().hex[:8]

    return {
        "name": name or f"API Key {unique_id}",
        "key_prefix": key_prefix,
        "is_active": is_active,
        "expires_at": expires_at,
        "scopes": scopes or ["read", "write"],
        "user_id": user_id,
        **kwargs,
    }


class ApiKeyFactory:
    """
    Factory class for creating API key test data with various configurations.
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
        """Create a single API key with default or overridden values."""
        idx = cls._next_id()
        defaults = {
            "name": f"API Key {idx}",
            "key_prefix": f"dk_test_{idx}",
            "is_active": True,
            "expires_at": None,
            "scopes": ["read", "write"],
        }
        return {**defaults, **overrides}

    @classmethod
    def create_batch(cls, count: int, **overrides) -> List[Dict[str, Any]]:
        """Create multiple API keys with the same overrides."""
        return [cls.create(**overrides) for _ in range(count)]

    @classmethod
    def create_active(cls, **overrides) -> Dict[str, Any]:
        """Create an active API key."""
        return cls.create(is_active=True, **overrides)

    @classmethod
    def create_inactive(cls, **overrides) -> Dict[str, Any]:
        """Create an inactive API key."""
        return cls.create(is_active=False, **overrides)

    @classmethod
    def create_expired(cls, **overrides) -> Dict[str, Any]:
        """Create an expired API key."""
        return cls.create(
            expires_at=datetime.now(timezone.utc) - timedelta(days=1),
            **overrides,
        )

    @classmethod
    def create_expiring_soon(cls, hours: int = 24, **overrides) -> Dict[str, Any]:
        """Create an API key expiring soon."""
        return cls.create(
            expires_at=datetime.now(timezone.utc) + timedelta(hours=hours),
            **overrides,
        )

    @classmethod
    def create_read_only(cls, **overrides) -> Dict[str, Any]:
        """Create a read-only API key."""
        return cls.create(scopes=["read"], **overrides)

    @classmethod
    def create_full_access(cls, **overrides) -> Dict[str, Any]:
        """Create an API key with full access."""
        return cls.create(scopes=["read", "write", "delete", "admin"], **overrides)

    @classmethod
    def create_for_user(cls, user_id: str, **overrides) -> Dict[str, Any]:
        """Create an API key for a specific user."""
        return cls.create(user_id=user_id, **overrides)


# =============================================================================
# API Key Generation Utilities
# =============================================================================

def generate_api_key(prefix: str = "dk_test") -> tuple[str, str]:
    """
    Generate a test API key and its hash.

    Args:
        prefix: Prefix for the API key

    Returns:
        Tuple of (plain_key, hashed_key)
    """
    # Generate a secure random key
    random_part = secrets.token_urlsafe(32)
    plain_key = f"{prefix}_{random_part}"

    # In production, this would be properly hashed
    # For tests, we just create a predictable hash
    hashed_key = f"hashed_{plain_key}"

    return plain_key, hashed_key


# =============================================================================
# Database Model Data
# =============================================================================

def create_api_key_db_data(
    api_key_id: Optional[str] = None,
    user_id: Optional[str] = None,
    key_hash: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Create API key data suitable for direct database insertion.

    Args:
        api_key_id: API key UUID (auto-generated if not provided)
        user_id: Owner user ID
        key_hash: Hashed API key
        **kwargs: Additional fields

    Returns:
        Dictionary with database-ready API key data
    """
    base_data = create_api_key_data(**kwargs)
    plain_key, hashed_key = generate_api_key(base_data.get("key_prefix", "dk_test"))

    return {
        "id": api_key_id or str(uuid.uuid4()),
        "user_id": user_id or str(uuid.uuid4()),
        "key_hash": key_hash or hashed_key,
        "last_used_at": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        **base_data,
    }

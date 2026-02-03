"""
User Domain Entity

Encapsulates user business logic and behavior.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta


class UserEntity:
    """
    User domain entity with business logic.

    Represents a user in the system with authentication and authorization behavior.
    """

    def __init__(
        self,
        id: str,
        email: str,
        username: str,
        hashed_password: str,
        full_name: Optional[str] = None,
        is_active: bool = True,
        is_verified: bool = False,
        is_superuser: bool = False,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        last_login: Optional[datetime] = None,
        verified_at: Optional[datetime] = None,
        preferences: Optional[Dict[str, Any]] = None,
        usage_statistics: Optional[Dict[str, Any]] = None,
        failed_login_attempts: int = 0,
        locked_until: Optional[datetime] = None,
        last_failed_login: Optional[datetime] = None,
    ):
        self.id = id
        self.email = email.lower()
        self.username = username.lower()
        self.hashed_password = hashed_password
        self.full_name = full_name
        self.is_active = is_active
        self.is_verified = is_verified
        self.is_superuser = is_superuser
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.last_login = last_login
        self.verified_at = verified_at
        self.preferences = preferences or {}
        self.usage_statistics = usage_statistics or {
            "documents_processed": 0,
            "tokens_used": 0,
            "api_calls": 0,
            "last_updated": datetime.utcnow(),
        }
        # Account lockout fields
        self.failed_login_attempts = failed_login_attempts
        self.locked_until = locked_until
        self.last_failed_login = last_failed_login

    def can_login(self) -> bool:
        """
        Check if user can login.

        Returns:
            False if user is inactive or locked, True otherwise
        """
        if not self.is_active:
            return False

        if self.is_locked():
            return False

        return True

    def is_locked(self) -> bool:
        """
        Check if account is currently locked.

        Returns:
            True if account is locked, False otherwise
        """
        if self.locked_until is None:
            return False

        # Check if lock period has expired
        if datetime.utcnow() >= self.locked_until:
            # Lock expired, automatically unlock
            return False

        return True

    def record_failed_login_attempt(self, max_attempts: int = 5, lockout_minutes: int = 15) -> bool:
        """
        Record a failed login attempt.

        Args:
            max_attempts: Maximum allowed failed attempts before lockout
            lockout_minutes: Duration of lockout in minutes

        Returns:
            True if account is now locked, False otherwise
        """
        self.failed_login_attempts += 1
        self.last_failed_login = datetime.utcnow()
        self.updated_at = datetime.utcnow()

        if self.failed_login_attempts >= max_attempts:
            # Lock the account
            self.locked_until = datetime.utcnow() + timedelta(minutes=lockout_minutes)
            return True

        return False

    def reset_failed_attempts(self) -> None:
        """Reset failed login attempts counter (called on successful login)."""
        if self.failed_login_attempts > 0 or self.locked_until:
            self.failed_login_attempts = 0
            self.locked_until = None
            self.last_failed_login = None
            self.updated_at = datetime.utcnow()

    def unlock(self) -> None:
        """Manually unlock account (admin action)."""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.updated_at = datetime.utcnow()

    def can_process_documents(self) -> bool:
        """Check if user can process documents."""
        return self.is_active and self.is_verified

    def has_permission(self, permission: str) -> bool:
        """
        Check if user has a specific permission.

        Args:
            permission: Permission string

        Returns:
            True if user has permission, False otherwise
        """
        # Superusers have all permissions
        if self.is_superuser:
            return True

        # Check specific permissions in user preferences
        user_permissions = self.preferences.get("permissions", [])
        return permission in user_permissions

    def update_last_login(self) -> None:
        """Update last login timestamp."""
        self.last_login = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def verify(self) -> None:
        """Verify user account."""
        if self.is_verified:
            raise ValueError("User is already verified")

        self.is_verified = True
        self.verified_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def deactivate(self) -> None:
        """Deactivate user account."""
        if not self.is_active:
            raise ValueError("User is already deactivated")

        self.is_active = False
        self.updated_at = datetime.utcnow()

    def activate(self) -> None:
        """Activate user account."""
        if self.is_active:
            raise ValueError("User is already active")

        self.is_active = True
        self.updated_at = datetime.utcnow()

    def update_preferences(self, preferences: Dict[str, Any]) -> None:
        """
        Update user preferences.

        Args:
            preferences: New preferences dictionary
        """
        self.preferences.update(preferences)
        self.updated_at = datetime.utcnow()

    def increment_usage(
        self,
        documents: int = 0,
        tokens: int = 0,
        api_calls: int = 0,
    ) -> None:
        """
        Increment usage statistics.

        Args:
            documents: Number of documents to add
            tokens: Number of tokens to add
            api_calls: Number of API calls to add
        """
        self.usage_statistics["documents_processed"] += documents
        self.usage_statistics["tokens_used"] += tokens
        self.usage_statistics["api_calls"] += api_calls
        self.usage_statistics["last_updated"] = datetime.utcnow()

    def get_usage_limit_status(self, limits: Dict[str, int]) -> Dict[str, Any]:
        """
        Check usage against limits.

        Args:
            limits: Dictionary of usage limits

        Returns:
            Dictionary with usage status
        """
        status = {}

        for key, limit in limits.items():
            current = self.usage_statistics.get(key, 0)
            status[key] = {
                "current": current,
                "limit": limit,
                "remaining": max(0, limit - current),
                "percentage": (current / limit * 100) if limit > 0 else 0,
                "exceeded": current >= limit,
            }

        return status

    def reset_usage_statistics(self) -> None:
        """Reset usage statistics."""
        self.usage_statistics = {
            "documents_processed": 0,
            "tokens_used": 0,
            "api_calls": 0,
            "last_updated": datetime.utcnow(),
        }

    def to_dict(self, include_password: bool = False) -> Dict[str, Any]:
        """
        Convert entity to dictionary.

        Args:
            include_password: Whether to include hashed password

        Returns:
            Dictionary representation
        """
        data = {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "is_superuser": self.is_superuser,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_login": self.last_login,
            "verified_at": self.verified_at,
            "preferences": self.preferences,
            "usage_statistics": self.usage_statistics,
            "failed_login_attempts": self.failed_login_attempts,
            "locked_until": self.locked_until,
            "last_failed_login": self.last_failed_login,
        }

        if include_password:
            data["hashed_password"] = self.hashed_password

        return data

    def __repr__(self) -> str:
        return f"UserEntity(id={self.id}, email={self.email}, username={self.username})"

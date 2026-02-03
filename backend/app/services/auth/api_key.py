"""
API Key Authentication Service

Handles API key generation, validation, and management for programmatic access.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from app.services.base import BaseService
from app.db.repositories.user import ApiKeyRepository
from app.db.models.api_key import ApiKey
from app.core.exceptions import (
    AuthenticationError,
    ValidationError,
    NotFoundError,
    AuthorizationError,
)
from app.core.security import generate_api_key, hash_api_key, verify_api_key


class ApiKeyService(BaseService[ApiKey, ApiKeyRepository]):
    """
    Service for API key management and authentication.

    Provides secure API key generation, validation, and lifecycle management.
    """

    async def create_api_key(
        self,
        user_id: str,
        name: str,
        expires_in_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Generate new API key for user.

        Args:
            user_id: User ID
            name: Descriptive name for the API key
            expires_in_days: Optional expiration in days (None = never expires)

        Returns:
            Dictionary containing api_key (plain text, show once) and metadata

        Raises:
            ValidationError: If validation fails
        """
        # Validate name
        if not name or len(name.strip()) == 0:
            raise ValidationError(
                "API key name cannot be empty",
                details={"name": name},
            )

        # Generate API key
        plain_key = generate_api_key()

        # Hash for storage
        hashed_key = hash_api_key(plain_key)

        # Calculate expiration
        expires_at = None
        if expires_in_days:
            if expires_in_days <= 0:
                raise ValidationError(
                    "Expiration days must be positive",
                    details={"expires_in_days": expires_in_days},
                )
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        # Extract key prefix for display/identification
        key_prefix = plain_key[:8]

        # Create API key record
        api_key = await self.repository.create_api_key(
            user_id=user_id,
            key_hash=hashed_key,
            key_prefix=key_prefix,
            name=name.strip(),
            expires_at=expires_at,
        )

        return {
            "api_key": plain_key,  # Plain text key (show only once)
            "api_key_id": str(api_key.id),
            "name": api_key.name,
            "created_at": api_key.created_at,
            "expires_at": api_key.expires_at,
            "is_active": api_key.is_active,
        }

    async def validate_api_key(
        self,
        api_key: str,
    ) -> ApiKey:
        """
        Validate API key and return API key record.

        Args:
            api_key: Plain text API key

        Returns:
            API key record if valid

        Raises:
            AuthenticationError: If API key is invalid, expired, or revoked
        """
        # Hash the plain key for lookup
        hashed_key = hash_api_key(api_key)

        # Get API key record by hashed key
        is_valid = await self.repository.is_key_valid(hashed_key)

        if not is_valid:
            raise AuthenticationError(
                "Invalid or expired API key",
                details={"api_key": api_key[:8] + "..."},  # Log prefix only
            )

        # Get full API key record
        api_key_record = await self.repository.get_by_key_hash(hashed_key)

        if not api_key_record:
            raise AuthenticationError("API key not found")

        # Additional validation checks
        if not api_key_record.is_active:
            raise AuthenticationError("API key has been revoked")

        if api_key_record.expires_at and api_key_record.expires_at < datetime.utcnow():
            raise AuthenticationError("API key has expired")

        return api_key_record

    async def list_user_api_keys(
        self,
        user_id: str,
        include_revoked: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        List all API keys for a user.

        Args:
            user_id: User ID
            include_revoked: Whether to include revoked keys

        Returns:
            List of API key metadata (without plain text keys)
        """
        # Get all API keys for user
        filters = {"user_id": user_id}
        if not include_revoked:
            filters["is_active"] = True

        api_keys = await self.repository.list(
            filters=filters,
            skip=0,
            limit=100,
            sort_by="created_at",
            sort_order="desc",  # Newest first
        )

        return [
            {
                "api_key_id": str(key.id),
                "name": key.name,
                "created_at": key.created_at,
                "last_used_at": key.last_used_at,
                "expires_at": key.expires_at,
                "is_active": key.is_active,
                "is_expired": key.expires_at < datetime.utcnow() if key.expires_at else False,
            }
            for key in api_keys
        ]

    async def revoke_api_key(
        self,
        api_key_id: str,
        user_id: str,
    ) -> bool:
        """
        Revoke an API key.

        Args:
            api_key_id: API key ID
            user_id: User ID (for authorization)

        Returns:
            True if revoked successfully

        Raises:
            NotFoundError: If API key not found
            AuthorizationError: If user doesn't own the API key
        """
        # Get API key
        api_key = await self.get_by_id(api_key_id)

        # Verify ownership
        if str(api_key.user_id) != user_id:
            raise AuthorizationError(
                "Not authorized to revoke this API key",
                details={"api_key_id": api_key_id, "user_id": user_id},
            )

        # Revoke key
        await self.repository.revoke_key(api_key_id)

        return True

    async def revoke_all_user_keys(
        self,
        user_id: str,
    ) -> int:
        """
        Revoke all API keys for a user.

        Args:
            user_id: User ID

        Returns:
            Number of keys revoked
        """
        # Get all active keys for user
        api_keys = await self.repository.list(
            filters={"user_id": user_id, "is_active": True},
            skip=0,
            limit=1000,
        )

        # Revoke each key
        revoked_count = 0
        for key in api_keys:
            await self.repository.revoke_key(str(key.id))
            revoked_count += 1

        return revoked_count

    async def update_last_used(
        self,
        api_key_id: str,
    ) -> None:
        """
        Update last used timestamp for API key.

        Args:
            api_key_id: API key ID
        """
        await self.repository.update(
            api_key_id,
            {"last_used_at": datetime.utcnow()},
        )

    async def rotate_api_key(
        self,
        api_key_id: str,
        user_id: str,
        new_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Rotate an API key (revoke old, create new).

        Args:
            api_key_id: Existing API key ID
            user_id: User ID (for authorization)
            new_name: Optional new name (defaults to old name + " (rotated)")

        Returns:
            Dictionary containing new api_key and metadata

        Raises:
            NotFoundError: If API key not found
            AuthorizationError: If user doesn't own the API key
        """
        # Get existing API key
        old_key = await self.get_by_id(api_key_id)

        # Verify ownership
        if str(old_key.user_id) != user_id:
            raise AuthorizationError(
                "Not authorized to rotate this API key",
                details={"api_key_id": api_key_id, "user_id": user_id},
            )

        # Revoke old key
        await self.repository.revoke_key(api_key_id)

        # Create new key with same expiration logic
        expires_in_days = None
        if old_key.expires_at:
            remaining_days = (old_key.expires_at - datetime.utcnow()).days
            expires_in_days = max(remaining_days, 1)  # At least 1 day

        name = new_name or f"{old_key.name} (rotated)"

        new_key = await self.create_api_key(
            user_id=user_id,
            name=name,
            expires_in_days=expires_in_days,
        )

        return new_key

    async def get_api_key_statistics(
        self,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Get API key usage statistics for a user.

        Args:
            user_id: User ID

        Returns:
            Statistics dictionary
        """
        # Get all keys
        all_keys = await self.repository.list(
            filters={"user_id": user_id},
            skip=0,
            limit=1000,
        )

        active_keys = [k for k in all_keys if k.is_active]
        expired_keys = [
            k for k in all_keys
            if k.expires_at and k.expires_at < datetime.utcnow()
        ]
        revoked_keys = [k for k in all_keys if not k.is_active]

        return {
            "total_keys": len(all_keys),
            "active_keys": len(active_keys),
            "expired_keys": len(expired_keys),
            "revoked_keys": len(revoked_keys),
            "recently_used": len([
                k for k in active_keys
                if k.last_used_at and (datetime.utcnow() - k.last_used_at).days < 7
            ]),
        }

    async def cleanup_expired_keys(
        self,
        user_id: Optional[str] = None,
    ) -> int:
        """
        Clean up expired API keys (mark as revoked).

        Args:
            user_id: Optional user ID (if None, clean up all users)

        Returns:
            Number of keys cleaned up
        """
        filters = {}
        if user_id:
            filters["user_id"] = user_id

        # Get all keys
        api_keys = await self.repository.list(
            filters=filters,
            skip=0,
            limit=10000,
        )

        # Revoke expired keys
        cleaned_count = 0
        for key in api_keys:
            if key.expires_at and key.expires_at < datetime.utcnow() and key.is_active:
                await self.repository.revoke_key(str(key.id))
                cleaned_count += 1

        return cleaned_count

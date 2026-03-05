"""
User Repository

Handles database operations for user entities and API keys using SQLAlchemy.
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.db.models.user import User
from app.db.models.api_key import ApiKey
from app.core.exceptions import NotFoundError, ConflictError, DatabaseError


class UserRepository(BaseRepository[User]):
    """Repository for user operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, User)

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email address.

        Args:
            email: User email

        Returns:
            User if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.get_by_field("email", email.lower())

    async def get_by_username(self, username: str) -> Optional[User]:
        """
        Get user by username.

        Args:
            username: Username

        Returns:
            User if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.get_by_field("username", username.lower())

    async def email_exists(
        self, email: str, exclude_user_id: Optional[str] = None
    ) -> bool:
        """
        Check if email already exists.

        Args:
            email: Email to check
            exclude_user_id: Optional user ID to exclude from check

        Returns:
            True if email exists, False otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            stmt = select(User).where(User.email == email.lower())

            if exclude_user_id:
                user_uuid = (
                    uuid.UUID(exclude_user_id)
                    if isinstance(exclude_user_id, str)
                    else exclude_user_id
                )
                stmt = stmt.where(User.id != user_uuid)

            result = await self.session.execute(stmt)
            return result.scalar_one_or_none() is not None

        except Exception as e:
            raise DatabaseError(f"Failed to check email existence: {str(e)}")

    async def username_exists(
        self, username: str, exclude_user_id: Optional[str] = None
    ) -> bool:
        """
        Check if username already exists.

        Args:
            username: Username to check
            exclude_user_id: Optional user ID to exclude from check

        Returns:
            True if username exists, False otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            stmt = select(User).where(User.username == username.lower())

            if exclude_user_id:
                user_uuid = (
                    uuid.UUID(exclude_user_id)
                    if isinstance(exclude_user_id, str)
                    else exclude_user_id
                )
                stmt = stmt.where(User.id != user_uuid)

            result = await self.session.execute(stmt)
            return result.scalar_one_or_none() is not None

        except Exception as e:
            raise DatabaseError(f"Failed to check username existence: {str(e)}")

    async def create_user(
        self,
        email: str,
        username: str,
        hashed_password: str,
        full_name: Optional[str] = None,
    ) -> User:
        """
        Create a new user with validation.

        Args:
            email: User email
            username: Username
            hashed_password: Hashed password
            full_name: Optional full name

        Returns:
            Created user

        Raises:
            ConflictError: If email or username already exists
            DatabaseError: If database operation fails
        """
        # Check for existing email
        if await self.email_exists(email):
            raise ConflictError("Email already registered")

        # Check for existing username
        if await self.username_exists(username):
            raise ConflictError("Username already taken")

        user_data = {
            "email": email.lower(),
            "username": username.lower(),
            "hashed_password": hashed_password,
            "full_name": full_name,
            "is_active": True,
            "is_verified": False,
        }

        return await self.create(user_data)

    async def update_last_login(self, user_id: str) -> Optional[User]:
        """
        Update user's last login timestamp.

        Args:
            user_id: User ID

        Returns:
            Updated user if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(user_id, {"last_login": datetime.utcnow()})

    async def verify_user(self, user_id: str) -> Optional[User]:
        """
        Mark user as verified.

        Args:
            user_id: User ID

        Returns:
            Updated user if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(
            user_id, {"is_verified": True, "verified_at": datetime.utcnow()}
        )

    async def update_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any],
    ) -> Optional[User]:
        """
        Update user preferences.

        Args:
            user_id: User ID
            preferences: User preferences dictionary

        Returns:
            Updated user if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(user_id, {"preferences": preferences})

    async def increment_usage(
        self,
        user_id: str,
        documents_processed: int = 0,
        tokens_used: int = 0,
    ) -> Optional[User]:
        """
        Increment user usage statistics.

        Args:
            user_id: User ID
            documents_processed: Number of documents to add
            tokens_used: Number of tokens to add

        Returns:
            Updated user if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            user = await self.get_by_id(user_id)
            if not user:
                return None

            # Get current usage statistics or initialize
            current_stats = user.usage_statistics or {
                "documents_processed": 0,
                "tokens_used": 0,
                "api_calls": 0,
            }

            # Increment values
            current_stats["documents_processed"] = (
                current_stats.get("documents_processed", 0) + documents_processed
            )
            current_stats["tokens_used"] = (
                current_stats.get("tokens_used", 0) + tokens_used
            )
            current_stats["last_updated"] = datetime.utcnow().isoformat()

            return await self.update(user_id, {"usage_statistics": current_stats})

        except Exception as e:
            raise DatabaseError(f"Failed to increment usage: {str(e)}")

    async def get_active_users(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """
        Get active users.

        Args:
            skip: Number of users to skip
            limit: Maximum number of users to return

        Returns:
            List of active users

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.list(
            filters={"is_active": True},
            skip=skip,
            limit=limit,
            sort_by="created_at",
            sort_order="desc",
        )

    async def record_failed_login(self, user_id: str) -> Optional[User]:
        """
        Record a failed login attempt.

        Args:
            user_id: User ID

        Returns:
            Updated user if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            user = await self.get_by_id(user_id)
            if not user:
                return None

            new_attempts = user.failed_login_attempts + 1
            update_data = {
                "failed_login_attempts": new_attempts,
                "last_failed_login": datetime.utcnow(),
            }

            return await self.update(user_id, update_data)

        except Exception as e:
            raise DatabaseError(f"Failed to record failed login: {str(e)}")

    async def reset_failed_login_attempts(self, user_id: str) -> Optional[User]:
        """
        Reset failed login attempts after successful login.

        Args:
            user_id: User ID

        Returns:
            Updated user if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(
            user_id,
            {
                "failed_login_attempts": 0,
                "locked_until": None,
                "last_failed_login": None,
            },
        )

    async def lock_user_account(
        self, user_id: str, locked_until: datetime
    ) -> Optional[User]:
        """
        Lock user account until specified time.

        Args:
            user_id: User ID
            locked_until: Lock expiration datetime

        Returns:
            Updated user if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(user_id, {"locked_until": locked_until})


class ApiKeyRepository(BaseRepository[ApiKey]):
    """Repository for API key operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, ApiKey)

    async def get_by_key_hash(self, key_hash: str) -> Optional[ApiKey]:
        """
        Get API key by key hash.

        Args:
            key_hash: Hashed API key value

        Returns:
            API key if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.get_by_field("key_hash", key_hash)

    async def get_by_user(
        self,
        user_id: str,
        include_revoked: bool = False,
    ) -> List[ApiKey]:
        """
        Get API keys for a user.

        Args:
            user_id: User ID
            include_revoked: Whether to include revoked keys

        Returns:
            List of API keys

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

            stmt = select(ApiKey).where(ApiKey.user_id == user_uuid)

            if not include_revoked:
                stmt = stmt.where(ApiKey.is_active == True)

            stmt = stmt.order_by(ApiKey.created_at.desc())

            result = await self.session.execute(stmt)
            return list(result.scalars().all())

        except Exception as e:
            raise DatabaseError(f"Failed to get user API keys: {str(e)}")

    async def create_api_key(
        self,
        user_id: str,
        key_hash: str,
        key_prefix: str,
        name: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        scopes: str = "read,write",
    ) -> ApiKey:
        """
        Create a new API key.

        Args:
            user_id: User ID
            key_hash: Hashed API key value
            key_prefix: First few characters of the key for identification
            name: Optional key name
            expires_at: Optional expiration datetime
            scopes: Comma-separated scopes

        Returns:
            Created API key

        Raises:
            DatabaseError: If database operation fails
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        key_data = {
            "user_id": user_uuid,
            "key_hash": key_hash,
            "key_prefix": key_prefix,
            "name": name or f"API Key {datetime.utcnow().strftime('%Y-%m-%d')}",
            "is_active": True,
            "expires_at": expires_at,
            "scopes": scopes,
        }

        return await self.create(key_data)

    async def revoke_key(self, key_id: str) -> Optional[ApiKey]:
        """
        Revoke an API key.

        Args:
            key_id: API key ID

        Returns:
            Updated API key if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(
            key_id,
            {
                "is_active": False,
                "revoked_at": datetime.utcnow(),
            },
        )

    async def update_last_used(self, key_id: str) -> Optional[ApiKey]:
        """
        Update API key's last used timestamp.

        Args:
            key_id: API key ID

        Returns:
            Updated API key if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(key_id, {"last_used_at": datetime.utcnow()})

    async def increment_usage(self, key_id: str) -> Optional[ApiKey]:
        """
        Increment API key usage count.

        Args:
            key_id: API key ID

        Returns:
            Updated API key if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            api_key = await self.get_by_id(key_id)
            if not api_key:
                return None

            new_count = api_key.usage_count + 1
            return await self.update(
                key_id,
                {
                    "usage_count": new_count,
                    "last_used_at": datetime.utcnow(),
                },
            )

        except Exception as e:
            raise DatabaseError(f"Failed to increment API key usage: {str(e)}")

    async def is_key_valid(self, key_hash: str) -> bool:
        """
        Check if API key is valid and active.

        Args:
            key_hash: Hashed API key value

        Returns:
            True if valid, False otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            key_doc = await self.get_by_key_hash(key_hash)

            if not key_doc or not key_doc.is_active:
                return False

            # Check if revoked
            if key_doc.revoked_at is not None:
                return False

            # Check expiration
            if key_doc.expires_at and key_doc.expires_at < datetime.utcnow():
                return False

            return True

        except Exception as e:
            raise DatabaseError(f"Failed to validate API key: {str(e)}")

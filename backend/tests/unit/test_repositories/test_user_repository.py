"""
Unit Tests for User Repository

Tests user-specific repository operations.
"""

import pytest
from datetime import datetime

from app.db.repositories.user import UserRepository


@pytest.mark.unit
@pytest.mark.asyncio
class TestUserRepository:
    """Test UserRepository operations."""

    @pytest.fixture
    def repository(self, clean_db):
        """Create a user repository instance."""
        return UserRepository(clean_db)

    async def test_create_user(self, repository):
        """Test creating a new user."""
        # Arrange
        user_data = {
            "email": "test@example.com",
            "hashed_password": "hashed_password_123",
            "full_name": "Test User",
            "is_active": True,
            "is_superuser": False,
            "is_verified": False,
        }

        # Act
        result = await repository.create(user_data)

        # Assert
        assert result is not None
        assert result["email"] == "test@example.com"
        assert result["full_name"] == "Test User"
        assert result["is_active"] is True
        assert result["is_superuser"] is False
        assert result["is_verified"] is False
        assert "hashed_password" in result

    async def test_get_by_email(self, repository):
        """Test retrieving user by email."""
        # Arrange
        await repository.create({
            "email": "test@example.com",
            "hashed_password": "hashed_password_123",
            "full_name": "Test User",
        })

        # Act
        result = await repository.get_by_email("test@example.com")

        # Assert
        assert result is not None
        assert result["email"] == "test@example.com"

    async def test_get_by_email_non_existing(self, repository):
        """Test retrieving non-existing user by email returns None."""
        # Act
        result = await repository.get_by_email("nonexistent@example.com")

        # Assert
        assert result is None

    async def test_email_exists(self, repository):
        """Test checking if email exists."""
        # Arrange
        await repository.create({
            "email": "test@example.com",
            "hashed_password": "hashed_password_123",
        })

        # Act
        exists = await repository.email_exists("test@example.com")
        not_exists = await repository.email_exists("other@example.com")

        # Assert
        assert exists is True
        assert not_exists is False

    async def test_update_password(self, repository):
        """Test updating user password."""
        # Arrange
        created = await repository.create({
            "email": "test@example.com",
            "hashed_password": "old_password",
        })
        user_id = created["id"]

        # Act
        new_hashed_password = "new_password_hash"
        result = await repository.update_password(user_id, new_hashed_password)

        # Assert
        assert result is not None
        assert result["hashed_password"] == new_hashed_password

        # Verify update
        updated_user = await repository.get_by_id(user_id)
        assert updated_user["hashed_password"] == new_hashed_password

    async def test_update_profile(self, repository):
        """Test updating user profile."""
        # Arrange
        created = await repository.create({
            "email": "test@example.com",
            "hashed_password": "password_hash",
            "full_name": "Original Name",
        })
        user_id = created["id"]

        # Act
        profile_data = {
            "full_name": "Updated Name",
            "bio": "This is my bio",
        }
        result = await repository.update_profile(user_id, profile_data)

        # Assert
        assert result is not None
        assert result["full_name"] == "Updated Name"
        assert result["bio"] == "This is my bio"

    async def test_verify_email(self, repository):
        """Test verifying user email."""
        # Arrange
        created = await repository.create({
            "email": "test@example.com",
            "hashed_password": "password_hash",
            "is_verified": False,
        })
        user_id = created["id"]

        # Act
        result = await repository.verify_email(user_id)

        # Assert
        assert result is not None
        assert result["is_verified"] is True

        # Verify update
        updated_user = await repository.get_by_id(user_id)
        assert updated_user["is_verified"] is True

    async def test_activate_user(self, repository):
        """Test activating user account."""
        # Arrange
        created = await repository.create({
            "email": "test@example.com",
            "hashed_password": "password_hash",
            "is_active": False,
        })
        user_id = created["id"]

        # Act
        result = await repository.activate_user(user_id)

        # Assert
        assert result is not None
        assert result["is_active"] is True

    async def test_deactivate_user(self, repository):
        """Test deactivating user account."""
        # Arrange
        created = await repository.create({
            "email": "test@example.com",
            "hashed_password": "password_hash",
            "is_active": True,
        })
        user_id = created["id"]

        # Act
        result = await repository.deactivate_user(user_id)

        # Assert
        assert result is not None
        assert result["is_active"] is False

    async def test_update_last_login(self, repository):
        """Test updating user's last login timestamp."""
        # Arrange
        created = await repository.create({
            "email": "test@example.com",
            "hashed_password": "password_hash",
        })
        user_id = created["id"]

        # Act
        result = await repository.update_last_login(user_id)

        # Assert
        assert result is not None
        assert "last_login_at" in result
        assert isinstance(result["last_login_at"], datetime)

    async def test_get_active_users(self, repository):
        """Test retrieving active users."""
        # Arrange
        await repository.create({
            "email": "active1@example.com",
            "hashed_password": "hash1",
            "is_active": True,
        })
        await repository.create({
            "email": "active2@example.com",
            "hashed_password": "hash2",
            "is_active": True,
        })
        await repository.create({
            "email": "inactive@example.com",
            "hashed_password": "hash3",
            "is_active": False,
        })

        # Act
        active_users = await repository.get_active_users()

        # Assert
        assert len(active_users) == 2
        assert all(user["is_active"] is True for user in active_users)

    async def test_get_superusers(self, repository):
        """Test retrieving superuser accounts."""
        # Arrange
        await repository.create({
            "email": "admin@example.com",
            "hashed_password": "hash1",
            "is_superuser": True,
        })
        await repository.create({
            "email": "user@example.com",
            "hashed_password": "hash2",
            "is_superuser": False,
        })

        # Act
        superusers = await repository.get_superusers()

        # Assert
        assert len(superusers) == 1
        assert superusers[0]["email"] == "admin@example.com"
        assert superusers[0]["is_superuser"] is True

    async def test_count_active_users(self, repository):
        """Test counting active users."""
        # Arrange
        await repository.create({"email": "user1@example.com", "is_active": True})
        await repository.create({"email": "user2@example.com", "is_active": True})
        await repository.create({"email": "user3@example.com", "is_active": False})

        # Act
        active_count = await repository.count_active_users()

        # Assert
        assert active_count == 2

    async def test_search_users_by_email(self, repository):
        """Test searching users by email pattern."""
        # Arrange
        await repository.create({"email": "john.doe@example.com"})
        await repository.create({"email": "jane.doe@example.com"})
        await repository.create({"email": "bob.smith@example.com"})

        # Act
        results = await repository.search_users_by_email("doe")

        # Assert
        assert len(results) == 2
        assert any(u["email"] == "john.doe@example.com" for u in results)
        assert any(u["email"] == "jane.doe@example.com" for u in results)

    async def test_delete_unverified_users(self, repository):
        """Test deleting unverified users older than specified days."""
        # Arrange
        from datetime import timedelta

        old_date = datetime.utcnow() - timedelta(days=31)
        recent_date = datetime.utcnow() - timedelta(days=7)

        await repository.create({
            "email": "old_unverified@example.com",
            "is_verified": False,
            "created_at": old_date,
        })
        await repository.create({
            "email": "recent_unverified@example.com",
            "is_verified": False,
            "created_at": recent_date,
        })
        await repository.create({
            "email": "verified@example.com",
            "is_verified": True,
            "created_at": old_date,
        })

        # Act
        deleted_count = await repository.delete_unverified_users(days=30)

        # Assert
        assert deleted_count == 1

        # Verify only old unverified user was deleted
        remaining_count = await repository.count()
        assert remaining_count == 2

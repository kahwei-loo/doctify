"""
Unit Tests for Base Repository

Tests the BaseRepository class that provides common CRUD operations.
"""

import pytest
from datetime import datetime
from uuid import uuid4

from app.db.repositories.base import BaseRepository


class TestDocument:
    """Test document model for repository testing."""

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


@pytest.mark.unit
@pytest.mark.asyncio
class TestBaseRepository:
    """Test BaseRepository CRUD operations."""

    @pytest.fixture
    def repository(self, clean_db):
        """Create a test repository instance."""
        return BaseRepository(clean_db, "test_collection")

    async def test_create_document(self, repository):
        """Test creating a new document."""
        # Arrange
        document_data = {
            "name": "Test Document",
            "value": 123,
            "created_at": datetime.utcnow(),
        }

        # Act
        result = await repository.create(document_data)

        # Assert
        assert result is not None
        assert "id" in result
        assert result["name"] == "Test Document"
        assert result["value"] == 123
        assert "created_at" in result

    async def test_get_byid_existing(self, repository):
        """Test retrieving an existing document by ID."""
        # Arrange
        created = await repository.create({"name": "Test", "value": 42})
        docid = created["id"]

        # Act
        result = await repository.get_byid(docid)

        # Assert
        assert result is not None
        assert result["id"] == docid
        assert result["name"] == "Test"
        assert result["value"] == 42

    async def test_get_byid_non_existing(self, repository):
        """Test retrieving a non-existing document returns None."""
        # Arrange
        non_existingid = uuid4()

        # Act
        result = await repository.get_byid(non_existingid)

        # Assert
        assert result is None

    async def test_get_by_field_existing(self, repository):
        """Test retrieving a document by field value."""
        # Arrange
        await repository.create({"name": "Test 1", "status": "active"})
        await repository.create({"name": "Test 2", "status": "inactive"})

        # Act
        result = await repository.get_by_field("status", "active")

        # Assert
        assert result is not None
        assert result["status"] == "active"
        assert result["name"] == "Test 1"

    async def test_get_by_field_non_existing(self, repository):
        """Test retrieving by non-existing field value returns None."""
        # Arrange
        await repository.create({"name": "Test", "status": "active"})

        # Act
        result = await repository.get_by_field("status", "deleted")

        # Assert
        assert result is None

    async def test_get_many_with_filters(self, repository):
        """Test retrieving multiple documents with filters."""
        # Arrange
        await repository.create({"name": "Doc 1", "category": "A", "value": 10})
        await repository.create({"name": "Doc 2", "category": "A", "value": 20})
        await repository.create({"name": "Doc 3", "category": "B", "value": 15})

        # Act
        results = await repository.get_many(filters={"category": "A"})

        # Assert
        assert len(results) == 2
        assert all(doc["category"] == "A" for doc in results)

    async def test_get_many_with_pagination(self, repository):
        """Test retrieving documents with pagination."""
        # Arrange
        for i in range(15):
            await repository.create({"name": f"Doc {i}", "value": i})

        # Act
        page_1 = await repository.get_many(skip=0, limit=5)
        page_2 = await repository.get_many(skip=5, limit=5)
        page_3 = await repository.get_many(skip=10, limit=5)

        # Assert
        assert len(page_1) == 5
        assert len(page_2) == 5
        assert len(page_3) == 5
        assert page_1[0]["name"] == "Doc 0"
        assert page_2[0]["name"] == "Doc 5"
        assert page_3[0]["name"] == "Doc 10"

    async def test_get_many_with_sorting(self, repository):
        """Test retrieving documents with sorting."""
        # Arrange
        await repository.create({"name": "Doc C", "order": 3})
        await repository.create({"name": "Doc A", "order": 1})
        await repository.create({"name": "Doc B", "order": 2})

        # Act
        results_asc = await repository.get_many(sort=[("order", 1)])
        results_desc = await repository.get_many(sort=[("order", -1)])

        # Assert
        assert len(results_asc) == 3
        assert results_asc[0]["name"] == "Doc A"
        assert results_asc[1]["name"] == "Doc B"
        assert results_asc[2]["name"] == "Doc C"

        assert len(results_desc) == 3
        assert results_desc[0]["name"] == "Doc C"
        assert results_desc[1]["name"] == "Doc B"
        assert results_desc[2]["name"] == "Doc A"

    async def test_count_documents(self, repository):
        """Test counting documents with filters."""
        # Arrange
        await repository.create({"category": "A"})
        await repository.create({"category": "A"})
        await repository.create({"category": "B"})

        # Act
        total_count = await repository.count()
        category_a_count = await repository.count(filters={"category": "A"})
        category_b_count = await repository.count(filters={"category": "B"})

        # Assert
        assert total_count == 3
        assert category_a_count == 2
        assert category_b_count == 1

    async def test_update_byid(self, repository):
        """Test updating a document by ID."""
        # Arrange
        created = await repository.create({"name": "Original", "value": 10})
        docid = created["id"]

        # Act
        update_data = {"name": "Updated", "value": 20}
        result = await repository.update_byid(docid, update_data)

        # Assert
        assert result is not None
        assert result["id"] == docid
        assert result["name"] == "Updated"
        assert result["value"] == 20

    async def test_update_byid_non_existing(self, repository):
        """Test updating a non-existing document returns None."""
        # Arrange
        non_existingid = uuid4()
        update_data = {"name": "Updated"}

        # Act
        result = await repository.update_byid(non_existingid, update_data)

        # Assert
        assert result is None

    async def test_update_many(self, repository):
        """Test updating multiple documents."""
        # Arrange
        await repository.create({"category": "A", "status": "pending"})
        await repository.create({"category": "A", "status": "pending"})
        await repository.create({"category": "B", "status": "pending"})

        # Act
        modified_count = await repository.update_many(
            filters={"category": "A"},
            update_data={"status": "completed"}
        )

        # Assert
        assert modified_count == 2

        # Verify updates
        category_a_docs = await repository.get_many(filters={"category": "A"})
        assert all(doc["status"] == "completed" for doc in category_a_docs)

        category_b_docs = await repository.get_many(filters={"category": "B"})
        assert all(doc["status"] == "pending" for doc in category_b_docs)

    async def test_delete_byid(self, repository):
        """Test deleting a document by ID."""
        # Arrange
        created = await repository.create({"name": "To Delete"})
        docid = created["id"]

        # Act
        success = await repository.delete_byid(docid)

        # Assert
        assert success is True

        # Verify deletion
        deleted_doc = await repository.get_byid(docid)
        assert deleted_doc is None

    async def test_delete_byid_non_existing(self, repository):
        """Test deleting a non-existing document returns False."""
        # Arrange
        non_existingid = uuid4()

        # Act
        success = await repository.delete_byid(non_existingid)

        # Assert
        assert success is False

    async def test_delete_many(self, repository):
        """Test deleting multiple documents."""
        # Arrange
        await repository.create({"category": "A"})
        await repository.create({"category": "A"})
        await repository.create({"category": "B"})

        # Act
        deleted_count = await repository.delete_many(filters={"category": "A"})

        # Assert
        assert deleted_count == 2

        # Verify deletions
        remaining_count = await repository.count()
        assert remaining_count == 1

        remaining_docs = await repository.get_many()
        assert remaining_docs[0]["category"] == "B"

    async def test_exists_byid(self, repository):
        """Test checking if document exists by ID."""
        # Arrange
        created = await repository.create({"name": "Test"})
        docid = created["id"]
        non_existingid = uuid4()

        # Act
        exists = await repository.exists_byid(docid)
        not_exists = await repository.exists_byid(non_existingid)

        # Assert
        assert exists is True
        assert not_exists is False

    async def test_exists_by_field(self, repository):
        """Test checking if document exists by field value."""
        # Arrange
        await repository.create({"email": "test@example.com"})

        # Act
        exists = await repository.exists_by_field("email", "test@example.com")
        not_exists = await repository.exists_by_field("email", "other@example.com")

        # Assert
        assert exists is True
        assert not_exists is False

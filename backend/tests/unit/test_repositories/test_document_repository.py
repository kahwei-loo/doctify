"""
Unit Tests for Document Repository

Tests document-specific repository operations.
"""

import pytest
from datetime import datetime
from uuid import uuid4

from app.db.repositories.document import DocumentRepository


@pytest.mark.unit
@pytest.mark.asyncio
class TestDocumentRepository:
    """Test DocumentRepository operations."""

    @pytest.fixture
    def repository(self, clean_db):
        """Create a document repository instance."""
        return DocumentRepository(clean_db)

    async def test_create_document_with_user_id(self, repository):
        """Test creating a document with user association."""
        # Arrange
        user_id = uuid4()
        document_data = {
            "user_id": user_id,
            "filename": "test.pdf",
            "file_path": "/uploads/test.pdf",
            "file_size": 1024,
            "file_hash": "abc123",
            "mime_type": "application/pdf",
            "status": "pending",
        }

        # Act
        result = await repository.create(document_data)

        # Assert
        assert result is not None
        assert result["user_id"] == user_id
        assert result["filename"] == "test.pdf"
        assert result["status"] == "pending"

    async def test_get_by_user_id(self, repository):
        """Test retrieving documents by user ID."""
        # Arrange
        user1_id = uuid4()
        user2_id = uuid4()

        await repository.create({
            "user_id": user1_id,
            "filename": "doc1.pdf",
            "status": "completed",
        })
        await repository.create({
            "user_id": user1_id,
            "filename": "doc2.pdf",
            "status": "pending",
        })
        await repository.create({
            "user_id": user2_id,
            "filename": "doc3.pdf",
            "status": "completed",
        })

        # Act
        user1_docs = await repository.get_by_user_id(user1_id)
        user2_docs = await repository.get_by_user_id(user2_id)

        # Assert
        assert len(user1_docs) == 2
        assert all(doc["user_id"] == user1_id for doc in user1_docs)

        assert len(user2_docs) == 1
        assert user2_docs[0]["user_id"] == user2_id

    async def test_get_by_project_id(self, repository):
        """Test retrieving documents by project ID."""
        # Arrange
        project1_id = uuid4()
        project2_id = uuid4()

        await repository.create({
            "project_id": project1_id,
            "filename": "doc1.pdf",
            "status": "completed",
        })
        await repository.create({
            "project_id": project1_id,
            "filename": "doc2.pdf",
            "status": "pending",
        })
        await repository.create({
            "project_id": project2_id,
            "filename": "doc3.pdf",
            "status": "completed",
        })

        # Act
        project1_docs = await repository.get_by_project_id(project1_id)
        project2_docs = await repository.get_by_project_id(project2_id)

        # Assert
        assert len(project1_docs) == 2
        assert all(doc["project_id"] == project1_id for doc in project1_docs)

        assert len(project2_docs) == 1
        assert project2_docs[0]["project_id"] == project2_id

    async def test_get_by_status(self, repository):
        """Test retrieving documents by status."""
        # Arrange
        await repository.create({"filename": "doc1.pdf", "status": "pending"})
        await repository.create({"filename": "doc2.pdf", "status": "processing"})
        await repository.create({"filename": "doc3.pdf", "status": "completed"})
        await repository.create({"filename": "doc4.pdf", "status": "completed"})
        await repository.create({"filename": "doc5.pdf", "status": "failed"})

        # Act
        pending_docs = await repository.get_by_status("pending")
        processing_docs = await repository.get_by_status("processing")
        completed_docs = await repository.get_by_status("completed")
        failed_docs = await repository.get_by_status("failed")

        # Assert
        assert len(pending_docs) == 1
        assert len(processing_docs) == 1
        assert len(completed_docs) == 2
        assert len(failed_docs) == 1

    async def test_get_by_file_hash(self, repository):
        """Test retrieving document by file hash."""
        # Arrange
        file_hash = "abc123def456"
        await repository.create({
            "filename": "doc1.pdf",
            "file_hash": file_hash,
            "status": "completed",
        })

        # Act
        result = await repository.get_by_file_hash(file_hash)

        # Assert
        assert result is not None
        assert result["file_hash"] == file_hash

    async def test_update_status(self, repository):
        """Test updating document status."""
        # Arrange
        created = await repository.create({
            "filename": "test.pdf",
            "status": "pending",
        })
        doc_id = created["id"]

        # Act
        result = await repository.update_status(doc_id, "processing")

        # Assert
        assert result is not None
        assert result["status"] == "processing"

        # Verify update
        updated_doc = await repository.get_by_id(doc_id)
        assert updated_doc["status"] == "processing"

    async def test_update_extraction_result(self, repository):
        """Test updating document extraction result."""
        # Arrange
        created = await repository.create({
            "filename": "test.pdf",
            "status": "processing",
        })
        doc_id = created["id"]

        extraction_result = {
            "text": "Sample extracted text",
            "confidence": 0.95,
            "metadata": {
                "author": "Test Author",
                "title": "Test Document",
            },
        }

        # Act
        result = await repository.update_extraction_result(doc_id, extraction_result)

        # Assert
        assert result is not None
        assert result["extraction_result"] == extraction_result
        assert result["status"] == "completed"

        # Verify update
        updated_doc = await repository.get_by_id(doc_id)
        assert updated_doc["extraction_result"]["text"] == "Sample extracted text"
        assert updated_doc["extraction_result"]["confidence"] == 0.95

    async def test_get_documents_with_filters(self, repository):
        """Test retrieving documents with complex filters."""
        # Arrange
        user_id = uuid4()
        project_id = uuid4()

        await repository.create({
            "user_id": user_id,
            "project_id": project_id,
            "filename": "doc1.pdf",
            "status": "completed",
            "mime_type": "application/pdf",
        })
        await repository.create({
            "user_id": user_id,
            "project_id": project_id,
            "filename": "doc2.png",
            "status": "pending",
            "mime_type": "image/png",
        })
        await repository.create({
            "user_id": user_id,
            "filename": "doc3.pdf",
            "status": "completed",
            "mime_type": "application/pdf",
        })

        # Act
        filters = {
            "user_id": user_id,
            "project_id": project_id,
            "status": "completed",
        }
        results = await repository.get_many(filters=filters)

        # Assert
        assert len(results) == 1
        assert results[0]["filename"] == "doc1.pdf"

    async def test_get_pending_documents(self, repository):
        """Test retrieving pending documents for processing."""
        # Arrange
        await repository.create({"filename": "doc1.pdf", "status": "pending"})
        await repository.create({"filename": "doc2.pdf", "status": "pending"})
        await repository.create({"filename": "doc3.pdf", "status": "processing"})
        await repository.create({"filename": "doc4.pdf", "status": "completed"})

        # Act
        pending_docs = await repository.get_pending_documents(limit=10)

        # Assert
        assert len(pending_docs) == 2
        assert all(doc["status"] == "pending" for doc in pending_docs)

    async def test_count_by_status(self, repository):
        """Test counting documents by status."""
        # Arrange
        user_id = uuid4()
        await repository.create({"user_id": user_id, "status": "pending"})
        await repository.create({"user_id": user_id, "status": "pending"})
        await repository.create({"user_id": user_id, "status": "completed"})
        await repository.create({"user_id": user_id, "status": "completed"})
        await repository.create({"user_id": user_id, "status": "completed"})
        await repository.create({"user_id": user_id, "status": "failed"})

        # Act
        pending_count = await repository.count_by_status(user_id, "pending")
        completed_count = await repository.count_by_status(user_id, "completed")
        failed_count = await repository.count_by_status(user_id, "failed")

        # Assert
        assert pending_count == 2
        assert completed_count == 3
        assert failed_count == 1

    async def test_delete_old_failed_documents(self, repository):
        """Test deleting old failed documents."""
        # Arrange
        from datetime import timedelta

        old_date = datetime.utcnow() - timedelta(days=31)
        recent_date = datetime.utcnow() - timedelta(days=7)

        await repository.create({
            "filename": "old_failed.pdf",
            "status": "failed",
            "created_at": old_date,
        })
        await repository.create({
            "filename": "recent_failed.pdf",
            "status": "failed",
            "created_at": recent_date,
        })
        await repository.create({
            "filename": "completed.pdf",
            "status": "completed",
            "created_at": old_date,
        })

        # Act
        deleted_count = await repository.delete_old_failed_documents(days=30)

        # Assert
        assert deleted_count == 1

        # Verify only old failed document was deleted
        remaining_count = await repository.count()
        assert remaining_count == 2

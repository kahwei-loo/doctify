"""
Unit Tests for Document Upload Service

Tests document upload and validation operations.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime
from uuid import uuid4

from app.services.document.upload import DocumentUploadService


@pytest.mark.unit
@pytest.mark.asyncio
class TestDocumentUploadService:
    """Test DocumentUploadService operations."""

    @pytest.fixture
    def mock_repository(self):
        """Create mock document repository."""
        mock = AsyncMock()
        mock.create = AsyncMock()
        mock.get_by_file_hash = AsyncMock()
        mock.get_by_id = AsyncMock()
        return mock

    @pytest.fixture
    def mock_storage(self):
        """Create mock storage service."""
        mock = Mock()
        mock.save_file = Mock(return_value="/uploads/test_file.pdf")
        mock.delete_file = Mock()
        mock.get_file_url = Mock(return_value="https://storage.example.com/test_file.pdf")
        return mock

    @pytest.fixture
    def service(self, mock_repository, mock_storage):
        """Create document upload service instance."""
        return DocumentUploadService(mock_repository, mock_storage)

    async def test_upload_document_success(self, service, mock_repository, mock_storage, test_pdf_file):
        """Test successful document upload."""
        # Arrange
        user_id = uuid4()
        project_id = uuid4()
        filename = "test_document.pdf"

        mock_repository.get_by_file_hash.return_value = None
        mock_repository.create.return_value = {
            "id": uuid4(),
            "user_id": user_id,
            "project_id": project_id,
            "filename": filename,
            "file_path": "/uploads/test_document.pdf",
            "status": "pending",
        }

        # Act
        result = await service.upload_document(
            file=test_pdf_file,
            filename=filename,
            user_id=user_id,
            project_id=project_id,
        )

        # Assert
        assert result is not None
        assert result["filename"] == filename
        assert result["user_id"] == user_id
        assert result["project_id"] == project_id
        assert result["status"] == "pending"

        mock_storage.save_file.assert_called_once()
        mock_repository.create.assert_called_once()

    async def test_upload_duplicate_document(self, service, mock_repository, test_pdf_file):
        """Test uploading duplicate document returns existing document."""
        # Arrange
        user_id = uuid4()
        existing_doc_id = uuid4()
        filename = "duplicate.pdf"

        # Mock existing document found by file hash
        mock_repository.get_by_file_hash.return_value = {
            "id": existing_doc_id,
            "user_id": user_id,
            "filename": filename,
            "file_hash": "abc123",
            "status": "completed",
        }

        # Act
        result = await service.upload_document(
            file=test_pdf_file,
            filename=filename,
            user_id=user_id,
        )

        # Assert
        assert result is not None
        assert result["id"] == existing_doc_id
        assert result["filename"] == filename

        # Should not save file or create new document
        assert not service.storage.save_file.called
        assert not mock_repository.create.called

    async def test_validate_file_type_allowed(self, service):
        """Test file type validation for allowed types."""
        # Arrange
        allowed_types = [".pdf", ".docx", ".txt"]

        # Act & Assert
        assert service.validate_file_type("document.pdf", allowed_types) is True
        assert service.validate_file_type("document.docx", allowed_types) is True
        assert service.validate_file_type("document.txt", allowed_types) is True

    async def test_validate_file_type_not_allowed(self, service):
        """Test file type validation for disallowed types."""
        # Arrange
        allowed_types = [".pdf", ".docx"]

        # Act & Assert
        assert service.validate_file_type("image.png", allowed_types) is False
        assert service.validate_file_type("script.exe", allowed_types) is False

    async def test_validate_file_size_within_limit(self, service):
        """Test file size validation within limit."""
        # Arrange
        max_size = 10 * 1024 * 1024  # 10MB

        # Act & Assert
        assert service.validate_file_size(5 * 1024 * 1024, max_size) is True
        assert service.validate_file_size(10 * 1024 * 1024, max_size) is True

    async def test_validate_file_size_exceeds_limit(self, service):
        """Test file size validation exceeding limit."""
        # Arrange
        max_size = 10 * 1024 * 1024  # 10MB

        # Act & Assert
        assert service.validate_file_size(11 * 1024 * 1024, max_size) is False
        assert service.validate_file_size(100 * 1024 * 1024, max_size) is False

    async def test_calculate_file_hash(self, service, test_pdf_file):
        """Test file hash calculation."""
        # Act
        file_hash = await service.calculate_file_hash(test_pdf_file)

        # Assert
        assert file_hash is not None
        assert isinstance(file_hash, str)
        assert len(file_hash) == 64  # SHA-256 hex digest length

    async def test_get_mime_type(self, service):
        """Test MIME type detection."""
        # Act & Assert
        assert service.get_mime_type("document.pdf") == "application/pdf"
        assert service.get_mime_type("document.docx") == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert service.get_mime_type("image.png") == "image/png"
        assert service.get_mime_type("image.jpg") == "image/jpeg"

    async def test_upload_document_with_invalid_type(self, service, test_pdf_file):
        """Test upload fails with invalid file type."""
        # Arrange
        user_id = uuid4()
        filename = "script.exe"  # Not allowed

        # Act & Assert
        with pytest.raises(ValueError, match="File type not allowed"):
            await service.upload_document(
                file=test_pdf_file,
                filename=filename,
                user_id=user_id,
            )

    async def test_upload_document_with_oversized_file(self, service):
        """Test upload fails with oversized file."""
        # Arrange
        user_id = uuid4()
        filename = "large_file.pdf"

        # Create mock file with large size
        large_file = Mock()
        large_file.size = 100 * 1024 * 1024  # 100MB (exceeds limit)

        # Act & Assert
        with pytest.raises(ValueError, match="File size exceeds maximum allowed"):
            await service.upload_document(
                file=large_file,
                filename=filename,
                user_id=user_id,
            )

    async def test_upload_document_storage_failure(self, service, mock_repository, mock_storage, test_pdf_file):
        """Test upload handles storage failure."""
        # Arrange
        user_id = uuid4()
        filename = "test.pdf"

        mock_repository.get_by_file_hash.return_value = None
        mock_storage.save_file.side_effect = Exception("Storage error")

        # Act & Assert
        with pytest.raises(Exception, match="Storage error"):
            await service.upload_document(
                file=test_pdf_file,
                filename=filename,
                user_id=user_id,
            )

        # Should not create document record if storage fails
        assert not mock_repository.create.called

    async def test_delete_document_file(self, service, mock_repository, mock_storage):
        """Test deleting document file from storage."""
        # Arrange
        document = {
            "id": uuid4(),
            "file_path": "/uploads/test.pdf",
        }

        # Act
        await service.delete_document_file(document)

        # Assert
        mock_storage.delete_file.assert_called_once_with("/uploads/test.pdf")

    async def test_get_document_download_url(self, service, mock_storage):
        """Test generating document download URL."""
        # Arrange
        document = {
            "id": uuid4(),
            "file_path": "/uploads/test.pdf",
        }

        # Act
        url = service.get_download_url(document)

        # Assert
        assert url == "https://storage.example.com/test_file.pdf"
        mock_storage.get_file_url.assert_called_once_with("/uploads/test.pdf")

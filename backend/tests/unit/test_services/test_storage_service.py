"""
Unit Tests for Storage Service

Tests file storage operations (local and S3).
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import os
from io import BytesIO

from app.services.storage.local import LocalStorageService
from app.services.storage.s3 import S3StorageService


@pytest.mark.unit
class TestLocalStorageService:
    """Test local storage service operations."""

    @pytest.fixture
    def service(self, tmp_path):
        """Create local storage service instance with temp directory."""
        storage_path = tmp_path / "uploads"
        storage_path.mkdir()
        return LocalStorageService(base_path=str(storage_path))

    def test_save_file_success(self, service, test_pdf_file):
        """Test successful file save to local storage."""
        # Arrange
        filename = "test_document.pdf"

        # Act
        file_path = service.save_file(test_pdf_file, filename)

        # Assert
        assert file_path is not None
        assert os.path.exists(os.path.join(service.base_path, file_path))
        assert filename in file_path

    def test_save_file_with_subdirectory(self, service, test_pdf_file):
        """Test saving file to subdirectory."""
        # Arrange
        filename = "test.pdf"
        subdirectory = "2024/01"

        # Act
        file_path = service.save_file(test_pdf_file, filename, subdirectory)

        # Assert
        assert subdirectory in file_path
        assert os.path.exists(os.path.join(service.base_path, file_path))

    def test_save_file_duplicate_filename(self, service, test_pdf_file):
        """Test saving files with duplicate filenames generates unique names."""
        # Arrange
        filename = "duplicate.pdf"

        # Act
        file_path_1 = service.save_file(test_pdf_file, filename)
        test_pdf_file.seek(0)  # Reset file pointer
        file_path_2 = service.save_file(test_pdf_file, filename)

        # Assert
        assert file_path_1 != file_path_2
        assert os.path.exists(os.path.join(service.base_path, file_path_1))
        assert os.path.exists(os.path.join(service.base_path, file_path_2))

    def test_read_file_success(self, service, test_pdf_file):
        """Test reading file from local storage."""
        # Arrange
        filename = "read_test.pdf"
        file_path = service.save_file(test_pdf_file, filename)

        # Act
        content = service.read_file(file_path)

        # Assert
        assert content is not None
        assert len(content) > 0

    def test_read_file_not_found(self, service):
        """Test reading non-existent file raises exception."""
        # Arrange
        non_existent_path = "non_existent/file.pdf"

        # Act & Assert
        with pytest.raises(FileNotFoundError):
            service.read_file(non_existent_path)

    def test_delete_file_success(self, service, test_pdf_file):
        """Test successful file deletion."""
        # Arrange
        filename = "delete_test.pdf"
        file_path = service.save_file(test_pdf_file, filename)
        full_path = os.path.join(service.base_path, file_path)

        assert os.path.exists(full_path)

        # Act
        result = service.delete_file(file_path)

        # Assert
        assert result is True
        assert not os.path.exists(full_path)

    def test_delete_file_not_found(self, service):
        """Test deleting non-existent file returns False."""
        # Arrange
        non_existent_path = "non_existent/file.pdf"

        # Act
        result = service.delete_file(non_existent_path)

        # Assert
        assert result is False

    def test_file_exists(self, service, test_pdf_file):
        """Test checking if file exists."""
        # Arrange
        filename = "exists_test.pdf"
        file_path = service.save_file(test_pdf_file, filename)

        # Act & Assert
        assert service.file_exists(file_path) is True
        assert service.file_exists("non_existent.pdf") is False

    def test_get_file_size(self, service, test_pdf_file):
        """Test getting file size."""
        # Arrange
        filename = "size_test.pdf"
        file_path = service.save_file(test_pdf_file, filename)

        # Act
        size = service.get_file_size(file_path)

        # Assert
        assert size > 0
        assert isinstance(size, int)

    def test_get_file_url(self, service, test_pdf_file):
        """Test generating file URL."""
        # Arrange
        filename = "url_test.pdf"
        file_path = service.save_file(test_pdf_file, filename)

        # Act
        url = service.get_file_url(file_path)

        # Assert
        assert url is not None
        assert file_path in url

    def test_list_files_in_directory(self, service, test_pdf_file):
        """Test listing files in directory."""
        # Arrange
        subdirectory = "test_folder"
        service.save_file(test_pdf_file, "file1.pdf", subdirectory)
        test_pdf_file.seek(0)
        service.save_file(test_pdf_file, "file2.pdf", subdirectory)

        # Act
        files = service.list_files(subdirectory)

        # Assert
        assert len(files) == 2
        assert all("file" in f for f in files)

    def test_move_file(self, service, test_pdf_file):
        """Test moving file to different location."""
        # Arrange
        filename = "move_test.pdf"
        original_path = service.save_file(test_pdf_file, filename, "original")
        new_path = "moved/move_test.pdf"

        # Act
        result = service.move_file(original_path, new_path)

        # Assert
        assert result is True
        assert not service.file_exists(original_path)
        assert service.file_exists(new_path)


@pytest.mark.unit
class TestS3StorageService:
    """Test S3 storage service operations."""

    @pytest.fixture
    def mock_s3_client(self):
        """Create mock S3 client."""
        mock = MagicMock()
        mock.upload_fileobj = Mock()
        mock.download_fileobj = Mock()
        mock.delete_object = Mock()
        mock.head_object = Mock()
        mock.list_objects_v2 = Mock()
        mock.generate_presigned_url = Mock(return_value="https://s3.amazonaws.com/bucket/file.pdf")
        return mock

    @pytest.fixture
    def service(self, mock_s3_client):
        """Create S3 storage service instance."""
        with patch('boto3.client', return_value=mock_s3_client):
            return S3StorageService(
                bucket_name="test-bucket",
                region="us-east-1",
                access_key="test-access-key",
                secret_key="test-secret-key",
            )

    def test_save_file_to_s3(self, service, mock_s3_client, test_pdf_file):
        """Test uploading file to S3."""
        # Arrange
        filename = "test_document.pdf"

        # Act
        file_path = service.save_file(test_pdf_file, filename)

        # Assert
        assert file_path is not None
        assert filename in file_path
        mock_s3_client.upload_fileobj.assert_called_once()

    def test_save_file_with_metadata(self, service, mock_s3_client, test_pdf_file):
        """Test uploading file with metadata."""
        # Arrange
        filename = "test.pdf"
        metadata = {
            "user_id": "12345",
            "document_type": "invoice",
        }

        # Act
        file_path = service.save_file(test_pdf_file, filename, metadata=metadata)

        # Assert
        assert file_path is not None
        call_args = mock_s3_client.upload_fileobj.call_args
        assert "Metadata" in call_args[1]["ExtraArgs"]

    def test_read_file_from_s3(self, service, mock_s3_client):
        """Test downloading file from S3."""
        # Arrange
        file_path = "documents/test.pdf"
        mock_content = b"PDF content"

        def download_side_effect(Bucket, Key, Fileobj):
            Fileobj.write(mock_content)

        mock_s3_client.download_fileobj.side_effect = download_side_effect

        # Act
        content = service.read_file(file_path)

        # Assert
        assert content == mock_content
        mock_s3_client.download_fileobj.assert_called_once()

    def test_delete_file_from_s3(self, service, mock_s3_client):
        """Test deleting file from S3."""
        # Arrange
        file_path = "documents/test.pdf"
        mock_s3_client.delete_object.return_value = {"DeleteMarker": True}

        # Act
        result = service.delete_file(file_path)

        # Assert
        assert result is True
        mock_s3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key=file_path,
        )

    def test_file_exists_in_s3(self, service, mock_s3_client):
        """Test checking if file exists in S3."""
        # Arrange
        file_path = "documents/test.pdf"
        mock_s3_client.head_object.return_value = {"ContentLength": 1024}

        # Act
        result = service.file_exists(file_path)

        # Assert
        assert result is True
        mock_s3_client.head_object.assert_called_once_with(
            Bucket="test-bucket",
            Key=file_path,
        )

    def test_file_not_exists_in_s3(self, service, mock_s3_client):
        """Test checking non-existent file in S3."""
        # Arrange
        file_path = "documents/non_existent.pdf"
        from botocore.exceptions import ClientError

        mock_s3_client.head_object.side_effect = ClientError(
            {"Error": {"Code": "404"}},
            "HeadObject"
        )

        # Act
        result = service.file_exists(file_path)

        # Assert
        assert result is False

    def test_get_file_size_from_s3(self, service, mock_s3_client):
        """Test getting file size from S3."""
        # Arrange
        file_path = "documents/test.pdf"
        mock_s3_client.head_object.return_value = {"ContentLength": 2048}

        # Act
        size = service.get_file_size(file_path)

        # Assert
        assert size == 2048

    def test_get_presigned_url(self, service, mock_s3_client):
        """Test generating presigned URL for S3 file."""
        # Arrange
        file_path = "documents/test.pdf"
        expiration = 3600

        # Act
        url = service.get_file_url(file_path, expiration)

        # Assert
        assert url is not None
        assert "https://" in url
        mock_s3_client.generate_presigned_url.assert_called_once()

    def test_list_files_in_s3_prefix(self, service, mock_s3_client):
        """Test listing files in S3 prefix."""
        # Arrange
        prefix = "documents/2024/"
        mock_s3_client.list_objects_v2.return_value = {
            "Contents": [
                {"Key": "documents/2024/file1.pdf", "Size": 1024},
                {"Key": "documents/2024/file2.pdf", "Size": 2048},
            ]
        }

        # Act
        files = service.list_files(prefix)

        # Assert
        assert len(files) == 2
        assert "file1.pdf" in files[0]
        assert "file2.pdf" in files[1]

    def test_upload_with_server_side_encryption(self, service, mock_s3_client, test_pdf_file):
        """Test uploading file with server-side encryption."""
        # Arrange
        filename = "encrypted.pdf"

        # Act
        file_path = service.save_file(
            test_pdf_file,
            filename,
            encryption="AES256"
        )

        # Assert
        assert file_path is not None
        call_args = mock_s3_client.upload_fileobj.call_args
        assert "ServerSideEncryption" in call_args[1]["ExtraArgs"]
        assert call_args[1]["ExtraArgs"]["ServerSideEncryption"] == "AES256"

    def test_copy_file_within_s3(self, service, mock_s3_client):
        """Test copying file within S3."""
        # Arrange
        source_path = "documents/original.pdf"
        destination_path = "documents/copy.pdf"
        mock_s3_client.copy_object = Mock()

        # Act
        result = service.copy_file(source_path, destination_path)

        # Assert
        assert result is True
        mock_s3_client.copy_object.assert_called_once()

"""
Base Storage Service

Abstract interface for storage operations supporting multiple backends.
"""

from abc import ABC, abstractmethod
from typing import Optional, BinaryIO, List
from pathlib import Path


class BaseStorageService(ABC):
    """
    Abstract base class for storage operations.

    Provides unified interface for local filesystem and cloud storage (S3, etc.).
    """

    @abstractmethod
    async def save_file(
        self,
        file_content: bytes,
        file_path: str,
    ) -> str:
        """
        Save file to storage.

        Args:
            file_content: File content as bytes
            file_path: Relative path where file should be stored

        Returns:
            Full path or URL where file was saved

        Raises:
            FileProcessingError: If save operation fails
        """
        pass

    @abstractmethod
    async def read_file(
        self,
        file_path: str,
    ) -> bytes:
        """
        Read file from storage.

        Args:
            file_path: Path to file

        Returns:
            File content as bytes

        Raises:
            FileProcessingError: If read operation fails
        """
        pass

    @abstractmethod
    async def delete_file(
        self,
        file_path: str,
    ) -> bool:
        """
        Delete file from storage.

        Args:
            file_path: Path to file

        Returns:
            True if deleted successfully

        Raises:
            FileProcessingError: If delete operation fails
        """
        pass

    @abstractmethod
    async def file_exists(
        self,
        file_path: str,
    ) -> bool:
        """
        Check if file exists in storage.

        Args:
            file_path: Path to file

        Returns:
            True if file exists
        """
        pass

    @abstractmethod
    async def get_file_size(
        self,
        file_path: str,
    ) -> int:
        """
        Get file size in bytes.

        Args:
            file_path: Path to file

        Returns:
            File size in bytes

        Raises:
            FileProcessingError: If file not found
        """
        pass

    @abstractmethod
    async def list_files(
        self,
        directory: str,
        pattern: Optional[str] = None,
    ) -> List[str]:
        """
        List files in directory.

        Args:
            directory: Directory path
            pattern: Optional glob pattern to filter files

        Returns:
            List of file paths
        """
        pass

    @abstractmethod
    async def move_file(
        self,
        source_path: str,
        destination_path: str,
    ) -> str:
        """
        Move file to new location.

        Args:
            source_path: Current file path
            destination_path: New file path

        Returns:
            New file path

        Raises:
            FileProcessingError: If move operation fails
        """
        pass

    @abstractmethod
    async def copy_file(
        self,
        source_path: str,
        destination_path: str,
    ) -> str:
        """
        Copy file to new location.

        Args:
            source_path: Source file path
            destination_path: Destination file path

        Returns:
            Destination file path

        Raises:
            FileProcessingError: If copy operation fails
        """
        pass

    @abstractmethod
    async def get_file_url(
        self,
        file_path: str,
        expires_in: Optional[int] = None,
    ) -> str:
        """
        Get URL for file access.

        Args:
            file_path: Path to file
            expires_in: Optional expiration time in seconds (for signed URLs)

        Returns:
            File URL (local file:// or cloud URL)
        """
        pass

    @abstractmethod
    async def create_directory(
        self,
        directory_path: str,
    ) -> bool:
        """
        Create directory if it doesn't exist.

        Args:
            directory_path: Directory path to create

        Returns:
            True if directory was created or already exists
        """
        pass

    @abstractmethod
    async def delete_directory(
        self,
        directory_path: str,
        recursive: bool = False,
    ) -> bool:
        """
        Delete directory.

        Args:
            directory_path: Directory path to delete
            recursive: Whether to delete recursively

        Returns:
            True if deleted successfully

        Raises:
            FileProcessingError: If delete operation fails
        """
        pass

    def get_file_extension(self, file_path: str) -> str:
        """
        Get file extension from path.

        Args:
            file_path: File path

        Returns:
            File extension (e.g., ".pdf", ".jpg")
        """
        return Path(file_path).suffix

    def get_filename(self, file_path: str) -> str:
        """
        Get filename from path.

        Args:
            file_path: File path

        Returns:
            Filename without path
        """
        return Path(file_path).name

    def get_directory(self, file_path: str) -> str:
        """
        Get directory from file path.

        Args:
            file_path: File path

        Returns:
            Directory path
        """
        return str(Path(file_path).parent)

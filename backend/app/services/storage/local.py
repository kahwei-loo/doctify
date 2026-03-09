"""
Local Filesystem Storage Service

Implementation for local filesystem storage operations.
"""

import os
import shutil
from typing import Optional, List
from pathlib import Path
import glob

from app.services.storage.base import BaseStorageService
from app.core.exceptions import FileProcessingError


class LocalStorageService(BaseStorageService):
    """
    Local filesystem storage implementation.

    Stores files on local disk with standard filesystem operations.
    """

    def __init__(self, base_directory: str):
        """
        Initialize local storage service.

        Args:
            base_directory: Base directory for file storage
        """
        self.base_directory = Path(base_directory).resolve()

        # Create base directory if it doesn't exist
        self.base_directory.mkdir(parents=True, exist_ok=True)

    def _get_absolute_path(self, file_path: str) -> Path:
        """
        Convert relative path to absolute path within base directory.

        Args:
            file_path: Relative file path

        Returns:
            Absolute Path object

        Raises:
            FileProcessingError: If path is outside base directory
        """
        absolute_path = (self.base_directory / file_path).resolve()

        # Security: Ensure path is within base directory
        try:
            absolute_path.relative_to(self.base_directory)
        except ValueError:
            raise FileProcessingError(
                "File path is outside allowed directory",
                details={
                    "file_path": file_path,
                    "base_directory": str(self.base_directory),
                },
            )

        return absolute_path

    async def save_file(
        self,
        file_content: bytes,
        file_path: str,
    ) -> str:
        """
        Save file to local filesystem.

        Args:
            file_content: File content as bytes
            file_path: Relative path where file should be stored

        Returns:
            Absolute path where file was saved

        Raises:
            FileProcessingError: If save operation fails
        """
        try:
            absolute_path = self._get_absolute_path(file_path)

            # Create parent directories if they don't exist
            absolute_path.parent.mkdir(parents=True, exist_ok=True)

            # Write file
            with open(absolute_path, "wb") as f:
                f.write(file_content)

            return str(absolute_path)

        except Exception as e:
            raise FileProcessingError(
                f"Failed to save file: {str(e)}",
                details={"file_path": file_path, "error": str(e)},
            )

    async def read_file(
        self,
        file_path: str,
    ) -> bytes:
        """
        Read file from local filesystem.

        Args:
            file_path: Path to file

        Returns:
            File content as bytes

        Raises:
            FileProcessingError: If read operation fails
        """
        try:
            absolute_path = self._get_absolute_path(file_path)

            if not absolute_path.exists():
                raise FileProcessingError(
                    "File not found",
                    details={"file_path": file_path},
                )

            with open(absolute_path, "rb") as f:
                return f.read()

        except FileProcessingError:
            raise
        except Exception as e:
            raise FileProcessingError(
                f"Failed to read file: {str(e)}",
                details={"file_path": file_path, "error": str(e)},
            )

    async def delete_file(
        self,
        file_path: str,
    ) -> bool:
        """
        Delete file from local filesystem.

        Args:
            file_path: Path to file

        Returns:
            True if deleted successfully

        Raises:
            FileProcessingError: If delete operation fails
        """
        try:
            absolute_path = self._get_absolute_path(file_path)

            if not absolute_path.exists():
                return False

            absolute_path.unlink()
            return True

        except Exception as e:
            raise FileProcessingError(
                f"Failed to delete file: {str(e)}",
                details={"file_path": file_path, "error": str(e)},
            )

    async def file_exists(
        self,
        file_path: str,
    ) -> bool:
        """
        Check if file exists in local filesystem.

        Args:
            file_path: Path to file

        Returns:
            True if file exists
        """
        try:
            absolute_path = self._get_absolute_path(file_path)
            return absolute_path.exists() and absolute_path.is_file()

        except FileProcessingError:
            return False

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
        try:
            absolute_path = self._get_absolute_path(file_path)

            if not absolute_path.exists():
                raise FileProcessingError(
                    "File not found",
                    details={"file_path": file_path},
                )

            return absolute_path.stat().st_size

        except FileProcessingError:
            raise
        except Exception as e:
            raise FileProcessingError(
                f"Failed to get file size: {str(e)}",
                details={"file_path": file_path, "error": str(e)},
            )

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
            List of relative file paths
        """
        try:
            absolute_dir = self._get_absolute_path(directory)

            if not absolute_dir.exists():
                return []

            # Build glob pattern
            if pattern:
                search_pattern = str(absolute_dir / pattern)
            else:
                search_pattern = str(absolute_dir / "*")

            # Find files
            files = glob.glob(search_pattern, recursive=True)

            # Convert to relative paths
            relative_files = []
            for file in files:
                file_path = Path(file)
                if file_path.is_file():
                    relative_path = file_path.relative_to(self.base_directory)
                    relative_files.append(str(relative_path))

            return relative_files

        except Exception as e:
            raise FileProcessingError(
                f"Failed to list files: {str(e)}",
                details={"directory": directory, "pattern": pattern, "error": str(e)},
            )

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
            Absolute destination path

        Raises:
            FileProcessingError: If move operation fails
        """
        try:
            source_absolute = self._get_absolute_path(source_path)
            destination_absolute = self._get_absolute_path(destination_path)

            if not source_absolute.exists():
                raise FileProcessingError(
                    "Source file not found",
                    details={"source_path": source_path},
                )

            # Create destination parent directories
            destination_absolute.parent.mkdir(parents=True, exist_ok=True)

            # Move file
            shutil.move(str(source_absolute), str(destination_absolute))

            return str(destination_absolute)

        except FileProcessingError:
            raise
        except Exception as e:
            raise FileProcessingError(
                f"Failed to move file: {str(e)}",
                details={
                    "source_path": source_path,
                    "destination_path": destination_path,
                    "error": str(e),
                },
            )

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
            Absolute destination path

        Raises:
            FileProcessingError: If copy operation fails
        """
        try:
            source_absolute = self._get_absolute_path(source_path)
            destination_absolute = self._get_absolute_path(destination_path)

            if not source_absolute.exists():
                raise FileProcessingError(
                    "Source file not found",
                    details={"source_path": source_path},
                )

            # Create destination parent directories
            destination_absolute.parent.mkdir(parents=True, exist_ok=True)

            # Copy file
            shutil.copy2(str(source_absolute), str(destination_absolute))

            return str(destination_absolute)

        except FileProcessingError:
            raise
        except Exception as e:
            raise FileProcessingError(
                f"Failed to copy file: {str(e)}",
                details={
                    "source_path": source_path,
                    "destination_path": destination_path,
                    "error": str(e),
                },
            )

    async def get_file_url(
        self,
        file_path: str,
        expires_in: Optional[int] = None,
    ) -> str:
        """
        Get local file URL.

        Args:
            file_path: Path to file
            expires_in: Not used for local storage

        Returns:
            File URL (file:// protocol)
        """
        absolute_path = self._get_absolute_path(file_path)
        return f"file://{absolute_path}"

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
        try:
            absolute_path = self._get_absolute_path(directory_path)
            absolute_path.mkdir(parents=True, exist_ok=True)
            return True

        except Exception as e:
            raise FileProcessingError(
                f"Failed to create directory: {str(e)}",
                details={"directory_path": directory_path, "error": str(e)},
            )

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
        try:
            absolute_path = self._get_absolute_path(directory_path)

            if not absolute_path.exists():
                return False

            if recursive:
                shutil.rmtree(absolute_path)
            else:
                absolute_path.rmdir()  # Only works if empty

            return True

        except Exception as e:
            raise FileProcessingError(
                f"Failed to delete directory: {str(e)}",
                details={
                    "directory_path": directory_path,
                    "recursive": recursive,
                    "error": str(e),
                },
            )

"""
Document Upload Service

Handles document file uploads, validation, and storage.
"""

from typing import Optional, BinaryIO
from datetime import datetime
import os

import uuid as uuid_module

from app.services.base import BaseService
from app.db.repositories.document import DocumentRepository
from app.db.repositories.project import ProjectRepository
from app.db.models.document import Document
from app.core.exceptions import (
    ValidationError,
    FileProcessingError,
    NotFoundError,
    AuthorizationError,
)
from app.core.security import (
    calculate_file_hash,
    validate_file_type,
    sanitize_filename,
    validate_file_content,
    validate_file_stream_size,
    get_expected_mime_types,
)
from app.domain.value_objects.file_metadata import FileMetadata


class DocumentUploadService(BaseService[Document, DocumentRepository]):
    """
    Service for handling document uploads.

    Coordinates file validation, storage, and metadata creation.
    """

    # Allowed file extensions
    ALLOWED_EXTENSIONS = [
        "pdf",
        "jpg",
        "jpeg",
        "png",
        "tiff",
        "bmp",
        "doc",
        "docx",
        "xls",
        "xlsx",
    ]

    # Maximum file size (50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024

    def __init__(
        self,
        repository: DocumentRepository,
        upload_directory: str,
        project_repository: Optional[ProjectRepository] = None,
    ):
        """
        Initialize upload service.

        Args:
            repository: Document repository
            upload_directory: Directory for file uploads
            project_repository: Optional project repository for validation
        """
        super().__init__(repository)
        self.upload_directory = upload_directory
        self.project_repository = project_repository

    async def upload_document(
        self,
        file: BinaryIO,
        filename: str,
        project_id: str,
        user_id: str,
        mime_type: Optional[str] = None,
        title: Optional[str] = None,
    ) -> Document:
        """
        Upload and process a document file.

        Args:
            file: File object or bytes
            filename: Original filename
            project_id: Project ID
            user_id: User ID
            mime_type: Optional MIME type

        Returns:
            Created document record

        Raises:
            ValidationError: If file validation fails
            FileProcessingError: If file processing fails
            NotFoundError: If project does not exist
            AuthorizationError: If project does not belong to user
        """
        # Convert string IDs to UUIDs early for validation
        user_uuid = uuid_module.UUID(user_id) if isinstance(user_id, str) else user_id
        project_uuid = (
            uuid_module.UUID(project_id) if isinstance(project_id, str) else project_id
        )

        # Validate project exists and belongs to user
        if self.project_repository:
            project = await self.project_repository.get_by_id(project_id)
            if not project:
                raise NotFoundError(
                    f"Project not found",
                    details={"project_id": project_id},
                )
            if str(project.user_id) != str(user_uuid):
                raise AuthorizationError(
                    "Project does not belong to this user",
                    details={"project_id": project_id, "user_id": user_id},
                )

        # Read and validate file content with streaming (prevents memory exhaustion)
        file_content, file_size = validate_file_stream_size(
            file, max_size=self.MAX_FILE_SIZE
        )

        # Validate file (including magic bytes validation)
        await self._validate_file(filename, file_content)

        # Calculate file hash
        file_hash = calculate_file_hash(file_content)

        # Check for duplicate (scoped to current user)
        existing_doc = await self.repository.get_by_file_hash(
            file_hash, user_id=user_id
        )
        if existing_doc:
            raise ValidationError(
                "Duplicate file detected",
                details={"existing_document_id": str(existing_doc.id)},
            )

        # Sanitize filename
        safe_filename = sanitize_filename(filename)

        # Generate unique filename
        unique_filename = await self._generate_unique_filename(safe_filename)

        # Create file metadata
        file_metadata = FileMetadata.create(
            filename=safe_filename,
            file_size=len(file_content),
            mime_type=mime_type or self._detect_mime_type(safe_filename),
            file_hash=file_hash,
        )

        # Save file to storage - track path for cleanup on failure
        file_path = None
        try:
            file_path = await self._save_file(unique_filename, file_content)

            # Generate title from filename if not provided
            doc_title = (
                title or safe_filename.rsplit(".", 1)[0]
                if safe_filename
                else "Untitled"
            )

            # Create document record
            document_data = {
                "project_id": project_uuid,
                "user_id": user_uuid,
                "title": doc_title,
                "original_filename": safe_filename,
                "file_path": file_path,
                "file_hash": file_hash,
                "file_size": file_metadata.file_size,
                "file_type": file_metadata.mime_type,
                "status": "pending",
            }

            document = await self.repository.create(document_data)

            # Ensure database transaction is committed
            await self.repository.session.commit()

            return document

        except Exception as e:
            # Clean up saved file if database operation fails
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass  # Best effort cleanup
            raise

    async def _validate_file(self, filename: str, content: bytes) -> None:
        """
        Validate uploaded file.

        Performs comprehensive validation including:
        - File extension validation
        - Magic bytes (MIME type) validation to prevent file type spoofing
        - Empty file check

        Note: File size validation is performed during streaming in upload_document()

        Args:
            filename: Filename
            content: File content

        Raises:
            ValidationError: If validation fails
        """
        # Validate file type by extension
        if not validate_file_type(filename, self.ALLOWED_EXTENSIONS):
            raise ValidationError(
                f"File type not allowed. Allowed types: {', '.join(self.ALLOWED_EXTENSIONS)}",
                details={"filename": filename},
            )

        # Validate file is not empty
        if len(content) == 0:
            raise ValidationError("File is empty", details={"filename": filename})

        # Validate file content using magic bytes (prevents file type spoofing)
        # Get expected MIME types based on allowed extensions
        expected_mime_types = get_expected_mime_types(self.ALLOWED_EXTENSIONS)

        # Validate actual file content matches expected types
        is_valid, detected_mime = validate_file_content(content, expected_mime_types)

        if not is_valid:
            raise ValidationError(
                f"File content type does not match extension. Detected: {detected_mime}",
                details={
                    "filename": filename,
                    "detected_mime_type": detected_mime,
                    "allowed_mime_types": expected_mime_types,
                },
            )

    def _detect_mime_type(self, filename: str) -> str:
        """
        Detect MIME type from filename extension.

        Args:
            filename: Filename

        Returns:
            MIME type string
        """
        extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        mime_types = {
            "pdf": "application/pdf",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "tiff": "image/tiff",
            "bmp": "image/bmp",
            "doc": "application/msword",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "xls": "application/vnd.ms-excel",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }

        return mime_types.get(extension, "application/octet-stream")

    async def _generate_unique_filename(self, filename: str) -> str:
        """
        Generate unique filename with timestamp.

        Args:
            filename: Original filename

        Returns:
            Unique filename
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")

        unique_filename = f"{timestamp}_{name}"
        if ext:
            unique_filename = f"{unique_filename}.{ext}"

        return unique_filename

    async def _save_file(self, filename: str, content: bytes) -> str:
        """
        Save file to storage.

        Args:
            filename: Unique filename
            content: File content

        Returns:
            File path

        Raises:
            FileProcessingError: If save fails
        """
        try:
            # Create upload directory if not exists
            os.makedirs(self.upload_directory, exist_ok=True)

            # Build file path
            file_path = os.path.join(self.upload_directory, filename)

            # Write file
            with open(file_path, "wb") as f:
                f.write(content)

            return file_path

        except Exception as e:
            raise FileProcessingError(
                f"Failed to save file: {str(e)}",
                details={"filename": filename},
            )

    async def delete_file(self, document_id: str) -> bool:
        """
        Delete document file from storage.

        Args:
            document_id: Document ID

        Returns:
            True if deleted successfully

        Raises:
            FileProcessingError: If deletion fails
        """
        try:
            document = await self.get_by_id(document_id)

            # Delete file from storage
            if os.path.exists(document.file_path):
                os.remove(document.file_path)

            # Delete document record
            return await self.repository.delete(document_id)

        except Exception as e:
            raise FileProcessingError(
                f"Failed to delete file: {str(e)}",
                details={"document_id": document_id},
            )

    async def get_file_content(self, document_id: str) -> bytes:
        """
        Get document file content.

        Args:
            document_id: Document ID

        Returns:
            File content as bytes

        Raises:
            FileProcessingError: If file read fails
        """
        try:
            document = await self.get_by_id(document_id)

            if not os.path.exists(document.file_path):
                raise FileProcessingError(
                    "File not found in storage",
                    details={
                        "document_id": document_id,
                        "file_path": document.file_path,
                    },
                )

            with open(document.file_path, "rb") as f:
                return f.read()

        except Exception as e:
            if isinstance(e, FileProcessingError):
                raise
            raise FileProcessingError(
                f"Failed to read file: {str(e)}",
                details={"document_id": document_id},
            )

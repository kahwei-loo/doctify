"""
Document Domain Entity

Encapsulates document business logic and behavior.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class DocumentStatus(str, Enum):
    """Document processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DocumentEntity:
    """
    Document domain entity with business logic.

    Represents a document in the system with its lifecycle and behavior.
    """

    def __init__(
        self,
        id: str,
        project_id: str,
        user_id: str,
        original_filename: str,
        filename: str,
        file_path: str,
        file_hash: str,
        file_size: int,
        mime_type: str,
        status: DocumentStatus = DocumentStatus.PENDING,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        completed_at: Optional[datetime] = None,
        error_message: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
    ):
        self.id = id
        self.project_id = project_id
        self.user_id = user_id
        self.original_filename = original_filename
        self.filename = filename
        self.file_path = file_path
        self.file_hash = file_hash
        self.file_size = file_size
        self.mime_type = mime_type
        self.status = status
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.completed_at = completed_at
        self.error_message = error_message
        self.result = result

    def start_processing(self) -> None:
        """Mark document as processing."""
        if self.status != DocumentStatus.PENDING:
            raise ValueError(f"Cannot start processing from status: {self.status}")

        self.status = DocumentStatus.PROCESSING
        self.updated_at = datetime.utcnow()

    def mark_completed(self, result: Dict[str, Any]) -> None:
        """
        Mark document as completed with result.

        Args:
            result: Processing result data

        Raises:
            ValueError: If document is not in processing status
        """
        if self.status != DocumentStatus.PROCESSING:
            raise ValueError(f"Cannot complete from status: {self.status}")

        self.status = DocumentStatus.COMPLETED
        self.result = result
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.error_message = None

    def mark_failed(self, error_message: str) -> None:
        """
        Mark document as failed with error message.

        Args:
            error_message: Error description

        Raises:
            ValueError: If document is not in processing status
        """
        if self.status not in [DocumentStatus.PENDING, DocumentStatus.PROCESSING]:
            raise ValueError(f"Cannot fail from status: {self.status}")

        self.status = DocumentStatus.FAILED
        self.error_message = error_message
        self.updated_at = datetime.utcnow()

    def cancel(self) -> None:
        """
        Cancel document processing.

        Raises:
            ValueError: If document is already completed or failed
        """
        if self.status in [DocumentStatus.COMPLETED, DocumentStatus.FAILED]:
            raise ValueError(f"Cannot cancel from status: {self.status}")

        self.status = DocumentStatus.CANCELLED
        self.updated_at = datetime.utcnow()

    def can_be_processed(self) -> bool:
        """Check if document can be processed."""
        return self.status in [DocumentStatus.PENDING, DocumentStatus.FAILED]

    def can_be_deleted(self) -> bool:
        """Check if document can be deleted."""
        return self.status not in [DocumentStatus.PROCESSING]

    def is_completed(self) -> bool:
        """Check if document processing is completed."""
        return self.status == DocumentStatus.COMPLETED

    def is_processing(self) -> bool:
        """Check if document is currently being processed."""
        return self.status == DocumentStatus.PROCESSING

    def is_failed(self) -> bool:
        """Check if document processing failed."""
        return self.status == DocumentStatus.FAILED

    def get_processing_duration(self) -> Optional[float]:
        """
        Get processing duration in seconds.

        Returns:
            Duration in seconds if completed, None otherwise
        """
        if self.completed_at:
            delta = self.completed_at - self.created_at
            return delta.total_seconds()
        return None

    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary."""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "original_filename": self.original_filename,
            "filename": self.filename,
            "file_path": self.file_path,
            "file_hash": self.file_hash,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "status": self.status.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "completed_at": self.completed_at,
            "error_message": self.error_message,
            "result": self.result,
        }

    def __repr__(self) -> str:
        return f"DocumentEntity(id={self.id}, filename={self.original_filename}, status={self.status})"

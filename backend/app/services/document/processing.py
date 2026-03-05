"""
Document Processing Service

Handles document processing workflow, status management, and result storage.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone

from app.services.base import BaseService
from app.db.repositories.document import DocumentRepository
from app.db.models.document import Document
from app.core.exceptions import ValidationError, FileProcessingError
from app.domain.entities.document import DocumentStatus
from app.domain.value_objects.confidence_score import FieldConfidence


class DocumentProcessingService(BaseService[Document, DocumentRepository]):
    """
    Service for managing document processing workflow.

    Coordinates document status updates and result storage.
    """

    def __init__(
        self,
        document_repository: DocumentRepository,
    ):
        """
        Initialize processing service.

        Args:
            document_repository: Document repository
        """
        super().__init__(document_repository)

    async def start_processing(self, document_id: str) -> Document:
        """
        Mark document as processing.

        Args:
            document_id: Document ID

        Returns:
            Updated document

        Raises:
            ValidationError: If document cannot be processed
        """
        document = await self.get_by_id(document_id)

        # Validate document can be processed
        if document.status not in ["pending", "failed"]:
            raise ValidationError(
                f"Cannot start processing from status: {document.status}",
                details={"document_id": document_id, "current_status": document.status},
            )

        # Update status to processing
        updated_document = await self.repository.update_status(
            document_id,
            DocumentStatus.PROCESSING.value,
        )

        return updated_document

    async def complete_processing(
        self,
        document_id: str,
        extracted_data: Dict[str, Any],
        confidence_scores: Optional[Dict[str, float]] = None,
    ) -> Document:
        """
        Mark document as completed with extraction results.

        Args:
            document_id: Document ID
            extracted_data: Extracted data dictionary
            confidence_scores: Optional field confidence scores

        Returns:
            Updated document

        Raises:
            ValidationError: If document is not in processing status
        """
        document = await self.get_by_id(document_id)

        # Validate document is processing
        if document.status != DocumentStatus.PROCESSING.value:
            raise ValidationError(
                f"Cannot complete from status: {document.status}",
                details={"document_id": document_id, "current_status": document.status},
            )

        # Validate extracted data
        if not extracted_data:
            raise ValidationError(
                "Extracted data cannot be empty",
                details={"document_id": document_id},
            )

        # Store extraction result in document
        extraction_metadata = {
            "confidence_scores": confidence_scores or {},
            "extracted_at": datetime.utcnow().isoformat(),
        }

        # Update document with extraction results
        updated_document = await self.repository.update_extraction_result(
            document_id,
            extracted_data=extracted_data,
            extraction_metadata=extraction_metadata,
        )

        return updated_document

    async def fail_processing(
        self,
        document_id: str,
        error_message: str,
    ) -> Document:
        """
        Mark document processing as failed.

        Args:
            document_id: Document ID
            error_message: Error description

        Returns:
            Updated document

        Raises:
            ValidationError: If document is not in processing status
        """
        document = await self.get_by_id(document_id)

        # Validate document is processing
        if document.status not in [
            DocumentStatus.PENDING.value,
            DocumentStatus.PROCESSING.value,
        ]:
            raise ValidationError(
                f"Cannot fail from status: {document.status}",
                details={"document_id": document_id, "current_status": document.status},
            )

        # Update status to failed
        updated_document = await self.repository.update_status(
            document_id,
            DocumentStatus.FAILED.value,
            error_message=error_message,
        )

        return updated_document

    async def cancel_processing(self, document_id: str) -> Document:
        """
        Cancel document processing.

        Args:
            document_id: Document ID

        Returns:
            Updated document

        Raises:
            ValidationError: If document cannot be cancelled
        """
        document = await self.get_by_id(document_id)

        # Validate document can be cancelled
        if document.status in [
            DocumentStatus.COMPLETED.value,
            DocumentStatus.FAILED.value,
        ]:
            raise ValidationError(
                f"Cannot cancel from status: {document.status}",
                details={"document_id": document_id, "current_status": document.status},
            )

        # Update status to cancelled
        updated_document = await self.repository.update_status(
            document_id,
            DocumentStatus.CANCELLED.value,
        )

        return updated_document

    async def get_processing_status(self, document_id: str) -> Dict[str, Any]:
        """
        Get detailed processing status.

        Args:
            document_id: Document ID

        Returns:
            Status information dictionary matching frontend DocumentDetail interface
        """
        document = await self.get_by_id(document_id)

        status_info = {
            "document_id": str(document.id),
            "filename": document.original_filename,
            "file_size": document.file_size,
            "mime_type": document.file_type,  # Frontend expects mime_type
            "status": document.status,
            "created_at": document.created_at,
            "updated_at": document.updated_at,
            "completed_at": document.processing_completed_at,  # Frontend expects completed_at
            "processing_error": document.processing_error,
            "project_id": str(document.project_id) if document.project_id else None,
        }

        # Calculate processing duration if completed
        if document.processing_completed_at:
            duration = (
                document.processing_completed_at - document.created_at
            ).total_seconds()
            status_info["processing_duration_seconds"] = duration

        # Add extraction result if available - matches frontend ExtractionResult interface
        if document.status in [
            DocumentStatus.COMPLETED.value,
            "processed",
            "confirmed",
        ]:
            if document.extracted_data or document.extracted_text:
                extraction_metadata = document.extraction_metadata or {}
                status_info["extraction_result"] = {
                    "text": document.extracted_text or "",
                    "confidence": extraction_metadata.get("confidence", 0.0),
                    "metadata": extraction_metadata,
                    "extracted_data": document.extracted_data or {},
                    "confidence_scores": extraction_metadata.get(
                        "field_confidences", {}
                    ),
                }

        # Add error message for failed documents
        if document.status == DocumentStatus.FAILED.value:
            status_info["error_message"] = document.processing_error

        return status_info

    async def get_project_documents(
        self,
        project_id: str,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        """
        Get documents for a project with optional status filter.

        Args:
            project_id: Project ID
            status: Optional status filter
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of documents
        """
        return await self.repository.get_by_project(
            project_id=project_id,
            skip=skip,
            limit=limit,
            status=status,
        )

    async def get_project_statistics(self, project_id: str) -> Dict[str, Any]:
        """
        Get processing statistics for a project.

        Args:
            project_id: Project ID

        Returns:
            Statistics dictionary
        """
        stats = await self.repository.get_project_stats(project_id)

        # Calculate percentages
        total = stats.get("total", 0)
        if total > 0:
            stats["percentages"] = {
                "processing": round((stats.get("processing", 0) / total) * 100, 2),
                "completed": round((stats.get("completed", 0) / total) * 100, 2),
                "failed": round((stats.get("failed", 0) / total) * 100, 2),
            }

        return stats

    async def retry_failed_document(self, document_id: str) -> Document:
        """
        Retry processing a pending, failed, or stuck document.

        Args:
            document_id: Document ID

        Returns:
            Updated document

        Raises:
            ValidationError: If document cannot be retried
        """
        document = await self.get_by_id(document_id)

        # Allow processing for pending documents (no reset needed)
        if document.status == DocumentStatus.PENDING.value:
            return document  # Just return, endpoint will trigger processing
        # Allow retry for failed documents
        elif document.status == DocumentStatus.FAILED.value:
            pass  # Allowed, will reset below
        # Allow retry for documents stuck in processing for more than 10 minutes
        elif document.status == DocumentStatus.PROCESSING.value:
            stuck_threshold = timedelta(minutes=10)
            processing_time = None

            if document.processing_started_at:
                now = datetime.now(timezone.utc)
                # Handle timezone-aware comparison
                if document.processing_started_at.tzinfo is None:
                    processing_time = (
                        now.replace(tzinfo=None) - document.processing_started_at
                    )
                else:
                    processing_time = now - document.processing_started_at

            if processing_time is None or processing_time < stuck_threshold:
                raise ValidationError(
                    f"Document is still being processed. Wait for processing to complete or timeout ({stuck_threshold.total_seconds() / 60:.0f} minutes).",
                    details={
                        "document_id": document_id,
                        "current_status": document.status,
                        "processing_started_at": (
                            str(document.processing_started_at)
                            if document.processing_started_at
                            else None
                        ),
                    },
                )
        elif document.status == DocumentStatus.COMPLETED.value:
            raise ValidationError(
                f"Document is already completed. Use reprocess if you want to process it again.",
                details={"document_id": document_id, "current_status": document.status},
            )
        else:
            raise ValidationError(
                f"Cannot process document with status: {document.status}",
                details={"document_id": document_id, "current_status": document.status},
            )

        # Reset status to pending and clear error
        updated_document = await self.repository.update_status(
            document_id,
            DocumentStatus.PENDING.value,
        )

        return updated_document

    async def get_documents_by_status(
        self,
        status: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        """
        Get documents by status.

        Args:
            status: Document status
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of documents
        """
        # Validate status
        valid_statuses = [s.value for s in DocumentStatus]
        if status not in valid_statuses:
            raise ValidationError(
                f"Invalid status: {status}",
                details={"valid_statuses": valid_statuses},
            )

        return await self.repository.get_by_status(
            status=status,
            skip=skip,
            limit=limit,
        )

    async def get_pending_documents(self, limit: int = 100) -> List[Document]:
        """
        Get pending documents for processing.

        Args:
            limit: Maximum number of documents to return

        Returns:
            List of pending documents
        """
        return await self.repository.get_by_status(
            status=DocumentStatus.PENDING.value,
            skip=0,
            limit=limit,
        )

    async def get_user_documents(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
    ) -> List[Document]:
        """
        Get all documents for a user with optional status filter.

        Args:
            user_id: User ID
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            status: Optional status filter

        Returns:
            List of documents
        """
        return await self.repository.get_by_user(
            user_id=user_id,
            skip=skip,
            limit=limit,
            status=status,
            is_archived=False,
        )

    async def validate_extraction_quality(
        self,
        document_id: str,
        minimum_confidence: float = 0.75,
    ) -> Dict[str, Any]:
        """
        Validate extraction quality against confidence threshold.

        Args:
            document_id: Document ID
            minimum_confidence: Minimum acceptable confidence

        Returns:
            Validation result dictionary
        """
        document = await self.get_by_id(document_id)

        if not document.extracted_data:
            raise ValidationError(
                "No extraction result found for document",
                details={"document_id": document_id},
            )

        # Get confidence scores from extraction metadata
        confidence_scores = {}
        if document.extraction_metadata:
            confidence_scores = document.extraction_metadata.get(
                "confidence_scores", {}
            )

        if not confidence_scores:
            return {
                "is_valid": False,
                "reason": "No confidence scores available",
            }

        # Create field confidence object
        field_confidence = FieldConfidence.create(confidence_scores)

        # Check if all fields meet threshold
        is_valid = field_confidence.all_acceptable(minimum_confidence)

        # Get fields below threshold
        low_confidence_fields = field_confidence.get_fields_below_threshold(
            minimum_confidence
        )

        return {
            "is_valid": is_valid,
            "average_confidence": field_confidence.get_average_confidence().to_percentage(),
            "lowest_confidence": field_confidence.get_lowest_confidence().to_percentage(),
            "highest_confidence": field_confidence.get_highest_confidence().to_percentage(),
            "low_confidence_fields": {
                name: score.to_percentage()
                for name, score in low_confidence_fields.items()
            },
        }

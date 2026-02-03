"""
OCR Processing Tasks

Asynchronous Celery tasks for document OCR and data extraction.
Phase 11: Integration with RAG embedding generation.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.db.database import get_session_factory
from app.db.repositories.document import DocumentRepository
from app.db.models.document import Document
from app.services.document.processing import DocumentProcessingService
from app.services.ocr.orchestrator import OCROrchestrator
from app.services.notification.redis_events import RedisEventService, RedisNotificationService
from app.core.exceptions import (
    ValidationError,
    FileProcessingError,
    NotFoundError,
)

# Phase 11: Import RAG embedding task for automatic embedding generation
from app.tasks.rag.embedding_task import generate_document_embeddings_task

logger = logging.getLogger(__name__)


# =============================================================================
# Task Helper Functions
# =============================================================================

async def get_services():
    """
    Get service instances for OCR tasks.

    Returns:
        Tuple of (processing_service, ocr_orchestrator, notification_service, session)
    """
    # Create async session
    async_session_factory = get_session_factory()
    session = async_session_factory()

    # Create repository
    document_repository = DocumentRepository(session)

    # Create services
    processing_service = DocumentProcessingService(
        document_repository=document_repository,
    )

    ocr_orchestrator = OCROrchestrator()

    # Create notification service
    redis_service = RedisEventService()
    await redis_service.connect()
    notification_service = RedisNotificationService(redis_service)

    return processing_service, ocr_orchestrator, notification_service, session


# =============================================================================
# OCR Processing Tasks
# =============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.document.ocr.process_document",
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(FileProcessingError,),
)
def process_document_ocr(
    self,
    document_id: str,
    extraction_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Process document with OCR and data extraction.

    Args:
        document_id: Document ID to process
        extraction_config: Optional extraction configuration

    Returns:
        Processing result dictionary

    Raises:
        NotFoundError: If document not found
        FileProcessingError: If processing fails
    """
    import asyncio

    logger.info(
        f"Starting OCR processing for document {document_id}",
        extra={"document_id": document_id, "task_id": self.request.id},
    )

    try:
        # Run async processing in event loop
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            _process_document_async(
                document_id=document_id,
                extraction_config=extraction_config,
                task_id=self.request.id,
            )
        )

        logger.info(
            f"Completed OCR processing for document {document_id}",
            extra={
                "document_id": document_id,
                "task_id": self.request.id,
                "result": result,
            },
        )

        return result

    except NotFoundError as e:
        logger.error(
            f"Document {document_id} not found",
            extra={"document_id": document_id, "error": str(e)},
        )
        raise

    except FileProcessingError as e:
        logger.error(
            f"OCR processing failed for document {document_id}",
            extra={
                "document_id": document_id,
                "error": str(e),
                "retry": self.request.retries,
            },
        )

        # Update document status to failed if max retries exceeded
        if self.request.retries >= self.max_retries:
            loop = asyncio.get_event_loop()
            loop.run_until_complete(
                _mark_document_failed(
                    document_id=document_id,
                    error_message=str(e),
                )
            )

        raise

    except Exception as e:
        logger.exception(
            f"Unexpected error processing document {document_id}",
            extra={"document_id": document_id, "error": str(e)},
        )

        # Mark as failed
        loop = asyncio.get_event_loop()
        loop.run_until_complete(
            _mark_document_failed(
                document_id=document_id,
                error_message=f"Unexpected error: {str(e)}",
            )
        )

        raise


async def _process_document_async(
    document_id: str,
    extraction_config: Optional[Dict[str, Any]],
    task_id: str,
) -> Dict[str, Any]:
    """
    Async function to process document with OCR.

    Args:
        document_id: Document ID
        extraction_config: Optional extraction config
        task_id: Celery task ID

    Returns:
        Processing result dictionary
    """
    # Get services
    processing_service, ocr_orchestrator, notification_service, session = await get_services()

    try:
        async with session:
            # Get document
            document = await processing_service.repository.get_by_id(document_id)
            if not document:
                raise NotFoundError(f"Document {document_id} not found")

            # Update status to processing
            await processing_service.repository.update(
                document_id,
                {
                    "status": "processing",
                    "processing_started_at": datetime.now(timezone.utc),
                    "celery_task_id": task_id,
                }
            )

            # Notify status change
            await notification_service.notify_document_event(
                event_type="status_change",
                document_id=document_id,
                data={
                    "status": "processing",
                    "user_id": str(document.user_id),
                    "project_id": str(document.project_id) if document.project_id else None,
                },
            )

            # Perform OCR processing with L2.5 enhancements
            # Get document file path from storage
            file_path = document.file_path
            if not file_path:
                raise FileProcessingError(f"Document {document_id} has no file path")

            # Get extraction config from document's project or use defaults
            doc_extraction_config = extraction_config or {}
            if document.project_id:
                # Fetch project config if available
                from app.db.repositories.project import ProjectRepository
                project_repo = ProjectRepository(session)
                project = await project_repo.get_by_id(str(document.project_id))
                if project and project.config:
                    doc_extraction_config = {**project.config, **doc_extraction_config}

            # Process with L2.5 enhanced OCR
            l25_result = await ocr_orchestrator.process_document_with_l25(
                file_path=file_path,
                extraction_config=doc_extraction_config,
                mime_type=document.file_type or "application/pdf",
                enable_retry=True,
                enable_validation=True,
                region="MY",  # Malaysia localization
                document_id=document_id,  # Pass document_id for logging
                user_id=str(document.user_id) if document.user_id else None,  # Pass user_id for logging
            )

            # Convert L2.5 result to extraction result format
            extraction_result = {
                "extracted_data": l25_result.get("extracted_data", {}),
                "confidence": l25_result.get("overall_confidence", 0.0),
                "document_type": l25_result.get("document_type"),
                "document_type_confidence": l25_result.get("document_type_confidence"),
                "field_confidences": l25_result.get("confidence_scores", {}),
                "token_usage": l25_result.get("token_usage", {}),
                "total_token_usage": l25_result.get("total_token_usage", {}),
                "l25_metadata": l25_result.get("l25_metadata", {}),
                "errors": l25_result.get("errors", []),
                "process_time": l25_result.get("process_time", 0),
                "metadata": {
                    "model": l25_result.get("model"),
                    "provider": l25_result.get("provider"),
                },
            }

            # Extract text content for RAG embedding generation
            extracted_text_content = ""
            extracted_data_content = extraction_result.get("extracted_data", {})
            if isinstance(extracted_data_content, dict):
                # Build text from extracted fields for embedding
                text_parts = []
                for key, value in extracted_data_content.items():
                    if value and isinstance(value, str):
                        text_parts.append(f"{key}: {value}")
                    elif value and isinstance(value, (list, dict)):
                        text_parts.append(f"{key}: {str(value)}")
                extracted_text_content = "\n".join(text_parts)

            # Store extraction result in document using correct field names
            await processing_service.repository.update(
                document_id,
                {
                    "status": "completed",
                    "processing_completed_at": datetime.now(timezone.utc),
                    "extracted_data": extracted_data_content,
                    "extracted_text": extracted_text_content if extracted_text_content else None,
                    "extraction_metadata": {
                        "confidence": extraction_result.get("confidence", 0.0),
                        "document_type": extraction_result.get("document_type"),
                        "document_type_confidence": extraction_result.get("document_type_confidence"),
                        "field_confidences": extraction_result.get("field_confidences", {}),
                        "token_usage": extraction_result.get("token_usage", {}),
                        "total_token_usage": extraction_result.get("total_token_usage", {}),
                        "l25_metadata": extraction_result.get("l25_metadata", {}),
                        "errors": extraction_result.get("errors", []),
                        "process_time": extraction_result.get("process_time", 0),
                        "model": extraction_result.get("metadata", {}).get("model"),
                        "provider": extraction_result.get("metadata", {}).get("provider"),
                    },
                }
            )

            # Notify completion
            await notification_service.notify_document_event(
                event_type="completed",
                document_id=document_id,
                data={
                    "status": "completed",
                    "user_id": str(document.user_id),
                    "project_id": str(document.project_id) if document.project_id else None,
                    "confidence": extraction_result.get("confidence", 0.0),
                },
            )

            await session.commit()

            # Phase 11: Trigger embedding generation after successful OCR completion
            # Only trigger if document has extracted_text
            # Refetch document to get updated data including extracted_text if it was set
            updated_document = await processing_service.repository.get_by_id(document_id)
            if updated_document and updated_document.extracted_text:
                logger.info(
                    f"Triggering embedding generation for document {document_id}",
                    extra={
                        "document_id": document_id,
                        "extracted_text_length": len(updated_document.extracted_text),
                    }
                )
                # Queue embedding generation task (async, non-blocking)
                generate_document_embeddings_task.delay(document_id)
            else:
                logger.warning(
                    f"Document {document_id} completed OCR but has no extracted_text, skipping embedding generation",
                    extra={"document_id": document_id}
                )

            return {
                "document_id": document_id,
                "status": "completed",
                "confidence": extraction_result.get("confidence", 0.0),
            }

    except Exception as e:
        logger.error(f"Error in async processing: {e}", exc_info=True)
        await session.rollback()
        raise
    finally:
        await session.close()


async def _mark_document_failed(
    document_id: str,
    error_message: str,
) -> None:
    """
    Mark document as failed with error message.

    Args:
        document_id: Document ID
        error_message: Error message to store
    """
    try:
        # Get services
        processing_service, _, notification_service, session = await get_services()

        async with session:
            # Update document status using correct field names
            await processing_service.repository.update(
                document_id,
                {
                    "status": "failed",
                    "processing_error": error_message,
                    "processing_completed_at": datetime.now(timezone.utc),
                }
            )

            # Get document for notification
            document = await processing_service.repository.get_by_id(document_id)

            # Notify failure
            await notification_service.notify_document_event(
                event_type="failed",
                document_id=document_id,
                data={
                    "status": "failed",
                    "error": error_message,
                    "user_id": str(document.user_id) if document else None,
                    "project_id": str(document.project_id) if document and document.project_id else None,
                },
            )

            await session.commit()

    except Exception as e:
        logger.error(f"Error marking document as failed: {e}", exc_info=True)


# =============================================================================
# Batch Processing Tasks
# =============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.document.ocr.batch_process_documents",
)
def batch_process_documents(
    self,
    document_ids: list[str],
    extraction_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Process multiple documents in batch.

    Args:
        document_ids: List of document IDs to process
        extraction_config: Optional extraction configuration

    Returns:
        Batch processing result with task IDs
    """
    logger.info(
        f"Starting batch processing for {len(document_ids)} documents",
        extra={"document_count": len(document_ids), "task_id": self.request.id},
    )

    # Queue individual processing tasks
    task_ids = []
    for document_id in document_ids:
        result = process_document_ocr.delay(
            document_id=document_id,
            extraction_config=extraction_config,
        )
        task_ids.append({
            "document_id": document_id,
            "task_id": result.id,
        })

    logger.info(
        f"Queued {len(task_ids)} OCR processing tasks",
        extra={"task_count": len(task_ids)},
    )

    return {
        "batch_task_id": self.request.id,
        "document_count": len(document_ids),
        "processing_tasks": task_ids,
    }


# =============================================================================
# Retry and Cleanup Tasks
# =============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.document.ocr.retry_failed_documents",
)
def retry_failed_documents(
    self,
    project_id: Optional[str] = None,
    max_retries: int = 3,
) -> Dict[str, Any]:
    """
    Retry processing for failed documents.

    Args:
        project_id: Optional project ID to filter documents
        max_retries: Maximum number of previous retries to consider

    Returns:
        Retry result with queued task IDs
    """
    import asyncio

    logger.info(
        f"Retrying failed documents",
        extra={"project_id": project_id, "task_id": self.request.id},
    )

    try:
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            _retry_failed_documents_async(
                project_id=project_id,
                max_retries=max_retries,
            )
        )

        return result

    except Exception as e:
        logger.exception(f"Error retrying failed documents: {e}")
        raise


async def _retry_failed_documents_async(
    project_id: Optional[str],
    max_retries: int,
) -> Dict[str, Any]:
    """
    Async function to retry failed documents.

    Args:
        project_id: Optional project ID filter
        max_retries: Max retries to consider

    Returns:
        Retry result dictionary
    """
    # Get services
    processing_service, _, _, session = await get_services()

    try:
        async with session:
            # Get failed documents using repository method
            failed_documents = await processing_service.repository.get_failed_documents(
                project_id=project_id,
                limit=100,
            )

            # Queue retry tasks
            task_ids = []
            for document in failed_documents:
                result = process_document_ocr.delay(
                    document_id=str(document.id),
                )
                task_ids.append({
                    "document_id": str(document.id),
                    "task_id": result.id,
                })

            return {
                "retried_count": len(task_ids),
                "retry_tasks": task_ids,
            }
    finally:
        await session.close()

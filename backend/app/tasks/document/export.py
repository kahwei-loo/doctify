"""
Document Export Tasks

Asynchronous Celery tasks for document export and format conversion.
"""

import logging
from typing import Optional, Dict, Any, List

from app.tasks.celery_app import celery_app
from app.db.database import get_session_factory
from app.db.repositories.document import DocumentRepository
from app.db.models.document import Document
from app.services.document.export import DocumentExportService
from app.services.notification.redis_events import RedisEventService, RedisNotificationService
from app.core.exceptions import (
    ValidationError,
    NotFoundError,
    FileProcessingError,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Task Helper Functions
# =============================================================================

async def get_export_services():
    """
    Get service instances for export tasks.

    Returns:
        Tuple of (export_service, notification_service, session)
    """
    # Create async session
    async_session_factory = get_session_factory()
    session = async_session_factory()

    # Create repository
    document_repository = DocumentRepository(session)

    # Create export service
    export_service = DocumentExportService(
        document_repository=document_repository,
    )

    # Create notification service
    redis_service = RedisEventService()
    await redis_service.connect()
    notification_service = RedisNotificationService(redis_service)

    return export_service, notification_service, session


# =============================================================================
# Document Export Tasks
# =============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.document.export.export_document",
    max_retries=3,
    default_retry_delay=30,
)
def export_document_task(
    self,
    document_id: str,
    export_format: str = "json",
    include_metadata: bool = True,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Export document extraction results to specified format.

    Args:
        document_id: Document ID to export
        export_format: Export format (json, csv, xml)
        include_metadata: Include document metadata
        user_id: Optional user ID for notifications

    Returns:
        Export result dictionary with file path/data

    Raises:
        NotFoundError: If document not found
        FileProcessingError: If export fails
    """
    import asyncio

    logger.info(
        f"Starting export for document {document_id} to {export_format}",
        extra={
            "document_id": document_id,
            "format": export_format,
            "task_id": self.request.id,
        },
    )

    try:
        # Run async export in event loop
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            _export_document_async(
                document_id=document_id,
                export_format=export_format,
                include_metadata=include_metadata,
                user_id=user_id,
                task_id=self.request.id,
            )
        )

        logger.info(
            f"Completed export for document {document_id}",
            extra={
                "document_id": document_id,
                "format": export_format,
                "task_id": self.request.id,
            },
        )

        return result

    except NotFoundError as e:
        logger.error(
            f"Document {document_id} not found for export",
            extra={"document_id": document_id, "error": str(e)},
        )
        raise

    except FileProcessingError as e:
        logger.error(
            f"Export failed for document {document_id}",
            extra={
                "document_id": document_id,
                "format": export_format,
                "error": str(e),
                "retry": self.request.retries,
            },
        )
        raise

    except Exception as e:
        logger.exception(
            f"Unexpected error exporting document {document_id}",
            extra={"document_id": document_id, "error": str(e)},
        )
        raise


async def _export_document_async(
    document_id: str,
    export_format: str,
    include_metadata: bool,
    user_id: Optional[str],
    task_id: str,
) -> Dict[str, Any]:
    """
    Async function to export document.

    Args:
        document_id: Document ID
        export_format: Export format
        include_metadata: Include metadata flag
        user_id: Optional user ID
        task_id: Celery task ID

    Returns:
        Export result dictionary
    """
    # Get services
    export_service, notification_service, session = await get_export_services()

    try:
        async with session:
            # Export document
            exported_data = await export_service.export_document(
                document_id=document_id,
                export_format=export_format,
                include_metadata=include_metadata,
            )

            # Get document for notification
            document = await export_service.repository.get_by_id(document_id)

            # Notify export completion
            await notification_service.notify_document_event(
                event_type="export_completed",
                document_id=document_id,
                data={
                    "format": export_format,
                    "size_bytes": len(exported_data) if exported_data else 0,
                    "user_id": user_id or (str(document.user_id) if document else None),
                    "project_id": str(document.project_id) if document and document.project_id else None,
                },
            )

            return {
                "document_id": document_id,
                "format": export_format,
                "size_bytes": len(exported_data) if exported_data else 0,
                "task_id": task_id,
                "status": "completed",
            }

    except Exception as e:
        logger.error(f"Error in async export: {e}", exc_info=True)

        # Notify export failure
        if user_id:
            await notification_service.notify_document_event(
                event_type="export_failed",
                document_id=document_id,
                data={
                    "format": export_format,
                    "error": str(e),
                    "user_id": user_id,
                },
            )

        raise
    finally:
        await session.close()


# =============================================================================
# Batch Export Tasks
# =============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.document.export.batch_export_documents",
)
def batch_export_documents_task(
    self,
    document_ids: List[str],
    export_format: str = "json",
    include_metadata: bool = True,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Export multiple documents in batch.

    Args:
        document_ids: List of document IDs to export
        export_format: Export format (json, csv, xml)
        include_metadata: Include document metadata
        user_id: Optional user ID for notifications

    Returns:
        Batch export result with task IDs
    """
    logger.info(
        f"Starting batch export for {len(document_ids)} documents",
        extra={
            "document_count": len(document_ids),
            "format": export_format,
            "task_id": self.request.id,
        },
    )

    # Queue individual export tasks
    task_ids = []
    for document_id in document_ids:
        result = export_document_task.delay(
            document_id=document_id,
            export_format=export_format,
            include_metadata=include_metadata,
            user_id=user_id,
        )
        task_ids.append({
            "document_id": document_id,
            "task_id": result.id,
        })

    logger.info(
        f"Queued {len(task_ids)} export tasks",
        extra={"task_count": len(task_ids)},
    )

    return {
        "batch_task_id": self.request.id,
        "document_count": len(document_ids),
        "export_format": export_format,
        "export_tasks": task_ids,
    }


# =============================================================================
# Project Export Tasks
# =============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.document.export.export_project",
)
def export_project_task(
    self,
    project_id: str,
    export_format: str = "json",
    include_metadata: bool = True,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Export all documents in a project.

    Args:
        project_id: Project ID to export
        export_format: Export format (json, csv, xml)
        include_metadata: Include document metadata
        user_id: Optional user ID for notifications

    Returns:
        Project export result with task IDs
    """
    import asyncio

    logger.info(
        f"Starting project export for {project_id}",
        extra={
            "project_id": project_id,
            "format": export_format,
            "task_id": self.request.id,
        },
    )

    try:
        loop = asyncio.get_event_loop()
        result = loop.run_until_complete(
            _export_project_async(
                project_id=project_id,
                export_format=export_format,
                include_metadata=include_metadata,
                user_id=user_id,
                task_id=self.request.id,
            )
        )

        return result

    except Exception as e:
        logger.exception(f"Error exporting project {project_id}: {e}")
        raise


async def _export_project_async(
    project_id: str,
    export_format: str,
    include_metadata: bool,
    user_id: Optional[str],
    task_id: str,
) -> Dict[str, Any]:
    """
    Async function to export project documents.

    Args:
        project_id: Project ID
        export_format: Export format
        include_metadata: Include metadata flag
        user_id: Optional user ID
        task_id: Celery task ID

    Returns:
        Export result dictionary
    """
    # Get services
    export_service, notification_service, session = await get_export_services()

    try:
        async with session:
            # Get all completed documents for project
            documents = await export_service.repository.find_by_project(
                project_id=project_id
            )

            # Filter for completed documents only
            completed_docs = [
                doc for doc in documents
                if doc.status == "completed"
            ]

            if not completed_docs:
                raise ValidationError(
                    f"No completed documents found for project {project_id}"
                )

            # Queue export tasks for each document
            task_ids = []
            for document in completed_docs:
                result = export_document_task.delay(
                    document_id=str(document.id),
                    export_format=export_format,
                    include_metadata=include_metadata,
                    user_id=user_id,
                )
                task_ids.append({
                    "document_id": str(document.id),
                    "task_id": result.id,
                })

            # Notify project export started
            await notification_service.notify_project_event(
                event_type="export_started",
                project_id=project_id,
                data={
                    "document_count": len(completed_docs),
                    "format": export_format,
                    "user_id": user_id,
                },
            )

            return {
                "project_id": project_id,
                "document_count": len(completed_docs),
                "export_format": export_format,
                "export_tasks": task_ids,
                "batch_task_id": task_id,
            }

    except Exception as e:
        logger.error(f"Error in async project export: {e}", exc_info=True)

        # Notify project export failure
        if user_id:
            await notification_service.notify_project_event(
                event_type="export_failed",
                project_id=project_id,
                data={
                    "error": str(e),
                    "user_id": user_id,
                },
            )

        raise
    finally:
        await session.close()


# =============================================================================
# Export Cleanup Tasks
# =============================================================================

@celery_app.task(
    bind=True,
    name="app.tasks.document.export.cleanup_old_exports",
)
def cleanup_old_exports_task(
    self,
    days_old: int = 7,
) -> Dict[str, Any]:
    """
    Clean up old export files older than specified days.

    Args:
        days_old: Delete exports older than this many days

    Returns:
        Cleanup result with count of deleted files
    """
    import os
    import shutil
    from datetime import datetime, timedelta
    from pathlib import Path

    from app.core.config import settings

    logger.info(
        f"Starting cleanup of exports older than {days_old} days",
        extra={"days_old": days_old, "task_id": self.request.id},
    )

    deleted_count = 0
    deleted_size = 0
    errors = []

    try:
        # Define export directories to clean
        upload_dir = Path(settings.UPLOAD_DIR)
        export_dir = upload_dir / "exports"

        # Check if export directory exists
        if not export_dir.exists():
            logger.info(f"Export directory does not exist: {export_dir}")
            return {
                "task_id": self.request.id,
                "days_old": days_old,
                "deleted_count": 0,
                "deleted_size_bytes": 0,
                "status": "completed",
                "message": "Export directory does not exist",
            }

        # Calculate cutoff time
        cutoff_time = datetime.now() - timedelta(days=days_old)
        cutoff_timestamp = cutoff_time.timestamp()

        # Iterate through export files and directories
        for item in export_dir.iterdir():
            try:
                # Check modification time
                item_mtime = item.stat().st_mtime

                if item_mtime < cutoff_timestamp:
                    item_size = 0

                    if item.is_file():
                        item_size = item.stat().st_size
                        item.unlink()
                        logger.debug(f"Deleted old export file: {item}")
                    elif item.is_dir():
                        # Calculate directory size before deletion
                        for file in item.rglob("*"):
                            if file.is_file():
                                item_size += file.stat().st_size
                        shutil.rmtree(item)
                        logger.debug(f"Deleted old export directory: {item}")

                    deleted_count += 1
                    deleted_size += item_size

            except PermissionError as e:
                error_msg = f"Permission denied deleting {item}: {e}"
                logger.warning(error_msg)
                errors.append(error_msg)
            except Exception as e:
                error_msg = f"Error deleting {item}: {e}"
                logger.warning(error_msg)
                errors.append(error_msg)

        logger.info(
            f"Export cleanup completed: deleted {deleted_count} items ({deleted_size} bytes)",
            extra={
                "deleted_count": deleted_count,
                "deleted_size_bytes": deleted_size,
                "task_id": self.request.id,
            },
        )

        return {
            "task_id": self.request.id,
            "days_old": days_old,
            "deleted_count": deleted_count,
            "deleted_size_bytes": deleted_size,
            "errors": errors if errors else None,
            "status": "completed" if not errors else "completed_with_errors",
        }

    except Exception as e:
        logger.exception(f"Error during export cleanup: {e}")
        return {
            "task_id": self.request.id,
            "days_old": days_old,
            "deleted_count": deleted_count,
            "deleted_size_bytes": deleted_size,
            "error": str(e),
            "status": "failed",
        }

"""
Document API Endpoints

Handles document upload, processing, and export operations.
"""

import logging
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Query,
    Path,
    Body,
    HTTPException,
    status,
)
from fastapi.responses import StreamingResponse
import io

logger = logging.getLogger(__name__)

from app.api.v1.deps import (
    get_current_verified_user,
    get_document_upload_service,
    get_document_processing_service,
    get_document_export_service,
    get_ocr_orchestrator,
    verify_document_ownership,
    get_websocket_notification_service,
    get_document_repository,
)
from app.services.document.upload import DocumentUploadService
from app.services.document.processing import DocumentProcessingService
from app.services.document.export import DocumentExportService
from app.services.ocr.orchestrator import OCROrchestrator
from app.services.notification.websocket import WebSocketNotificationService
from app.db.models.user import User
from app.db.repositories.document import DocumentRepository
from datetime import datetime
from app.models.document import (
    ExportFormat,
    DocumentExportRequest,
    DocumentConfirmRequest,
)
from app.models.ocr import (
    ProcessDocumentRequest,
    ExtractionConfig,
)
from app.models.common import (
    success_response,
    paginated_response,
    message_response,
    PaginationParams,
)
from app.core.exceptions import (
    ValidationError,
    FileProcessingError,
    NotFoundError,
)

router = APIRouter()


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    project_id: str = Query(..., description="Project ID"),
    file: UploadFile = File(..., description="Document file to upload"),
    current_user: User = Depends(get_current_verified_user),
    upload_service: DocumentUploadService = Depends(get_document_upload_service),
):
    """
    Upload a new document for processing.

    - **project_id**: Project ID to associate document with
    - **file**: Document file (PDF, images, Office documents)

    Returns the created document information.
    """
    try:
        # Upload document
        document = await upload_service.upload_document(
            file=file.file,
            filename=file.filename,
            project_id=project_id,
            user_id=str(current_user.id),
            mime_type=file.content_type,
        )

        return success_response(
            data={
                "document_id": str(document.id),
                "filename": document.original_filename,
                "file_size": document.file_size,
                "mime_type": document.file_type,  # Document model uses file_type, not mime_type
                "status": document.status,
                "created_at": document.created_at,
            },
            message="Document uploaded successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except FileProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )


@router.post("/{document_id}/process", status_code=status.HTTP_202_ACCEPTED)
async def process_document(
    document_id: str = Path(..., description="Document ID"),
    extraction_config: Optional[ExtractionConfig] = Body(
        None, description="OCR extraction configuration (validated for security)"
    ),
    priority: Optional[str] = Body(
        "normal", description="Processing priority (low, normal, high)"
    ),
    current_user: User = Depends(get_current_verified_user),
    processing_service: DocumentProcessingService = Depends(
        get_document_processing_service
    ),
    ocr_service: OCROrchestrator = Depends(get_ocr_orchestrator),
    notification_service: WebSocketNotificationService = Depends(
        get_websocket_notification_service
    ),
    _: bool = Depends(verify_document_ownership),
):
    """
    Start processing a document.

    - **document_id**: ID of document to process
    - **extraction_config**: Optional extraction configuration (validated against whitelist)
    - **priority**: Processing priority (low, normal, high)

    Triggers OCR and data extraction. Processing happens asynchronously.
    """
    try:
        # Mark document as processing
        document = await processing_service.start_processing(document_id)

        # Notify via WebSocket
        await notification_service.notify_document_status_change(
            document_id=document_id,
            status="processing",
            user_id=str(current_user.id),
        )

        # Trigger Celery task for actual OCR processing
        from app.tasks.document.ocr import process_document_ocr

        # Convert ExtractionConfig to dict if provided
        config_dict = extraction_config.model_dump() if extraction_config else None

        task = process_document_ocr.delay(
            document_id=document_id,
            extraction_config=config_dict,
        )

        return success_response(
            data={
                "document_id": document_id,
                "task_id": task.id,
                "status": document.status,
                "message": "Document processing started",
            },
            message="Processing started successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.get("/{document_id}")
async def get_document(
    document_id: str = Path(..., description="Document ID"),
    current_user: User = Depends(get_current_verified_user),
    processing_service: DocumentProcessingService = Depends(
        get_document_processing_service
    ),
    _: bool = Depends(verify_document_ownership),
):
    """
    Get document information and processing status.

    - **document_id**: ID of document to retrieve

    Returns document metadata, status, and extraction results if available.
    """
    try:
        status_info = await processing_service.get_processing_status(document_id)

        return success_response(data=status_info)

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.get("")
async def list_documents(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_verified_user),
    processing_service: DocumentProcessingService = Depends(
        get_document_processing_service
    ),
    document_repository: DocumentRepository = Depends(get_document_repository),
):
    """
    List documents with optional filtering.

    - **project_id**: Optional project ID filter
    - **status_filter**: Optional status filter (pending, processing, completed, failed)
    - **page**: Page number (default: 1)
    - **per_page**: Items per page (default: 20)

    Returns paginated list of documents.
    """
    try:
        if project_id:
            # Get documents for specific project
            documents = await processing_service.get_project_documents(
                project_id=project_id,
                status=status_filter,
                skip=pagination.get_skip(),
                limit=pagination.get_limit(),
            )
        else:
            # Get documents by status or all user documents
            documents = await processing_service.get_user_documents(
                user_id=str(current_user.id),
                skip=pagination.get_skip(),
                limit=pagination.get_limit(),
                status=status_filter,
            )

        # Convert to response format
        document_list = [
            {
                "document_id": str(doc.id),
                "filename": doc.original_filename,
                "file_size": doc.file_size,
                "mime_type": doc.file_type,  # Document model uses file_type
                "status": doc.status,
                "created_at": doc.created_at,
                "completed_at": doc.processing_completed_at,  # Model uses processing_completed_at
            }
            for doc in documents
        ]

        # Get actual total count from repository
        if project_id:
            total = await document_repository.count_by_project(project_id)
        else:
            total = await document_repository.count_by_user(str(current_user.id))

        return paginated_response(
            items=document_list,
            total=total,
            page=pagination.page,
            per_page=pagination.per_page,
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str = Path(..., description="Document ID"),
    current_user: User = Depends(get_current_verified_user),
    upload_service: DocumentUploadService = Depends(get_document_upload_service),
    _: bool = Depends(verify_document_ownership),
):
    """
    Delete a document and its associated file.

    - **document_id**: ID of document to delete

    Permanently removes document and file from storage.
    """
    try:
        await upload_service.delete_file(document_id)
        return None

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )
    except FileProcessingError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )


@router.post("/{document_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_failed_document(
    document_id: str = Path(..., description="Document ID"),
    current_user: User = Depends(get_current_verified_user),
    processing_service: DocumentProcessingService = Depends(
        get_document_processing_service
    ),
    notification_service: WebSocketNotificationService = Depends(
        get_websocket_notification_service
    ),
    _: bool = Depends(verify_document_ownership),
):
    """
    Retry processing a failed or stuck document.

    - **document_id**: ID of failed or stuck processing document

    Resets document status to pending and triggers reprocessing.
    For stuck documents (processing > 10 minutes), allows retry.
    """
    try:
        # Reset document status
        document = await processing_service.retry_failed_document(document_id)

        # Mark as processing
        await processing_service.start_processing(document_id)

        # Notify via WebSocket
        await notification_service.notify_document_status_change(
            document_id=document_id,
            status="processing",
            user_id=str(current_user.id),
        )

        # Trigger Celery task for actual OCR processing
        from app.tasks.document.ocr import process_document_ocr

        task = process_document_ocr.delay(
            document_id=document_id,
            extraction_config=None,
        )

        return success_response(
            data={
                "document_id": document_id,
                "task_id": task.id,
                "status": "processing",
            },
            message="Document queued for retry",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.post("/{document_id}/cancel")
async def cancel_processing(
    document_id: str = Path(..., description="Document ID"),
    current_user: User = Depends(get_current_verified_user),
    processing_service: DocumentProcessingService = Depends(
        get_document_processing_service
    ),
    _: bool = Depends(verify_document_ownership),
):
    """
    Cancel document processing.

    - **document_id**: ID of document to cancel

    Cancels ongoing processing and marks document as cancelled.
    """
    try:
        document = await processing_service.cancel_processing(document_id)

        return success_response(
            data={
                "document_id": document_id,
                "status": document.status,
            },
            message="Processing cancelled",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.get("/{document_id}/export")
async def export_document(
    document_id: str = Path(..., description="Document ID"),
    export_format: ExportFormat = Query(
        ExportFormat.JSON, description="Export format (enum-validated for security)"
    ),
    include_metadata: bool = Query(True, description="Include document metadata"),
    include_content: bool = Query(True, description="Include document content"),
    current_user: User = Depends(get_current_verified_user),
    export_service: DocumentExportService = Depends(get_document_export_service),
    _: bool = Depends(verify_document_ownership),
):
    """
    Export document extraction results.

    - **document_id**: ID of document to export
    - **export_format**: Format (json, csv, xml, pdf, excel, markdown, html) - enum validated
    - **include_metadata**: Include document metadata
    - **include_content**: Include document content

    Returns file download with extraction results.
    """
    try:
        # Export document
        exported_data = await export_service.export_document(
            document_id=document_id,
            export_format=export_format.value,  # Pass string value to service
            include_metadata=include_metadata,
        )

        # Use enum methods for content type and filename
        content_type = ExportFormat.get_mime_type(export_format)
        file_extension = ExportFormat.get_file_extension(export_format)
        filename = f"document_{document_id}{file_extension}"

        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(exported_data),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.get("/{document_id}/validate-quality")
async def validate_extraction_quality(
    document_id: str = Path(..., description="Document ID"),
    minimum_confidence: float = Query(
        0.75, ge=0.0, le=1.0, description="Minimum confidence threshold"
    ),
    current_user: User = Depends(get_current_verified_user),
    processing_service: DocumentProcessingService = Depends(
        get_document_processing_service
    ),
    _: bool = Depends(verify_document_ownership),
):
    """
    Validate extraction quality against confidence threshold.

    - **document_id**: ID of document to validate
    - **minimum_confidence**: Minimum acceptable confidence (0.0-1.0)

    Returns quality validation results with confidence scores.
    """
    try:
        validation_result = await processing_service.validate_extraction_quality(
            document_id=document_id,
            minimum_confidence=minimum_confidence,
        )

        return success_response(data=validation_result)

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.post("/{document_id}/confirm", status_code=status.HTTP_200_OK)
async def confirm_document_extraction(
    document_id: str = Path(..., description="Document ID"),
    data: DocumentConfirmRequest = Body(
        ..., description="Confirmation data with user-corrected OCR results"
    ),
    current_user: User = Depends(get_current_verified_user),
    document_repo: DocumentRepository = Depends(get_document_repository),
    _: bool = Depends(verify_document_ownership),
):
    """
    Confirm OCR extraction results with optional user corrections.

    - **document_id**: ID of document to confirm
    - **data**: Confirmation data including corrected OCR results

    Updates document status to 'confirmed' and saves user-corrected data.
    This endpoint should be called after user reviews and confirms the
    extracted data in the Confirmation Tab.

    **Requirements**:
    - Document must be in 'completed' status (OCR processing finished)
    - User must own the document (verified by dependency)

    **Updates**:
    - Sets `user_corrected_data` to the confirmed OCR data
    - Sets `confirmed_at` timestamp
    - Sets `confirmed_by` to current user ID
    - Updates `status` to 'confirmed'

    Returns the updated document information.
    """
    try:
        # 1. Get document (ownership already verified by dependency)
        document = await document_repo.get_by_id(document_id)
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found",
            )

        # 2. Validate document status
        if document.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot confirm document in '{document.status}' status. "
                "Document must be 'completed' first (OCR processing must finish).",
            )

        # 3. Check if already confirmed
        if document.is_confirmed():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Document already confirmed at {document.confirmed_at}",
            )

        # 4. Update document with confirmation data
        update_data = {
            "status": "confirmed",
            "user_corrected_data": data.ocr_data,
            "confirmed_at": datetime.utcnow(),
            "confirmed_by": current_user.id,
        }

        updated_document = await document_repo.update(document_id, update_data)

        # 5. Log field changes if provided (for audit trail)
        if data.field_changes:
            change_count = len(data.field_changes)
            logger.info(
                f"Document {document_id} confirmed by user {current_user.id} "
                f"with {change_count} field changes"
            )

        return success_response(
            data={
                "document_id": str(updated_document.id),
                "status": updated_document.status,
                "confirmed_at": (
                    updated_document.confirmed_at.isoformat()
                    if updated_document.confirmed_at
                    else None
                ),
                "confirmed_by": (
                    str(updated_document.confirmed_by)
                    if updated_document.confirmed_by
                    else None
                ),
                "has_corrections": data.ocr_data != document.extracted_data,
                "field_changes_count": (
                    len(data.field_changes) if data.field_changes else 0
                ),
            },
            message="Document confirmed successfully",
        )

    except HTTPException:
        # Re-raise HTTP exceptions (validation errors, not found, etc.)
        raise
    except Exception as e:
        logger.error(
            f"Error confirming document {document_id}: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm document: {str(e)}",
        )


@router.get("/{document_id}/file/preview")
async def preview_document_file(
    document_id: str = Path(..., description="Document ID"),
    current_user: User = Depends(get_current_verified_user),
    upload_service: DocumentUploadService = Depends(get_document_upload_service),
    document_repository: DocumentRepository = Depends(get_document_repository),
    _: bool = Depends(verify_document_ownership),
):
    """
    Preview document file inline in browser.

    - **document_id**: ID of document to preview

    Returns the file with Content-Disposition: inline for browser preview.
    """
    document = await document_repository.get_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        file_content = await upload_service.get_file_content(document_id)
    except FileProcessingError:
        raise HTTPException(status_code=404, detail="File not found in storage")

    return StreamingResponse(
        io.BytesIO(file_content),
        media_type=document.file_type,
        headers={
            "Content-Disposition": f'inline; filename="{document.original_filename}"',
            "Content-Length": str(len(file_content)),
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.get("/{document_id}/file/download")
async def download_document_file(
    document_id: str = Path(..., description="Document ID"),
    current_user: User = Depends(get_current_verified_user),
    upload_service: DocumentUploadService = Depends(get_document_upload_service),
    document_repository: DocumentRepository = Depends(get_document_repository),
    _: bool = Depends(verify_document_ownership),
):
    """
    Download document file as attachment.

    - **document_id**: ID of document to download

    Returns the file with Content-Disposition: attachment for browser download.
    """
    document = await document_repository.get_by_id(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        file_content = await upload_service.get_file_content(document_id)
    except FileProcessingError:
        raise HTTPException(status_code=404, detail="File not found in storage")

    safe_filename = document.original_filename.encode("ascii", "ignore").decode()

    return StreamingResponse(
        io.BytesIO(file_content),
        media_type=document.file_type,
        headers={
            "Content-Disposition": f"attachment; filename=\"{safe_filename}\"; filename*=UTF-8''{document.original_filename}",
            "Content-Length": str(len(file_content)),
        },
    )

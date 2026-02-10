"""
Data Source API Endpoints

REST API endpoints for data source management within knowledge bases.
Phase 1 - Knowledge Base Feature (Week 2-3)
Unified Knowledge: structured_data upload support
"""

import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, status, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.db.models.user import User
from app.db.repositories.knowledge_base import KnowledgeBaseRepository, DataSourceRepository
from app.schemas.data_source import (
    DataSourceCreate,
    DataSourceUpdate,
    DataSourceResponse,
    DataSourceListResponse,
    CrawlStatusResponse,
)
from app.core.exceptions import DatabaseError

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/knowledge-bases/{kb_id}/data-sources",
    response_model=DataSourceListResponse,
    status_code=status.HTTP_200_OK,
    summary="List data sources for knowledge base",
    description="Get all data sources for a specific knowledge base with pagination.",
)
async def list_data_sources(
    kb_id: uuid.UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceListResponse:
    """
    List all data sources for a knowledge base.

    Args:
        kb_id: Knowledge base UUID
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
        current_user: Authenticated user
        db: Database session

    Returns:
        List of data sources with counts

    Raises:
        HTTPException 404: Knowledge base not found
        HTTPException 403: User does not own this knowledge base
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)

        # Verify KB exists and user owns it
        kb = await kb_repo.get_by_id(kb_id)

        if not kb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge base not found",
            )

        if kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this knowledge base",
            )

        # Get data sources with counts
        data_sources = await ds_repo.list_by_kb(
            kb_id=kb_id,
            skip=skip,
            limit=limit,
        )

        # Convert to response format
        items = [
            DataSourceResponse(
                id=ds.id,
                knowledge_base_id=ds.knowledge_base_id,
                type=ds.type,
                name=ds.name,
                config=ds.config,
                status=ds.status,
                error_message=ds.error_message,
                document_count=getattr(ds, "document_count", 0),
                embedding_count=getattr(ds, "embedding_count", 0),
                last_synced_at=ds.last_synced_at,
                created_at=ds.created_at,
                updated_at=ds.updated_at,
            )
            for ds in data_sources
        ]

        # Get total count
        total = await ds_repo.count({"knowledge_base_id": kb_id})

        return DataSourceListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=skip,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list data sources: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post(
    "/data-sources",
    response_model=DataSourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create data source",
    description="Create a new data source for a knowledge base. Supports 4 types: uploaded_docs, website, text, qa_pairs.",
)
async def create_data_source(
    data: DataSourceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceResponse:
    """
    Create a new data source.

    Supports 4 types:
    - uploaded_docs: Document upload source
    - website: Web crawler source
    - text: Direct text input source
    - qa_pairs: Question-answer pairs source

    Args:
        data: Data source creation data
        current_user: Authenticated user
        db: Database session

    Returns:
        Created data source

    Raises:
        HTTPException 404: Knowledge base not found
        HTTPException 403: User does not own this knowledge base
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)

        # Verify KB exists and user owns it
        kb = await kb_repo.get_by_id(data.knowledge_base_id)

        if not kb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge base not found",
            )

        if kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this knowledge base",
            )

        # Create data source
        ds_data = {
            "knowledge_base_id": data.knowledge_base_id,
            "type": data.type,
            "name": data.name,
            "config": data.config or {},
            "status": "active",
        }

        ds = await ds_repo.create(ds_data)
        await db.commit()
        await db.refresh(ds)

        # Auto-trigger embedding generation for types with immediate content
        if data.type in ("text", "qa_pairs"):
            try:
                from app.tasks.knowledge_base import generate_embeddings_task
                generate_embeddings_task.delay(str(ds.id))
                logger.info(f"Auto-triggered embedding generation for {data.type} data source {ds.id}")
            except Exception as e:
                logger.warning(f"Failed to auto-trigger embeddings for data source {ds.id}: {e}")

        # Set counts to 0 for new data source
        ds.document_count = 0
        ds.embedding_count = 0

        return DataSourceResponse(
            id=ds.id,
            knowledge_base_id=ds.knowledge_base_id,
            type=ds.type,
            name=ds.name,
            config=ds.config,
            status=ds.status,
            error_message=ds.error_message,
            document_count=0,
            embedding_count=0,
            last_synced_at=ds.last_synced_at,
            created_at=ds.created_at,
            updated_at=ds.updated_at,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create data source: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post(
    "/knowledge-bases/{kb_id}/data-sources/{ds_id}/upload",
    status_code=status.HTTP_200_OK,
    summary="Upload documents to data source",
    description="Upload document files to an uploaded_docs data source.",
)
async def upload_documents_to_data_source(
    kb_id: uuid.UUID,
    ds_id: uuid.UUID,
    files: list[UploadFile] = File(..., description="Document files to upload"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Upload documents to an uploaded_docs data source.

    Args:
        kb_id: Knowledge base UUID
        ds_id: Data source UUID
        files: List of files to upload
        current_user: Authenticated user
        db: Database session

    Returns:
        Dictionary with document_ids array

    Raises:
        HTTPException 404: Knowledge base or data source not found
        HTTPException 403: User does not own this knowledge base
        HTTPException 400: Invalid file type or data source type
        HTTPException 500: Upload or processing error
    """
    try:
        from app.services.storage.factory import get_storage_service
        from app.db.models.document import Document
        from app.tasks.knowledge_base import generate_embeddings_task
        import hashlib
        from pathlib import Path

        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)

        # Verify KB exists and user owns it
        kb = await kb_repo.get_by_id(kb_id)
        if not kb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge base not found",
            )

        if kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this knowledge base",
            )

        # Verify data source exists and is uploaded_docs type
        ds = await ds_repo.get_by_id(ds_id)
        if not ds or ds.knowledge_base_id != kb_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data source not found",
            )

        if ds.type != "uploaded_docs":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This endpoint only supports uploaded_docs data sources",
            )

        # Get storage service
        storage_service = get_storage_service()

        # Process each file
        document_ids = []
        for file in files:
            # Read file content
            content = await file.read()

            # Calculate file hash
            file_hash = hashlib.sha256(content).hexdigest()

            # Determine file path
            file_extension = Path(file.filename).suffix
            file_path = f"knowledge_bases/{kb_id}/data_sources/{ds_id}/{uuid.uuid4()}{file_extension}"

            # Save file to storage
            saved_path = await storage_service.save_file(content, file_path)

            # Extract text content from uploaded file
            extracted_text = None
            file_extension = Path(file.filename).suffix.lower()

            try:
                if file_extension == ".pdf":
                    import io
                    from PyPDF2 import PdfReader
                    pdf_reader = PdfReader(io.BytesIO(content))
                    text_parts = []
                    for page in pdf_reader.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                    extracted_text = "\n\n".join(text_parts) if text_parts else None
                elif file_extension in (".txt", ".md", ".csv", ".json", ".xml", ".html"):
                    extracted_text = content.decode("utf-8", errors="replace")
            except Exception as text_err:
                logger.warning(f"Failed to extract text from {file.filename}: {text_err}")

            # Create document record
            document = Document(
                id=uuid.uuid4(),
                user_id=current_user.id,
                project_id=None,  # KB documents don't belong to projects
                title=file.filename,
                description=f"Uploaded to knowledge base data source",
                original_filename=file.filename,
                file_path=saved_path,
                file_type=file.content_type or "application/octet-stream",
                file_size=len(content),
                file_hash=file_hash,
                extracted_text=extracted_text,
                status="completed",  # KB docs don't need OCR processing
            )

            db.add(document)
            await db.flush()  # Flush to get document ID

            document_ids.append(str(document.id))

        # Update data source config with document IDs
        current_config = ds.config or {}
        existing_doc_ids = current_config.get("document_ids", [])
        updated_doc_ids = existing_doc_ids + document_ids

        ds.config = {**current_config, "document_ids": updated_doc_ids}

        await db.commit()

        # Trigger KB embedding generation AFTER commit (avoids race condition)
        try:
            generate_embeddings_task.delay(str(ds.id))
            logger.info(f"Triggered embedding generation for data source {ds.id}")
        except Exception as e:
            logger.warning(f"Failed to trigger embedding generation for data source {ds.id}: {e}")

        return {
            "document_ids": document_ids,
            "message": f"Successfully uploaded {len(document_ids)} documents",
        }

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to upload documents: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload documents: {str(e)}",
        )


@router.get(
    "/data-sources/{ds_id}",
    response_model=DataSourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get data source",
    description="Get a specific data source by ID.",
)
async def get_data_source(
    ds_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceResponse:
    """
    Get a specific data source by ID.

    Args:
        ds_id: Data source UUID
        current_user: Authenticated user
        db: Database session

    Returns:
        Data source details with counts

    Raises:
        HTTPException 404: Data source not found
        HTTPException 403: User does not own this data source
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)

        # Get data source with embedding count
        ds = await ds_repo.get_by_id_with_embeddings_count(ds_id)

        if not ds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data source not found",
            )

        # Verify ownership through knowledge base
        kb = await kb_repo.get_by_id(ds.knowledge_base_id)
        if not kb or kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this data source",
            )

        return DataSourceResponse(
            id=ds.id,
            knowledge_base_id=ds.knowledge_base_id,
            type=ds.type,
            name=ds.name,
            config=ds.config,
            status=ds.status,
            error_message=ds.error_message,
            document_count=getattr(ds, "document_count", 0),
            embedding_count=getattr(ds, "embedding_count", 0),
            last_synced_at=ds.last_synced_at,
            created_at=ds.created_at,
            updated_at=ds.updated_at,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve data source: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.patch(
    "/data-sources/{ds_id}",
    response_model=DataSourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update data source",
    description="Update data source name, config, status, or error message.",
)
async def update_data_source(
    ds_id: uuid.UUID,
    data: DataSourceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DataSourceResponse:
    """
    Update a data source.

    Args:
        ds_id: Data source UUID
        data: Update data
        current_user: Authenticated user
        db: Database session

    Returns:
        Updated data source

    Raises:
        HTTPException 404: Data source not found
        HTTPException 403: User does not own this data source
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)

        # Verify existence and ownership
        ds = await ds_repo.get_by_id(ds_id)

        if not ds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data source not found",
            )

        # Verify ownership through knowledge base
        kb = await kb_repo.get_by_id(ds.knowledge_base_id)
        if not kb or kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this data source",
            )

        # Build update dict (only include non-None values)
        update_data = {}
        if data.name is not None:
            update_data["name"] = data.name
        if data.config is not None:
            update_data["config"] = data.config
        if data.status is not None:
            update_data["status"] = data.status
        if data.error_message is not None:
            update_data["error_message"] = data.error_message

        # Update data source
        updated_ds = await ds_repo.update(ds_id, update_data)
        await db.commit()

        if not updated_ds:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update data source",
            )

        # Refresh to get updated data with counts
        updated_ds = await ds_repo.get_by_id_with_embeddings_count(ds_id)

        return DataSourceResponse(
            id=updated_ds.id,
            knowledge_base_id=updated_ds.knowledge_base_id,
            type=updated_ds.type,
            name=updated_ds.name,
            config=updated_ds.config,
            status=updated_ds.status,
            error_message=updated_ds.error_message,
            document_count=getattr(updated_ds, "document_count", 0),
            embedding_count=getattr(updated_ds, "embedding_count", 0),
            last_synced_at=updated_ds.last_synced_at,
            created_at=updated_ds.created_at,
            updated_at=updated_ds.updated_at,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update data source: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.delete(
    "/data-sources/{ds_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete data source",
    description="Delete a data source and all associated embeddings (cascade delete).",
)
async def delete_data_source(
    ds_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a data source.

    Cascade delete will remove:
    - All embeddings associated with this data source

    Args:
        ds_id: Data source UUID
        current_user: Authenticated user
        db: Database session

    Returns:
        None (204 No Content on success)

    Raises:
        HTTPException 404: Data source not found
        HTTPException 403: User does not own this data source
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)

        # Verify existence and ownership
        ds = await ds_repo.get_by_id(ds_id)

        if not ds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data source not found",
            )

        # Verify ownership through knowledge base
        kb = await kb_repo.get_by_id(ds.knowledge_base_id)
        if not kb or kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this data source",
            )

        # Delete data source (cascade will handle embeddings)
        await ds_repo.delete(ds_id)
        await db.commit()

    except HTTPException:
        raise
    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete data source: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post(
    "/data-sources/{ds_id}/crawl",
    response_model=CrawlStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger website crawl",
    description="Trigger a Celery task to crawl a website data source (type='website' only).",
)
async def trigger_crawl(
    ds_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CrawlStatusResponse:
    """
    Trigger website crawl for a data source.

    Only works for data sources with type='website'.
    Starts a background Celery task to crawl the website.

    Args:
        ds_id: Data source UUID
        current_user: Authenticated user
        db: Database session

    Returns:
        Crawl status with task ID

    Raises:
        HTTPException 404: Data source not found
        HTTPException 403: User does not own this data source
        HTTPException 400: Data source is not a website type
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)

        # Verify existence and ownership
        ds = await ds_repo.get_by_id(ds_id)

        if not ds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data source not found",
            )

        # Verify ownership through knowledge base
        kb = await kb_repo.get_by_id(ds.knowledge_base_id)
        if not kb or kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this data source",
            )

        # Verify it's a website type
        if ds.type != "website":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crawl operation only supported for website data sources",
            )

        # Update status to syncing
        await ds_repo.update_status(ds_id, "syncing")
        await db.commit()

        # Trigger Celery task for website crawling
        from app.tasks.knowledge_base import crawl_website_task
        task = crawl_website_task.delay(str(ds_id))
        task_id = task.id

        return CrawlStatusResponse(
            task_id=task_id,
            status="pending",
            pages_crawled=0,
            total_pages=None,
            error=None,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger crawl: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get(
    "/data-sources/{ds_id}/crawl-status",
    response_model=CrawlStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get crawl status",
    description="Get the status of a website crawl task (polling fallback if WebSocket not ready).",
)
async def get_crawl_status(
    ds_id: uuid.UUID,
    task_id: Optional[str] = Query(None, description="Celery task ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CrawlStatusResponse:
    """
    Get crawl status for a data source.

    Polling fallback for WebSocket-based real-time updates.
    Returns: pages_crawled, total_pages, status.

    Args:
        ds_id: Data source UUID
        task_id: Optional Celery task ID
        current_user: Authenticated user
        db: Database session

    Returns:
        Crawl status

    Raises:
        HTTPException 404: Data source not found
        HTTPException 403: User does not own this data source
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)

        # Verify existence and ownership
        ds = await ds_repo.get_by_id(ds_id)

        if not ds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Data source not found",
            )

        # Verify ownership through knowledge base
        kb = await kb_repo.get_by_id(ds.knowledge_base_id)
        if not kb or kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this data source",
            )

        # Check Celery task status
        from app.tasks.celery_app import celery_app

        if task_id:
            task_result = celery_app.AsyncResult(task_id)
            task_status = task_result.state
            task_info = task_result.info or {}

            # Map Celery states to our status
            if task_status == "PENDING":
                status_value = "pending"
            elif task_status == "PROGRESS":
                status_value = "syncing"
            elif task_status == "SUCCESS":
                status_value = "completed"
            elif task_status == "FAILURE":
                status_value = "error"
            else:
                status_value = task_status.lower()

            pages_crawled = task_info.get("pages_crawled", 0) if isinstance(task_info, dict) else 0
            total_pages = task_info.get("total_pages") if isinstance(task_info, dict) else None
            error = task_info.get("error") if isinstance(task_info, dict) else None
        else:
            # Use data source status if no task_id provided
            status_value = ds.status
            pages_crawled = ds.document_count or 0
            total_pages = ds.config.get("max_pages", 100) if ds.config else None
            error = ds.error_message

        return CrawlStatusResponse(
            task_id=task_id or f"status-{ds_id}",
            status=status_value,
            pages_crawled=pages_crawled,
            total_pages=total_pages,
            error=error,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve crawl status: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


# ===========================
# Structured Data Upload
# ===========================


@router.post(
    "/knowledge-bases/{kb_id}/data-sources/upload-structured",
    response_model=DataSourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload structured data file as a data source",
    description="Upload a CSV or XLSX file to create a structured_data data source for analytics queries.",
)
async def upload_structured_data(
    kb_id: uuid.UUID,
    file: UploadFile = File(..., description="CSV or XLSX file"),
    name: Optional[str] = Query(None, description="Data source name (defaults to filename)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a structured data file (CSV/XLSX) as a knowledge base data source."""
    try:
        # Verify knowledge base exists and belongs to user
        kb_repo = KnowledgeBaseRepository(db)
        kb = await kb_repo.get_by_id(kb_id)
        if not kb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Knowledge base {kb_id} not found",
            )
        if str(kb.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this knowledge base",
            )

        # Validate file type
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must have a filename",
            )
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ("csv", "xlsx", "xls"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only CSV and XLSX files are supported",
            )

        # Read file content
        file_content = await file.read()
        max_size = 50 * 1024 * 1024  # 50MB limit
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds 50MB limit",
            )

        # Use DatasetService to process the file
        from app.services.insights.dataset_service import DatasetService

        dataset_service = DatasetService(db)
        ds_name = name or file.filename.rsplit(".", 1)[0]

        dataset_id, schema_def = await dataset_service.upload_dataset(
            user_id=current_user.id,
            file_content=file_content,
            filename=file.filename,
            name=ds_name,
        )

        # Get the created dataset for file info
        dataset = await dataset_service.dataset_repo.get_by_id(dataset_id)

        # Build data source config with schema and file info
        config = {
            "dataset_id": str(dataset_id),
            "schema_definition": {
                "columns": [
                    {
                        "name": col.name,
                        "dtype": col.dtype if isinstance(col.dtype, str) else col.dtype.value,
                        "aliases": col.aliases or [],
                        "description": col.description or "",
                        "is_metric": col.is_metric or False,
                        "is_dimension": col.is_dimension or False,
                        "default_agg": col.default_agg.value if col.default_agg else None,
                        "sample_values": col.sample_values or [],
                    }
                    for col in schema_def.columns
                ]
            },
            "file_info": {
                "filename": file.filename,
                "size": len(file_content),
                "row_count": dataset.row_count if dataset else 0,
                "column_count": len(schema_def.columns),
            },
        }
        if dataset and dataset.parquet_path:
            config["parquet_path"] = dataset.parquet_path

        # Create the data source record
        ds_repo = DataSourceRepository(db)
        ds = await ds_repo.create(
            knowledge_base_id=kb_id,
            type="structured_data",
            name=ds_name,
            config=config,
            status="active",
        )

        logger.info(
            f"Created structured_data source {ds.id} for KB {kb_id} "
            f"(dataset={dataset_id}, columns={len(schema_def.columns)})"
        )

        # Auto-trigger embedding generation for structured data
        try:
            from app.tasks.knowledge_base import generate_embeddings_task
            generate_embeddings_task.delay(str(ds.id))
            logger.info(f"Auto-triggered embedding generation for structured_data source {ds.id}")
        except Exception as e:
            logger.warning(f"Failed to auto-trigger embeddings for structured_data source {ds.id}: {e}")

        return DataSourceResponse(
            id=ds.id,
            knowledge_base_id=ds.knowledge_base_id,
            type=ds.type,
            name=ds.name,
            config=ds.config or {},
            status=ds.status,
            error_message=ds.error_message,
            document_count=ds.document_count or 0,
            embedding_count=ds.embedding_count or 0,
            last_synced_at=str(ds.last_synced_at) if ds.last_synced_at else None,
            created_at=ds.created_at,
            updated_at=ds.updated_at,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload structured data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload structured data: {str(e)}",
        )

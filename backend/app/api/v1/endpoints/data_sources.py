"""
Data Source API Endpoints

REST API endpoints for data source management within knowledge bases.
Phase 1 - Knowledge Base Feature (Week 2-3)
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
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

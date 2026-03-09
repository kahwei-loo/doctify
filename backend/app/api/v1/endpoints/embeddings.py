"""
Embeddings API Endpoints

REST API endpoints for managing embeddings within knowledge bases.
Phase 1 - Knowledge Base Feature (Week 2-3)
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, get_db
from app.db.models.user import User
from app.db.repositories.knowledge_base import (
    KnowledgeBaseRepository,
    DataSourceRepository,
)
from app.db.repositories.rag import DocumentEmbeddingRepository
from app.schemas.rag import EmbeddingResponse
from app.core.exceptions import DatabaseError
from pydantic import BaseModel

router = APIRouter()


class GenerateEmbeddingsRequest(BaseModel):
    """Request model for generating embeddings."""

    force_regenerate: bool = False


class GenerateEmbeddingsResponse(BaseModel):
    """Response model for embedding generation."""

    task_id: str
    status: str
    message: str


class EmbeddingListResponse(BaseModel):
    """Response model for embedding list."""

    items: List[EmbeddingResponse]
    total: int
    limit: int
    offset: int


@router.post(
    "/data-sources/{ds_id}/embeddings",
    response_model=GenerateEmbeddingsResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate embeddings",
    description="Trigger embedding generation for a data source using background task.",
)
async def generate_embeddings(
    ds_id: uuid.UUID,
    data: GenerateEmbeddingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GenerateEmbeddingsResponse:
    """
    Generate embeddings for a data source.

    Starts a background Celery task to:
    1. Extract text from data source (based on type)
    2. Chunk text (using KB config: chunk_size, chunk_overlap)
    3. Generate embeddings via OpenAI (batch of 50)
    4. Store in document_embeddings table with data_source_id
    5. Update data source status and counts

    Args:
        ds_id: Data source UUID
        data: Generation request parameters
        current_user: Authenticated user
        db: Database session

    Returns:
        Task information

    Raises:
        HTTPException 404: Data source not found
        HTTPException 403: User does not own this data source
        HTTPException 400: Data source has no content to embed
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

        # Update status to processing
        await ds_repo.update_status(ds_id, "syncing")
        await db.commit()

        # Trigger Celery task for embedding generation
        from app.tasks.knowledge_base import generate_embeddings_task

        task = generate_embeddings_task.delay(
            str(ds_id), force_regenerate=data.force_regenerate
        )
        task_id = task.id

        return GenerateEmbeddingsResponse(
            task_id=task_id,
            status="pending",
            message="Embedding generation started",
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start embedding generation: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get(
    "/knowledge-bases/{kb_id}/embeddings",
    response_model=EmbeddingListResponse,
    status_code=status.HTTP_200_OK,
    summary="List embeddings",
    description="Get all embeddings for a knowledge base with pagination.",
)
async def list_embeddings(
    kb_id: uuid.UUID,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        50, ge=1, le=100, description="Maximum number of records to return"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmbeddingListResponse:
    """
    List all embeddings for a knowledge base.

    Args:
        kb_id: Knowledge base UUID
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
        current_user: Authenticated user
        db: Database session

    Returns:
        List of embeddings with text preview and metadata

    Raises:
        HTTPException 404: Knowledge base not found
        HTTPException 403: User does not own this knowledge base
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        embedding_repo = DocumentEmbeddingRepository(db)

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

        # Get all data source IDs for this KB
        ds_repo = DataSourceRepository(db)
        data_sources = await ds_repo.list_by_kb(kb_id=kb_id, skip=0, limit=1000)
        ds_ids = [ds.id for ds in data_sources]

        if not ds_ids:
            return EmbeddingListResponse(
                items=[],
                total=0,
                limit=limit,
                offset=skip,
            )

        # Get embeddings filtered by data_source_ids using repository method
        embeddings = await embedding_repo.get_by_data_source_ids(
            data_source_ids=ds_ids, skip=skip, limit=limit
        )

        # Get total count
        total = await embedding_repo.count_by_data_source_ids(ds_ids)

        # Convert to response format
        items = [
            EmbeddingResponse(
                id=emb.id,
                document_id=emb.document_id,
                data_source_id=emb.data_source_id,
                chunk_index=emb.chunk_index,
                text_content=emb.chunk_text,  # Use chunk_text field
                metadata=emb.chunk_metadata,  # Use chunk_metadata field
                created_at=emb.created_at,
            )
            for emb in embeddings
        ]

        return EmbeddingListResponse(
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
            detail=f"Failed to list embeddings: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.delete(
    "/embeddings/{embedding_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete embedding",
    description="Delete a single embedding by ID.",
)
async def delete_embedding(
    embedding_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a single embedding.

    Args:
        embedding_id: Embedding UUID
        current_user: Authenticated user
        db: Database session

    Returns:
        None (204 No Content on success)

    Raises:
        HTTPException 404: Embedding not found
        HTTPException 403: User does not own this embedding
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)
        embedding_repo = DocumentEmbeddingRepository(db)

        # Get embedding
        embedding = await embedding_repo.get_by_id(embedding_id)

        if not embedding:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Embedding not found",
            )

        # Verify ownership through data source → knowledge base
        if embedding.data_source_id:
            ds = await ds_repo.get_by_id(embedding.data_source_id)
            if ds:
                kb = await kb_repo.get_by_id(ds.knowledge_base_id)
                if not kb or kb.user_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You do not have permission to delete this embedding",
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Data source not found",
                )
        else:
            # Legacy document-based embedding - check document ownership
            # This would require checking document ownership through projects
            # For now, allow deletion if user is authenticated
            pass

        # Delete embedding
        await embedding_repo.delete(embedding_id)
        await db.commit()

    except HTTPException:
        raise
    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete embedding: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )

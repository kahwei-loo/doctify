"""
Knowledge Base API Endpoints

REST API endpoints for knowledge base management.
Phase 1 - Knowledge Base Feature (Week 2-3)
"""

import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from app.api.v1.deps import get_current_user, get_db
from app.db.models.user import User
from app.db.repositories.knowledge_base import KnowledgeBaseRepository, DataSourceRepository
from app.db.repositories.rag import DocumentEmbeddingRepository
from app.schemas.knowledge_base import (
    KnowledgeBaseCreate,
    KnowledgeBaseUpdate,
    KnowledgeBaseResponse,
    KnowledgeBaseListResponse,
    KnowledgeBaseStatsResponse,
)
from app.core.exceptions import DatabaseError

router = APIRouter(prefix="/knowledge-bases", tags=["Knowledge Bases"])


@router.get(
    "/stats",
    response_model=KnowledgeBaseStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get knowledge base statistics",
    description="Get overall statistics for the current user's knowledge bases.",
)
async def get_kb_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBaseStatsResponse:
    """
    Get knowledge base statistics for the current user.

    Returns:
        Statistics including total KBs, data sources, embeddings, and processing count

    Raises:
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        stats = await kb_repo.get_stats(current_user.id)

        return KnowledgeBaseStatsResponse(**stats)

    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve stats: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get(
    "",
    response_model=KnowledgeBaseListResponse,
    status_code=status.HTTP_200_OK,
    summary="List knowledge bases",
    description="Get all knowledge bases for the current user with pagination.",
)
async def list_knowledge_bases(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBaseListResponse:
    """
    List all knowledge bases for the current user.

    Args:
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
        current_user: Authenticated user
        db: Database session

    Returns:
        List of knowledge bases with counts

    Raises:
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)

        # Get knowledge bases with counts
        kbs = await kb_repo.get_by_user(
            user_id=current_user.id,
            skip=skip,
            limit=limit,
        )

        # Convert to response format
        items = [
            KnowledgeBaseResponse(
                id=kb.id,
                user_id=kb.user_id,
                name=kb.name,
                description=kb.description,
                config=kb.config,
                status=kb.status,
                data_source_count=getattr(kb, "data_source_count", 0),
                embedding_count=getattr(kb, "embedding_count", 0),
                created_at=kb.created_at,
                updated_at=kb.updated_at,
            )
            for kb in kbs
        ]

        # Get total count
        total = await kb_repo.count({"user_id": current_user.id})

        return KnowledgeBaseListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=skip,
        )

    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list knowledge bases: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post(
    "",
    response_model=KnowledgeBaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create knowledge base",
    description="Create a new knowledge base for the current user.",
)
async def create_knowledge_base(
    data: KnowledgeBaseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBaseResponse:
    """
    Create a new knowledge base.

    Args:
        data: Knowledge base creation data
        current_user: Authenticated user
        db: Database session

    Returns:
        Created knowledge base

    Raises:
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)

        # Set default config if not provided
        config = data.config or {
            "embedding_model": "text-embedding-3-small",
            "embedding_dimensions": 1536,
            "chunk_size": 1024,
            "chunk_overlap": 128,
        }

        # Create knowledge base
        kb_data = {
            "user_id": current_user.id,
            "name": data.name,
            "description": data.description,
            "config": config,
            "status": "active",
        }

        kb = await kb_repo.create(kb_data)
        await db.commit()
        await db.refresh(kb)

        # Set counts to 0 for new KB
        kb.data_source_count = 0
        kb.embedding_count = 0

        return KnowledgeBaseResponse(
            id=kb.id,
            user_id=kb.user_id,
            name=kb.name,
            description=kb.description,
            config=kb.config,
            status=kb.status,
            data_source_count=0,
            embedding_count=0,
            created_at=kb.created_at,
            updated_at=kb.updated_at,
        )

    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create knowledge base: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get(
    "/{kb_id}",
    response_model=KnowledgeBaseResponse,
    status_code=status.HTTP_200_OK,
    summary="Get knowledge base",
    description="Get a specific knowledge base by ID.",
)
async def get_knowledge_base(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBaseResponse:
    """
    Get a specific knowledge base by ID.

    Args:
        kb_id: Knowledge base UUID
        current_user: Authenticated user
        db: Database session

    Returns:
        Knowledge base details with counts

    Raises:
        HTTPException 404: Knowledge base not found
        HTTPException 403: User does not own this knowledge base
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)

        # Get knowledge base with data sources loaded
        kb = await kb_repo.get_by_id_with_sources(kb_id)

        if not kb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge base not found",
            )

        # Verify ownership
        if kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this knowledge base",
            )

        return KnowledgeBaseResponse(
            id=kb.id,
            user_id=kb.user_id,
            name=kb.name,
            description=kb.description,
            config=kb.config,
            status=kb.status,
            data_source_count=getattr(kb, "data_source_count", 0),
            embedding_count=getattr(kb, "embedding_count", 0),
            created_at=kb.created_at,
            updated_at=kb.updated_at,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve knowledge base: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.patch(
    "/{kb_id}",
    response_model=KnowledgeBaseResponse,
    status_code=status.HTTP_200_OK,
    summary="Update knowledge base",
    description="Update knowledge base name, description, config, or status.",
)
async def update_knowledge_base(
    kb_id: uuid.UUID,
    data: KnowledgeBaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KnowledgeBaseResponse:
    """
    Update a knowledge base.

    Args:
        kb_id: Knowledge base UUID
        data: Update data
        current_user: Authenticated user
        db: Database session

    Returns:
        Updated knowledge base

    Raises:
        HTTPException 404: Knowledge base not found
        HTTPException 403: User does not own this knowledge base
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)

        # Verify existence and ownership
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

        # Build update dict (only include non-None values)
        update_data = {}
        if data.name is not None:
            update_data["name"] = data.name
        if data.description is not None:
            update_data["description"] = data.description
        if data.config is not None:
            update_data["config"] = data.config
        if data.status is not None:
            update_data["status"] = data.status

        # Update knowledge base
        updated_kb = await kb_repo.update(kb_id, update_data)
        await db.commit()

        if not updated_kb:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update knowledge base",
            )

        # Refresh to get updated data with counts
        updated_kb = await kb_repo.get_by_id_with_sources(kb_id)

        return KnowledgeBaseResponse(
            id=updated_kb.id,
            user_id=updated_kb.user_id,
            name=updated_kb.name,
            description=updated_kb.description,
            config=updated_kb.config,
            status=updated_kb.status,
            data_source_count=getattr(updated_kb, "data_source_count", 0),
            embedding_count=getattr(updated_kb, "embedding_count", 0),
            created_at=updated_kb.created_at,
            updated_at=updated_kb.updated_at,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update knowledge base: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.delete(
    "/{kb_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete knowledge base",
    description="Delete a knowledge base and all associated data sources and embeddings (cascade delete).",
)
async def delete_knowledge_base(
    kb_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a knowledge base.

    Cascade delete will remove:
    - All data sources
    - All embeddings associated with data sources

    Args:
        kb_id: Knowledge base UUID
        current_user: Authenticated user
        db: Database session

    Returns:
        None (204 No Content on success)

    Raises:
        HTTPException 404: Knowledge base not found
        HTTPException 403: User does not own this knowledge base
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)

        # Verify existence and ownership
        kb = await kb_repo.get_by_id(kb_id)

        if not kb:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Knowledge base not found",
            )

        if kb.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this knowledge base",
            )

        # Delete knowledge base (cascade will handle data sources and embeddings)
        await kb_repo.delete(kb_id)
        await db.commit()

    except HTTPException:
        raise
    except DatabaseError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete knowledge base: {str(e)}",
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


# ===========================
# Test Query Models & Endpoint
# ===========================

class TestQueryRequest(BaseModel):
    """Request model for testing knowledge base queries."""

    query: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Test query string",
        examples=["What is the main topic?"],
    )
    top_k: Optional[int] = Field(
        5,
        ge=1,
        le=20,
        description="Number of results to return",
    )
    similarity_threshold: Optional[float] = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score (0-1)",
    )


class TestQueryResult(BaseModel):
    """Individual test query result."""

    text: str = Field(..., description="Chunk text content")
    similarity: float = Field(..., description="Similarity score (0-1)")
    source_name: str = Field(..., description="Data source name")
    source_type: str = Field(..., description="Data source type")
    chunk_index: int = Field(..., description="Chunk position")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class TestQueryResponse(BaseModel):
    """Response model for test query."""

    results: List[TestQueryResult] = Field(..., description="Search results")
    total_embeddings: int = Field(..., description="Total embeddings searched")
    query_embedding_generated: bool = Field(..., description="Whether query embedding was generated")


@router.post(
    "/{kb_id}/test-query",
    response_model=TestQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Test knowledge base query",
    description="Test semantic search on knowledge base without generating AI answer.",
)
async def test_query(
    kb_id: uuid.UUID,
    data: TestQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TestQueryResponse:
    """
    Test query on knowledge base.

    Performs semantic search on KB embeddings without AI answer generation.
    Useful for testing embedding quality and search relevance.

    Process:
    1. Generate query embedding (OpenAI)
    2. Search embeddings WHERE data_source.kb_id = kb_id
    3. Return top-k results with similarity scores

    Args:
        kb_id: Knowledge base UUID
        data: Query parameters
        current_user: Authenticated user
        db: Database session

    Returns:
        Search results with similarity scores

    Raises:
        HTTPException 404: Knowledge base not found
        HTTPException 403: User does not own this knowledge base
        HTTPException 400: No embeddings found in knowledge base
        HTTPException 500: Database error occurred
    """
    try:
        kb_repo = KnowledgeBaseRepository(db)
        ds_repo = DataSourceRepository(db)
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
        data_sources = await ds_repo.list_by_kb(kb_id=kb_id, skip=0, limit=1000)
        ds_ids = [ds.id for ds in data_sources]

        if not ds_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data sources found in this knowledge base",
            )

        # Create data source lookup dict
        ds_lookup = {ds.id: ds for ds in data_sources}

        # Get total embeddings count for this KB
        total_embeddings = await embedding_repo.count_by_data_source_ids(ds_ids)

        if total_embeddings == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No embeddings found in this knowledge base. Please generate embeddings first.",
            )

        # Generate query embedding using EmbeddingService
        from app.services.rag.embedding_service import EmbeddingService

        embedding_service = EmbeddingService(db)
        query_embedding = await embedding_service.generate_embedding(data.query)

        # Search embeddings by vector similarity
        # Note: search_by_embedding doesn't support data_source_id filtering directly,
        # so we search by document_ids that belong to data sources in this KB
        # For KB search, we need to use document_ids from data sources
        search_results = await embedding_repo.search_by_embedding(
            query_embedding=query_embedding,
            limit=data.top_k,
            similarity_threshold=data.similarity_threshold,
        )

        # Filter results to only include embeddings from this KB's data sources
        results = []
        for embedding, similarity in search_results:
            if embedding.data_source_id and embedding.data_source_id in ds_lookup:
                ds = ds_lookup[embedding.data_source_id]
                results.append(
                    TestQueryResult(
                        text=embedding.chunk_text or "",
                        similarity=round(similarity, 4),
                        source_name=ds.name,
                        source_type=ds.source_type,
                        chunk_index=embedding.chunk_index or 0,
                        metadata=embedding.chunk_metadata,
                    )
                )

        return TestQueryResponse(
            results=results,
            total_embeddings=total_embeddings,
            query_embedding_generated=True,
        )

    except HTTPException:
        raise
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute test query: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )

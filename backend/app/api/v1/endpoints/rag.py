"""
RAG API Endpoints

REST API endpoints for Retrieval Augmented Generation (RAG) system.
Phase 11 - RAG Implementation
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.v1.deps import get_current_user, get_db
from app.db.models.user import User
from app.db.models.rag import RAGQuery, DocumentEmbedding
from app.services.rag.generation_service import GenerationService
from app.db.repositories.rag import RAGQueryRepository
from app.schemas.rag import (
    RAGQueryRequest,
    RAGQueryResponse,
    RAGHistoryResponse,
    RAGHistoryItem,
    RAGFeedbackRequest,
    RAGStatsResponse,
    RAGSource,
)
from app.core.exceptions import ValidationError, DatabaseError

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post(
    "/query",
    response_model=RAGQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask a question about documents",
    description="""
    Query documents using RAG (Retrieval Augmented Generation).

    Workflow:
    1. Retrieve relevant document chunks using semantic search
    2. Generate answer using AI with retrieved context
    3. Save query history for analytics
    4. Return answer with source citations

    The system automatically:
    - Filters documents by user ownership
    - Validates input for prompt injection
    - Sanitizes output for XSS prevention
    - Provides confidence scores
    """,
)
async def query_documents(
    request: RAGQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RAGQueryResponse:
    """
    Query documents using RAG.

    Args:
        request: Query request with question and optional parameters
        current_user: Authenticated user
        db: Database session

    Returns:
        Answer with sources, metadata, and confidence score

    Raises:
        HTTPException 400: Invalid input or prompt injection detected
        HTTPException 500: RAG processing failed
    """
    try:
        # Initialize services
        generation_service = GenerationService(db)
        rag_query_repo = RAGQueryRepository(db)

        # Generate answer using RAG
        rag_response = await generation_service.generate_answer(
            question=request.question,
            top_k=request.top_k or 5,
            similarity_threshold=request.similarity_threshold or 0.5,  # Changed from 0.7
            document_ids=request.document_ids,
            user_id=current_user.id,
            model=request.model,
        )

        # Save to query history
        query_data = {
            "user_id": current_user.id,
            "question": request.question,
            "answer": rag_response.answer,
            "sources": rag_response.sources,
            "model_used": rag_response.model_used,
            "tokens_used": rag_response.tokens_used,
            "confidence_score": rag_response.confidence_score,
        }
        query_record = await rag_query_repo.create(query_data)
        await db.commit()

        # Convert sources to response format
        sources = [
            RAGSource(
                chunk_text=source["chunk_text"],
                document_id=source["document_id"],
                document_name=source["document_name"],
                document_title=source.get("document_title"),
                chunk_index=source["chunk_index"],
                similarity_score=source["similarity_score"],
                metadata=source.get("metadata"),
            )
            for source in rag_response.sources
        ]

        return RAGQueryResponse(
            id=query_record.id,
            question=request.question,
            answer=rag_response.answer,
            sources=sources,
            model_used=rag_response.model_used,
            tokens_used=rag_response.tokens_used,
            confidence_score=rag_response.confidence_score,
            context_used=rag_response.context_used,
            created_at=query_record.created_at,
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except DatabaseError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG processing failed: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get(
    "/history",
    response_model=RAGHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get query history",
    description="Retrieve RAG query history for the current user with pagination support.",
)
async def get_query_history(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RAGHistoryResponse:
    """
    Get RAG query history for current user.

    Args:
        limit: Maximum number of items to return (1-100)
        offset: Number of items to skip for pagination
        current_user: Authenticated user
        db: Database session

    Returns:
        Paginated list of query history items

    Raises:
        HTTPException 400: Invalid pagination parameters
    """
    # Validate pagination parameters
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100",
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Offset must be non-negative",
        )

    try:
        rag_query_repo = RAGQueryRepository(db)

        # Get total count
        count_stmt = select(func.count()).select_from(RAGQuery).where(
            RAGQuery.user_id == current_user.id
        )
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Get paginated queries
        queries = await rag_query_repo.get_by_user_id(
            user_id=current_user.id, limit=limit, offset=offset
        )

        # Convert to response format
        items = []
        for query in queries:
            sources = None
            if query.sources:
                sources = [
                    RAGSource(
                        chunk_text=source["chunk_text"],
                        document_id=source["document_id"],
                        document_name=source["document_name"],
                        document_title=source.get("document_title"),
                        chunk_index=source["chunk_index"],
                        similarity_score=source["similarity_score"],
                        metadata=source.get("metadata"),
                    )
                    for source in query.sources
                ]

            items.append(
                RAGHistoryItem(
                    id=query.id,
                    question=query.question,
                    answer=query.answer,
                    sources=sources,
                    model_used=query.model_used,
                    tokens_used=query.tokens_used,
                    confidence_score=query.confidence_score,
                    feedback_rating=query.feedback_rating,
                    created_at=query.created_at,
                )
            )

        return RAGHistoryResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve history: {str(e)}",
        )


@router.post(
    "/feedback/{query_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Submit query feedback",
    description="Submit user feedback (rating and optional text) for a RAG query.",
)
async def submit_feedback(
    query_id: uuid.UUID,
    request: RAGFeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Submit feedback for a RAG query.

    Args:
        query_id: UUID of the query to rate
        request: Feedback with rating and optional text
        current_user: Authenticated user
        db: Database session

    Raises:
        HTTPException 404: Query not found or user doesn't own it
        HTTPException 500: Failed to save feedback
    """
    try:
        rag_query_repo = RAGQueryRepository(db)

        # Verify query exists and belongs to user
        query = await rag_query_repo.get_by_id(query_id)
        if not query or query.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Query not found",
            )

        # Update feedback
        await rag_query_repo.update_feedback(
            query_id=query_id,
            rating=request.rating,
            feedback_text=request.feedback_text,
        )
        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}",
        )


@router.get(
    "/stats",
    response_model=RAGStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get RAG usage statistics",
    description="Retrieve RAG usage statistics for the current user including query counts and ratings.",
)
async def get_rag_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RAGStatsResponse:
    """
    Get RAG usage statistics for current user.

    Args:
        current_user: Authenticated user
        db: Database session

    Returns:
        Usage statistics including queries, documents, and ratings

    Raises:
        HTTPException 500: Failed to retrieve statistics
    """
    try:
        # Total queries
        queries_count_stmt = select(func.count()).select_from(RAGQuery).where(
            RAGQuery.user_id == current_user.id
        )
        queries_count_result = await db.execute(queries_count_stmt)
        total_queries = queries_count_result.scalar() or 0

        # Average confidence
        avg_confidence_stmt = select(func.avg(RAGQuery.confidence_score)).where(
            RAGQuery.user_id == current_user.id
        )
        avg_confidence_result = await db.execute(avg_confidence_stmt)
        average_confidence = avg_confidence_result.scalar() or 0.0

        # Average rating and feedback count
        avg_rating_stmt = select(func.avg(RAGQuery.feedback_rating)).where(
            RAGQuery.user_id == current_user.id,
            RAGQuery.feedback_rating.isnot(None),
        )
        avg_rating_result = await db.execute(avg_rating_stmt)
        average_rating = avg_rating_result.scalar()

        feedback_count_stmt = select(func.count()).select_from(RAGQuery).where(
            RAGQuery.user_id == current_user.id,
            RAGQuery.feedback_rating.isnot(None),
        )
        feedback_count_result = await db.execute(feedback_count_stmt)
        queries_with_feedback = feedback_count_result.scalar() or 0

        # Documents with embeddings (user's documents only)
        # Join through documents table to filter by user
        from app.db.models.document import Document

        docs_count_stmt = (
            select(func.count(func.distinct(DocumentEmbedding.document_id)))
            .select_from(DocumentEmbedding)
            .join(Document, DocumentEmbedding.document_id == Document.id)
            .where(Document.user_id == current_user.id)
        )
        docs_count_result = await db.execute(docs_count_stmt)
        total_documents_indexed = docs_count_result.scalar() or 0

        # Total chunks for user's documents
        chunks_count_stmt = (
            select(func.count())
            .select_from(DocumentEmbedding)
            .join(Document, DocumentEmbedding.document_id == Document.id)
            .where(Document.user_id == current_user.id)
        )
        chunks_count_result = await db.execute(chunks_count_stmt)
        total_chunks = chunks_count_result.scalar() or 0

        return RAGStatsResponse(
            total_queries=total_queries,
            total_documents_indexed=total_documents_indexed,
            total_chunks=total_chunks,
            average_confidence=round(float(average_confidence), 3),
            average_rating=round(float(average_rating), 2) if average_rating else None,
            queries_with_feedback=queries_with_feedback,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve statistics: {str(e)}",
        )


@router.delete(
    "/history/{query_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete query from history",
    description="Delete a specific query from the user's history.",
)
async def delete_query(
    query_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a query from history.

    Args:
        query_id: UUID of the query to delete
        current_user: Authenticated user
        db: Database session

    Raises:
        HTTPException 404: Query not found or user doesn't own it
        HTTPException 500: Failed to delete query
    """
    try:
        rag_query_repo = RAGQueryRepository(db)

        # Verify query exists and belongs to user
        query = await rag_query_repo.get_by_id(query_id)
        if not query or query.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Query not found",
            )

        # Delete query
        await rag_query_repo.delete(query_id)
        await db.commit()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete query: {str(e)}",
        )

"""
RAG API Endpoints

REST API endpoints for Retrieval Augmented Generation (RAG) system.
Phase 11 - RAG Implementation
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.v1.deps import get_current_user, get_db
from app.db.models.user import User
from app.db.models.rag import RAGQuery, DocumentEmbedding
from app.services.rag.generation_service import GenerationService
from app.db.repositories.rag import RAGQueryRepository, RAGConversationRepository
from app.schemas.rag import (
    RAGQueryRequest,
    RAGQueryResponse,
    RAGHistoryResponse,
    RAGHistoryItem,
    RAGFeedbackRequest,
    RAGStatsResponse,
    RAGSource,
    RAGConversationCreate,
    RAGConversationResponse,
    RAGConversationListResponse,
    RAGConversationDetailResponse,
    RAGEvaluationResponse,
    RAGEvaluationListResponse,
    RAGEvaluationTriggerResponse,
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
            similarity_threshold=request.similarity_threshold or 0.5,
            document_ids=request.document_ids,
            data_source_ids=request.data_source_ids,
            user_id=current_user.id,
            model=request.model,
            search_mode=request.search_mode or "hybrid",
            use_reranking=request.use_reranking or False,
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
            "groundedness_score": rag_response.groundedness_score,
            "unsupported_claims": rag_response.unsupported_claims,
        }
        if request.conversation_id:
            query_data["conversation_id"] = request.conversation_id
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
                metadata=source.get("chunk_metadata") or source.get("metadata"),
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
            search_mode=request.search_mode or "hybrid",
            cached=rag_response.cached,
            groundedness_score=rag_response.groundedness_score,
            unsupported_claims=rag_response.unsupported_claims,
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


@router.post(
    "/query/stream",
    summary="Stream a RAG answer (SSE)",
    description="Query documents using RAG with Server-Sent Events streaming response.",
)
async def query_documents_stream(
    request: RAGQueryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Stream RAG answer as Server-Sent Events."""
    generation_service = GenerationService(db)

    async def event_generator():
        async for event in generation_service.generate_answer_stream(
            question=request.question,
            top_k=request.top_k or 5,
            similarity_threshold=request.similarity_threshold or 0.5,
            document_ids=request.document_ids,
            data_source_ids=request.data_source_ids,
            user_id=current_user.id,
            model=request.model,
            search_mode=request.search_mode or "hybrid",
            use_reranking=request.use_reranking or False,
        ):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
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


# ===========================
# Conversation Endpoints (P1.3)
# ===========================


@router.post(
    "/conversations",
    response_model=RAGConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a RAG conversation",
)
async def create_conversation(
    request: RAGConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RAGConversationResponse:
    """Create a new RAG conversation session."""
    try:
        conv_repo = RAGConversationRepository(db)
        title = request.title or "New Conversation"
        conv = await conv_repo.create({"user_id": current_user.id, "title": title})
        await db.commit()
        return RAGConversationResponse.model_validate(conv)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}",
        )


@router.get(
    "/conversations",
    response_model=RAGConversationListResponse,
    summary="List RAG conversations",
)
async def list_conversations(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RAGConversationListResponse:
    """List conversations for the current user."""
    try:
        conv_repo = RAGConversationRepository(db)
        convs = await conv_repo.get_by_user_id(current_user.id, limit=limit, offset=offset)
        total = await conv_repo.count({"user_id": current_user.id})
        return RAGConversationListResponse(
            items=[RAGConversationResponse.model_validate(c) for c in convs],
            total=total,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list conversations: {str(e)}",
        )


@router.get(
    "/conversations/{conversation_id}",
    response_model=RAGConversationDetailResponse,
    summary="Get conversation with queries",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RAGConversationDetailResponse:
    """Get a conversation with its query history."""
    try:
        conv_repo = RAGConversationRepository(db)
        conv = await conv_repo.get_by_id(conversation_id)
        if not conv or conv.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")

        rag_query_repo = RAGQueryRepository(db)
        queries_stmt = select(RAGQuery).where(
            RAGQuery.conversation_id == conversation_id
        ).order_by(RAGQuery.created_at)
        result = await db.execute(queries_stmt)
        queries = list(result.scalars().all())

        query_items = []
        for q in queries:
            sources = None
            if q.sources:
                sources = [
                    RAGSource(
                        chunk_text=s["chunk_text"],
                        document_id=s["document_id"],
                        document_name=s["document_name"],
                        document_title=s.get("document_title"),
                        chunk_index=s["chunk_index"],
                        similarity_score=s["similarity_score"],
                        metadata=s.get("metadata"),
                    )
                    for s in q.sources
                ]
            query_items.append(
                RAGHistoryItem(
                    id=q.id,
                    question=q.question,
                    answer=q.answer,
                    sources=sources,
                    model_used=q.model_used,
                    tokens_used=q.tokens_used,
                    confidence_score=q.confidence_score,
                    feedback_rating=q.feedback_rating,
                    created_at=q.created_at,
                )
            )

        return RAGConversationDetailResponse(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            queries=query_items,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation: {str(e)}",
        )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a conversation and its queries."""
    try:
        conv_repo = RAGConversationRepository(db)
        conv = await conv_repo.get_by_id(conversation_id)
        if not conv or conv.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        await conv_repo.delete(conversation_id)
        await db.commit()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}",
        )


# ===========================
# Evaluation Endpoints (P3.2)
# ===========================


@router.get(
    "/evaluations",
    response_model=RAGEvaluationListResponse,
    summary="Get RAG evaluation history",
    description="Retrieve historical RAG quality evaluations for the current user.",
)
async def get_evaluations(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RAGEvaluationListResponse:
    """Get evaluation history with pagination."""
    try:
        from app.db.models.rag import RAGEvaluation

        count_stmt = select(func.count()).select_from(RAGEvaluation).where(
            RAGEvaluation.user_id == current_user.id
        )
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        stmt = (
            select(RAGEvaluation)
            .where(RAGEvaluation.user_id == current_user.id)
            .order_by(RAGEvaluation.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        evaluations = list(result.scalars().all())

        items = [
            RAGEvaluationResponse(
                id=e.id,
                faithfulness=e.faithfulness,
                answer_relevancy=e.answer_relevancy,
                context_precision=e.context_precision,
                context_recall=e.context_recall,
                sample_size=e.sample_size,
                queries_with_feedback=e.queries_with_feedback,
                average_groundedness=e.average_groundedness,
                created_at=e.created_at,
            )
            for e in evaluations
        ]

        return RAGEvaluationListResponse(items=items, total=total)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve evaluations: {str(e)}",
        )


@router.post(
    "/evaluations/run",
    response_model=RAGEvaluationTriggerResponse,
    summary="Trigger a RAG evaluation",
    description="Run a quality evaluation on recent RAG queries. Evaluates faithfulness, relevancy, precision, and recall.",
)
async def trigger_evaluation(
    sample_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RAGEvaluationTriggerResponse:
    """Trigger an evaluation run for the current user."""
    try:
        from app.services.rag.evaluation_service import EvaluationService

        evaluation_service = EvaluationService()
        result = await evaluation_service.run_evaluation(
            session=db,
            user_id=current_user.id,
            sample_size=sample_size,
        )

        if result.sample_size == 0:
            return RAGEvaluationTriggerResponse(
                message="No queries available for evaluation. Ask some questions first.",
            )

        return RAGEvaluationTriggerResponse(
            faithfulness=result.faithfulness,
            answer_relevancy=result.answer_relevancy,
            context_precision=result.context_precision,
            context_recall=result.context_recall,
            sample_size=result.sample_size,
            message=f"Evaluation completed on {result.sample_size} queries.",
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}",
        )

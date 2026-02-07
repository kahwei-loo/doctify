"""
RAG Schemas

Pydantic models for RAG request/response validation.
Phase 11 - RAG Implementation
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
import uuid


# ===========================
# Request Models
# ===========================

class RAGQueryRequest(BaseModel):
    """Request model for RAG query."""

    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Question to ask about documents",
        examples=["What is the main topic of this document?"],
    )
    top_k: Optional[int] = Field(
        5,
        ge=1,
        le=20,
        description="Number of document chunks to retrieve",
    )
    similarity_threshold: Optional[float] = Field(
        0.5,
        ge=0.0,
        le=1.0,
        description="Minimum similarity score (0.5 recommended for text-embedding-3-small)",
    )
    document_ids: Optional[List[uuid.UUID]] = Field(
        None,
        description="Optional list of document IDs to search within",
    )
    data_source_ids: Optional[List[uuid.UUID]] = Field(
        None,
        description="Optional list of data source IDs to search within (for KB queries)",
    )
    model: Optional[str] = Field(
        None,
        description="Optional AI model override (e.g., 'gpt-4', 'gpt-3.5-turbo')",
    )
    search_mode: Optional[str] = Field(
        "hybrid",
        description="Search mode: 'semantic' (vector), 'keyword' (BM25), 'hybrid' (combined, default)",
    )
    use_reranking: Optional[bool] = Field(
        False,
        description="Whether to apply reranking for improved relevance",
    )
    conversation_id: Optional[str] = Field(
        None,
        description="Optional conversation ID for multi-turn RAG",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "question": "What are the key financial metrics in the quarterly report?",
                "top_k": 5,
                "similarity_threshold": 0.5,
                "search_mode": "hybrid",
            }
        }
    )


class RAGFeedbackRequest(BaseModel):
    """Request model for RAG query feedback."""

    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="Rating from 1 (poor) to 5 (excellent)",
    )
    feedback_text: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional feedback text",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "rating": 5,
                "feedback_text": "Very helpful answer with accurate information!",
            }
        }
    )


# ===========================
# Response Models
# ===========================

class RAGSource(BaseModel):
    """Source document chunk information."""

    chunk_text: str = Field(..., description="Text content of the chunk")
    document_id: str = Field(..., description="Document UUID")
    document_name: str = Field(..., description="Original filename")
    document_title: Optional[str] = Field(None, description="Document title")
    chunk_index: int = Field(..., description="Chunk position in document")
    similarity_score: float = Field(..., description="Similarity score (0-1)")
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional chunk metadata"
    )

    model_config = ConfigDict(from_attributes=True)


class RAGQueryResponse(BaseModel):
    """Response model for RAG query."""

    id: uuid.UUID = Field(..., description="Query record ID")
    question: str = Field(..., description="User question")
    answer: str = Field(..., description="AI-generated answer")
    sources: List[RAGSource] = Field(..., description="Source document chunks")
    model_used: str = Field(..., description="AI model used for generation")
    tokens_used: int = Field(..., description="Total tokens consumed")
    confidence_score: float = Field(..., description="Answer confidence (0-1)")
    context_used: int = Field(..., description="Number of chunks used")
    created_at: datetime = Field(..., description="Query timestamp")
    search_mode: Optional[str] = Field(None, description="Search mode used")
    cached: Optional[bool] = Field(None, description="Whether response was served from cache")
    groundedness_score: Optional[float] = Field(None, description="Groundedness score (0-1)")
    unsupported_claims: Optional[List[str]] = Field(None, description="Claims not supported by context")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "question": "What are the quarterly revenue numbers?",
                "answer": "According to the Q4 report, the quarterly revenue was $2.5M...",
                "sources": [
                    {
                        "chunk_text": "Q4 Revenue: $2.5M",
                        "document_id": "123e4567-e89b-12d3-a456-426614174000",
                        "document_name": "Q4_Report_2024.pdf",
                        "document_title": "Q4 Financial Report",
                        "chunk_index": 3,
                        "similarity_score": 0.92,
                        "metadata": {"page": 5},
                    }
                ],
                "model_used": "gpt-4",
                "tokens_used": 450,
                "confidence_score": 0.89,
                "context_used": 5,
                "created_at": "2024-01-21T10:30:00Z",
            }
        },
    )


class RAGHistoryItem(BaseModel):
    """Response model for RAG query history item."""

    id: uuid.UUID = Field(..., description="Query record ID")
    question: str = Field(..., description="User question")
    answer: Optional[str] = Field(None, description="AI-generated answer")
    sources: Optional[List[RAGSource]] = Field(None, description="Source chunks")
    model_used: Optional[str] = Field(None, description="AI model used for generation")
    tokens_used: Optional[int] = Field(None, description="Total tokens consumed")
    confidence_score: Optional[float] = Field(None, description="Answer confidence (0-1)")
    feedback_rating: Optional[int] = Field(
        None, description="User feedback rating (1-5)"
    )
    created_at: datetime = Field(..., description="Query timestamp")

    model_config = ConfigDict(from_attributes=True)


class RAGHistoryResponse(BaseModel):
    """Response model for RAG query history list."""

    items: List[RAGHistoryItem] = Field(..., description="History items")
    total: int = Field(..., description="Total number of queries")
    limit: int = Field(..., description="Items per page")
    offset: int = Field(..., description="Pagination offset")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "question": "What are the key risks?",
                        "answer": "The main risks identified are...",
                        "sources": [],
                        "feedback_rating": 4,
                        "created_at": "2024-01-21T10:30:00Z",
                    }
                ],
                "total": 25,
                "limit": 50,
                "offset": 0,
            }
        }
    )


class RAGStatsResponse(BaseModel):
    """Response model for RAG usage statistics."""

    total_queries: int = Field(..., description="Total queries made")
    total_documents_indexed: int = Field(..., description="Documents with embeddings")
    total_chunks: int = Field(..., description="Total document chunks")
    average_confidence: float = Field(..., description="Average answer confidence")
    average_rating: Optional[float] = Field(
        None, description="Average user rating (1-5)"
    )
    queries_with_feedback: int = Field(..., description="Queries with feedback")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_queries": 150,
                "total_documents_indexed": 45,
                "total_chunks": 2340,
                "average_confidence": 0.85,
                "average_rating": 4.2,
                "queries_with_feedback": 78,
            }
        }
    )


# ===========================
# Conversational RAG (P1.3)
# ===========================

class RAGConversationCreate(BaseModel):
    """Request to create a RAG conversation."""
    title: Optional[str] = Field(None, max_length=200, description="Optional title")

class RAGConversationResponse(BaseModel):
    """Response for a RAG conversation."""
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RAGConversationListResponse(BaseModel):
    """Paginated list of conversations."""
    items: List[RAGConversationResponse]
    total: int

class RAGConversationDetailResponse(RAGConversationResponse):
    """Conversation with its queries."""
    queries: List[RAGHistoryItem] = []


# ===========================
# Evaluation (P3.2)
# ===========================

class RAGEvaluationResponse(BaseModel):
    """Response model for a single evaluation run."""

    id: uuid.UUID = Field(..., description="Evaluation record ID")
    faithfulness: float = Field(..., description="Faithfulness score (0-1)")
    answer_relevancy: float = Field(..., description="Answer relevancy score (0-1)")
    context_precision: float = Field(..., description="Context precision score (0-1)")
    context_recall: float = Field(..., description="Context recall score (0-1)")
    sample_size: int = Field(..., description="Number of queries evaluated")
    queries_with_feedback: int = Field(..., description="Queries with user feedback")
    average_groundedness: Optional[float] = Field(None, description="Average groundedness score")
    created_at: datetime = Field(..., description="Evaluation timestamp")

    model_config = ConfigDict(from_attributes=True)


class RAGEvaluationListResponse(BaseModel):
    """Response model for evaluation history."""

    items: List[RAGEvaluationResponse] = Field(..., description="Evaluation results")
    total: int = Field(..., description="Total evaluations")


class RAGEvaluationTriggerResponse(BaseModel):
    """Response when triggering an evaluation."""

    task_id: Optional[str] = Field(None, description="Celery task ID (if async)")
    faithfulness: Optional[float] = None
    answer_relevancy: Optional[float] = None
    context_precision: Optional[float] = None
    context_recall: Optional[float] = None
    sample_size: Optional[int] = None
    message: str = Field(..., description="Status message")


# ===========================
# Knowledge Base Embedding Response (Phase 1)
# ===========================

class EmbeddingResponse(BaseModel):
    """Response model for document embedding."""

    id: uuid.UUID = Field(..., description="Embedding UUID")
    document_id: Optional[uuid.UUID] = Field(None, description="Document UUID (legacy)")
    data_source_id: Optional[uuid.UUID] = Field(None, description="Data source UUID")
    chunk_index: int = Field(..., description="Chunk position")
    text_content: str = Field(..., description="Text content of the chunk")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True)

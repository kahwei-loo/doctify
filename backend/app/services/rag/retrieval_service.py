"""
Retrieval Service for RAG

Handles semantic search and context retrieval for question answering.
Phase 11 - RAG Implementation
Enhanced: P0.2 Hybrid Search, P1.1 Reranking
"""

import uuid
import logging
from enum import Enum
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.rag.embedding_service import EmbeddingService
from app.db.repositories.rag import DocumentEmbeddingRepository
from app.db.repositories.document import DocumentRepository
from app.core.exceptions import ValidationError, DatabaseError

logger = logging.getLogger(__name__)


class SearchMode(str, Enum):
    """Search mode for retrieval."""

    SEMANTIC = "semantic"  # Pure vector similarity (original)
    KEYWORD = "keyword"  # Pure BM25 text search
    HYBRID = "hybrid"  # Combined vector + BM25 with RRF


class RetrievalService:
    """
    Service for retrieving relevant document chunks using semantic search.

    Combines vector similarity search with metadata filtering.
    """

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session
        self.embedding_service = EmbeddingService(session)
        self.embedding_repo = DocumentEmbeddingRepository(session)
        self.document_repo = DocumentRepository(session)

    async def retrieve_context(
        self,
        question: str,
        top_k: int = 5,
        similarity_threshold: float = 0.5,
        document_ids: Optional[List[uuid.UUID]] = None,
        data_source_ids: Optional[List[uuid.UUID]] = None,
        user_id: Optional[uuid.UUID] = None,
        search_mode: str = "hybrid",
        use_reranking: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve most relevant document chunks for a question.

        Supports multiple search modes:
        - "semantic": Pure vector similarity search
        - "keyword": Pure BM25 text search
        - "hybrid": Combined vector + BM25 with RRF (default)

        Args:
            question: User question
            top_k: Number of chunks to retrieve
            similarity_threshold: Minimum similarity score (0-1)
            document_ids: Optional list of document IDs to search within
            data_source_ids: Optional list of data source IDs to search within
            user_id: Optional user ID for access control filtering
            search_mode: Search mode ("semantic", "keyword", "hybrid")
            use_reranking: Whether to apply reranking (P1.1)

        Returns:
            List of context dictionaries

        Raises:
            ValidationError: If question is empty or parameters invalid
            DatabaseError: If search fails
        """
        if not question or not question.strip():
            raise ValidationError("Question cannot be empty")

        if top_k <= 0 or top_k > 50:
            raise ValidationError("top_k must be between 1 and 50")

        if similarity_threshold < 0.0 or similarity_threshold > 1.0:
            raise ValidationError("similarity_threshold must be between 0.0 and 1.0")

        try:
            search_results: List = []

            if search_mode == SearchMode.KEYWORD:
                # Pure keyword search
                search_results = await self.embedding_repo.search_by_keyword(
                    query_text=question,
                    limit=top_k,
                    document_ids=document_ids,
                    data_source_ids=data_source_ids,
                )
                # Normalize: (embedding, score) tuples
                search_results = [(emb, score) for emb, score in search_results]

            elif search_mode == SearchMode.HYBRID:
                # Hybrid: vector + BM25 with RRF
                query_embedding = await self.embedding_service.generate_embedding(
                    question
                )
                # Fetch more for reranking if enabled
                fetch_k = top_k * 4 if use_reranking else top_k
                hybrid_results = await self.embedding_repo.hybrid_search(
                    query_embedding=query_embedding,
                    query_text=question,
                    limit=fetch_k,
                    similarity_threshold=similarity_threshold,
                    document_ids=document_ids,
                    data_source_ids=data_source_ids,
                )
                # Use RRF for ranking, vector cosine for display
                search_results = [
                    (emb, rrf, vs) for emb, rrf, vs, _ts in hybrid_results
                ]

            else:
                # Pure vector search (original)
                query_embedding = await self.embedding_service.generate_embedding(
                    question
                )
                fetch_k = top_k * 4 if use_reranking else top_k
                search_results = await self.embedding_repo.search_by_embedding(
                    query_embedding=query_embedding,
                    limit=fetch_k,
                    similarity_threshold=similarity_threshold,
                    document_ids=document_ids,
                )

            if not search_results:
                logger.warning(
                    "No chunks retrieved",
                    extra={
                        "threshold": similarity_threshold,
                        "search_mode": search_mode,
                    },
                )
                return []

            # Normalize results: (embedding, ranking_score, display_score)
            # For hybrid search, display_score is vector cosine similarity
            # For other modes, display_score equals ranking_score
            normalized = []
            for item in search_results:
                if len(item) == 3:
                    emb, rank_score, display_score = item
                    normalized.append((emb, rank_score, display_score))
                else:
                    emb, score = item
                    normalized.append((emb, score, score))

            # Log result quality
            rank_scores = [rs for _, rs, _ in normalized]
            logger.info(
                "Context retrieval completed",
                extra={
                    "chunks_found": len(normalized),
                    "search_mode": search_mode,
                    "avg_score": round(sum(rank_scores) / len(rank_scores), 4),
                    "max_score": round(max(rank_scores), 4),
                },
            )

            # Enrich with document metadata and filter by user_id
            context_list = []
            for embedding, rank_score, display_score in normalized:
                # Try document_id first, then data_source_id
                doc_name = "Unknown"
                doc_title = None
                doc_id_str = None

                if embedding.document_id:
                    document = await self.document_repo.get_by_id(embedding.document_id)
                    if not document:
                        continue
                    if user_id and document.user_id != user_id:
                        continue
                    doc_name = document.original_filename
                    doc_title = document.title
                    doc_id_str = str(embedding.document_id)
                elif embedding.data_source_id:
                    # For KB data sources, use metadata for naming
                    meta = embedding.chunk_metadata or {}
                    doc_name = meta.get("document_name", "Knowledge Base Source")
                    doc_id_str = str(embedding.data_source_id)

                context_entry = {
                    "chunk_text": embedding.chunk_text,
                    "document_id": doc_id_str or "",
                    "data_source_id": (
                        str(embedding.data_source_id)
                        if embedding.data_source_id
                        else None
                    ),
                    "document_name": doc_name,
                    "document_title": doc_title,
                    "chunk_index": embedding.chunk_index,
                    "similarity_score": round(display_score, 4),
                    "rank_score": round(rank_score, 4),
                    "metadata": embedding.chunk_metadata or {},
                    "search_mode": search_mode,
                }

                context_list.append(context_entry)

            # Sort by rank score (RRF for hybrid, cosine for others)
            context_list.sort(key=lambda x: x["rank_score"], reverse=True)

            # Apply reranking if enabled (P1.1 - implemented separately)
            if use_reranking and len(context_list) > top_k:
                try:
                    from app.services.rag.reranker_service import RerankerService

                    reranker = RerankerService()
                    context_list = await reranker.rerank(
                        query=question,
                        documents=context_list,
                        top_n=top_k,
                    )
                except ImportError:
                    # Reranker not yet available, just truncate
                    context_list = context_list[:top_k]
                except Exception as e:
                    logger.warning(
                        f"Reranking failed, falling back to original order: {e}"
                    )
                    context_list = context_list[:top_k]
            else:
                context_list = context_list[:top_k]

            return context_list

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to retrieve context: {str(e)}")

    async def retrieve_context_for_documents(
        self,
        question: str,
        document_ids: List[uuid.UUID],
        top_k: int = 5,
        similarity_threshold: float = 0.5,  # Changed from 0.7 - better for text-embedding-3-small
    ) -> List[Dict[str, Any]]:
        """
        Retrieve context from specific documents only.

        Convenience method for document-scoped search.

        Args:
            question: User question
            document_ids: List of document IDs to search
            top_k: Number of chunks to retrieve
            similarity_threshold: Minimum similarity score

        Returns:
            List of context dictionaries
        """
        return await self.retrieve_context(
            question=question,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            document_ids=document_ids,
        )

    async def get_similar_chunks(
        self,
        text: str,
        top_k: int = 5,
        similarity_threshold: float = 0.5,  # Changed from 0.7 - better for text-embedding-3-small
        exclude_document_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Find similar text chunks across all documents.

        Useful for finding related content or duplicate detection.

        Args:
            text: Text to find similar chunks for
            top_k: Number of similar chunks to retrieve
            similarity_threshold: Minimum similarity score
            exclude_document_id: Optional document ID to exclude from results

        Returns:
            List of similar chunk dictionaries
        """
        if not text or not text.strip():
            raise ValidationError("Text cannot be empty")

        try:
            # Generate embedding for the text
            text_embedding = await self.embedding_service.generate_embedding(text)

            # Search for similar embeddings
            search_results = await self.embedding_repo.search_by_embedding(
                query_embedding=text_embedding,
                limit=top_k,
                similarity_threshold=similarity_threshold,
            )

            if not search_results:
                return []

            # Build result list with document info
            similar_chunks = []
            for embedding, similarity in search_results:
                # Skip if this is from the excluded document
                if exclude_document_id and embedding.document_id == exclude_document_id:
                    continue

                # Fetch document
                document = await self.document_repo.get_by_id(embedding.document_id)
                if not document:
                    continue

                similar_chunks.append(
                    {
                        "chunk_text": embedding.chunk_text,
                        "document_id": str(embedding.document_id),
                        "document_name": document.original_filename,
                        "chunk_index": embedding.chunk_index,
                        "similarity_score": round(similarity, 3),
                        "metadata": embedding.chunk_metadata or {},
                    }
                )

            return similar_chunks

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to find similar chunks: {str(e)}")

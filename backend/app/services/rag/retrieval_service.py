"""
Retrieval Service for RAG

Handles semantic search and context retrieval for question answering.
Phase 11 - RAG Implementation
"""

import uuid
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.rag.embedding_service import EmbeddingService
from app.db.repositories.rag import DocumentEmbeddingRepository
from app.db.repositories.document import DocumentRepository
from app.core.exceptions import ValidationError, DatabaseError

logger = logging.getLogger(__name__)


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
        similarity_threshold: float = 0.5,  # Changed from 0.7 - better for text-embedding-3-small
        document_ids: Optional[List[uuid.UUID]] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve most relevant document chunks for a question.

        Workflow:
        1. Generate embedding for question
        2. Vector similarity search in embeddings table
        3. Fetch associated document metadata
        4. Filter by user_id if provided (RLS)
        5. Return ranked context with sources

        Args:
            question: User question
            top_k: Number of chunks to retrieve
            similarity_threshold: Minimum similarity score (0-1)
            document_ids: Optional list of document IDs to search within
            user_id: Optional user ID for access control filtering

        Returns:
            List of context dictionaries with format:
            {
                "chunk_text": str,
                "document_id": str,
                "document_name": str,
                "chunk_index": int,
                "similarity_score": float,
                "metadata": dict
            }

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
            # Generate query embedding
            query_embedding = await self.embedding_service.generate_embedding(question)

            # Perform vector search
            search_results = await self.embedding_repo.search_by_embedding(
                query_embedding=query_embedding,
                limit=top_k,
                similarity_threshold=similarity_threshold,
                document_ids=document_ids
            )

            if not search_results:
                logger.warning(
                    "No chunks retrieved - threshold may be too high",
                    extra={"threshold": similarity_threshold}
                )
                return []

            # Log result quality
            similarity_scores = [score for _, score in search_results]
            logger.info(
                "Context retrieval completed",
                extra={
                    "chunks_found": len(search_results),
                    "avg_similarity": round(sum(similarity_scores) / len(similarity_scores), 3),
                    "max_similarity": round(max(similarity_scores), 3),
                    "min_similarity": round(min(similarity_scores), 3)
                }
            )

            # Enrich with document metadata and filter by user_id
            context_list = []
            for embedding, similarity in search_results:
                # Fetch document
                document = await self.document_repo.get_by_id(embedding.document_id)

                # Skip if document not found or user doesn't have access
                if not document:
                    continue

                if user_id and document.user_id != user_id:
                    continue

                # Build context entry
                context_entry = {
                    "chunk_text": embedding.chunk_text,
                    "document_id": str(embedding.document_id),
                    "document_name": document.original_filename,
                    "document_title": document.title,
                    "chunk_index": embedding.chunk_index,
                    "similarity_score": round(similarity, 3),
                    "metadata": embedding.chunk_metadata or {}
                }

                context_list.append(context_entry)

            # Sort by similarity score (highest first)
            context_list.sort(key=lambda x: x["similarity_score"], reverse=True)

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
        similarity_threshold: float = 0.5  # Changed from 0.7 - better for text-embedding-3-small
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
            document_ids=document_ids
        )

    async def get_similar_chunks(
        self,
        text: str,
        top_k: int = 5,
        similarity_threshold: float = 0.5,  # Changed from 0.7 - better for text-embedding-3-small
        exclude_document_id: Optional[uuid.UUID] = None
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
                similarity_threshold=similarity_threshold
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

                similar_chunks.append({
                    "chunk_text": embedding.chunk_text,
                    "document_id": str(embedding.document_id),
                    "document_name": document.original_filename,
                    "chunk_index": embedding.chunk_index,
                    "similarity_score": round(similarity, 3),
                    "metadata": embedding.chunk_metadata or {}
                })

            return similar_chunks

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to find similar chunks: {str(e)}")

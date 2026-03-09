"""
RAG Repositories for Document Embeddings and Query History

Phase 11 - RAG Implementation
"""

import uuid
import logging
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.db.models.rag import DocumentEmbedding, RAGQuery, RAGConversation
from app.core.exceptions import DatabaseError

logger = logging.getLogger(__name__)


class DocumentEmbeddingRepository(BaseRepository[DocumentEmbedding]):
    """Repository for document embeddings with vector search."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, DocumentEmbedding)

    async def create_bulk(
        self, embeddings: List[DocumentEmbedding]
    ) -> List[DocumentEmbedding]:
        """Bulk insert embeddings for efficiency."""
        try:
            self.session.add_all(embeddings)
            await self.session.flush()
            return embeddings
        except Exception as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to bulk create embeddings: {str(e)}")

    async def get_by_document_id(
        self, document_id: uuid.UUID | str
    ) -> List[DocumentEmbedding]:
        """Get all embeddings for a document ordered by chunk index."""
        try:
            if isinstance(document_id, str):
                document_id = uuid.UUID(document_id)

            stmt = (
                select(DocumentEmbedding)
                .where(DocumentEmbedding.document_id == document_id)
                .order_by(DocumentEmbedding.chunk_index)
            )

            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            raise DatabaseError(f"Failed to get embeddings by document_id: {str(e)}")

    async def search_by_embedding(
        self,
        query_embedding: List[float],
        limit: int = 5,
        similarity_threshold: float = 0.5,  # Changed from 0.7 - better for text-embedding-3-small
        document_ids: Optional[List[uuid.UUID]] = None,
    ) -> List[Tuple[DocumentEmbedding, float]]:
        """
        Vector similarity search using cosine distance.

        Returns list of (embedding, similarity_score) tuples.
        Similarity score = 1 - cosine_distance (higher is better).
        """
        try:
            # Convert embedding to PostgreSQL array format
            embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

            # Build base query with vector similarity
            query_parts = ["""
                SELECT *,
                       1 - (embedding <=> CAST(:query_embedding AS vector)) AS similarity
                FROM document_embeddings
                WHERE 1 = 1
            """]

            params = {
                "query_embedding": embedding_str,
                "threshold": similarity_threshold,
                "limit": limit,
            }

            # Add document_ids filter if provided
            if document_ids:
                query_parts.append("AND document_id = ANY(:document_ids)")
                params["document_ids"] = [str(doc_id) for doc_id in document_ids]

            # Add similarity threshold and ordering
            query_parts.append("""
                AND 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :threshold
                ORDER BY embedding <=> CAST(:query_embedding AS vector)
                LIMIT :limit
            """)

            full_query = " ".join(query_parts)
            result = await self.session.execute(text(full_query), params)

            rows = result.fetchall()

            # Log search results
            logger.info(
                "Vector search completed",
                extra={
                    "results_count": len(rows),
                    "threshold": similarity_threshold,
                    "top_score": rows[0].similarity if rows else 0.0,
                    "scores": [round(row.similarity, 3) for row in rows[:5]],
                },
            )

            embeddings_with_scores = []

            for row in rows:
                # Fetch the full embedding object
                embedding = await self.get_by_id(row.id)
                if embedding:
                    embeddings_with_scores.append((embedding, float(row.similarity)))

            return embeddings_with_scores

        except Exception as e:
            raise DatabaseError(f"Failed to search embeddings: {str(e)}")

    async def search_by_keyword(
        self,
        query_text: str,
        limit: int = 20,
        document_ids: Optional[List[uuid.UUID]] = None,
        data_source_ids: Optional[List[uuid.UUID]] = None,
    ) -> List[Tuple[DocumentEmbedding, float]]:
        """
        Full-text keyword search using PostgreSQL tsvector.

        Returns list of (embedding, text_rank_score) tuples.
        """
        try:
            query_parts = ["""
                SELECT *,
                       ts_rank(search_vector, plainto_tsquery('english', :query_text)) AS text_score
                FROM document_embeddings
                WHERE search_vector @@ plainto_tsquery('english', :query_text)
            """]
            params: Dict[str, Any] = {"query_text": query_text, "limit": limit}

            if document_ids:
                query_parts.append("AND document_id = ANY(:document_ids)")
                params["document_ids"] = [str(doc_id) for doc_id in document_ids]

            if data_source_ids:
                query_parts.append("AND data_source_id = ANY(:data_source_ids)")
                params["data_source_ids"] = [str(ds_id) for ds_id in data_source_ids]

            query_parts.append("""
                ORDER BY ts_rank(search_vector, plainto_tsquery('english', :query_text)) DESC
                LIMIT :limit
            """)

            full_query = " ".join(query_parts)
            result = await self.session.execute(text(full_query), params)
            rows = result.fetchall()

            embeddings_with_scores = []
            for row in rows:
                embedding = await self.get_by_id(row.id)
                if embedding:
                    embeddings_with_scores.append((embedding, float(row.text_score)))

            return embeddings_with_scores

        except Exception as e:
            raise DatabaseError(f"Failed to keyword search embeddings: {str(e)}")

    async def hybrid_search(
        self,
        query_embedding: List[float],
        query_text: str,
        limit: int = 5,
        similarity_threshold: float = 0.5,
        document_ids: Optional[List[uuid.UUID]] = None,
        data_source_ids: Optional[List[uuid.UUID]] = None,
        vector_weight: float = 0.5,
        rrf_k: int = 60,
    ) -> List[Tuple[DocumentEmbedding, float, float, float]]:
        """
        Hybrid search combining vector similarity and BM25 text search.

        Uses Reciprocal Rank Fusion (RRF) to merge results.

        Returns list of (embedding, rrf_score, vector_score, text_score) tuples.
        """
        try:
            embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

            # Build filter clauses
            filter_clause = ""
            params: Dict[str, Any] = {
                "query_embedding": embedding_str,
                "query_text": query_text,
                "vector_threshold": similarity_threshold,
                "vector_limit": limit * 4,  # Fetch more for RRF merging
                "text_limit": limit * 4,
                "limit": limit,
                "rrf_k": rrf_k,
            }

            if document_ids:
                filter_clause += " AND document_id = ANY(:document_ids)"
                params["document_ids"] = [str(doc_id) for doc_id in document_ids]

            if data_source_ids:
                filter_clause += " AND data_source_id = ANY(:data_source_ids)"
                params["data_source_ids"] = [str(ds_id) for ds_id in data_source_ids]

            full_query = f"""
            WITH vector_results AS (
                SELECT id, chunk_text, document_id, data_source_id, chunk_index,
                       1 - (embedding <=> CAST(:query_embedding AS vector)) AS vector_score,
                       ROW_NUMBER() OVER (ORDER BY embedding <=> CAST(:query_embedding AS vector)) AS vector_rank
                FROM document_embeddings
                WHERE 1 - (embedding <=> CAST(:query_embedding AS vector)) >= :vector_threshold
                {filter_clause}
                ORDER BY embedding <=> CAST(:query_embedding AS vector)
                LIMIT :vector_limit
            ),
            text_results AS (
                SELECT id, chunk_text, document_id, data_source_id, chunk_index,
                       ts_rank(search_vector, plainto_tsquery('english', :query_text)) AS text_score,
                       ROW_NUMBER() OVER (ORDER BY ts_rank(search_vector, plainto_tsquery('english', :query_text)) DESC) AS text_rank
                FROM document_embeddings
                WHERE search_vector @@ plainto_tsquery('english', :query_text)
                {filter_clause}
                LIMIT :text_limit
            ),
            combined AS (
                SELECT COALESCE(v.id, t.id) AS id,
                       COALESCE(v.vector_score, 0) AS vector_score,
                       COALESCE(t.text_score, 0) AS text_score,
                       COALESCE(1.0 / (:rrf_k + v.vector_rank), 0) + COALESCE(1.0 / (:rrf_k + t.text_rank), 0) AS rrf_score
                FROM vector_results v
                FULL OUTER JOIN text_results t ON v.id = t.id
            )
            SELECT * FROM combined ORDER BY rrf_score DESC LIMIT :limit;
            """

            result = await self.session.execute(text(full_query), params)
            rows = result.fetchall()

            logger.info(
                "Hybrid search completed",
                extra={
                    "results_count": len(rows),
                    "top_rrf_score": rows[0].rrf_score if rows else 0.0,
                },
            )

            results = []
            for row in rows:
                embedding = await self.get_by_id(row.id)
                if embedding:
                    results.append(
                        (
                            embedding,
                            float(row.rrf_score),
                            float(row.vector_score),
                            float(row.text_score),
                        )
                    )

            return results

        except Exception as e:
            raise DatabaseError(f"Failed to hybrid search embeddings: {str(e)}")

    async def delete_by_document_id(self, document_id: uuid.UUID | str) -> int:
        """Delete all embeddings for a document."""
        try:
            if isinstance(document_id, str):
                document_id = uuid.UUID(document_id)

            result = await self.delete_many({"document_id": document_id})
            return result
        except Exception as e:
            raise DatabaseError(f"Failed to delete embeddings: {str(e)}")

    async def count_by_document_id(self, document_id: uuid.UUID | str) -> int:
        """Count embeddings for a document."""
        try:
            if isinstance(document_id, str):
                document_id = uuid.UUID(document_id)

            return await self.count({"document_id": document_id})
        except Exception as e:
            raise DatabaseError(f"Failed to count embeddings: {str(e)}")

    async def get_by_data_source_id(
        self, data_source_id: uuid.UUID | str, skip: int = 0, limit: int = 1000
    ) -> List[DocumentEmbedding]:
        """Get all embeddings for a data source ordered by chunk index."""
        try:
            if isinstance(data_source_id, str):
                data_source_id = uuid.UUID(data_source_id)

            stmt = (
                select(DocumentEmbedding)
                .where(DocumentEmbedding.data_source_id == data_source_id)
                .order_by(DocumentEmbedding.chunk_index)
                .offset(skip)
                .limit(limit)
            )

            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            raise DatabaseError(f"Failed to get embeddings by data_source_id: {str(e)}")

    async def delete_by_data_source_id(self, data_source_id: uuid.UUID | str) -> int:
        """Delete all embeddings for a data source."""
        try:
            if isinstance(data_source_id, str):
                data_source_id = uuid.UUID(data_source_id)

            result = await self.delete_many({"data_source_id": data_source_id})
            return result
        except Exception as e:
            raise DatabaseError(
                f"Failed to delete embeddings by data_source_id: {str(e)}"
            )

    async def count_by_data_source_id(self, data_source_id: uuid.UUID | str) -> int:
        """Count embeddings for a data source."""
        try:
            if isinstance(data_source_id, str):
                data_source_id = uuid.UUID(data_source_id)

            return await self.count({"data_source_id": data_source_id})
        except Exception as e:
            raise DatabaseError(
                f"Failed to count embeddings by data_source_id: {str(e)}"
            )

    async def get_by_data_source_ids(
        self, data_source_ids: List[uuid.UUID | str], skip: int = 0, limit: int = 1000
    ) -> List[DocumentEmbedding]:
        """Get embeddings for multiple data sources."""
        try:
            # Convert string IDs to UUIDs
            uuid_ids = []
            for ds_id in data_source_ids:
                if isinstance(ds_id, str):
                    uuid_ids.append(uuid.UUID(ds_id))
                else:
                    uuid_ids.append(ds_id)

            stmt = (
                select(DocumentEmbedding)
                .where(DocumentEmbedding.data_source_id.in_(uuid_ids))
                .order_by(
                    DocumentEmbedding.data_source_id, DocumentEmbedding.chunk_index
                )
                .offset(skip)
                .limit(limit)
            )

            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            raise DatabaseError(
                f"Failed to get embeddings by data_source_ids: {str(e)}"
            )

    async def count_by_data_source_ids(
        self, data_source_ids: List[uuid.UUID | str]
    ) -> int:
        """Count embeddings for multiple data sources."""
        try:
            # Convert string IDs to UUIDs
            uuid_ids = []
            for ds_id in data_source_ids:
                if isinstance(ds_id, str):
                    uuid_ids.append(uuid.UUID(ds_id))
                else:
                    uuid_ids.append(ds_id)

            stmt = select(func.count(DocumentEmbedding.id)).where(
                DocumentEmbedding.data_source_id.in_(uuid_ids)
            )

            result = await self.session.execute(stmt)
            return result.scalar() or 0
        except Exception as e:
            raise DatabaseError(
                f"Failed to count embeddings by data_source_ids: {str(e)}"
            )


class RAGQueryRepository(BaseRepository[RAGQuery]):
    """Repository for RAG query history."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, RAGQuery)

    async def get_by_user_id(
        self, user_id: uuid.UUID | str, limit: int = 50, offset: int = 0
    ) -> List[RAGQuery]:
        """Get query history for a user ordered by most recent."""
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)

            return await self.list(
                filters={"user_id": user_id},
                skip=offset,
                limit=limit,
                sort_by="created_at",
                sort_order="desc",
            )
        except Exception as e:
            raise DatabaseError(f"Failed to get queries by user_id: {str(e)}")

    async def get_recent_queries(
        self, user_id: uuid.UUID | str, hours: int = 24
    ) -> List[RAGQuery]:
        """Get recent queries within time window."""
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)

            cutoff = datetime.utcnow() - timedelta(hours=hours)

            stmt = (
                select(RAGQuery)
                .where(RAGQuery.user_id == user_id, RAGQuery.created_at >= cutoff)
                .order_by(RAGQuery.created_at.desc())
            )

            result = await self.session.execute(stmt)
            return list(result.scalars().all())

        except Exception as e:
            raise DatabaseError(f"Failed to get recent queries: {str(e)}")

    async def update_feedback(
        self,
        query_id: uuid.UUID | str,
        rating: int,
        feedback_text: Optional[str] = None,
    ) -> Optional[RAGQuery]:
        """Update user feedback for a query."""
        try:
            return await self.update(
                query_id, {"feedback_rating": rating, "feedback_text": feedback_text}
            )
        except Exception as e:
            raise DatabaseError(f"Failed to update feedback: {str(e)}")

    async def get_last_by_conversation(
        self,
        conversation_id: str,
    ) -> Optional[RAGQuery]:
        """Get the most recent query in a conversation."""
        try:
            conv_uuid = (
                uuid.UUID(conversation_id)
                if isinstance(conversation_id, str)
                else conversation_id
            )
            stmt = (
                select(RAGQuery)
                .where(RAGQuery.conversation_id == conv_uuid)
                .order_by(RAGQuery.created_at.desc())
                .limit(1)
            )
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise DatabaseError(f"Failed to get last query by conversation: {str(e)}")

    async def get_average_rating(
        self, user_id: Optional[uuid.UUID] = None
    ) -> Optional[float]:
        """Get average feedback rating, optionally filtered by user."""
        try:
            stmt = select(func.avg(RAGQuery.feedback_rating)).where(
                RAGQuery.feedback_rating.isnot(None)
            )

            if user_id:
                stmt = stmt.where(RAGQuery.user_id == user_id)

            result = await self.session.execute(stmt)
            avg = result.scalar()
            return float(avg) if avg is not None else None

        except Exception as e:
            raise DatabaseError(f"Failed to get average rating: {str(e)}")


class RAGConversationRepository(BaseRepository[RAGConversation]):
    """Repository for RAG conversation sessions (P1.3)."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, RAGConversation)

    async def get_by_user_id(
        self,
        user_id: uuid.UUID | str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[RAGConversation]:
        """Get conversations for a user ordered by most recent."""
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)

            return await self.list(
                filters={"user_id": user_id},
                skip=offset,
                limit=limit,
                sort_by="updated_at",
                sort_order="desc",
            )
        except Exception as e:
            raise DatabaseError(f"Failed to get conversations: {str(e)}")

    async def get_with_queries(
        self,
        conversation_id: uuid.UUID | str,
    ) -> Optional[RAGConversation]:
        """Get conversation with its queries loaded."""
        try:
            if isinstance(conversation_id, str):
                conversation_id = uuid.UUID(conversation_id)
            return await self.get_by_id(conversation_id)
        except Exception as e:
            raise DatabaseError(f"Failed to get conversation: {str(e)}")

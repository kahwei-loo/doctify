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
from app.db.models.rag import DocumentEmbedding, RAGQuery
from app.core.exceptions import DatabaseError

logger = logging.getLogger(__name__)


class DocumentEmbeddingRepository(BaseRepository[DocumentEmbedding]):
    """Repository for document embeddings with vector search."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, DocumentEmbedding)

    async def create_bulk(self, embeddings: List[DocumentEmbedding]) -> List[DocumentEmbedding]:
        """Bulk insert embeddings for efficiency."""
        try:
            self.session.add_all(embeddings)
            await self.session.flush()
            return embeddings
        except Exception as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to bulk create embeddings: {str(e)}")

    async def get_by_document_id(self, document_id: uuid.UUID | str) -> List[DocumentEmbedding]:
        """Get all embeddings for a document ordered by chunk index."""
        try:
            if isinstance(document_id, str):
                document_id = uuid.UUID(document_id)

            stmt = select(DocumentEmbedding).where(
                DocumentEmbedding.document_id == document_id
            ).order_by(DocumentEmbedding.chunk_index)

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
                "limit": limit
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
                    "scores": [round(row.similarity, 3) for row in rows[:5]]
                }
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
        self,
        data_source_id: uuid.UUID | str,
        skip: int = 0,
        limit: int = 1000
    ) -> List[DocumentEmbedding]:
        """Get all embeddings for a data source ordered by chunk index."""
        try:
            if isinstance(data_source_id, str):
                data_source_id = uuid.UUID(data_source_id)

            stmt = select(DocumentEmbedding).where(
                DocumentEmbedding.data_source_id == data_source_id
            ).order_by(DocumentEmbedding.chunk_index).offset(skip).limit(limit)

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
            raise DatabaseError(f"Failed to delete embeddings by data_source_id: {str(e)}")

    async def count_by_data_source_id(self, data_source_id: uuid.UUID | str) -> int:
        """Count embeddings for a data source."""
        try:
            if isinstance(data_source_id, str):
                data_source_id = uuid.UUID(data_source_id)

            return await self.count({"data_source_id": data_source_id})
        except Exception as e:
            raise DatabaseError(f"Failed to count embeddings by data_source_id: {str(e)}")

    async def get_by_data_source_ids(
        self,
        data_source_ids: List[uuid.UUID | str],
        skip: int = 0,
        limit: int = 1000
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

            stmt = select(DocumentEmbedding).where(
                DocumentEmbedding.data_source_id.in_(uuid_ids)
            ).order_by(
                DocumentEmbedding.data_source_id,
                DocumentEmbedding.chunk_index
            ).offset(skip).limit(limit)

            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            raise DatabaseError(f"Failed to get embeddings by data_source_ids: {str(e)}")

    async def count_by_data_source_ids(self, data_source_ids: List[uuid.UUID | str]) -> int:
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
            raise DatabaseError(f"Failed to count embeddings by data_source_ids: {str(e)}")


class RAGQueryRepository(BaseRepository[RAGQuery]):
    """Repository for RAG query history."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, RAGQuery)

    async def get_by_user_id(
        self,
        user_id: uuid.UUID | str,
        limit: int = 50,
        offset: int = 0
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
                sort_order="desc"
            )
        except Exception as e:
            raise DatabaseError(f"Failed to get queries by user_id: {str(e)}")

    async def get_recent_queries(
        self,
        user_id: uuid.UUID | str,
        hours: int = 24
    ) -> List[RAGQuery]:
        """Get recent queries within time window."""
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)

            cutoff = datetime.utcnow() - timedelta(hours=hours)

            stmt = select(RAGQuery).where(
                RAGQuery.user_id == user_id,
                RAGQuery.created_at >= cutoff
            ).order_by(RAGQuery.created_at.desc())

            result = await self.session.execute(stmt)
            return list(result.scalars().all())

        except Exception as e:
            raise DatabaseError(f"Failed to get recent queries: {str(e)}")

    async def update_feedback(
        self,
        query_id: uuid.UUID | str,
        rating: int,
        feedback_text: Optional[str] = None
    ) -> Optional[RAGQuery]:
        """Update user feedback for a query."""
        try:
            return await self.update(
                query_id,
                {
                    "feedback_rating": rating,
                    "feedback_text": feedback_text
                }
            )
        except Exception as e:
            raise DatabaseError(f"Failed to update feedback: {str(e)}")

    async def get_average_rating(self, user_id: Optional[uuid.UUID] = None) -> Optional[float]:
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

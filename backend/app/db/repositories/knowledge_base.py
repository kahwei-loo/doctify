"""
Knowledge Base Repositories

Phase 1 - Knowledge Base Feature (Week 2-3)
"""

import uuid
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.repositories.base import BaseRepository
from app.db.models.knowledge_base import KnowledgeBase, DataSource
from app.db.models.rag import DocumentEmbedding
from app.core.exceptions import DatabaseError

logger = logging.getLogger(__name__)


class KnowledgeBaseRepository(BaseRepository[KnowledgeBase]):
    """Repository for knowledge bases."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, KnowledgeBase)

    async def get_by_user(
        self, user_id: uuid.UUID | str, skip: int = 0, limit: int = 100
    ) -> List[KnowledgeBase]:
        """
        Get all knowledge bases for a user ordered by creation date.

        Args:
            user_id: User UUID or string
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of KnowledgeBase instances with data source counts loaded
        """
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)

            # Query with data_sources relationship eagerly loaded for counting
            stmt = (
                select(KnowledgeBase)
                .where(KnowledgeBase.user_id == user_id)
                .options(selectinload(KnowledgeBase.data_sources))
                .order_by(KnowledgeBase.created_at.desc())
                .offset(skip)
                .limit(limit)
            )

            result = await self.session.execute(stmt)
            kbs = list(result.scalars().all())

            # Enrich with counts
            for kb in kbs:
                kb.data_source_count = len(kb.data_sources)

                # Count total embeddings across all data sources
                embedding_count_query = select(func.count(DocumentEmbedding.id)).where(
                    DocumentEmbedding.data_source_id.in_(
                        select(DataSource.id).where(
                            DataSource.knowledge_base_id == kb.id
                        )
                    )
                )
                embedding_result = await self.session.execute(embedding_count_query)
                kb.embedding_count = embedding_result.scalar() or 0

            return kbs

        except Exception as e:
            raise DatabaseError(f"Failed to get knowledge bases by user: {str(e)}")

    async def get_stats(self, user_id: uuid.UUID | str) -> Dict[str, Any]:
        """
        Get overall statistics for a user's knowledge bases.

        Args:
            user_id: User UUID or string

        Returns:
            Dictionary with statistics:
            - total_knowledge_bases: Total number of KBs
            - total_data_sources: Total number of data sources across all KBs
            - total_embeddings: Total number of embeddings
            - processing_count: Number of KBs currently processing
        """
        try:
            if isinstance(user_id, str):
                user_id = uuid.UUID(user_id)

            # Count total knowledge bases
            kb_count_query = select(func.count(KnowledgeBase.id)).where(
                KnowledgeBase.user_id == user_id
            )
            kb_count_result = await self.session.execute(kb_count_query)
            total_kbs = kb_count_result.scalar() or 0

            # Count processing knowledge bases
            processing_query = select(func.count(KnowledgeBase.id)).where(
                KnowledgeBase.user_id == user_id, KnowledgeBase.status == "processing"
            )
            processing_result = await self.session.execute(processing_query)
            processing_count = processing_result.scalar() or 0

            # Count total data sources
            data_sources_query = select(func.count(DataSource.id)).where(
                DataSource.knowledge_base_id.in_(
                    select(KnowledgeBase.id).where(KnowledgeBase.user_id == user_id)
                )
            )
            data_sources_result = await self.session.execute(data_sources_query)
            total_data_sources = data_sources_result.scalar() or 0

            # Count total embeddings
            embeddings_query = select(func.count(DocumentEmbedding.id)).where(
                DocumentEmbedding.data_source_id.in_(
                    select(DataSource.id).where(
                        DataSource.knowledge_base_id.in_(
                            select(KnowledgeBase.id).where(
                                KnowledgeBase.user_id == user_id
                            )
                        )
                    )
                )
            )
            embeddings_result = await self.session.execute(embeddings_query)
            total_embeddings = embeddings_result.scalar() or 0

            return {
                "total_knowledge_bases": total_kbs,
                "total_data_sources": total_data_sources,
                "total_embeddings": total_embeddings,
                "processing_count": processing_count,
            }

        except Exception as e:
            raise DatabaseError(f"Failed to get knowledge base stats: {str(e)}")

    async def get_by_id_with_sources(
        self, kb_id: uuid.UUID | str
    ) -> Optional[KnowledgeBase]:
        """
        Get a knowledge base by ID with data sources eagerly loaded.

        Args:
            kb_id: Knowledge base UUID or string

        Returns:
            KnowledgeBase instance with data_sources loaded, or None if not found
        """
        try:
            if isinstance(kb_id, str):
                kb_id = uuid.UUID(kb_id)

            stmt = (
                select(KnowledgeBase)
                .where(KnowledgeBase.id == kb_id)
                .options(selectinload(KnowledgeBase.data_sources))
            )

            result = await self.session.execute(stmt)
            kb = result.scalar_one_or_none()

            if kb:
                # Enrich with counts
                kb.data_source_count = len(kb.data_sources)

                # Count total embeddings
                embedding_count_query = select(func.count(DocumentEmbedding.id)).where(
                    DocumentEmbedding.data_source_id.in_(
                        select(DataSource.id).where(
                            DataSource.knowledge_base_id == kb.id
                        )
                    )
                )
                embedding_result = await self.session.execute(embedding_count_query)
                kb.embedding_count = embedding_result.scalar() or 0

            return kb

        except Exception as e:
            raise DatabaseError(f"Failed to get knowledge base by ID: {str(e)}")


class DataSourceRepository(BaseRepository[DataSource]):
    """Repository for data sources."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, DataSource)

    async def list_by_kb(
        self, kb_id: uuid.UUID | str, skip: int = 0, limit: int = 100
    ) -> List[DataSource]:
        """
        Get all data sources for a knowledge base ordered by creation date.

        Args:
            kb_id: Knowledge base UUID or string
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of DataSource instances with embedding counts
        """
        try:
            if isinstance(kb_id, str):
                kb_id = uuid.UUID(kb_id)

            stmt = (
                select(DataSource)
                .where(DataSource.knowledge_base_id == kb_id)
                .order_by(DataSource.created_at.desc())
                .offset(skip)
                .limit(limit)
            )

            result = await self.session.execute(stmt)
            data_sources = list(result.scalars().all())

            # Enrich with embedding counts
            for ds in data_sources:
                embedding_count_query = select(func.count(DocumentEmbedding.id)).where(
                    DocumentEmbedding.data_source_id == ds.id
                )
                embedding_result = await self.session.execute(embedding_count_query)
                ds.embedding_count = embedding_result.scalar() or 0

            return data_sources

        except Exception as e:
            raise DatabaseError(f"Failed to get data sources by KB: {str(e)}")

    async def get_by_id_with_embeddings_count(
        self, ds_id: uuid.UUID | str
    ) -> Optional[DataSource]:
        """
        Get a data source by ID with embedding count.

        Args:
            ds_id: Data source UUID or string

        Returns:
            DataSource instance with embedding_count attribute, or None if not found
        """
        try:
            if isinstance(ds_id, str):
                ds_id = uuid.UUID(ds_id)

            ds = await self.get_by_id(ds_id)

            if ds:
                # Count embeddings
                embedding_count_query = select(func.count(DocumentEmbedding.id)).where(
                    DocumentEmbedding.data_source_id == ds.id
                )
                embedding_result = await self.session.execute(embedding_count_query)
                ds.embedding_count = embedding_result.scalar() or 0

            return ds

        except Exception as e:
            raise DatabaseError(f"Failed to get data source by ID: {str(e)}")

    async def update_status(
        self, ds_id: uuid.UUID | str, status: str, error_message: Optional[str] = None
    ) -> Optional[DataSource]:
        """
        Update data source status and error message.

        Args:
            ds_id: Data source UUID or string
            status: New status (active, syncing, error, paused)
            error_message: Optional error message (cleared if status != error)

        Returns:
            Updated DataSource instance, or None if not found
        """
        try:
            update_data = {"status": status}

            if status == "error" and error_message:
                update_data["error_message"] = error_message
            elif status != "error":
                update_data["error_message"] = None

            return await self.update(ds_id, update_data)

        except Exception as e:
            raise DatabaseError(f"Failed to update data source status: {str(e)}")

    async def update_sync_timestamp(
        self, ds_id: uuid.UUID | str
    ) -> Optional[DataSource]:
        """
        Update the last_synced_at timestamp to now.

        Args:
            ds_id: Data source UUID or string

        Returns:
            Updated DataSource instance, or None if not found
        """
        try:
            return await self.update(
                ds_id, {"last_synced_at": datetime.utcnow().isoformat()}
            )

        except Exception as e:
            raise DatabaseError(f"Failed to update sync timestamp: {str(e)}")

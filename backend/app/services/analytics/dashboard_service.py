"""
Dashboard Service

Provides dashboard statistics and analytics with Redis caching.
"""

import logging
from typing import List, Optional, Tuple
from datetime import datetime, date, timedelta
from collections import defaultdict

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.document import Document
from app.db.models.project import Project
from app.db.models.assistant_conversation import AssistantConversation
from app.db.redis import RedisClient, CacheKeys, CacheTTL
from app.db.repositories.knowledge_base import KnowledgeBaseRepository
from app.db.repositories.assistant_repository import AssistantRepository
from app.models.dashboard import (
    DashboardStats,
    TrendData,
    TrendDataPoint,
    ProjectDistribution,
    RecentDocument,
    UnifiedStats,
    TrendComparison,
    RecentActivity,
)

logger = logging.getLogger(__name__)


class DashboardService:
    """
    Dashboard service with Redis caching.

    Provides statistics and analytics for the dashboard with
    intelligent caching to reduce database load.
    """

    # Token cost estimation (approximate, based on OpenAI pricing)
    TOKEN_COST_PER_1K = 0.01  # $0.01 per 1K tokens (average)

    def __init__(
        self,
        session: AsyncSession,
        redis_client: Optional[RedisClient] = None,
    ):
        self.session = session
        self.redis = redis_client

    async def get_dashboard_stats(
        self,
        user_id: str,
        use_cache: bool = True,
    ) -> Tuple[DashboardStats, bool]:
        """
        Get dashboard statistics for a user.

        Args:
            user_id: User ID
            use_cache: Whether to use Redis cache

        Returns:
            Tuple of (DashboardStats, is_cached)
        """
        cache_key = CacheKeys.dashboard_stats(user_id)

        # Try cache first
        if use_cache and self.redis:
            cached = await self.redis.get_model(cache_key, DashboardStats)
            if cached:
                logger.debug(f"Dashboard stats cache HIT for user {user_id}")
                return cached, True

        logger.debug(f"Dashboard stats cache MISS for user {user_id}")

        # Query database
        stats = await self._compute_dashboard_stats(user_id)

        # Cache the result
        if self.redis:
            await self.redis.set_model(
                cache_key,
                stats,
                ttl=CacheTTL.DASHBOARD_STATS,
            )

        return stats, False

    async def _compute_dashboard_stats(self, user_id: str) -> DashboardStats:
        """Compute dashboard stats from database."""
        from uuid import UUID
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        # Document status counts
        status_query = (
            select(
                Document.status,
                func.count(Document.id).label("count"),
            )
            .where(
                and_(
                    Document.user_id == user_uuid,
                    Document.is_archived == False,
                )
            )
            .group_by(Document.status)
        )
        result = await self.session.execute(status_query)
        status_counts = {row.status: row.count for row in result.all()}

        # Total documents
        total_documents = sum(status_counts.values())

        # Project count
        project_query = (
            select(func.count(Project.id))
            .where(
                and_(
                    Project.user_id == user_uuid,
                    Project.is_active == True,
                )
            )
        )
        result = await self.session.execute(project_query)
        total_projects = result.scalar() or 0

        # Token usage
        token_query = (
            select(func.coalesce(func.sum(Document.tokens_used), 0))
            .where(
                and_(
                    Document.user_id == user_uuid,
                    Document.is_archived == False,
                )
            )
        )
        result = await self.session.execute(token_query)
        total_tokens = result.scalar() or 0

        # Calculate stats
        processed_count = status_counts.get("completed", 0) + status_counts.get("processed", 0)
        pending_count = status_counts.get("pending", 0)
        processing_count = status_counts.get("processing", 0)
        failed_count = status_counts.get("failed", 0)

        # Success rate
        total_processed = processed_count + failed_count
        success_rate = (processed_count / total_processed) if total_processed > 0 else 0.0

        # Estimated cost
        estimated_cost = (total_tokens / 1000) * self.TOKEN_COST_PER_1K

        return DashboardStats(
            total_projects=total_projects,
            total_documents=total_documents,
            processed_documents=processed_count,
            pending_documents=pending_count,
            processing_documents=processing_count,
            failed_documents=failed_count,
            success_rate=round(success_rate, 4),
            total_tokens_used=total_tokens,
            estimated_cost=round(estimated_cost, 2),
        )

    async def get_trends(
        self,
        user_id: str,
        days: int = 30,
        use_cache: bool = True,
    ) -> Tuple[TrendData, bool]:
        """
        Get document processing trends for the last N days.

        Args:
            user_id: User ID
            days: Number of days to include (7-90)
            use_cache: Whether to use Redis cache

        Returns:
            Tuple of (TrendData, is_cached)
        """
        # Clamp days to valid range
        days = max(7, min(90, days))

        cache_key = CacheKeys.dashboard_trends(user_id, days)

        # Try cache first
        if use_cache and self.redis:
            cached = await self.redis.get_model(cache_key, TrendData)
            if cached:
                logger.debug(f"Dashboard trends cache HIT for user {user_id}")
                return cached, True

        logger.debug(f"Dashboard trends cache MISS for user {user_id}")

        # Query database
        trends = await self._compute_trends(user_id, days)

        # Cache the result
        if self.redis:
            await self.redis.set_model(
                cache_key,
                trends,
                ttl=CacheTTL.DASHBOARD_TRENDS,
            )

        return trends, False

    async def _compute_trends(self, user_id: str, days: int) -> TrendData:
        """Compute trend data from database."""
        from uuid import UUID
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days - 1)

        # Query for daily upload counts
        upload_query = (
            select(
                func.date(Document.created_at).label("date"),
                func.count(Document.id).label("count"),
            )
            .where(
                and_(
                    Document.user_id == user_uuid,
                    Document.is_archived == False,
                    func.date(Document.created_at) >= start_date,
                    func.date(Document.created_at) <= end_date,
                )
            )
            .group_by(func.date(Document.created_at))
        )
        result = await self.session.execute(upload_query)
        uploads_by_date = {row.date: row.count for row in result.all()}

        # Query for daily processed counts
        processed_query = (
            select(
                func.date(Document.processing_completed_at).label("date"),
                Document.status,
                func.count(Document.id).label("count"),
            )
            .where(
                and_(
                    Document.user_id == user_uuid,
                    Document.is_archived == False,
                    Document.processing_completed_at.isnot(None),
                    func.date(Document.processing_completed_at) >= start_date,
                    func.date(Document.processing_completed_at) <= end_date,
                )
            )
            .group_by(func.date(Document.processing_completed_at), Document.status)
        )
        result = await self.session.execute(processed_query)

        processed_by_date = defaultdict(int)
        failed_by_date = defaultdict(int)

        for row in result.all():
            if row.status in ("completed", "processed"):
                processed_by_date[row.date] += row.count
            elif row.status == "failed":
                failed_by_date[row.date] += row.count

        # Build data points for each day
        data_points = []
        total_uploaded = 0
        total_processed = 0
        total_failed = 0

        current_date = start_date
        while current_date <= end_date:
            uploaded = uploads_by_date.get(current_date, 0)
            processed = processed_by_date.get(current_date, 0)
            failed = failed_by_date.get(current_date, 0)

            total_uploaded += uploaded
            total_processed += processed
            total_failed += failed

            data_points.append(
                TrendDataPoint(
                    date=current_date,
                    uploaded=uploaded,
                    processed=processed,
                    failed=failed,
                )
            )
            current_date += timedelta(days=1)

        return TrendData(
            days=days,
            data=data_points,
            total_uploaded=total_uploaded,
            total_processed=total_processed,
            total_failed=total_failed,
        )

    async def get_recent_documents(
        self,
        user_id: str,
        limit: int = 5,
    ) -> List[RecentDocument]:
        """
        Get recent documents for dashboard.

        Args:
            user_id: User ID
            limit: Maximum number of documents to return

        Returns:
            List of recent documents
        """
        from uuid import UUID
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        query = (
            select(Document, Project.name.label("project_name"))
            .outerjoin(Project, Document.project_id == Project.id)
            .where(
                and_(
                    Document.user_id == user_uuid,
                    Document.is_archived == False,
                )
            )
            .order_by(Document.created_at.desc())
            .limit(limit)
        )

        result = await self.session.execute(query)
        rows = result.all()

        documents = []
        for row in rows:
            doc = row.Document
            project_name = row.project_name

            documents.append(
                RecentDocument(
                    document_id=str(doc.id),
                    filename=doc.original_filename,
                    status=doc.status,
                    project_id=str(doc.project_id) if doc.project_id else None,
                    project_name=project_name,
                    created_at=doc.created_at,
                    processed_at=doc.processing_completed_at,
                )
            )

        return documents

    async def get_project_distribution(
        self,
        user_id: str,
    ) -> List[ProjectDistribution]:
        """
        Get document distribution across projects.

        Args:
            user_id: User ID

        Returns:
            List of project distribution data
        """
        from uuid import UUID
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        # Query for document counts per project
        query = (
            select(
                Project.id,
                Project.name,
                func.count(Document.id).label("doc_count"),
            )
            .outerjoin(Document, and_(
                Document.project_id == Project.id,
                Document.is_archived == False,
            ))
            .where(
                and_(
                    Project.user_id == user_uuid,
                    Project.is_active == True,
                )
            )
            .group_by(Project.id, Project.name)
            .order_by(func.count(Document.id).desc())
        )

        result = await self.session.execute(query)
        rows = result.all()

        # Calculate total for percentage
        total_docs = sum(row.doc_count for row in rows)

        distribution = []
        for row in rows:
            percentage = (row.doc_count / total_docs * 100) if total_docs > 0 else 0.0

            distribution.append(
                ProjectDistribution(
                    project_id=str(row.id),
                    project_name=row.name,
                    document_count=row.doc_count,
                    percentage=round(percentage, 2),
                )
            )

        return distribution

    async def invalidate_user_cache(self, user_id: str) -> None:
        """
        Invalidate all dashboard cache for a user.

        Call this when document or project changes occur.

        Args:
            user_id: User ID
        """
        if self.redis:
            pattern = f"dashboard:*:{user_id}*"
            deleted = await self.redis.delete_pattern(pattern)
            logger.debug(f"Invalidated {deleted} dashboard cache keys for user {user_id}")

    async def get_unified_stats(
        self,
        user_id: str,
        use_cache: bool = True,
    ) -> Tuple[UnifiedStats, bool]:
        """
        Get unified dashboard statistics including KB and Assistant data.

        Aggregates data from:
        - Document/project stats (existing)
        - Knowledge base stats
        - Assistant stats
        - Week-over-week trend comparison

        Args:
            user_id: User ID
            use_cache: Whether to use Redis cache

        Returns:
            Tuple of (UnifiedStats, is_cached)
        """
        cache_key = CacheKeys.dashboard_unified(user_id)

        # Try cache first
        if use_cache and self.redis:
            cached = await self.redis.get_model(cache_key, UnifiedStats)
            if cached:
                logger.debug(f"Unified stats cache HIT for user {user_id}")
                return cached, True

        logger.debug(f"Unified stats cache MISS for user {user_id}")

        # Get base dashboard stats
        base_stats = await self._compute_dashboard_stats(user_id)

        # Get KB stats
        kb_repo = KnowledgeBaseRepository(self.session)
        kb_stats = await kb_repo.get_stats(user_id)

        # Get Assistant stats
        from uuid import UUID
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
        assistant_repo = AssistantRepository(self.session)
        assistant_stats = await assistant_repo.get_user_stats(user_uuid)

        # Calculate trend comparison
        trend_comparison = await self._compute_trend_comparison(user_id)

        # Build unified stats
        unified = UnifiedStats(
            # Base stats
            total_projects=base_stats.total_projects,
            total_documents=base_stats.total_documents,
            processed_documents=base_stats.processed_documents,
            pending_documents=base_stats.pending_documents,
            processing_documents=base_stats.processing_documents,
            failed_documents=base_stats.failed_documents,
            success_rate=base_stats.success_rate,
            total_tokens_used=base_stats.total_tokens_used,
            estimated_cost=base_stats.estimated_cost,
            # KB stats
            total_knowledge_bases=kb_stats.get("total_knowledge_bases", 0),
            total_data_sources=kb_stats.get("total_data_sources", 0),
            total_embeddings=kb_stats.get("total_embeddings", 0),
            # Assistant stats
            total_assistants=assistant_stats.get("total_assistants", 0),
            active_assistants=assistant_stats.get("active_assistants", 0),
            total_conversations=assistant_stats.get("total_conversations", 0),
            unresolved_conversations=assistant_stats.get("unresolved_conversations", 0),
            # Trend comparison
            trend_comparison=trend_comparison,
        )

        # Cache the result
        if self.redis:
            await self.redis.set_model(
                cache_key,
                unified,
                ttl=CacheTTL.DASHBOARD_STATS,
            )

        return unified, False

    async def _compute_trend_comparison(self, user_id: str) -> TrendComparison:
        """
        Compute week-over-week trend comparison.

        Args:
            user_id: User ID

        Returns:
            TrendComparison with document and conversation trends
        """
        from uuid import UUID
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        today = datetime.utcnow().date()
        # This week: last 7 days
        this_week_start = today - timedelta(days=6)
        # Last week: 8-14 days ago
        last_week_start = today - timedelta(days=13)
        last_week_end = today - timedelta(days=7)

        # Documents this week
        docs_this_week_query = (
            select(func.count(Document.id))
            .where(
                and_(
                    Document.user_id == user_uuid,
                    Document.is_archived == False,
                    func.date(Document.created_at) >= this_week_start,
                    func.date(Document.created_at) <= today,
                )
            )
        )
        result = await self.session.execute(docs_this_week_query)
        docs_this_week = result.scalar() or 0

        # Documents last week
        docs_last_week_query = (
            select(func.count(Document.id))
            .where(
                and_(
                    Document.user_id == user_uuid,
                    Document.is_archived == False,
                    func.date(Document.created_at) >= last_week_start,
                    func.date(Document.created_at) <= last_week_end,
                )
            )
        )
        result = await self.session.execute(docs_last_week_query)
        docs_last_week = result.scalar() or 0

        # Get user's assistant IDs for conversation queries
        from app.db.models.assistant import Assistant
        assistant_ids_query = (
            select(Assistant.id).where(Assistant.user_id == user_uuid)
        )
        result = await self.session.execute(assistant_ids_query)
        assistant_ids = [row[0] for row in result.fetchall()]

        # Conversations this week
        convs_this_week = 0
        convs_last_week = 0

        if assistant_ids:
            convs_this_week_query = (
                select(func.count(AssistantConversation.id))
                .where(
                    and_(
                        AssistantConversation.assistant_id.in_(assistant_ids),
                        func.date(AssistantConversation.created_at) >= this_week_start,
                        func.date(AssistantConversation.created_at) <= today,
                    )
                )
            )
            result = await self.session.execute(convs_this_week_query)
            convs_this_week = result.scalar() or 0

            convs_last_week_query = (
                select(func.count(AssistantConversation.id))
                .where(
                    and_(
                        AssistantConversation.assistant_id.in_(assistant_ids),
                        func.date(AssistantConversation.created_at) >= last_week_start,
                        func.date(AssistantConversation.created_at) <= last_week_end,
                    )
                )
            )
            result = await self.session.execute(convs_last_week_query)
            convs_last_week = result.scalar() or 0

        # Calculate percentage changes
        def calc_percent_change(current: int, previous: int) -> float:
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round(((current - previous) / previous) * 100, 1)

        return TrendComparison(
            documents_this_week=docs_this_week,
            documents_last_week=docs_last_week,
            documents_change_percent=calc_percent_change(docs_this_week, docs_last_week),
            conversations_this_week=convs_this_week,
            conversations_last_week=convs_last_week,
            conversations_change_percent=calc_percent_change(convs_this_week, convs_last_week),
        )

    async def get_recent_activity(
        self,
        user_id: str,
        limit: int = 5,
    ) -> List[RecentActivity]:
        """
        Get combined recent activity (documents + conversations).

        Merges recent documents and conversations into a unified
        activity feed sorted by timestamp.

        Args:
            user_id: User ID
            limit: Maximum number of items to return

        Returns:
            List of RecentActivity items sorted by timestamp descending
        """
        from uuid import UUID
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id

        activities: List[RecentActivity] = []

        # Get recent documents (fetch more than limit to allow merging)
        fetch_limit = limit * 2
        doc_query = (
            select(Document, Project.name.label("project_name"))
            .outerjoin(Project, Document.project_id == Project.id)
            .where(
                and_(
                    Document.user_id == user_uuid,
                    Document.is_archived == False,
                )
            )
            .order_by(Document.created_at.desc())
            .limit(fetch_limit)
        )
        result = await self.session.execute(doc_query)
        doc_rows = result.all()

        for row in doc_rows:
            doc = row.Document
            project_name = row.project_name
            activities.append(
                RecentActivity(
                    activity_id=str(doc.id),
                    activity_type="document",
                    title=doc.original_filename,
                    subtitle=project_name,
                    status=doc.status,
                    timestamp=doc.created_at,
                    metadata={
                        "project_id": str(doc.project_id) if doc.project_id else None,
                        "processed_at": doc.processing_completed_at.isoformat() if doc.processing_completed_at else None,
                    },
                )
            )

        # Get recent conversations
        from app.db.models.assistant import Assistant
        assistant_ids_query = (
            select(Assistant.id, Assistant.name)
            .where(Assistant.user_id == user_uuid)
        )
        result = await self.session.execute(assistant_ids_query)
        assistant_map = {row[0]: row[1] for row in result.fetchall()}

        if assistant_map:
            conv_query = (
                select(AssistantConversation)
                .where(
                    AssistantConversation.assistant_id.in_(list(assistant_map.keys()))
                )
                .order_by(AssistantConversation.last_message_at.desc())
                .limit(fetch_limit)
            )
            result = await self.session.execute(conv_query)
            conversations = result.scalars().all()

            for conv in conversations:
                assistant_name = assistant_map.get(conv.assistant_id, "Unknown Assistant")
                activities.append(
                    RecentActivity(
                        activity_id=str(conv.id),
                        activity_type="conversation",
                        title=conv.last_message_preview or "New Conversation",
                        subtitle=assistant_name,
                        status=conv.status,
                        timestamp=conv.last_message_at or conv.created_at,
                        metadata={
                            "assistant_id": str(conv.assistant_id),
                            "message_count": conv.message_count,
                        },
                    )
                )

        # Sort by timestamp and limit
        activities.sort(key=lambda x: x.timestamp, reverse=True)
        return activities[:limit]

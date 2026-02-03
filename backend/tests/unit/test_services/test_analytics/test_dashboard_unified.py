"""
Unit Tests for Dashboard Service - Week 6 Unified Stats

Tests for:
- get_unified_stats: Aggregated stats with KB, Assistants, and trends
- _compute_trend_comparison: Week-over-week trend calculations
- get_recent_activity: Combined document and conversation activity
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.analytics.dashboard_service import DashboardService
from app.models.dashboard import (
    DashboardStats,
    UnifiedStats,
    TrendComparison,
    RecentActivity,
)


@pytest.fixture
def mock_session():
    """Create a mock async database session."""
    session = AsyncMock()
    return session


@pytest.fixture
def mock_redis():
    """Create a mock Redis client."""
    redis = AsyncMock()
    redis.get_model = AsyncMock(return_value=None)
    redis.set_model = AsyncMock()
    redis.delete_pattern = AsyncMock(return_value=0)
    return redis


@pytest.fixture
def dashboard_service(mock_session, mock_redis):
    """Create a DashboardService instance with mocks."""
    return DashboardService(session=mock_session, redis_client=mock_redis)


@pytest.fixture
def sample_user_id():
    """Return a sample user UUID string."""
    return str(uuid4())


@pytest.fixture
def sample_base_stats():
    """Return sample DashboardStats."""
    return DashboardStats(
        total_projects=5,
        total_documents=100,
        processed_documents=80,
        pending_documents=10,
        processing_documents=5,
        failed_documents=5,
        success_rate=0.9412,
        total_tokens_used=50000,
        estimated_cost=0.50,
    )


class TestComputeTrendComparison:
    """Tests for _compute_trend_comparison method."""

    @pytest.mark.asyncio
    async def test_trend_comparison_with_increase(
        self, dashboard_service, mock_session, sample_user_id
    ):
        """Test trend comparison when this week is higher than last week."""
        # Setup mock responses for document counts
        # This week: 10 documents, Last week: 5 documents
        mock_result = MagicMock()
        mock_result.scalar.side_effect = [10, 5, 8, 4]  # docs_this, docs_last, convs_this, convs_last

        mock_session.execute = AsyncMock(return_value=mock_result)

        # Mock assistant IDs query
        mock_fetchall = MagicMock()
        mock_fetchall.fetchall.return_value = [(uuid4(),)]
        mock_session.execute.side_effect = [
            MagicMock(scalar=MagicMock(return_value=10)),  # docs this week
            MagicMock(scalar=MagicMock(return_value=5)),   # docs last week
            MagicMock(fetchall=MagicMock(return_value=[(uuid4(),)])),  # assistant IDs
            MagicMock(scalar=MagicMock(return_value=8)),   # convs this week
            MagicMock(scalar=MagicMock(return_value=4)),   # convs last week
        ]

        result = await dashboard_service._compute_trend_comparison(sample_user_id)

        assert isinstance(result, TrendComparison)
        assert result.documents_this_week == 10
        assert result.documents_last_week == 5
        assert result.documents_change_percent == 100.0  # 100% increase


    @pytest.mark.asyncio
    async def test_trend_comparison_with_decrease(
        self, dashboard_service, mock_session, sample_user_id
    ):
        """Test trend comparison when this week is lower than last week."""
        mock_session.execute.side_effect = [
            MagicMock(scalar=MagicMock(return_value=5)),   # docs this week
            MagicMock(scalar=MagicMock(return_value=10)),  # docs last week
            MagicMock(fetchall=MagicMock(return_value=[])),  # no assistants
        ]

        result = await dashboard_service._compute_trend_comparison(sample_user_id)

        assert result.documents_this_week == 5
        assert result.documents_last_week == 10
        assert result.documents_change_percent == -50.0  # 50% decrease

    @pytest.mark.asyncio
    async def test_trend_comparison_from_zero(
        self, dashboard_service, mock_session, sample_user_id
    ):
        """Test trend comparison when last week was zero."""
        mock_session.execute.side_effect = [
            MagicMock(scalar=MagicMock(return_value=5)),   # docs this week
            MagicMock(scalar=MagicMock(return_value=0)),   # docs last week
            MagicMock(fetchall=MagicMock(return_value=[])),  # no assistants
        ]

        result = await dashboard_service._compute_trend_comparison(sample_user_id)

        assert result.documents_this_week == 5
        assert result.documents_last_week == 0
        assert result.documents_change_percent == 100.0  # From 0 to positive = 100%

    @pytest.mark.asyncio
    async def test_trend_comparison_both_zero(
        self, dashboard_service, mock_session, sample_user_id
    ):
        """Test trend comparison when both weeks are zero."""
        mock_session.execute.side_effect = [
            MagicMock(scalar=MagicMock(return_value=0)),   # docs this week
            MagicMock(scalar=MagicMock(return_value=0)),   # docs last week
            MagicMock(fetchall=MagicMock(return_value=[])),  # no assistants
        ]

        result = await dashboard_service._compute_trend_comparison(sample_user_id)

        assert result.documents_this_week == 0
        assert result.documents_last_week == 0
        assert result.documents_change_percent == 0.0


class TestGetUnifiedStats:
    """Tests for get_unified_stats method."""

    @pytest.mark.asyncio
    async def test_unified_stats_cache_hit(
        self, dashboard_service, mock_redis, sample_user_id
    ):
        """Test that cached unified stats are returned when available."""
        cached_stats = UnifiedStats(
            total_projects=5,
            total_documents=100,
            processed_documents=80,
            pending_documents=10,
            processing_documents=5,
            failed_documents=5,
            success_rate=0.94,
            total_tokens_used=50000,
            estimated_cost=0.50,
            total_knowledge_bases=3,
            total_data_sources=10,
            total_embeddings=5000,
            total_assistants=2,
            active_assistants=2,
            total_conversations=15,
            unresolved_conversations=3,
            trend_comparison=TrendComparison(
                documents_this_week=10,
                documents_last_week=8,
                documents_change_percent=25.0,
                conversations_this_week=5,
                conversations_last_week=4,
                conversations_change_percent=25.0,
            ),
        )
        mock_redis.get_model = AsyncMock(return_value=cached_stats)

        result, is_cached = await dashboard_service.get_unified_stats(sample_user_id)

        assert is_cached is True
        assert result == cached_stats
        mock_redis.get_model.assert_called_once()

    @pytest.mark.asyncio
    async def test_unified_stats_cache_miss(
        self, dashboard_service, mock_session, mock_redis, sample_user_id
    ):
        """Test that stats are computed on cache miss."""
        mock_redis.get_model = AsyncMock(return_value=None)

        # Mock the complex database queries
        with patch.object(
            dashboard_service, '_compute_dashboard_stats', new_callable=AsyncMock
        ) as mock_compute_stats:
            mock_compute_stats.return_value = DashboardStats(
                total_projects=5,
                total_documents=100,
                processed_documents=80,
                pending_documents=10,
                processing_documents=5,
                failed_documents=5,
                success_rate=0.94,
                total_tokens_used=50000,
                estimated_cost=0.50,
            )

            with patch.object(
                dashboard_service, '_compute_trend_comparison', new_callable=AsyncMock
            ) as mock_trend:
                mock_trend.return_value = TrendComparison(
                    documents_this_week=10,
                    documents_last_week=8,
                    documents_change_percent=25.0,
                    conversations_this_week=5,
                    conversations_last_week=4,
                    conversations_change_percent=25.0,
                )

                # Mock KB repository
                with patch('app.services.analytics.dashboard_service.KnowledgeBaseRepository') as mock_kb_repo_class:
                    mock_kb_repo = MagicMock()
                    mock_kb_repo.get_stats = AsyncMock(return_value={
                        'total_knowledge_bases': 3,
                        'total_data_sources': 10,
                        'total_embeddings': 5000,
                    })
                    mock_kb_repo_class.return_value = mock_kb_repo

                    # Mock Assistant repository
                    with patch('app.services.analytics.dashboard_service.AssistantRepository') as mock_assistant_repo_class:
                        mock_assistant_repo = MagicMock()
                        mock_assistant_repo.get_user_stats = AsyncMock(return_value={
                            'total_assistants': 2,
                            'active_assistants': 2,
                            'total_conversations': 15,
                            'unresolved_conversations': 3,
                        })
                        mock_assistant_repo_class.return_value = mock_assistant_repo

                        result, is_cached = await dashboard_service.get_unified_stats(sample_user_id)

        assert is_cached is False
        assert isinstance(result, UnifiedStats)
        assert result.total_documents == 100
        assert result.total_knowledge_bases == 3
        assert result.total_assistants == 2
        assert result.trend_comparison is not None
        assert result.trend_comparison.documents_this_week == 10

    @pytest.mark.asyncio
    async def test_unified_stats_no_cache_flag(
        self, dashboard_service, mock_session, mock_redis, sample_user_id
    ):
        """Test that cache is bypassed when use_cache=False."""
        with patch.object(
            dashboard_service, '_compute_dashboard_stats', new_callable=AsyncMock
        ) as mock_compute_stats:
            mock_compute_stats.return_value = DashboardStats(
                total_projects=5,
                total_documents=100,
                processed_documents=80,
                pending_documents=10,
                processing_documents=5,
                failed_documents=5,
                success_rate=0.94,
                total_tokens_used=50000,
                estimated_cost=0.50,
            )

            with patch.object(
                dashboard_service, '_compute_trend_comparison', new_callable=AsyncMock
            ) as mock_trend:
                mock_trend.return_value = TrendComparison(
                    documents_this_week=10,
                    documents_last_week=8,
                    documents_change_percent=25.0,
                    conversations_this_week=5,
                    conversations_last_week=4,
                    conversations_change_percent=25.0,
                )

                with patch('app.services.analytics.dashboard_service.KnowledgeBaseRepository') as mock_kb_repo_class:
                    mock_kb_repo = MagicMock()
                    mock_kb_repo.get_stats = AsyncMock(return_value={
                        'total_knowledge_bases': 0,
                        'total_data_sources': 0,
                        'total_embeddings': 0,
                    })
                    mock_kb_repo_class.return_value = mock_kb_repo

                    with patch('app.services.analytics.dashboard_service.AssistantRepository') as mock_assistant_repo_class:
                        mock_assistant_repo = MagicMock()
                        mock_assistant_repo.get_user_stats = AsyncMock(return_value={
                            'total_assistants': 0,
                            'active_assistants': 0,
                            'total_conversations': 0,
                            'unresolved_conversations': 0,
                        })
                        mock_assistant_repo_class.return_value = mock_assistant_repo

                        result, is_cached = await dashboard_service.get_unified_stats(
                            sample_user_id, use_cache=False
                        )

        # Cache get should not be called when use_cache=False
        mock_redis.get_model.assert_not_called()
        assert is_cached is False


class TestGetRecentActivity:
    """Tests for get_recent_activity method."""

    @pytest.mark.asyncio
    async def test_recent_activity_documents_only(
        self, dashboard_service, mock_session, sample_user_id
    ):
        """Test recent activity with only documents (no assistants)."""
        # Mock document query result
        mock_doc = MagicMock()
        mock_doc.Document.id = uuid4()
        mock_doc.Document.original_filename = "test.pdf"
        mock_doc.Document.status = "completed"
        mock_doc.Document.project_id = None
        mock_doc.Document.created_at = datetime.utcnow()
        mock_doc.Document.processing_completed_at = datetime.utcnow()
        mock_doc.project_name = None

        mock_session.execute.side_effect = [
            MagicMock(all=MagicMock(return_value=[mock_doc])),  # documents
            MagicMock(fetchall=MagicMock(return_value=[])),  # no assistants
        ]

        result = await dashboard_service.get_recent_activity(sample_user_id, limit=5)

        assert len(result) == 1
        assert result[0].activity_type == "document"
        assert result[0].title == "test.pdf"
        assert result[0].status == "completed"

    @pytest.mark.asyncio
    async def test_recent_activity_mixed(
        self, dashboard_service, mock_session, sample_user_id
    ):
        """Test recent activity with both documents and conversations."""
        now = datetime.utcnow()
        doc_time = now - timedelta(hours=1)
        conv_time = now - timedelta(minutes=30)

        # Mock document
        mock_doc = MagicMock()
        mock_doc.Document.id = uuid4()
        mock_doc.Document.original_filename = "report.pdf"
        mock_doc.Document.status = "completed"
        mock_doc.Document.project_id = uuid4()
        mock_doc.Document.created_at = doc_time
        mock_doc.Document.processing_completed_at = doc_time
        mock_doc.project_name = "Project A"

        # Mock conversation
        mock_conv = MagicMock()
        mock_conv.id = uuid4()
        mock_conv.assistant_id = uuid4()
        mock_conv.last_message_preview = "Hello, how can I help?"
        mock_conv.status = "active"
        mock_conv.last_message_at = conv_time
        mock_conv.created_at = conv_time
        mock_conv.message_count = 5

        assistant_id = mock_conv.assistant_id

        mock_session.execute.side_effect = [
            MagicMock(all=MagicMock(return_value=[mock_doc])),  # documents
            MagicMock(fetchall=MagicMock(return_value=[(assistant_id, "My Assistant")])),  # assistants
            MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[mock_conv])))),  # conversations
        ]

        result = await dashboard_service.get_recent_activity(sample_user_id, limit=5)

        assert len(result) == 2
        # Should be sorted by timestamp descending - conversation is more recent
        assert result[0].activity_type == "conversation"
        assert result[0].title == "Hello, how can I help?"
        assert result[1].activity_type == "document"
        assert result[1].title == "report.pdf"

    @pytest.mark.asyncio
    async def test_recent_activity_empty(
        self, dashboard_service, mock_session, sample_user_id
    ):
        """Test recent activity when no activity exists."""
        mock_session.execute.side_effect = [
            MagicMock(all=MagicMock(return_value=[])),  # no documents
            MagicMock(fetchall=MagicMock(return_value=[])),  # no assistants
        ]

        result = await dashboard_service.get_recent_activity(sample_user_id, limit=5)

        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_recent_activity_respects_limit(
        self, dashboard_service, mock_session, sample_user_id
    ):
        """Test that recent activity respects the limit parameter."""
        now = datetime.utcnow()

        # Create 10 mock documents
        mock_docs = []
        for i in range(10):
            mock_doc = MagicMock()
            mock_doc.Document.id = uuid4()
            mock_doc.Document.original_filename = f"doc_{i}.pdf"
            mock_doc.Document.status = "completed"
            mock_doc.Document.project_id = None
            mock_doc.Document.created_at = now - timedelta(hours=i)
            mock_doc.Document.processing_completed_at = now - timedelta(hours=i)
            mock_doc.project_name = None
            mock_docs.append(mock_doc)

        mock_session.execute.side_effect = [
            MagicMock(all=MagicMock(return_value=mock_docs)),  # documents
            MagicMock(fetchall=MagicMock(return_value=[])),  # no assistants
        ]

        result = await dashboard_service.get_recent_activity(sample_user_id, limit=5)

        assert len(result) == 5
        # Verify sorted by timestamp descending
        assert result[0].title == "doc_0.pdf"  # Most recent


class TestUnifiedStatsModel:
    """Tests for UnifiedStats Pydantic model."""

    def test_unified_stats_model_creation(self):
        """Test that UnifiedStats model can be created with all fields."""
        stats = UnifiedStats(
            total_projects=5,
            total_documents=100,
            processed_documents=80,
            pending_documents=10,
            processing_documents=5,
            failed_documents=5,
            success_rate=0.94,
            total_tokens_used=50000,
            estimated_cost=0.50,
            total_knowledge_bases=3,
            total_data_sources=10,
            total_embeddings=5000,
            total_assistants=2,
            active_assistants=2,
            total_conversations=15,
            unresolved_conversations=3,
            trend_comparison=TrendComparison(
                documents_this_week=10,
                documents_last_week=8,
                documents_change_percent=25.0,
                conversations_this_week=5,
                conversations_last_week=4,
                conversations_change_percent=25.0,
            ),
        )

        assert stats.total_documents == 100
        assert stats.total_knowledge_bases == 3
        assert stats.total_assistants == 2
        assert stats.trend_comparison.documents_change_percent == 25.0

    def test_unified_stats_model_with_none_trend(self):
        """Test that UnifiedStats can have None trend_comparison."""
        stats = UnifiedStats(
            total_projects=0,
            total_documents=0,
            processed_documents=0,
            pending_documents=0,
            processing_documents=0,
            failed_documents=0,
            success_rate=0.0,
            total_tokens_used=0,
            estimated_cost=0.0,
            total_knowledge_bases=0,
            total_data_sources=0,
            total_embeddings=0,
            total_assistants=0,
            active_assistants=0,
            total_conversations=0,
            unresolved_conversations=0,
            trend_comparison=None,
        )

        assert stats.trend_comparison is None


class TestTrendComparisonModel:
    """Tests for TrendComparison Pydantic model."""

    def test_trend_comparison_positive(self):
        """Test trend comparison with positive change."""
        trend = TrendComparison(
            documents_this_week=15,
            documents_last_week=10,
            documents_change_percent=50.0,
            conversations_this_week=20,
            conversations_last_week=15,
            conversations_change_percent=33.3,
        )

        assert trend.documents_change_percent == 50.0
        assert trend.conversations_change_percent == 33.3

    def test_trend_comparison_negative(self):
        """Test trend comparison with negative change."""
        trend = TrendComparison(
            documents_this_week=5,
            documents_last_week=10,
            documents_change_percent=-50.0,
            conversations_this_week=8,
            conversations_last_week=16,
            conversations_change_percent=-50.0,
        )

        assert trend.documents_change_percent == -50.0
        assert trend.conversations_change_percent == -50.0


class TestRecentActivityModel:
    """Tests for RecentActivity Pydantic model."""

    def test_recent_activity_document(self):
        """Test RecentActivity for document type."""
        activity = RecentActivity(
            activity_id=str(uuid4()),
            activity_type="document",
            title="test_document.pdf",
            subtitle="Project A",
            status="completed",
            timestamp=datetime.utcnow(),
            metadata={"project_id": str(uuid4()), "processed_at": None},
        )

        assert activity.activity_type == "document"
        assert activity.title == "test_document.pdf"

    def test_recent_activity_conversation(self):
        """Test RecentActivity for conversation type."""
        activity = RecentActivity(
            activity_id=str(uuid4()),
            activity_type="conversation",
            title="How do I use the API?",
            subtitle="Support Assistant",
            status="active",
            timestamp=datetime.utcnow(),
            metadata={"assistant_id": str(uuid4()), "message_count": 10},
        )

        assert activity.activity_type == "conversation"
        assert activity.metadata["message_count"] == 10

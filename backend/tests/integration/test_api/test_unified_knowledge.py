"""
Unified Knowledge & Insights Integration Tests

Tests for the unified query endpoint that routes to RAG or Analytics pipelines
based on LLM intent classification, plus the feedback endpoint.

Part of Unified Knowledge & Insights integration (Week 4).
"""

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.services.rag.pipeline_router import UnifiedResponse
from app.services.rag.generation_service import RAGResponse

settings = get_settings()
API_PREFIX = settings.API_V1_STR


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_rag_response():
    """Build a mock RAG pipeline response."""
    return UnifiedResponse(
        query_id=uuid.uuid4(),
        intent_type="rag",
        confidence=0.92,
        rag_response=RAGResponse(
            answer="The document discusses quarterly revenue growth of 15%.",
            sources=[
                {
                    "chunk_text": "Revenue grew by 15% in Q3...",
                    "document_id": str(uuid.uuid4()),
                    "document_name": "financial_report.pdf",
                    "document_title": "Q3 Financial Report",
                    "chunk_index": 0,
                    "similarity_score": 0.89,
                    "metadata": {},
                }
            ],
            model_used="gpt-4o-mini",
            tokens_used=350,
            confidence_score=0.88,
            context_used="Revenue grew by 15% in Q3...",
            groundedness_score=0.91,
            unsupported_claims=[],
        ),
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def mock_analytics_response():
    """Build a mock Analytics pipeline response."""
    return UnifiedResponse(
        query_id=uuid.uuid4(),
        intent_type="analytics",
        confidence=0.87,
        analytics_response={
            "sql": "SELECT category, SUM(amount) FROM sales GROUP BY category",
            "data": [
                {"category": "Electronics", "total": 45000},
                {"category": "Clothing", "total": 32000},
            ],
            "chart_type": "bar",
            "chart_config": {"x_axis": "category", "y_axis": "total"},
            "insights_text": "Electronics leads sales at $45K, followed by Clothing at $32K.",
        },
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_kb_id():
    """A sample knowledge base UUID."""
    return uuid.uuid4()


# =============================================================================
# Unified Query Endpoint Tests
# =============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
class TestUnifiedQueryEndpoint:
    """Integration tests for POST /rag/knowledge-bases/{kb_id}/unified-query."""

    async def test_unified_query_rag_intent(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_kb_id: uuid.UUID,
        mock_rag_response: UnifiedResponse,
    ):
        """Test unified query routed to RAG pipeline."""
        with patch(
            "app.api.v1.endpoints.rag.DataSourceRepository"
        ) as mock_ds_repo_cls, patch(
            "app.api.v1.endpoints.rag.PipelineRouter"
        ) as mock_router_cls:
            # Mock data source repository
            mock_ds_repo = AsyncMock()
            mock_ds_repo.get_by_knowledge_base.return_value = []
            mock_ds_repo_cls.return_value = mock_ds_repo

            # Mock pipeline router
            mock_router = AsyncMock()
            mock_router.route_query.return_value = mock_rag_response
            mock_router_cls.return_value = mock_router

            response = await async_client.post(
                f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
                json={"query": "What does the financial report say about revenue?"},
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert data["intent_type"] == "rag"
            assert data["confidence"] == pytest.approx(0.92)
            assert data["rag_response"] is not None
            assert data["analytics_response"] is None

            # Verify RAG response fields
            rag = data["rag_response"]
            assert "answer" in rag
            assert "sources" in rag
            assert len(rag["sources"]) == 1
            assert rag["sources"][0]["document_name"] == "financial_report.pdf"
            assert rag["groundedness_score"] == pytest.approx(0.91)

    async def test_unified_query_analytics_intent(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_kb_id: uuid.UUID,
        mock_analytics_response: UnifiedResponse,
    ):
        """Test unified query routed to Analytics pipeline."""
        with patch(
            "app.api.v1.endpoints.rag.DataSourceRepository"
        ) as mock_ds_repo_cls, patch(
            "app.api.v1.endpoints.rag.PipelineRouter"
        ) as mock_router_cls:
            mock_ds_repo = AsyncMock()
            mock_ds_repo.get_by_knowledge_base.return_value = []
            mock_ds_repo_cls.return_value = mock_ds_repo

            mock_router = AsyncMock()
            mock_router.route_query.return_value = mock_analytics_response
            mock_router_cls.return_value = mock_router

            response = await async_client.post(
                f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
                json={"query": "Show me total sales by category"},
                headers=auth_headers,
            )

            assert response.status_code == 200
            data = response.json()

            assert data["intent_type"] == "analytics"
            assert data["confidence"] == pytest.approx(0.87)
            assert data["analytics_response"] is not None
            assert data["rag_response"] is None

            # Verify analytics response fields
            analytics = data["analytics_response"]
            assert analytics["sql"] == "SELECT category, SUM(amount) FROM sales GROUP BY category"
            assert len(analytics["data"]) == 2
            assert analytics["chart_type"] == "bar"
            assert analytics["insights_text"] is not None

    async def test_unified_query_with_conversation_id(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_kb_id: uuid.UUID,
        mock_rag_response: UnifiedResponse,
    ):
        """Test unified query passes conversation_id for stickiness."""
        conv_id = str(uuid.uuid4())

        with patch(
            "app.api.v1.endpoints.rag.DataSourceRepository"
        ) as mock_ds_repo_cls, patch(
            "app.api.v1.endpoints.rag.PipelineRouter"
        ) as mock_router_cls, patch(
            "app.api.v1.endpoints.rag.RAGQueryRepository"
        ) as mock_query_repo_cls:
            mock_ds_repo = AsyncMock()
            mock_ds_repo.get_by_knowledge_base.return_value = []
            mock_ds_repo_cls.return_value = mock_ds_repo

            # Mock conversation lookup returning a prior analytics query
            mock_query_repo = AsyncMock()
            mock_last_query = MagicMock()
            mock_last_query.intent_type = "analytics"
            mock_last_query.dataset_id = uuid.uuid4()
            mock_query_repo.get_last_by_conversation.return_value = mock_last_query
            mock_query_repo_cls.return_value = mock_query_repo

            mock_router = AsyncMock()
            mock_router.route_query.return_value = mock_rag_response
            mock_router_cls.return_value = mock_router

            response = await async_client.post(
                f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
                json={
                    "query": "What about the latest trends?",
                    "conversation_id": conv_id,
                },
                headers=auth_headers,
            )

            assert response.status_code == 200

            # Verify conversation_context was built from prior query
            call_kwargs = mock_router.route_query.call_args.kwargs
            assert call_kwargs["conversation_id"] == conv_id
            assert call_kwargs["conversation_context"] is not None
            assert call_kwargs["conversation_context"]["last_intent"] == "analytics"

    async def test_unified_query_validation_empty_query(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_kb_id: uuid.UUID,
    ):
        """Test validation rejects empty query string."""
        response = await async_client.post(
            f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
            json={"query": ""},
            headers=auth_headers,
        )

        assert response.status_code == 422

    async def test_unified_query_validation_query_too_long(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_kb_id: uuid.UUID,
    ):
        """Test validation rejects query exceeding max length."""
        response = await async_client.post(
            f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
            json={"query": "a" * 2001},
            headers=auth_headers,
        )

        assert response.status_code == 422

    async def test_unified_query_unauthenticated(
        self,
        async_client: AsyncClient,
        sample_kb_id: uuid.UUID,
    ):
        """Test unified query requires authentication."""
        response = await async_client.post(
            f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
            json={"query": "Test query"},
        )

        assert response.status_code == 401

    async def test_unified_query_pipeline_error(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_kb_id: uuid.UUID,
    ):
        """Test error handling when pipeline raises an exception."""
        with patch(
            "app.api.v1.endpoints.rag.DataSourceRepository"
        ) as mock_ds_repo_cls, patch(
            "app.api.v1.endpoints.rag.PipelineRouter"
        ) as mock_router_cls:
            mock_ds_repo = AsyncMock()
            mock_ds_repo.get_by_knowledge_base.return_value = []
            mock_ds_repo_cls.return_value = mock_ds_repo

            mock_router = AsyncMock()
            mock_router.route_query.side_effect = Exception("OpenAI API timeout")
            mock_router_cls.return_value = mock_router

            response = await async_client.post(
                f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
                json={"query": "What is in this document?"},
                headers=auth_headers,
            )

            assert response.status_code == 500
            data = response.json()
            assert "Unified query failed" in data["detail"]

    async def test_unified_query_with_search_mode(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_kb_id: uuid.UUID,
        mock_rag_response: UnifiedResponse,
    ):
        """Test unified query passes search_mode parameter."""
        with patch(
            "app.api.v1.endpoints.rag.DataSourceRepository"
        ) as mock_ds_repo_cls, patch(
            "app.api.v1.endpoints.rag.PipelineRouter"
        ) as mock_router_cls:
            mock_ds_repo = AsyncMock()
            mock_ds_repo.get_by_knowledge_base.return_value = []
            mock_ds_repo_cls.return_value = mock_ds_repo

            mock_router = AsyncMock()
            mock_router.route_query.return_value = mock_rag_response
            mock_router_cls.return_value = mock_router

            response = await async_client.post(
                f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
                json={
                    "query": "Summarize the report",
                    "search_mode": "semantic",
                },
                headers=auth_headers,
            )

            assert response.status_code == 200
            call_kwargs = mock_router.route_query.call_args.kwargs
            assert call_kwargs["search_mode"] == "semantic"

    async def test_unified_query_builds_data_sources(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        sample_kb_id: uuid.UUID,
        mock_rag_response: UnifiedResponse,
    ):
        """Test that data source info is correctly built from DB and passed to router."""
        mock_doc_source = MagicMock()
        mock_doc_source.id = uuid.uuid4()
        mock_doc_source.type = "uploaded_docs"
        mock_doc_source.name = "Documents"
        mock_doc_source.config = {}

        mock_structured_source = MagicMock()
        mock_structured_source.id = uuid.uuid4()
        mock_structured_source.type = "structured_data"
        mock_structured_source.name = "Sales Data"
        mock_structured_source.config = {
            "schema_definition": {
                "columns": [
                    {"name": "category", "type": "string"},
                    {"name": "amount", "type": "float"},
                ]
            }
        }

        with patch(
            "app.api.v1.endpoints.rag.DataSourceRepository"
        ) as mock_ds_repo_cls, patch(
            "app.api.v1.endpoints.rag.PipelineRouter"
        ) as mock_router_cls:
            mock_ds_repo = AsyncMock()
            mock_ds_repo.get_by_knowledge_base.return_value = [
                mock_doc_source,
                mock_structured_source,
            ]
            mock_ds_repo_cls.return_value = mock_ds_repo

            mock_router = AsyncMock()
            mock_router.route_query.return_value = mock_rag_response
            mock_router_cls.return_value = mock_router

            response = await async_client.post(
                f"{API_PREFIX}/rag/knowledge-bases/{sample_kb_id}/unified-query",
                json={"query": "What is our top category?"},
                headers=auth_headers,
            )

            assert response.status_code == 200

            # Verify data_sources passed to router
            call_kwargs = mock_router.route_query.call_args.kwargs
            data_sources = call_kwargs["data_sources"]
            assert len(data_sources) == 2

            # Check structured_data source has columns extracted
            structured_ds = [ds for ds in data_sources if ds.type == "structured_data"][0]
            assert structured_ds.columns == ["category", "amount"]

            # Check doc source has no columns
            doc_ds = [ds for ds in data_sources if ds.type == "uploaded_docs"][0]
            assert doc_ds.columns == []


# =============================================================================
# Feedback Endpoint Tests
# =============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
class TestUnifiedFeedbackEndpoint:
    """Integration tests for POST /rag/queries/{query_id}/feedback."""

    async def test_submit_positive_feedback(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        clean_db: AsyncSession,
        test_user_data: dict,
    ):
        """Test submitting positive feedback (thumbs up)."""
        from app.db.models.user import User
        from app.db.models.rag import RAGQuery
        from sqlalchemy import select

        # Get the test user
        result = await clean_db.execute(
            select(User).where(User.email == test_user_data["email"])
        )
        user = result.scalar_one()

        # Create a query record
        query_record = RAGQuery(
            user_id=user.id,
            question="What is the revenue?",
            answer="Revenue grew by 15%.",
            intent_type="rag",
            intent_confidence=0.92,
        )
        clean_db.add(query_record)
        await clean_db.commit()
        await clean_db.refresh(query_record)

        # Submit positive feedback
        response = await async_client.post(
            f"{API_PREFIX}/rag/queries/{query_record.id}/feedback",
            json={"rating": 5},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify feedback was stored
        await clean_db.refresh(query_record)
        assert query_record.feedback_rating == 5

    async def test_submit_negative_feedback_with_intent_correction(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        clean_db: AsyncSession,
        test_user_data: dict,
    ):
        """Test submitting negative feedback with intent correction."""
        from app.db.models.user import User
        from app.db.models.rag import RAGQuery
        from sqlalchemy import select

        result = await clean_db.execute(
            select(User).where(User.email == test_user_data["email"])
        )
        user = result.scalar_one()

        query_record = RAGQuery(
            user_id=user.id,
            question="Show me sales by region",
            answer="The document mentions regional data...",
            intent_type="rag",
            intent_confidence=0.65,
        )
        clean_db.add(query_record)
        await clean_db.commit()
        await clean_db.refresh(query_record)

        # Submit negative feedback with intent correction
        response = await async_client.post(
            f"{API_PREFIX}/rag/queries/{query_record.id}/feedback",
            json={
                "rating": 1,
                "correct_intent": "analytics",
            },
            headers=auth_headers,
        )

        assert response.status_code == 200

        # Verify intent correction was stored
        await clean_db.refresh(query_record)
        assert query_record.feedback_rating == 1
        assert query_record.user_feedback_intent == "analytics"

    async def test_feedback_nonexistent_query(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test feedback for a nonexistent query returns 404."""
        fake_id = uuid.uuid4()
        response = await async_client.post(
            f"{API_PREFIX}/rag/queries/{fake_id}/feedback",
            json={"rating": 3},
            headers=auth_headers,
        )

        assert response.status_code == 404

    async def test_feedback_other_users_query(
        self,
        async_client: AsyncClient,
        other_user_headers: dict,
        clean_db: AsyncSession,
        test_user_data: dict,
    ):
        """Test feedback on another user's query returns 403."""
        from app.db.models.user import User
        from app.db.models.rag import RAGQuery
        from sqlalchemy import select

        # Create query record owned by test_user (not other_user)
        result = await clean_db.execute(
            select(User).where(User.email == test_user_data["email"])
        )
        user = result.scalar_one()

        query_record = RAGQuery(
            user_id=user.id,
            question="Some query",
            answer="Some answer",
            intent_type="rag",
        )
        clean_db.add(query_record)
        await clean_db.commit()
        await clean_db.refresh(query_record)

        # Try to submit feedback as other_user
        response = await async_client.post(
            f"{API_PREFIX}/rag/queries/{query_record.id}/feedback",
            json={"rating": 2},
            headers=other_user_headers,
        )

        assert response.status_code == 403

    async def test_feedback_validation_rating_out_of_range(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test feedback validation rejects out-of-range rating."""
        fake_id = uuid.uuid4()

        # Rating too low
        response = await async_client.post(
            f"{API_PREFIX}/rag/queries/{fake_id}/feedback",
            json={"rating": 0},
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Rating too high
        response = await async_client.post(
            f"{API_PREFIX}/rag/queries/{fake_id}/feedback",
            json={"rating": 6},
            headers=auth_headers,
        )
        assert response.status_code == 422

    async def test_feedback_unauthenticated(
        self,
        async_client: AsyncClient,
    ):
        """Test feedback requires authentication."""
        fake_id = uuid.uuid4()
        response = await async_client.post(
            f"{API_PREFIX}/rag/queries/{fake_id}/feedback",
            json={"rating": 5},
        )

        assert response.status_code == 401

    async def test_feedback_without_intent_correction(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        clean_db: AsyncSession,
        test_user_data: dict,
    ):
        """Test feedback without intent correction only stores rating."""
        from app.db.models.user import User
        from app.db.models.rag import RAGQuery
        from sqlalchemy import select

        result = await clean_db.execute(
            select(User).where(User.email == test_user_data["email"])
        )
        user = result.scalar_one()

        query_record = RAGQuery(
            user_id=user.id,
            question="Analyze the data",
            answer="Analysis results...",
            intent_type="analytics",
            intent_confidence=0.95,
        )
        clean_db.add(query_record)
        await clean_db.commit()
        await clean_db.refresh(query_record)

        response = await async_client.post(
            f"{API_PREFIX}/rag/queries/{query_record.id}/feedback",
            json={"rating": 4},
            headers=auth_headers,
        )

        assert response.status_code == 200

        await clean_db.refresh(query_record)
        assert query_record.feedback_rating == 4
        assert query_record.user_feedback_intent is None

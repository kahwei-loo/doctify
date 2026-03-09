"""
Unit tests for PipelineRouter service.

Unified Knowledge & Insights integration.
"""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from dataclasses import dataclass

from app.services.rag.pipeline_router import PipelineRouter, UnifiedResponse
from app.services.rag.intent_classifier import (
    IntentType,
    ClassificationResult,
    DataSourceInfo,
)
from app.services.rag.generation_service import RAGResponse


# ── Fixtures ──────────────────────────────────────────────────────────

KB_ID = uuid.uuid4()
USER_ID = uuid.uuid4()
CONV_ID = str(uuid.uuid4())

DOC_SOURCE = DataSourceInfo(id="ds-1", type="uploaded_docs", name="Contracts")
STRUCTURED_SOURCE = DataSourceInfo(
    id="ds-3",
    type="structured_data",
    name="Sales Data",
    columns=["date", "revenue", "customer"],
)


def _make_rag_response(**kwargs) -> RAGResponse:
    defaults = dict(
        answer="The contract states payment within 30 days.",
        sources=[{"chunk_id": "c1", "text": "Payment within 30 days", "score": 0.9}],
        model_used="gpt-4",
        tokens_used=250,
        confidence_score=0.88,
        context_used=3,
    )
    defaults.update(kwargs)
    return RAGResponse(**defaults)


def _make_analytics_result():
    """Mock result from QueryService.process_query()."""
    result = MagicMock()
    result.generated_sql = "SELECT month, SUM(revenue) FROM sales GROUP BY month"
    result.data = [{"month": "Jan", "revenue": 10000}]
    result.text = "January had $10,000 in revenue."
    result.chart = MagicMock()
    result.chart.type = "bar"
    result.chart.config = {"x": "month", "y": "revenue"}
    return result


def _make_query_record():
    record = MagicMock()
    record.id = uuid.uuid4()
    record.created_at = MagicMock()
    return record


# ── Test Suite ────────────────────────────────────────────────────────


@pytest.mark.asyncio
class TestPipelineRouter:
    """Test suite for PipelineRouter."""

    @pytest.fixture
    def mock_session(self):
        session = AsyncMock()
        session.commit = AsyncMock()
        return session

    @pytest.fixture
    def router(self, mock_session):
        with (
            patch(
                "app.services.rag.pipeline_router.IntentClassifier"
            ) as MockClassifier,
            patch("app.services.rag.pipeline_router.GenerationService") as MockGen,
            patch("app.services.rag.pipeline_router.RAGQueryRepository") as MockRepo,
        ):

            MockClassifier.return_value = AsyncMock()
            MockGen.return_value = AsyncMock()
            MockRepo.return_value = AsyncMock()

            r = PipelineRouter(mock_session)
            r.classifier = MockClassifier.return_value
            r.generation_service = MockGen.return_value
            r.query_repo = MockRepo.return_value
            r.query_repo.create = AsyncMock(return_value=_make_query_record())
            return r

    # ── RAG Routing ───────────────────────────────────────────────

    async def test_routes_to_rag_pipeline(self, router, mock_session):
        """Query classified as RAG should call generation_service."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.RAG,
                confidence=0.95,
                reasoning="Document question",
                latency_ms=50,
            )
        )
        router.generation_service.generate_answer = AsyncMock(
            return_value=_make_rag_response()
        )

        result = await router.route_query(
            kb_id=KB_ID,
            query="What are the payment terms?",
            user_id=USER_ID,
            data_sources=[DOC_SOURCE],
        )

        assert result.intent_type == "rag"
        assert result.rag_response is not None
        assert result.analytics_response is None
        assert result.confidence == 0.95
        router.generation_service.generate_answer.assert_awaited_once()

    async def test_rag_uses_hybrid_search_mode(self, router, mock_session):
        """RAG should pass search_mode through to generation_service."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.RAG, confidence=0.9, latency_ms=40
            )
        )
        router.generation_service.generate_answer = AsyncMock(
            return_value=_make_rag_response()
        )

        await router.route_query(
            kb_id=KB_ID,
            query="Summarize the contract",
            user_id=USER_ID,
            data_sources=[DOC_SOURCE],
            search_mode="vector",
        )

        call_kwargs = router.generation_service.generate_answer.call_args.kwargs
        assert call_kwargs["search_mode"] == "vector"

    # ── Analytics Routing ─────────────────────────────────────────

    async def test_routes_to_analytics_pipeline(self, router, mock_session):
        """Query classified as analytics with dataset_id should call QueryService."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.ANALYTICS,
                confidence=0.92,
                dataset_id="ds-3",
                reasoning="Data aggregation query",
                latency_ms=60,
            )
        )

        mock_analytics_result = _make_analytics_result()

        with patch("app.services.insights.query_service.QueryService") as MockQS:
            MockQS.return_value.process_query = AsyncMock(
                return_value=mock_analytics_result
            )

            result = await router.route_query(
                kb_id=KB_ID,
                query="Total revenue by month",
                user_id=USER_ID,
                data_sources=[DOC_SOURCE, STRUCTURED_SOURCE],
                conversation_id=CONV_ID,
            )

        assert result.intent_type == "analytics"
        assert result.analytics_response is not None
        assert result.rag_response is None
        assert result.analytics_response["sql"] == mock_analytics_result.generated_sql

    async def test_analytics_without_conversation_id(self, router, mock_session):
        """Analytics without conversation_id should return needs_conversation response."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.ANALYTICS,
                confidence=0.9,
                dataset_id="ds-3",
                latency_ms=55,
            )
        )

        result = await router.route_query(
            kb_id=KB_ID,
            query="Show revenue",
            user_id=USER_ID,
            data_sources=[STRUCTURED_SOURCE],
            conversation_id=None,
        )

        assert result.intent_type == "analytics"
        assert result.analytics_response["needs_conversation"] is True
        assert result.analytics_response["dataset_id"] == "ds-3"

    async def test_analytics_no_dataset_id_falls_to_rag(self, router, mock_session):
        """Analytics without dataset_id should fall back to RAG pipeline."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.ANALYTICS,
                confidence=0.8,
                dataset_id=None,  # No dataset identified
                latency_ms=70,
            )
        )
        router.generation_service.generate_answer = AsyncMock(
            return_value=_make_rag_response()
        )

        result = await router.route_query(
            kb_id=KB_ID,
            query="Show me the data",
            user_id=USER_ID,
            data_sources=[DOC_SOURCE, STRUCTURED_SOURCE],
        )

        # Without dataset_id, the condition `classification.dataset_id` is falsy → RAG
        assert result.intent_type == "rag"
        router.generation_service.generate_answer.assert_awaited_once()

    # ── Conversation Stickiness ───────────────────────────────────

    async def test_conversation_context_passed_to_classifier(
        self, router, mock_session
    ):
        """Conversation context should be forwarded to the classifier."""
        context = {"last_intent": "analytics", "last_dataset_id": "ds-3"}
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.ANALYTICS,
                confidence=0.88,
                dataset_id="ds-3",
                latency_ms=45,
            )
        )

        with patch("app.services.insights.query_service.QueryService") as MockQS:
            MockQS.return_value.process_query = AsyncMock(
                return_value=_make_analytics_result()
            )

            await router.route_query(
                kb_id=KB_ID,
                query="Now show Q4",
                user_id=USER_ID,
                data_sources=[DOC_SOURCE, STRUCTURED_SOURCE],
                conversation_id=CONV_ID,
                conversation_context=context,
            )

        router.classifier.classify.assert_awaited_once()
        call_kwargs = router.classifier.classify.call_args.kwargs
        assert call_kwargs["conversation_context"] == context

    # ── Query Logging ─────────────────────────────────────────────

    async def test_logs_rag_query_to_db(self, router, mock_session):
        """RAG query should be logged with classification metadata."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.RAG,
                confidence=0.93,
                latency_ms=50,
            )
        )
        rag_resp = _make_rag_response()
        router.generation_service.generate_answer = AsyncMock(return_value=rag_resp)

        await router.route_query(
            kb_id=KB_ID,
            query="What about payment?",
            user_id=USER_ID,
            data_sources=[DOC_SOURCE],
        )

        router.query_repo.create.assert_awaited_once()
        log_data = router.query_repo.create.call_args[0][0]
        assert log_data["intent_type"] == "rag"
        assert log_data["intent_confidence"] == 0.93
        assert log_data["answer"] == rag_resp.answer
        assert log_data["model_used"] == rag_resp.model_used

    async def test_logs_analytics_query_to_db(self, router, mock_session):
        """Analytics query should log SQL and chart_type."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.ANALYTICS,
                confidence=0.91,
                dataset_id="ds-3",
                latency_ms=60,
            )
        )

        with patch("app.services.insights.query_service.QueryService") as MockQS:
            MockQS.return_value.process_query = AsyncMock(
                return_value=_make_analytics_result()
            )

            await router.route_query(
                kb_id=KB_ID,
                query="Revenue by month",
                user_id=USER_ID,
                data_sources=[STRUCTURED_SOURCE],
                conversation_id=CONV_ID,
            )

        log_data = router.query_repo.create.call_args[0][0]
        assert log_data["intent_type"] == "analytics"
        assert log_data["dataset_id"] == "ds-3"
        assert "SELECT" in log_data["generated_sql"]
        assert log_data["chart_type"] == "bar"

    async def test_query_id_and_created_at_set(self, router, mock_session):
        """Response should get query_id and created_at from the DB record."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.RAG, confidence=0.9, latency_ms=30
            )
        )
        router.generation_service.generate_answer = AsyncMock(
            return_value=_make_rag_response()
        )

        result = await router.route_query(
            kb_id=KB_ID,
            query="Test",
            user_id=USER_ID,
            data_sources=[DOC_SOURCE],
        )

        assert result.query_id is not None
        assert result.created_at is not None

    # ── Error Handling ────────────────────────────────────────────

    async def test_rag_pipeline_error_raises(self, router, mock_session):
        """RAG pipeline error should raise ValidationError."""
        from app.core.exceptions import ValidationError

        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.RAG, confidence=0.9, latency_ms=30
            )
        )
        router.generation_service.generate_answer = AsyncMock(
            side_effect=Exception("OpenAI timeout")
        )

        with pytest.raises(ValidationError, match="RAG query failed"):
            await router.route_query(
                kb_id=KB_ID,
                query="Test",
                user_id=USER_ID,
                data_sources=[DOC_SOURCE],
            )

    async def test_analytics_pipeline_error_raises(self, router, mock_session):
        """Analytics pipeline error should raise ValidationError."""
        from app.core.exceptions import ValidationError

        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.ANALYTICS,
                confidence=0.9,
                dataset_id="ds-3",
                latency_ms=30,
            )
        )

        with patch("app.services.insights.query_service.QueryService") as MockQS:
            MockQS.return_value.process_query = AsyncMock(
                side_effect=Exception("DuckDB error")
            )

            with pytest.raises(ValidationError, match="Analytics query failed"):
                await router.route_query(
                    kb_id=KB_ID,
                    query="Revenue",
                    user_id=USER_ID,
                    data_sources=[STRUCTURED_SOURCE],
                    conversation_id=CONV_ID,
                )

    # ── Session Commit ────────────────────────────────────────────

    async def test_session_committed_after_success(self, router, mock_session):
        """Session should be committed after successful query."""
        router.classifier.classify = AsyncMock(
            return_value=ClassificationResult(
                intent=IntentType.RAG, confidence=0.9, latency_ms=30
            )
        )
        router.generation_service.generate_answer = AsyncMock(
            return_value=_make_rag_response()
        )

        await router.route_query(
            kb_id=KB_ID,
            query="Test",
            user_id=USER_ID,
            data_sources=[DOC_SOURCE],
        )

        mock_session.commit.assert_awaited_once()

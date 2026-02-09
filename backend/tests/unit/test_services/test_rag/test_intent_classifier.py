"""
Unit tests for RAG Intent Classifier service.

Unified Knowledge & Insights integration.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.rag.intent_classifier import (
    IntentClassifier,
    IntentType,
    ClassificationResult,
    DataSourceInfo,
)


def _make_function_call_response(
    intent: str = "rag",
    confidence: float = 0.95,
    dataset_id: str = "",
    reasoning: str = "Test reasoning",
):
    """Helper to create a mock OpenAI function call response."""
    args = json.dumps({
        "intent": intent,
        "confidence": confidence,
        "dataset_id": dataset_id,
        "reasoning": reasoning,
    })
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.function_call = MagicMock()
    mock_response.choices[0].message.function_call.arguments = args
    return mock_response


# Sample data sources for tests
DOC_SOURCE = DataSourceInfo(id="ds-1", type="uploaded_docs", name="Contract Documents")
WEB_SOURCE = DataSourceInfo(id="ds-2", type="website", name="Company Website")
STRUCTURED_SOURCE = DataSourceInfo(
    id="ds-3",
    type="structured_data",
    name="Sales Data",
    columns=["date", "revenue", "customer", "product", "quantity"],
)
STRUCTURED_SOURCE_2 = DataSourceInfo(
    id="ds-4",
    type="structured_data",
    name="HR Data",
    columns=["employee_name", "department", "salary", "hire_date"],
)


@pytest.mark.asyncio
class TestIntentClassifier:
    """Test suite for RAG IntentClassifier."""

    @pytest.fixture
    def classifier(self):
        """Create IntentClassifier instance with mocked settings."""
        with patch("app.services.rag.intent_classifier.settings") as mock_settings:
            mock_settings.OPENAI_API_KEY = "test-key"
            mock_settings.OPENAI_BASE_URL = None
            mock_settings.INTENT_CLASSIFIER_MODEL = "gpt-4o-mini"
            mock_settings.INTENT_CONFIDENCE_THRESHOLD = 0.7
            mock_settings.DATASET_CONFIDENCE_THRESHOLD = 0.6
            return IntentClassifier()

    # ── Fast-Path Tests ───────────────────────────────────────────────

    async def test_fast_path_documents_only(self, classifier):
        """When KB has only document sources, should return RAG without LLM call."""
        data_sources = [DOC_SOURCE, WEB_SOURCE]
        result = await classifier.classify("What is the contract about?", data_sources)

        assert result.intent == IntentType.RAG
        assert result.confidence == 1.0
        assert result.dataset_id is None
        assert "only document" in result.reasoning.lower()

    async def test_fast_path_structured_only_single(self, classifier):
        """When KB has only one structured source, should return ANALYTICS with dataset_id."""
        data_sources = [STRUCTURED_SOURCE]
        result = await classifier.classify("What is total revenue?", data_sources)

        assert result.intent == IntentType.ANALYTICS
        assert result.confidence == 1.0
        assert result.dataset_id == "ds-3"

    async def test_fast_path_structured_only_multiple(self, classifier):
        """When KB has multiple structured sources, should return ANALYTICS with no dataset_id."""
        data_sources = [STRUCTURED_SOURCE, STRUCTURED_SOURCE_2]
        result = await classifier.classify("Show me data", data_sources)

        assert result.intent == IntentType.ANALYTICS
        assert result.confidence == 1.0
        assert result.dataset_id is None  # Can't auto-select from multiple

    # ── LLM Classification Tests ──────────────────────────────────────

    async def test_classify_rag_intent(self, classifier):
        """LLM classifies document Q&A query as RAG."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_resp = _make_function_call_response(
            intent="rag", confidence=0.92, reasoning="Asking about document content"
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            result = await classifier.classify(
                "What does the contract say about payment terms?", data_sources
            )
            assert result.intent == IntentType.RAG
            assert result.confidence == 0.92
            assert result.dataset_id is None

    async def test_classify_analytics_intent(self, classifier):
        """LLM classifies data query as ANALYTICS with dataset_id."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_resp = _make_function_call_response(
            intent="analytics",
            confidence=0.95,
            dataset_id="ds-3",
            reasoning="Aggregation query on structured data",
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            result = await classifier.classify(
                "What's the total revenue by month?", data_sources
            )
            assert result.intent == IntentType.ANALYTICS
            assert result.confidence == 0.95
            assert result.dataset_id == "ds-3"

    async def test_classify_ambiguous_falls_back_to_rag(self, classifier):
        """Ambiguous intent should fall back to RAG."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_resp = _make_function_call_response(
            intent="ambiguous", confidence=0.5, reasoning="Could be either"
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            result = await classifier.classify("Show me the data", data_sources)
            assert result.intent == IntentType.RAG
            assert result.confidence < 0.7

    async def test_low_confidence_falls_back_to_rag(self, classifier):
        """Low confidence analytics classification should fall back to RAG."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_resp = _make_function_call_response(
            intent="analytics", confidence=0.55, reasoning="Uncertain"
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            result = await classifier.classify("Tell me about revenue", data_sources)
            assert result.intent == IntentType.RAG

    # ── Bilingual Tests ───────────────────────────────────────────────

    async def test_classify_chinese_analytics_query(self, classifier):
        """Chinese analytics query should be classified correctly."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_resp = _make_function_call_response(
            intent="analytics",
            confidence=0.93,
            dataset_id="ds-3",
            reasoning="中文数据分析查询",
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            result = await classifier.classify("每月的总收入是多少?", data_sources)
            assert result.intent == IntentType.ANALYTICS

    async def test_classify_chinese_rag_query(self, classifier):
        """Chinese RAG query should be classified correctly."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_resp = _make_function_call_response(
            intent="rag", confidence=0.91, reasoning="中文文档问答"
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            result = await classifier.classify(
                "合同中关于付款条件怎么写的?", data_sources
            )
            assert result.intent == IntentType.RAG

    # ── Conversation Stickiness Tests ─────────────────────────────────

    async def test_conversation_stickiness_hint(self, classifier):
        """Previous analytics intent should be passed as context hint to LLM."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        context = {"last_intent": "analytics", "last_dataset_id": "ds-3"}
        mock_resp = _make_function_call_response(
            intent="analytics",
            confidence=0.88,
            dataset_id="ds-3",
            reasoning="Continuing analytics conversation",
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ) as mock_create:
            result = await classifier.classify(
                "Now show me Q4 numbers", data_sources, conversation_context=context
            )
            assert result.intent == IntentType.ANALYTICS
            assert result.dataset_id == "ds-3"

            # Verify the stickiness hint was included in the prompt
            call_args = mock_create.call_args
            user_msg = call_args.kwargs["messages"][1]["content"]
            assert "ds-3" in user_msg

    # ── Error Handling Tests ──────────────────────────────────────────

    async def test_api_error_falls_back_to_rag(self, classifier):
        """API errors should fall back to RAG with low confidence."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            side_effect=Exception("API timeout"),
        ):
            result = await classifier.classify("Test query", data_sources)
            assert result.intent == IntentType.RAG
            assert result.confidence == 0.5
            assert "error" in result.reasoning.lower()

    async def test_no_function_call_falls_back_to_rag(self, classifier):
        """Response without function call should fall back to RAG."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.function_call = None

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await classifier.classify("Test query", data_sources)
            assert result.intent == IntentType.RAG
            assert result.confidence == 0.5

    async def test_invalid_json_falls_back_to_rag(self, classifier):
        """Invalid JSON in function call arguments should fall back to RAG."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.function_call = MagicMock()
        mock_response.choices[0].message.function_call.arguments = "not-valid-json"

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await classifier.classify("Test query", data_sources)
            assert result.intent == IntentType.RAG
            assert result.confidence == 0.5

    # ── Multi-Dataset Disambiguation Tests ────────────────────────────

    async def test_invalid_dataset_id_cleared(self, classifier):
        """Dataset ID not in data sources should be cleared."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        mock_resp = _make_function_call_response(
            intent="analytics",
            confidence=0.9,
            dataset_id="nonexistent-id",
            reasoning="Test",
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            result = await classifier.classify("Total revenue?", data_sources)
            assert result.intent == IntentType.ANALYTICS
            assert result.dataset_id is None  # Invalid ID cleared

    async def test_valid_dataset_id_preserved(self, classifier):
        """Valid dataset ID matching a structured source should be preserved."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE, STRUCTURED_SOURCE_2]
        mock_resp = _make_function_call_response(
            intent="analytics",
            confidence=0.93,
            dataset_id="ds-4",
            reasoning="HR data query",
        )

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_resp,
        ):
            result = await classifier.classify(
                "What is the average salary by department?", data_sources
            )
            assert result.intent == IntentType.ANALYTICS
            assert result.dataset_id == "ds-4"

    # ── Latency Tracking Test ─────────────────────────────────────────

    async def test_latency_tracked(self, classifier):
        """Classification result should include latency in milliseconds."""
        data_sources = [DOC_SOURCE]  # Fast-path
        result = await classifier.classify("What is this about?", data_sources)
        assert result.latency_ms >= 0

    # ── Data Source Context Building ──────────────────────────────────

    def test_build_data_source_context(self, classifier):
        """Data source context should include column names for structured sources."""
        data_sources = [DOC_SOURCE, STRUCTURED_SOURCE]
        context = classifier._build_data_source_context(data_sources)

        assert "Contract Documents" in context
        assert "Sales Data" in context
        assert "revenue" in context
        assert "customer" in context

    def test_build_empty_data_source_context(self, classifier):
        """Empty data sources should return informative message."""
        context = classifier._build_data_source_context([])
        assert "No data sources" in context

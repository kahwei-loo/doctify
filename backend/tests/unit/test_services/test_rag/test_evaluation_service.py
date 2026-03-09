"""Unit tests for EvaluationService."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.rag.evaluation_service import (
    AggregatedEvaluation,
    EvaluationMetrics,
    EvaluationService,
)


def _make_llm_response(content: str) -> MagicMock:
    """Build a mock LLM response with the given message content."""
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message.content = content
    return response


@pytest.mark.unit
class TestEvaluationService:
    """Tests for EvaluationService._judge, evaluate_single_query, and run_evaluation."""

    @pytest.fixture(autouse=True)
    def setup_service(self):
        """Patch the AI gateway and instantiate the service."""
        self.mock_gateway = MagicMock()
        self.mock_gateway.acompletion = AsyncMock()

        with patch(
            "app.services.rag.evaluation_service.get_ai_gateway",
            return_value=self.mock_gateway,
        ):
            self.service = EvaluationService()

    @pytest.mark.asyncio
    async def test_judge_valid_json_returns_score(self):
        """_judge should parse valid JSON and return the score."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            '{"score": 0.8}'
        )

        result = await self.service._judge("some prompt")

        assert result == 0.8
        self.mock_gateway.acompletion.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_judge_invalid_json_returns_fallback(self):
        """_judge should return 0.5 fallback when LLM returns non-JSON."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            "This is not valid JSON"
        )

        result = await self.service._judge("some prompt")

        assert result == 0.5

    @pytest.mark.asyncio
    async def test_judge_exception_returns_fallback(self):
        """_judge should return 0.5 fallback when gateway raises an exception."""
        self.mock_gateway.acompletion.side_effect = RuntimeError("API timeout")

        result = await self.service._judge("some prompt")

        assert result == 0.5

    @pytest.mark.asyncio
    async def test_judge_clamps_score_above_one(self):
        """_judge should clamp scores above 1.0 to 1.0."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            '{"score": 1.5}'
        )

        result = await self.service._judge("some prompt")

        assert result == 1.0

    @pytest.mark.asyncio
    async def test_judge_clamps_score_below_zero(self):
        """_judge should clamp scores below 0.0 to 0.0."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            '{"score": -0.3}'
        )

        result = await self.service._judge("some prompt")

        assert result == 0.0

    @pytest.mark.asyncio
    async def test_evaluate_single_query_calls_all_four_judges(self):
        """evaluate_single_query should call _judge 4 times and return EvaluationMetrics."""
        scores = [0.9, 0.8, 0.7, 0.6]
        with patch.object(
            self.service,
            "_judge",
            new_callable=AsyncMock,
            side_effect=scores,
        ):
            result = await self.service.evaluate_single_query(
                question="What is X?",
                answer="X is Y.",
                sources=[{"chunk_text": "X is Y.", "similarity_score": 0.95}],
            )

        assert result == EvaluationMetrics(
            faithfulness=0.9,
            answer_relevancy=0.8,
            context_precision=0.7,
            context_recall=0.6,
        )

    @pytest.mark.asyncio
    async def test_run_evaluation_empty_queries_returns_zeros(self):
        """run_evaluation should return all zeros when no queries are found."""
        # Mock session.execute to return an empty result set
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []

        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars

        mock_session = AsyncMock()
        mock_session.execute = AsyncMock(return_value=mock_result)

        result = await self.service.run_evaluation(
            session=mock_session,
            user_id=None,
            sample_size=10,
        )

        assert result == AggregatedEvaluation(
            faithfulness=0.0,
            answer_relevancy=0.0,
            context_precision=0.0,
            context_recall=0.0,
            sample_size=0,
            queries_with_feedback=0,
            average_groundedness=None,
        )

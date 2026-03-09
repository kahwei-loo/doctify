"""Unit tests for GroundednessService."""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.rag.groundedness_service import (
    GroundednessResult,
    GroundednessService,
)


def _make_llm_response(content: str) -> MagicMock:
    """Build a mock LLM response with the given message content."""
    response = MagicMock()
    response.choices = [MagicMock()]
    response.choices[0].message.content = content
    return response


@pytest.mark.unit
class TestGroundednessService:
    """Tests for GroundednessService.check()."""

    @pytest.fixture(autouse=True)
    def setup_service(self):
        """Patch the AI gateway and instantiate the service."""
        self.mock_gateway = MagicMock()
        self.mock_gateway.acompletion = AsyncMock()

        with patch(
            "app.services.rag.groundedness_service.get_ai_gateway",
            return_value=self.mock_gateway,
        ):
            self.service = GroundednessService()

    @pytest.mark.asyncio
    async def test_empty_answer_returns_zero_score(self):
        """Empty answer should short-circuit with score 0.0 and no claims."""
        result = await self.service.check(answer="", context_chunks=["some context"])

        assert result == GroundednessResult(score=0.0, unsupported_claims=[])
        self.mock_gateway.acompletion.assert_not_called()

    @pytest.mark.asyncio
    async def test_whitespace_only_answer_returns_zero_score(self):
        """Whitespace-only answer is treated the same as empty."""
        result = await self.service.check(answer="   ", context_chunks=["ctx"])

        assert result == GroundednessResult(score=0.0, unsupported_claims=[])
        self.mock_gateway.acompletion.assert_not_called()

    @pytest.mark.asyncio
    async def test_empty_context_chunks_returns_unsupported(self):
        """No context chunks should return score 0.0 with an explanatory claim."""
        result = await self.service.check(answer="The sky is blue.", context_chunks=[])

        assert result.score == 0.0
        assert len(result.unsupported_claims) == 1
        assert "No context provided" in result.unsupported_claims[0]
        self.mock_gateway.acompletion.assert_not_called()

    @pytest.mark.asyncio
    async def test_valid_json_high_score(self):
        """LLM returns valid JSON with high score and no unsupported claims."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            '{"score": 0.9, "unsupported_claims": []}'
        )

        result = await self.service.check(
            answer="Paris is the capital of France.",
            context_chunks=["Paris is the capital of France."],
        )

        assert result.score == 0.9
        assert result.unsupported_claims == []
        self.mock_gateway.acompletion.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_valid_json_with_unsupported_claims(self):
        """LLM identifies unsupported claims correctly."""
        payload = {
            "score": 0.4,
            "unsupported_claims": [
                "The population is 2 million",
                "Founded in 300 BC",
            ],
        }
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            json.dumps(payload)
        )

        result = await self.service.check(
            answer="Paris has 2 million people and was founded in 300 BC.",
            context_chunks=["Paris is the capital of France."],
        )

        assert result.score == 0.4
        assert result.unsupported_claims == [
            "The population is 2 million",
            "Founded in 300 BC",
        ]

    @pytest.mark.asyncio
    async def test_score_clamped_above_one(self):
        """Score exceeding 1.0 should be clamped to 1.0."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            '{"score": 1.5, "unsupported_claims": []}'
        )

        result = await self.service.check(
            answer="Valid answer.",
            context_chunks=["Some context."],
        )

        assert result.score == 1.0

    @pytest.mark.asyncio
    async def test_score_clamped_below_zero(self):
        """Negative score should be clamped to 0.0."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            '{"score": -0.3, "unsupported_claims": []}'
        )

        result = await self.service.check(
            answer="Valid answer.",
            context_chunks=["Some context."],
        )

        assert result.score == 0.0

    @pytest.mark.asyncio
    async def test_invalid_json_returns_fallback(self):
        """Malformed JSON from LLM should return moderate fallback score."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            "This is not valid JSON at all"
        )

        result = await self.service.check(
            answer="Some answer.",
            context_chunks=["Some context."],
        )

        assert result == GroundednessResult(score=0.5, unsupported_claims=[])

    @pytest.mark.asyncio
    async def test_api_error_returns_fallback(self):
        """Gateway exception should return moderate fallback score."""
        self.mock_gateway.acompletion.side_effect = RuntimeError("API timeout")

        result = await self.service.check(
            answer="Some answer.",
            context_chunks=["Some context."],
        )

        assert result == GroundednessResult(score=0.5, unsupported_claims=[])

    @pytest.mark.asyncio
    async def test_non_list_unsupported_claims_treated_as_empty(self):
        """If LLM returns a non-list for unsupported_claims, treat as empty list."""
        self.mock_gateway.acompletion.return_value = _make_llm_response(
            '{"score": 0.7, "unsupported_claims": "not a list"}'
        )

        result = await self.service.check(
            answer="Answer text.",
            context_chunks=["Context text."],
        )

        assert result.score == 0.7
        assert result.unsupported_claims == []

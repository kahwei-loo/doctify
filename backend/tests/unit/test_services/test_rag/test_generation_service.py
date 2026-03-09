"""
Unit tests for GenerationService (RAG answer generation).

Tests cover prompt building, the full generate_answer workflow,
LLM fallback logic, and conversation-history query rewriting.
"""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.rag.generation_service import GenerationService, RAGResponse
from app.services.rag.groundedness_service import GroundednessResult
from app.core.exceptions import ValidationError, DatabaseError


MODULE = "app.services.rag.generation_service"
USER_ID = uuid.uuid4()


def _make_chunk(**overrides) -> dict:
    """Build a single context chunk dict."""
    defaults = {
        "chunk_text": "Revenue grew 15% year-over-year.",
        "document_name": "report.pdf",
        "chunk_index": 0,
        "similarity_score": 0.85,
        "rank_score": 0.85,
        "document_id": str(uuid.uuid4()),
        "data_source_id": None,
        "document_title": "Annual Report",
        "metadata": {},
        "search_mode": "hybrid",
    }
    defaults.update(overrides)
    return defaults


def _mock_llm_response(content: str = "Answer text", total_tokens: int = 150):
    """Build a mock object mimicking the litellm acompletion response."""
    message = MagicMock()
    message.content = content

    choice = MagicMock()
    choice.message = message

    usage = MagicMock()
    usage.total_tokens = total_tokens

    response = MagicMock()
    response.choices = [choice]
    response.usage = usage
    return response


def _build_service(
    mock_retrieval,
    mock_embedding,
    mock_security,
    mock_groundedness,
    mock_cache,
    mock_get_gateway,
    gateway=None,
):
    """Instantiate GenerationService with all dependencies mocked."""
    if gateway is None:
        gateway = MagicMock()
        gateway.get_model = MagicMock(return_value="openai/gpt-4o")
        gateway.acompletion = AsyncMock(return_value=_mock_llm_response())

    mock_get_gateway.return_value = gateway

    mock_retrieval.return_value = MagicMock()
    mock_retrieval.return_value.retrieve_context = AsyncMock(
        return_value=[_make_chunk()]
    )

    mock_embedding.return_value = MagicMock()
    mock_embedding.return_value.generate_embedding = AsyncMock(
        return_value=[0.1] * 1536
    )

    mock_security.return_value = MagicMock()
    mock_security.return_value.validate_query_safety = MagicMock(return_value=None)
    mock_security.return_value.sanitize_llm_output = MagicMock(side_effect=lambda x: x)

    mock_groundedness.return_value = MagicMock()
    mock_groundedness.return_value.check = AsyncMock(
        return_value=GroundednessResult(score=0.9, unsupported_claims=[])
    )

    mock_cache.return_value = MagicMock()
    mock_cache.return_value.get_cached = AsyncMock(return_value=None)
    mock_cache.return_value.cache_response = AsyncMock(return_value=None)

    session = AsyncMock()
    service = GenerationService(session)
    return service


_patches = (
    f"{MODULE}.RetrievalService",
    f"{MODULE}.EmbeddingService",
    f"{MODULE}.RAGSecurityValidator",
    f"{MODULE}.GroundednessService",
    f"{MODULE}.SemanticCacheService",
    f"{MODULE}.get_ai_gateway",
)


def _patch_all(fn):
    """Stack all six patches in consistent order."""
    for target in _patches:
        fn = patch(target)(fn)
    return fn


@pytest.mark.unit
class TestBuildRAGPrompt:
    """Tests for _build_rag_prompt (synchronous helper)."""

    @_patch_all
    def test_prompt_includes_numbered_sources(self, *mocks):
        service = _build_service(*mocks)
        chunks = [
            _make_chunk(document_name="a.pdf", chunk_index=0, chunk_text="Chunk A"),
            _make_chunk(document_name="b.pdf", chunk_index=1, chunk_text="Chunk B"),
        ]

        prompt = service._build_rag_prompt("What is revenue?", chunks)

        assert "[Source 1: a.pdf, Chunk 0]" in prompt
        assert "[Source 2: b.pdf, Chunk 1]" in prompt
        assert "Chunk A" in prompt
        assert "Chunk B" in prompt

    @_patch_all
    def test_prompt_includes_question(self, *mocks):
        service = _build_service(*mocks)
        question = "How did the product launch perform?"

        prompt = service._build_rag_prompt(question, [_make_chunk()])

        assert question in prompt
        assert "QUESTION:" in prompt


@pytest.mark.unit
class TestGenerateAnswer:
    """Tests for the main generate_answer async workflow."""

    @pytest.mark.asyncio
    @_patch_all
    async def test_empty_question_raises_validation_error(self, *mocks):
        service = _build_service(*mocks)

        with pytest.raises(ValidationError, match="Question cannot be empty"):
            await service.generate_answer(question="")

        with pytest.raises(ValidationError, match="Question cannot be empty"):
            await service.generate_answer(question="   ")

    @pytest.mark.asyncio
    @_patch_all
    async def test_success_returns_rag_response(self, *mocks):
        service = _build_service(*mocks)

        result = await service.generate_answer(
            question="What is the revenue?",
            user_id=USER_ID,
        )

        assert isinstance(result, RAGResponse)
        assert result.answer == "Answer text"
        assert result.model_used == "openai/gpt-4o"
        assert result.tokens_used == 150
        assert result.context_used == 1
        assert result.confidence_score > 0
        assert result.groundedness_score == 0.9
        assert result.unsupported_claims == []
        assert result.cached is False
        assert len(result.sources) == 1

    @pytest.mark.asyncio
    @_patch_all
    async def test_no_context_returns_empty_response(self, *mocks):
        service = _build_service(*mocks)
        service.retrieval_service.retrieve_context = AsyncMock(return_value=[])

        result = await service.generate_answer(question="Unknown topic?")

        assert isinstance(result, RAGResponse)
        assert "don't have" in result.answer.lower()
        assert result.sources == []
        assert result.confidence_score == 0.0
        assert result.tokens_used == 0
        assert result.model_used == "none"
        assert result.context_used == 0

    @pytest.mark.asyncio
    @_patch_all
    async def test_llm_failure_falls_back_to_chat_fast(self, *mocks):
        service = _build_service(*mocks)

        fallback_response = _mock_llm_response(
            content="Fallback answer", total_tokens=80
        )
        service.gateway.acompletion = AsyncMock(
            side_effect=[Exception("Primary LLM down"), fallback_response]
        )
        service.gateway.get_model = MagicMock(
            side_effect=lambda purpose: (
                "openai/gpt-4o"
                if str(purpose).endswith("CHAT")
                else "openai/gpt-4o-mini"
            )
        )

        result = await service.generate_answer(question="Test question")

        assert result.answer == "Fallback answer"
        assert result.tokens_used == 80
        assert service.gateway.acompletion.call_count == 2

    @pytest.mark.asyncio
    @_patch_all
    async def test_llm_failure_and_fallback_failure_raises_database_error(self, *mocks):
        service = _build_service(*mocks)

        service.gateway.acompletion = AsyncMock(
            side_effect=Exception("All models down")
        )
        service.gateway.get_model = MagicMock(
            side_effect=lambda purpose: (
                "openai/gpt-4o"
                if str(purpose).endswith("CHAT")
                else "openai/gpt-4o-mini"
            )
        )

        with pytest.raises(DatabaseError, match="LLM generation failed"):
            await service.generate_answer(question="Test question")

        assert service.gateway.acompletion.call_count == 2


@pytest.mark.unit
class TestGenerateAnswerWithConversationHistory:
    """Tests for generate_answer_with_conversation_history."""

    @pytest.mark.asyncio
    @_patch_all
    async def test_rewrites_query_then_generates(self, *mocks):
        service = _build_service(*mocks)

        rewritten = "What was the revenue last year?"
        service._rewrite_query = AsyncMock(return_value=rewritten)

        history = [
            {"role": "user", "content": "What is the revenue?"},
            {"role": "assistant", "content": "Revenue is $2.5M."},
        ]

        result = await service.generate_answer_with_conversation_history(
            question="What about last year?",
            conversation_history=history,
            user_id=USER_ID,
        )

        service._rewrite_query.assert_awaited_once_with(
            "What about last year?", history
        )
        assert isinstance(result, RAGResponse)
        assert result.answer == "Answer text"

        service.retrieval_service.retrieve_context.assert_awaited_once()
        call_kwargs = service.retrieval_service.retrieve_context.call_args.kwargs
        assert call_kwargs["question"] == rewritten

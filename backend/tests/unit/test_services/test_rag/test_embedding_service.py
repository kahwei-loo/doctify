"""
Unit tests for EmbeddingService (RAG text chunking and embedding generation).

Tests cover text chunking strategies (fixed, semantic), embedding generation,
dimension validation, and error handling.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.rag.embedding_service import EmbeddingService
from app.core.exceptions import ValidationError, DatabaseError

MODULE = "app.services.rag.embedding_service"


# ---------------------------------------------------------------------------
# Patch helpers
# ---------------------------------------------------------------------------

# For chunk_text tests: only mock the 3 non-tiktoken deps so tiktoken is real.
_chunk_patches = (
    f"{MODULE}.get_ai_gateway",
    f"{MODULE}.DocumentRepository",
    f"{MODULE}.DocumentEmbeddingRepository",
)


def _patch_chunk(fn):
    """Patch gateway + repos but leave tiktoken real."""
    for target in _chunk_patches:
        fn = patch(target)(fn)
    return fn


# For async tests: also mock tiktoken to avoid heavy encoding load.
_all_patches = (
    f"{MODULE}.get_ai_gateway",
    f"{MODULE}.DocumentRepository",
    f"{MODULE}.DocumentEmbeddingRepository",
    f"{MODULE}.tiktoken",
)


def _patch_all(fn):
    """Patch all four dependencies (gateway, doc repo, embedding repo, tiktoken)."""
    for target in _all_patches:
        fn = patch(target)(fn)
    return fn


def _build_service_chunk(mock_gateway, mock_doc_repo, mock_emb_repo):
    """Instantiate EmbeddingService with repos/gateway mocked, tiktoken real."""
    mock_gateway.return_value = MagicMock()
    mock_doc_repo.return_value = MagicMock()
    mock_emb_repo.return_value = MagicMock()
    session = AsyncMock()
    return EmbeddingService(session)


def _build_service_async(mock_gateway, mock_doc_repo, mock_emb_repo, mock_tiktoken):
    """Instantiate EmbeddingService with all deps mocked (for async tests)."""
    gateway = MagicMock()
    mock_gateway.return_value = gateway

    mock_doc_repo.return_value = MagicMock()
    mock_emb_repo.return_value = MagicMock()

    encoding = MagicMock()
    encoding.encode.return_value = list(range(10))
    mock_tiktoken.get_encoding.return_value = encoding

    session = AsyncMock()
    service = EmbeddingService(session)
    service.gateway = gateway
    return service


# ---------------------------------------------------------------------------
# Tests: chunk_text
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestChunkText:
    """Tests for EmbeddingService.chunk_text."""

    @_patch_chunk
    def test_empty_text_returns_empty_list(self, *mocks):
        service = _build_service_chunk(*mocks)

        assert service.chunk_text("") == []
        assert service.chunk_text("   ") == []

    @_patch_chunk
    def test_invalid_params_raises_validation_error(self, *mocks):
        service = _build_service_chunk(*mocks)

        with pytest.raises(ValidationError, match="Invalid chunk parameters"):
            service.chunk_text("some text", chunk_size=0)

        with pytest.raises(ValidationError, match="Invalid chunk parameters"):
            service.chunk_text("some text", chunk_size=10, chunk_overlap=10)

        with pytest.raises(ValidationError, match="Invalid chunk parameters"):
            service.chunk_text("some text", chunk_size=5, chunk_overlap=6)

    @_patch_chunk
    def test_fixed_strategy_returns_chunks(self, *mocks):
        service = _build_service_chunk(*mocks)

        text = "word " * 100  # ~100 tokens
        chunks = service.chunk_text(
            text, chunk_size=20, chunk_overlap=5, strategy="fixed"
        )

        assert isinstance(chunks, list)
        assert len(chunks) >= 2
        for chunk in chunks:
            assert isinstance(chunk, str)
            assert len(chunk) > 0

    @_patch_chunk
    def test_semantic_strategy_splits_on_sentences(self, *mocks):
        service = _build_service_chunk(*mocks)

        text = (
            "The first sentence is about revenue growth. "
            "The second sentence covers market expansion. "
            "The third sentence discusses customer acquisition. "
            "The fourth sentence explains product development. "
            "The fifth sentence mentions team growth."
        )
        chunks = service.chunk_text(
            text, chunk_size=15, chunk_overlap=3, strategy="semantic"
        )

        assert isinstance(chunks, list)
        assert len(chunks) >= 2
        # Each chunk should contain complete sentence fragments
        for chunk in chunks:
            assert isinstance(chunk, str)
            assert len(chunk) > 0

    @_patch_chunk
    def test_small_text_returns_single_chunk(self, *mocks):
        service = _build_service_chunk(*mocks)

        text = "Hello world."
        chunks = service.chunk_text(
            text, chunk_size=1000, chunk_overlap=200, strategy="semantic"
        )

        assert chunks == [text.strip()]


# ---------------------------------------------------------------------------
# Tests: generate_embedding
# ---------------------------------------------------------------------------


@pytest.mark.unit
class TestGenerateEmbedding:
    """Tests for EmbeddingService.generate_embedding (async)."""

    @pytest.mark.asyncio
    @_patch_all
    async def test_empty_text_raises_validation_error(self, *mocks):
        service = _build_service_async(*mocks)

        with pytest.raises(
            ValidationError, match="Cannot generate embedding for empty text"
        ):
            await service.generate_embedding("")

        with pytest.raises(
            ValidationError, match="Cannot generate embedding for empty text"
        ):
            await service.generate_embedding("   ")

    @pytest.mark.asyncio
    @_patch_all
    async def test_success_returns_embedding_vector(self, *mocks):
        service = _build_service_async(*mocks)

        expected_vector = [0.1] * 1536
        embedding_data = MagicMock()
        embedding_data.embedding = expected_vector

        response = MagicMock()
        response.data = [embedding_data]

        service.gateway.aembedding = AsyncMock(return_value=response)

        result = await service.generate_embedding("Hello world")

        assert result == expected_vector
        assert len(result) == 1536
        service.gateway.aembedding.assert_awaited_once_with(input_text="Hello world")

    @pytest.mark.asyncio
    @_patch_all
    async def test_wrong_dimension_raises_database_error(self, *mocks):
        service = _build_service_async(*mocks)

        embedding_data = MagicMock()
        embedding_data.embedding = [0.1] * 768

        response = MagicMock()
        response.data = [embedding_data]

        service.gateway.aembedding = AsyncMock(return_value=response)

        with pytest.raises(DatabaseError, match="Unexpected embedding dimension"):
            await service.generate_embedding("Hello world")

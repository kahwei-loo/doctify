"""
Unit tests for RetrievalService.

Tests semantic, hybrid, and keyword search modes plus validation and filtering.
"""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.rag.retrieval_service import RetrievalService
from app.core.exceptions import ValidationError, DatabaseError


MODULE = "app.services.rag.retrieval_service"
USER_ID = uuid.uuid4()
DOC_ID = uuid.uuid4()
DS_ID = uuid.uuid4()


def _make_embedding_mock(
    chunk_text="Sample chunk text",
    document_id=None,
    data_source_id=None,
    chunk_index=0,
    chunk_metadata=None,
):
    """Create a mock embedding object."""
    emb = MagicMock()
    emb.chunk_text = chunk_text
    emb.document_id = document_id or DOC_ID
    emb.data_source_id = data_source_id
    emb.chunk_index = chunk_index
    emb.chunk_metadata = chunk_metadata or {}
    return emb


def _make_document_mock(
    original_filename="test.pdf",
    title="Test Document",
    user_id=None,
):
    """Create a mock document object."""
    doc = MagicMock()
    doc.original_filename = original_filename
    doc.title = title
    doc.user_id = user_id or USER_ID
    return doc


def _build_service(mock_embedding_svc, mock_embedding_repo, mock_document_repo):
    """Instantiate RetrievalService with mocked dependencies."""
    session = AsyncMock()

    mock_embedding_svc.return_value = MagicMock()
    mock_embedding_svc.return_value.generate_embedding = AsyncMock(
        return_value=[0.1] * 1536
    )

    mock_embedding_repo.return_value = MagicMock()
    mock_embedding_repo.return_value.search_by_embedding = AsyncMock(return_value=[])
    mock_embedding_repo.return_value.search_by_keyword = AsyncMock(return_value=[])
    mock_embedding_repo.return_value.hybrid_search = AsyncMock(return_value=[])

    mock_document_repo.return_value = MagicMock()
    mock_document_repo.return_value.get_by_id = AsyncMock(
        return_value=_make_document_mock()
    )

    service = RetrievalService(session)
    return service


_patch_targets = (
    f"{MODULE}.EmbeddingService",
    f"{MODULE}.DocumentEmbeddingRepository",
    f"{MODULE}.DocumentRepository",
)


def _patch_all(fn):
    """Stack all three patches."""
    for target in _patch_targets:
        fn = patch(target)(fn)
    return fn


@pytest.mark.unit
class TestRetrieveContextValidation:
    """Tests for input validation in retrieve_context."""

    @pytest.mark.asyncio
    @_patch_all
    async def test_empty_question_raises_validation_error(self, *mocks):
        service = _build_service(*mocks)

        with pytest.raises(ValidationError, match="Question cannot be empty"):
            await service.retrieve_context(question="")

        with pytest.raises(ValidationError, match="Question cannot be empty"):
            await service.retrieve_context(question="   ")

    @pytest.mark.asyncio
    @_patch_all
    async def test_invalid_top_k_raises_validation_error(self, *mocks):
        service = _build_service(*mocks)

        with pytest.raises(ValidationError, match="top_k must be between"):
            await service.retrieve_context(question="test", top_k=0)

        with pytest.raises(ValidationError, match="top_k must be between"):
            await service.retrieve_context(question="test", top_k=51)

    @pytest.mark.asyncio
    @_patch_all
    async def test_invalid_similarity_threshold_raises_validation_error(self, *mocks):
        service = _build_service(*mocks)

        with pytest.raises(ValidationError, match="similarity_threshold must be"):
            await service.retrieve_context(question="test", similarity_threshold=-0.1)

        with pytest.raises(ValidationError, match="similarity_threshold must be"):
            await service.retrieve_context(question="test", similarity_threshold=1.1)


@pytest.mark.unit
class TestRetrieveContextSearchModes:
    """Tests for different search modes in retrieve_context."""

    @pytest.mark.asyncio
    @_patch_all
    async def test_semantic_search_mode(self, *mocks):
        """Semantic mode calls generate_embedding + search_by_embedding."""
        service = _build_service(*mocks)
        emb = _make_embedding_mock()
        service.embedding_repo.search_by_embedding = AsyncMock(
            return_value=[(emb, 0.85)]
        )

        result = await service.retrieve_context(
            question="What is revenue?", search_mode="semantic"
        )

        assert len(result) == 1
        assert result[0]["chunk_text"] == "Sample chunk text"
        assert result[0]["similarity_score"] == 0.85
        service.embedding_service.generate_embedding.assert_awaited_once()
        service.embedding_repo.search_by_embedding.assert_awaited_once()

    @pytest.mark.asyncio
    @_patch_all
    async def test_hybrid_search_mode(self, *mocks):
        """Hybrid mode calls generate_embedding + hybrid_search with RRF scores."""
        service = _build_service(*mocks)
        emb = _make_embedding_mock()
        # hybrid_search returns (embedding, rrf_score, vector_score, text_score)
        service.embedding_repo.hybrid_search = AsyncMock(
            return_value=[(emb, 0.92, 0.85, 0.78)]
        )

        result = await service.retrieve_context(
            question="What is revenue?", search_mode="hybrid"
        )

        assert len(result) == 1
        assert result[0]["rank_score"] == 0.92
        assert result[0]["similarity_score"] == 0.85  # vector cosine for display
        service.embedding_service.generate_embedding.assert_awaited_once()
        service.embedding_repo.hybrid_search.assert_awaited_once()

    @pytest.mark.asyncio
    @_patch_all
    async def test_keyword_search_mode(self, *mocks):
        """Keyword mode calls search_by_keyword without embedding generation."""
        service = _build_service(*mocks)
        emb = _make_embedding_mock()
        service.embedding_repo.search_by_keyword = AsyncMock(return_value=[(emb, 0.75)])

        result = await service.retrieve_context(
            question="revenue growth", search_mode="keyword"
        )

        assert len(result) == 1
        assert result[0]["similarity_score"] == 0.75
        assert result[0]["search_mode"] == "keyword"
        service.embedding_service.generate_embedding.assert_not_awaited()
        service.embedding_repo.search_by_keyword.assert_awaited_once()

    @pytest.mark.asyncio
    @_patch_all
    async def test_no_results_returns_empty_list(self, *mocks):
        """When no search results found, returns empty list."""
        service = _build_service(*mocks)

        result = await service.retrieve_context(
            question="obscure topic nobody wrote about"
        )

        assert result == []

    @pytest.mark.asyncio
    @_patch_all
    async def test_user_id_filtering_skips_other_users_documents(self, *mocks):
        """Documents not owned by user_id are filtered out."""
        service = _build_service(*mocks)
        other_user = uuid.uuid4()
        emb = _make_embedding_mock()

        service.embedding_repo.search_by_embedding = AsyncMock(
            return_value=[(emb, 0.85)]
        )
        # Document belongs to a different user
        service.document_repo.get_by_id = AsyncMock(
            return_value=_make_document_mock(user_id=other_user)
        )

        result = await service.retrieve_context(
            question="test", search_mode="semantic", user_id=USER_ID
        )

        assert result == []

    @pytest.mark.asyncio
    @_patch_all
    async def test_runtime_error_wrapped_as_database_error(self, *mocks):
        """Non-validation errors are wrapped as DatabaseError."""
        service = _build_service(*mocks)
        service.embedding_service.generate_embedding = AsyncMock(
            side_effect=RuntimeError("Connection lost")
        )

        with pytest.raises(DatabaseError, match="Failed to retrieve context"):
            await service.retrieve_context(question="test", search_mode="semantic")


@pytest.mark.unit
class TestGetSimilarChunks:
    """Tests for get_similar_chunks method."""

    @pytest.mark.asyncio
    @_patch_all
    async def test_empty_text_raises_validation_error(self, *mocks):
        service = _build_service(*mocks)

        with pytest.raises(ValidationError, match="Text cannot be empty"):
            await service.get_similar_chunks(text="")

    @pytest.mark.asyncio
    @_patch_all
    async def test_returns_similar_chunks_with_metadata(self, *mocks):
        """Returns chunk dicts enriched with document metadata."""
        service = _build_service(*mocks)
        emb = _make_embedding_mock(chunk_text="Similar content")
        service.embedding_repo.search_by_embedding = AsyncMock(
            return_value=[(emb, 0.88)]
        )

        result = await service.get_similar_chunks(text="Find similar content")

        assert len(result) == 1
        assert result[0]["chunk_text"] == "Similar content"
        assert result[0]["similarity_score"] == 0.88
        assert result[0]["document_name"] == "test.pdf"

    @pytest.mark.asyncio
    @_patch_all
    async def test_excludes_specified_document(self, *mocks):
        """Chunks from excluded document are filtered out."""
        service = _build_service(*mocks)
        emb = _make_embedding_mock(document_id=DOC_ID)
        service.embedding_repo.search_by_embedding = AsyncMock(
            return_value=[(emb, 0.9)]
        )

        result = await service.get_similar_chunks(
            text="test", exclude_document_id=DOC_ID
        )

        assert result == []

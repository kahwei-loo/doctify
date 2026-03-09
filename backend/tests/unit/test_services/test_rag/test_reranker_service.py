"""
Unit tests for Reranker Service.

Tests Cohere cross-encoder reranking via AI Gateway.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.unit
class TestRerankerService:
    """Tests for RerankerService."""

    def _make_documents(self, count: int = 3):
        """Create sample context document dicts."""
        return [
            {
                "chunk_text": f"Document {i} content about topic {i}",
                "document_name": f"doc{i}.pdf",
                "chunk_index": i,
                "similarity_score": round(0.9 - i * 0.1, 2),
            }
            for i in range(count)
        ]

    def _make_rerank_response(self, index_score_pairs):
        """Create a mock arerank response with results."""
        mock_response = MagicMock()
        results = []
        for index, score in index_score_pairs:
            result = MagicMock()
            result.index = index
            result.relevance_score = score
            results.append(result)
        mock_response.results = results
        return mock_response

    @pytest.mark.asyncio
    @patch("app.services.rag.reranker_service.get_ai_gateway")
    async def test_rerank_empty_documents_returns_empty_list(self, mock_get_gateway):
        """Reranking empty document list returns [] without calling gateway."""
        mock_gateway = MagicMock()
        mock_gateway.arerank = AsyncMock()
        mock_get_gateway.return_value = mock_gateway

        from app.services.rag.reranker_service import RerankerService

        service = RerankerService()

        result = await service.rerank(query="test query", documents=[])

        assert result == []
        mock_gateway.arerank.assert_not_awaited()

    @pytest.mark.asyncio
    @patch("app.services.rag.reranker_service.get_ai_gateway")
    async def test_rerank_success_maps_results_with_rerank_score(
        self, mock_get_gateway
    ):
        """Successful rerank maps gateway results back to document dicts with rerank_score."""
        mock_gateway = MagicMock()
        # Reranker reorders: doc at index 2 is most relevant, then index 0
        mock_gateway.arerank = AsyncMock(
            return_value=self._make_rerank_response([(2, 0.95), (0, 0.82), (1, 0.71)])
        )
        mock_get_gateway.return_value = mock_gateway

        from app.services.rag.reranker_service import RerankerService

        service = RerankerService()
        docs = self._make_documents(3)

        result = await service.rerank(query="test query", documents=docs, top_n=3)

        assert len(result) == 3
        # First result should be from original index 2
        assert result[0]["chunk_text"] == "Document 2 content about topic 2"
        assert result[0]["rerank_score"] == 0.95
        # Second result from original index 0
        assert result[1]["chunk_text"] == "Document 0 content about topic 0"
        assert result[1]["rerank_score"] == 0.82

        mock_gateway.arerank.assert_awaited_once()

    @pytest.mark.asyncio
    @patch("app.services.rag.reranker_service.get_ai_gateway")
    async def test_rerank_top_n_limits_results(self, mock_get_gateway):
        """top_n parameter limits the number of results returned by gateway."""
        mock_gateway = MagicMock()
        mock_gateway.arerank = AsyncMock(
            return_value=self._make_rerank_response([(1, 0.95), (0, 0.80)])
        )
        mock_get_gateway.return_value = mock_gateway

        from app.services.rag.reranker_service import RerankerService

        service = RerankerService()
        docs = self._make_documents(3)

        result = await service.rerank(query="test", documents=docs, top_n=2)

        assert len(result) == 2
        # Verify gateway received top_n=2
        call_kwargs = mock_gateway.arerank.call_args[1]
        assert call_kwargs["top_n"] == 2

    @pytest.mark.asyncio
    @patch("app.services.rag.reranker_service.get_ai_gateway")
    async def test_rerank_top_n_exceeds_document_count(self, mock_get_gateway):
        """When top_n > len(documents), uses len(documents) instead."""
        mock_gateway = MagicMock()
        mock_gateway.arerank = AsyncMock(
            return_value=self._make_rerank_response([(0, 0.9)])
        )
        mock_get_gateway.return_value = mock_gateway

        from app.services.rag.reranker_service import RerankerService

        service = RerankerService()
        docs = self._make_documents(1)

        await service.rerank(query="test", documents=docs, top_n=10)

        # Should pass min(10, 1) = 1 as top_n
        call_kwargs = mock_gateway.arerank.call_args[1]
        assert call_kwargs["top_n"] == 1

    @pytest.mark.asyncio
    @patch("app.services.rag.reranker_service.get_ai_gateway")
    async def test_rerank_gateway_exception_returns_original_order(
        self, mock_get_gateway
    ):
        """When gateway.arerank raises, returns original documents[:top_n] as fallback."""
        mock_gateway = MagicMock()
        mock_gateway.arerank = AsyncMock(side_effect=RuntimeError("API error"))
        mock_get_gateway.return_value = mock_gateway

        from app.services.rag.reranker_service import RerankerService

        service = RerankerService()
        docs = self._make_documents(3)

        result = await service.rerank(query="test", documents=docs, top_n=2)

        assert len(result) == 2
        assert result[0]["chunk_text"] == docs[0]["chunk_text"]
        assert result[1]["chunk_text"] == docs[1]["chunk_text"]
        # Fallback results should NOT have rerank_score
        assert "rerank_score" not in result[0]

    @pytest.mark.asyncio
    @patch("app.services.rag.reranker_service.get_ai_gateway")
    async def test_rerank_does_not_mutate_original_documents(self, mock_get_gateway):
        """Reranking should not mutate the original document dicts."""
        mock_gateway = MagicMock()
        mock_gateway.arerank = AsyncMock(
            return_value=self._make_rerank_response([(0, 0.95)])
        )
        mock_get_gateway.return_value = mock_gateway

        from app.services.rag.reranker_service import RerankerService

        service = RerankerService()
        docs = self._make_documents(1)
        original_keys = set(docs[0].keys())

        await service.rerank(query="test", documents=docs, top_n=1)

        # Original doc should not have rerank_score added
        assert set(docs[0].keys()) == original_keys

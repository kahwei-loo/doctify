"""
RAG API Integration Tests

Tests for RAG endpoints.
Phase 11 - RAG Implementation
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4

from app.core.config import settings


@pytest.mark.integration
class TestRAGAPI:
    """Integration tests for RAG API endpoints."""

    @pytest.mark.asyncio
    async def test_rag_query_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_document_with_embeddings: dict,
    ):
        """Test successful RAG query."""
        response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "What is this document about?"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "id" in data
        assert "question" in data
        assert "answer" in data
        assert "sources" in data
        assert "model_used" in data
        assert "tokens_used" in data
        assert "confidence_score" in data
        assert "created_at" in data

        # Verify data types
        assert isinstance(data["sources"], list)
        assert isinstance(data["tokens_used"], int)
        assert isinstance(data["confidence_score"], float)

        # Verify answer is not empty
        assert len(data["answer"]) > 0

        # Verify sources have correct structure
        if len(data["sources"]) > 0:
            source = data["sources"][0]
            assert "chunk_text" in source
            assert "document_id" in source
            assert "document_name" in source
            assert "similarity_score" in source

    @pytest.mark.asyncio
    async def test_rag_query_no_documents(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test RAG query when no documents are indexed."""
        response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "What is the capital of France?"},
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Should still return valid response but with no sources
        assert "answer" in data
        assert len(data["sources"]) == 0

    @pytest.mark.asyncio
    async def test_rag_query_validation_errors(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test RAG query validation errors."""
        # Empty question
        response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": ""},
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Question too long
        response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "a" * 2001},
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Invalid top_k
        response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "test", "top_k": 0},
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Invalid similarity_threshold
        response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "test", "similarity_threshold": 1.5},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_rag_query_unauthorized(self, client: AsyncClient):
        """Test RAG query without authentication."""
        response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "What is this about?"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_rag_history(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test getting RAG query history."""
        # First make a query
        await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "Test question?"},
            headers=auth_headers,
        )

        # Get history
        response = await client.get(
            f"{settings.API_V1_STR}/rag/history",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        assert "items" in data
        assert "total" in data
        assert "limit" in data
        assert "offset" in data

        assert isinstance(data["items"], list)
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_get_rag_history_pagination(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test RAG history pagination."""
        # Make multiple queries
        for i in range(5):
            await client.post(
                f"{settings.API_V1_STR}/rag/query",
                json={"question": f"Question {i}?"},
                headers=auth_headers,
            )

        # Get first page
        response = await client.get(
            f"{settings.API_V1_STR}/rag/history?limit=2&offset=0",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 2

        # Get second page
        response = await client.get(
            f"{settings.API_V1_STR}/rag/history?limit=2&offset=2",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 2

    @pytest.mark.asyncio
    async def test_submit_feedback(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test submitting feedback for RAG query."""
        # Make a query
        query_response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "Test question?"},
            headers=auth_headers,
        )
        query_id = query_response.json()["id"]

        # Submit positive feedback
        response = await client.post(
            f"{settings.API_V1_STR}/rag/feedback/{query_id}",
            json={"rating": 5, "feedback_text": "Very helpful!"},
            headers=auth_headers,
        )
        assert response.status_code == 204

        # Verify feedback was saved
        history_response = await client.get(
            f"{settings.API_V1_STR}/rag/history",
            headers=auth_headers,
        )
        history_items = history_response.json()["items"]
        query_item = next((item for item in history_items if item["id"] == query_id), None)
        assert query_item is not None
        assert query_item["feedback_rating"] == 5

    @pytest.mark.asyncio
    async def test_submit_feedback_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test submitting feedback for non-existent query."""
        fake_query_id = str(uuid4())

        response = await client.post(
            f"{settings.API_V1_STR}/rag/feedback/{fake_query_id}",
            json={"rating": 5},
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_submit_feedback_validation(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test feedback validation."""
        # Make a query
        query_response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "Test question?"},
            headers=auth_headers,
        )
        query_id = query_response.json()["id"]

        # Invalid rating (too low)
        response = await client.post(
            f"{settings.API_V1_STR}/rag/feedback/{query_id}",
            json={"rating": 0},
            headers=auth_headers,
        )
        assert response.status_code == 422

        # Invalid rating (too high)
        response = await client.post(
            f"{settings.API_V1_STR}/rag/feedback/{query_id}",
            json={"rating": 6},
            headers=auth_headers,
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_rag_stats(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test getting RAG statistics."""
        response = await client.get(
            f"{settings.API_V1_STR}/rag/stats",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()

        # Verify stats structure
        assert "total_queries" in data
        assert "total_documents_indexed" in data
        assert "total_chunks" in data
        assert "average_confidence" in data
        assert "queries_with_feedback" in data

        # Verify data types
        assert isinstance(data["total_queries"], int)
        assert isinstance(data["total_documents_indexed"], int)
        assert isinstance(data["total_chunks"], int)
        assert isinstance(data["average_confidence"], float) or data["average_confidence"] is None
        assert isinstance(data["queries_with_feedback"], int)

    @pytest.mark.asyncio
    async def test_delete_query(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test deleting a query from history."""
        # Make a query
        query_response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "Test question to delete?"},
            headers=auth_headers,
        )
        query_id = query_response.json()["id"]

        # Delete the query
        response = await client.delete(
            f"{settings.API_V1_STR}/rag/history/{query_id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

        # Verify it's deleted
        history_response = await client.get(
            f"{settings.API_V1_STR}/rag/history",
            headers=auth_headers,
        )
        history_items = history_response.json()["items"]
        query_item = next((item for item in history_items if item["id"] == query_id), None)
        assert query_item is None


@pytest.fixture
async def sample_document_with_embeddings(auth_headers: dict, client: AsyncClient):
    """Create a sample document with embeddings for testing."""
    # This would be implemented based on your test data setup
    # For now, return a placeholder
    return {
        "id": str(uuid4()),
        "filename": "test_document.pdf",
        "has_embeddings": True,
    }

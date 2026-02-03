"""
RAG End-to-End Workflow Tests

Tests complete RAG workflows from document upload to query.
Phase 11 - RAG Implementation
"""

import pytest
import asyncio
from httpx import AsyncClient
from uuid import uuid4

from app.core.config import settings


@pytest.mark.e2e
@pytest.mark.slow
class TestRAGWorkflow:
    """End-to-end tests for complete RAG workflows."""

    @pytest.mark.asyncio
    async def test_complete_rag_workflow(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """
        Test complete RAG workflow:
        1. Upload document
        2. Wait for OCR processing
        3. Wait for embedding generation
        4. Query the document
        5. Verify answer with sources
        6. Submit feedback
        7. Check history
        """
        # Step 1: Upload a test document
        with open("tests/fixtures/sample_document.pdf", "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            upload_response = await client.post(
                f"{settings.API_V1_STR}/documents/upload",
                files=files,
                headers=auth_headers,
            )

        assert upload_response.status_code == 201
        document_id = upload_response.json()["id"]

        # Step 2: Wait for OCR processing (poll status)
        max_wait = 60  # seconds
        wait_interval = 2
        elapsed = 0
        ocr_complete = False

        while elapsed < max_wait:
            status_response = await client.get(
                f"{settings.API_V1_STR}/documents/{document_id}",
                headers=auth_headers,
            )
            document = status_response.json()

            if document["status"] == "completed":
                ocr_complete = True
                break
            elif document["status"] == "failed":
                pytest.fail("OCR processing failed")

            await asyncio.sleep(wait_interval)
            elapsed += wait_interval

        assert ocr_complete, "OCR processing did not complete in time"
        assert document["extracted_text"] is not None

        # Step 3: Wait for embedding generation (give Celery time)
        await asyncio.sleep(10)

        # Verify embeddings were created by checking stats
        stats_response = await client.get(
            f"{settings.API_V1_STR}/rag/stats",
            headers=auth_headers,
        )
        stats = stats_response.json()
        assert stats["total_documents_indexed"] >= 1
        assert stats["total_chunks"] >= 1

        # Step 4: Query the document
        query_response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "What is the main topic of this document?"},
            headers=auth_headers,
        )

        assert query_response.status_code == 200
        query_result = query_response.json()

        # Step 5: Verify answer with sources
        assert query_result["answer"] is not None
        assert len(query_result["answer"]) > 0
        assert len(query_result["sources"]) > 0

        # Verify source contains our document
        source_document_ids = [source["document_id"] for source in query_result["sources"]]
        assert document_id in source_document_ids

        # Verify confidence and tokens
        assert 0.0 <= query_result["confidence_score"] <= 1.0
        assert query_result["tokens_used"] > 0

        # Step 6: Submit positive feedback
        query_id = query_result["id"]
        feedback_response = await client.post(
            f"{settings.API_V1_STR}/rag/feedback/{query_id}",
            json={"rating": 5, "feedback_text": "Accurate and helpful!"},
            headers=auth_headers,
        )
        assert feedback_response.status_code == 204

        # Step 7: Check history
        history_response = await client.get(
            f"{settings.API_V1_STR}/rag/history",
            headers=auth_headers,
        )
        history = history_response.json()

        assert history["total"] >= 1
        query_in_history = next(
            (item for item in history["items"] if item["id"] == query_id),
            None
        )
        assert query_in_history is not None
        assert query_in_history["feedback_rating"] == 5

    @pytest.mark.asyncio
    async def test_multi_document_rag_workflow(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """
        Test RAG workflow with multiple documents:
        1. Upload multiple documents
        2. Wait for processing
        3. Query across all documents
        4. Verify sources from different documents
        """
        # Upload multiple test documents
        document_ids = []
        for i in range(3):
            with open(f"tests/fixtures/sample_document_{i}.pdf", "rb") as f:
                files = {"file": (f"sample_{i}.pdf", f, "application/pdf")}
                upload_response = await client.post(
                    f"{settings.API_V1_STR}/documents/upload",
                    files=files,
                    headers=auth_headers,
                )
            document_ids.append(upload_response.json()["id"])

        # Wait for all documents to process
        await asyncio.sleep(30)

        # Query across all documents
        query_response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "What are the common themes across these documents?"},
            headers=auth_headers,
        )

        assert query_response.status_code == 200
        query_result = query_response.json()

        # Verify answer includes information from multiple documents
        assert len(query_result["sources"]) >= 2
        source_document_ids = [source["document_id"] for source in query_result["sources"]]
        unique_documents = set(source_document_ids)
        assert len(unique_documents) >= 2, "Should include sources from multiple documents"

    @pytest.mark.asyncio
    async def test_rag_workflow_with_document_filter(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """
        Test RAG workflow with document filtering:
        1. Upload multiple documents
        2. Query with specific document_ids filter
        3. Verify sources only from filtered documents
        """
        # Upload two documents
        document_ids = []
        for i in range(2):
            with open(f"tests/fixtures/sample_document_{i}.pdf", "rb") as f:
                files = {"file": (f"sample_{i}.pdf", f, "application/pdf")}
                upload_response = await client.post(
                    f"{settings.API_V1_STR}/documents/upload",
                    files=files,
                    headers=auth_headers,
                )
            document_ids.append(upload_response.json()["id"])

        await asyncio.sleep(30)

        # Query with document filter (only first document)
        query_response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={
                "question": "What is this about?",
                "document_ids": [document_ids[0]]
            },
            headers=auth_headers,
        )

        assert query_response.status_code == 200
        query_result = query_response.json()

        # Verify all sources are from the filtered document
        for source in query_result["sources"]:
            assert source["document_id"] == document_ids[0]

    @pytest.mark.asyncio
    async def test_rag_workflow_error_recovery(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """
        Test RAG workflow error recovery:
        1. Query before any documents are indexed
        2. Verify graceful error handling
        3. Upload document
        4. Query again successfully
        """
        # Query with no indexed documents
        query_response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "What is the capital of France?"},
            headers=auth_headers,
        )

        assert query_response.status_code == 200
        query_result = query_response.json()

        # Should return answer but with no sources
        assert query_result["answer"] is not None
        assert len(query_result["sources"]) == 0

        # Now upload a document
        with open("tests/fixtures/sample_document.pdf", "rb") as f:
            files = {"file": ("sample.pdf", f, "application/pdf")}
            upload_response = await client.post(
                f"{settings.API_V1_STR}/documents/upload",
                files=files,
                headers=auth_headers,
            )

        await asyncio.sleep(30)

        # Query again
        query_response = await client.post(
            f"{settings.API_V1_STR}/rag/query",
            json={"question": "What is this document about?"},
            headers=auth_headers,
        )

        assert query_response.status_code == 200
        query_result = query_response.json()
        assert len(query_result["sources"]) > 0

    @pytest.mark.asyncio
    async def test_rag_history_lifecycle(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """
        Test complete history lifecycle:
        1. Make several queries
        2. Submit feedback for some
        3. Delete some queries
        4. Verify history accuracy
        """
        query_ids = []

        # Make 5 queries
        for i in range(5):
            query_response = await client.post(
                f"{settings.API_V1_STR}/rag/query",
                json={"question": f"Question {i}?"},
                headers=auth_headers,
            )
            query_ids.append(query_response.json()["id"])

        # Submit feedback for first 3
        for i in range(3):
            await client.post(
                f"{settings.API_V1_STR}/rag/feedback/{query_ids[i]}",
                json={"rating": i + 3},  # ratings 3, 4, 5
                headers=auth_headers,
            )

        # Delete the last query
        await client.delete(
            f"{settings.API_V1_STR}/rag/history/{query_ids[4]}",
            headers=auth_headers,
        )

        # Verify history
        history_response = await client.get(
            f"{settings.API_V1_STR}/rag/history",
            headers=auth_headers,
        )
        history = history_response.json()

        # Should have 4 queries (5 - 1 deleted)
        assert len(history["items"]) == 4

        # Verify feedback ratings
        feedback_ratings = [
            item["feedback_rating"]
            for item in history["items"]
            if item["feedback_rating"] is not None
        ]
        assert len(feedback_ratings) == 3
        assert sorted(feedback_ratings) == [3, 4, 5]

        # Verify stats
        stats_response = await client.get(
            f"{settings.API_V1_STR}/rag/stats",
            headers=auth_headers,
        )
        stats = stats_response.json()
        assert stats["total_queries"] == 4
        assert stats["queries_with_feedback"] == 3
        assert stats["average_rating"] == pytest.approx(4.0, rel=0.1)


@pytest.fixture(scope="session")
def create_test_documents():
    """Create test PDF documents for E2E testing."""
    # This would create actual test PDF files
    # For now, assume they exist in tests/fixtures/
    pass

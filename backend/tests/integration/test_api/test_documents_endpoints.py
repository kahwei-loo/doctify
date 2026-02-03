"""
Integration Tests for Document API Endpoints

Tests document management API endpoints with real FastAPI routing.
"""

import uuid
import pytest
from httpx import AsyncClient
from io import BytesIO


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentUploadEndpoints:
    """Test document upload API endpoints."""

    async def test_upload_document_success(self, async_client: AsyncClient, auth_headers: dict, test_pdf_file):
        """Test successful document upload via API."""
        # Arrange
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        data = {"project_id": str(uuid.uuid4())}

        # Act
        response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            data=data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 201
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert result["data"]["filename"] == "test.pdf"
        assert result["data"]["status"] == "pending"

    async def test_upload_document_without_auth(self, async_client: AsyncClient, test_pdf_file):
        """Test document upload fails without authentication."""
        # Arrange
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}

        # Act
        response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
        )

        # Assert
        assert response.status_code == 401

    async def test_upload_document_invalid_file_type(self, async_client: AsyncClient, auth_headers: dict):
        """Test document upload with invalid file type."""
        # Arrange
        invalid_file = BytesIO(b"Not a valid file")
        files = {"file": ("test.exe", invalid_file, "application/x-msdownload")}

        # Act
        response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 400
        result = response.json()
        assert result["success"] is False
        assert "error" in result

    async def test_upload_document_too_large(self, async_client: AsyncClient, auth_headers: dict):
        """Test document upload with file size exceeding limit."""
        # Arrange
        large_file = BytesIO(b"x" * (100 * 1024 * 1024))  # 100MB file
        files = {"file": ("large.pdf", large_file, "application/pdf")}

        # Act
        response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 413
        result = response.json()
        assert result["success"] is False

    async def test_upload_duplicate_document(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test uploading duplicate document returns existing document."""
        # Arrange
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}

        # Act - Upload first time
        response1 = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        # Reset file pointer
        test_pdf_file.seek(0)

        # Act - Upload second time (duplicate)
        response2 = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        # Assert
        assert response1.status_code == 201
        assert response2.status_code == 200
        result1 = response1.json()
        result2 = response2.json()
        assert result1["data"]["id"] == result2["data"]["id"]
        assert result2["data"]["is_duplicate"] is True


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentListEndpoints:
    """Test document listing and retrieval endpoints."""

    async def test_list_documents_empty(self, async_client: AsyncClient, auth_headers: dict):
        """Test listing documents when none exist."""
        # Act
        response = await async_client.get(
            "/api/v1/documents",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["items"] == []
        assert result["data"]["total"] == 0

    async def test_list_documents_with_pagination(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test listing documents with pagination."""
        # Arrange - Upload multiple documents
        for i in range(15):
            test_pdf_file.seek(0)
            files = {"file": (f"test_{i}.pdf", test_pdf_file, "application/pdf")}
            await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                headers=auth_headers,
            )

        # Act - Get first page
        response = await async_client.get(
            "/api/v1/documents",
            params={"skip": 0, "limit": 10},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert len(result["data"]["items"]) == 10
        assert result["data"]["total"] == 15

    async def test_list_documents_with_filters(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test listing documents with status filter."""
        # Act
        response = await async_client.get(
            "/api/v1/documents",
            params={"status": "completed"},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        # All returned documents should have 'completed' status
        for doc in result["data"]["items"]:
            assert doc["status"] == "completed"

    async def test_list_documents_unauthorized(self, async_client: AsyncClient):
        """Test listing documents without authentication."""
        # Act
        response = await async_client.get("/api/v1/documents")

        # Assert
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentDetailEndpoints:
    """Test document detail and retrieval endpoints."""

    async def test_get_document_by_id_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test retrieving document by ID."""
        # Arrange - Upload a document
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )
        document_id = upload_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["id"] == document_id
        assert result["data"]["filename"] == "test.pdf"

    async def test_get_document_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test retrieving non-existent document."""
        # Arrange
        non_existent_id = str(uuid.uuid4())

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{non_existent_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404
        result = response.json()
        assert result["success"] is False

    async def test_get_document_invalid_id(self, async_client: AsyncClient, auth_headers: dict):
        """Test retrieving document with invalid ID format."""
        # Act
        response = await async_client.get(
            "/api/v1/documents/invalid_id",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 422
        result = response.json()
        assert result["success"] is False

    async def test_get_document_unauthorized(self, async_client: AsyncClient):
        """Test retrieving document without authentication."""
        # Arrange
        document_id = str(uuid.uuid4())

        # Act
        response = await async_client.get(f"/api/v1/documents/{document_id}")

        # Assert
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentProcessingEndpoints:
    """Test document processing trigger endpoints."""

    async def test_trigger_document_processing_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test triggering document processing."""
        # Arrange - Upload a document
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )
        document_id = upload_response.json()["data"]["id"]

        # Act
        response = await async_client.post(
            f"/api/v1/documents/{document_id}/process",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["status"] in ["processing", "queued"]

    async def test_trigger_processing_already_processing(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test triggering processing for document already being processed."""
        # This test would require setting up a document in 'processing' state
        # Implementation depends on test data setup
        pass

    async def test_reprocess_failed_document(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test reprocessing a failed document."""
        # This test would require setting up a document in 'failed' state
        # Implementation depends on test data setup
        pass


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentDeletionEndpoints:
    """Test document deletion endpoints."""

    async def test_delete_document_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test successful document deletion."""
        # Arrange - Upload a document
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )
        document_id = upload_response.json()["data"]["id"]

        # Act
        response = await async_client.delete(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

        # Verify document no longer exists
        get_response = await async_client.get(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404

    async def test_delete_document_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test deleting non-existent document."""
        # Arrange
        non_existent_id = str(uuid.uuid4())

        # Act
        response = await async_client.delete(
            f"/api/v1/documents/{non_existent_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404

    async def test_delete_document_unauthorized(self, async_client: AsyncClient):
        """Test deleting document without authentication."""
        # Arrange
        document_id = str(uuid.uuid4())

        # Act
        response = await async_client.delete(f"/api/v1/documents/{document_id}")

        # Assert
        assert response.status_code == 401

    async def test_delete_document_unauthorized_user(
        self,
        async_client: AsyncClient,
        test_pdf_file,
    ):
        """Test deleting document owned by another user."""
        # Arrange - Create two users and upload document with first user
        user1_data = {"email": "user1@example.com", "password": "Password123!"}
        user2_data = {"email": "user2@example.com", "password": "Password123!"}

        # Register and login user1
        await async_client.post("/api/v1/auth/register", json=user1_data)
        login1_response = await async_client.post(
            "/api/v1/auth/login",
            data={"username": user1_data["email"], "password": user1_data["password"]},
        )
        user1_token = login1_response.json()["data"]["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        # Upload document as user1
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=user1_headers,
        )
        document_id = upload_response.json()["data"]["id"]

        # Register and login user2
        await async_client.post("/api/v1/auth/register", json=user2_data)
        login2_response = await async_client.post(
            "/api/v1/auth/login",
            data={"username": user2_data["email"], "password": user2_data["password"]},
        )
        user2_token = login2_response.json()["data"]["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Act - Try to delete document as user2
        response = await async_client.delete(
            f"/api/v1/documents/{document_id}",
            headers=user2_headers,
        )

        # Assert
        assert response.status_code == 403
        result = response.json()
        assert result["success"] is False


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentStatusEndpoints:
    """Test document status update endpoints."""

    async def test_update_document_status(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test updating document status."""
        # Arrange - Upload a document
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )
        document_id = upload_response.json()["data"]["id"]

        # Act
        response = await async_client.patch(
            f"/api/v1/documents/{document_id}/status",
            json={"status": "processing"},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["status"] == "processing"

    async def test_update_status_invalid_transition(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test invalid status transition."""
        # This test would require specific business logic for status transitions
        # Implementation depends on status machine rules
        pass


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentSearchEndpoints:
    """Test document search and filtering endpoints."""

    async def test_search_documents_by_filename(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test searching documents by filename."""
        # Arrange - Upload documents with different names
        for i in range(5):
            test_pdf_file.seek(0)
            filename = f"report_{i}.pdf" if i < 3 else f"invoice_{i}.pdf"
            files = {"file": (filename, test_pdf_file, "application/pdf")}
            await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                headers=auth_headers,
            )

        # Act
        response = await async_client.get(
            "/api/v1/documents/search",
            params={"query": "report"},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert len(result["data"]["items"]) == 3
        for doc in result["data"]["items"]:
            assert "report" in doc["filename"].lower()

    async def test_search_documents_no_results(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test search with no matching results."""
        # Act
        response = await async_client.get(
            "/api/v1/documents/search",
            params={"query": "nonexistent"},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["items"] == []
        assert result["data"]["total"] == 0


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentConfirmEndpoints:
    """Test document confirmation API endpoints."""

    async def test_confirm_document_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_completed_document,
    ):
        """Test successful document confirmation with user corrections."""
        # Arrange
        document_id = str(test_completed_document.id)
        confirm_data = {
            "ocr_data": {
                "invoice_number": "INV-2024-001-CORRECTED",
                "date": "2024-01-15",
                "total": 1250.00,
                "line_items": [
                    {"description": "Service A", "amount": 1000.00},
                    {"description": "Service B", "amount": 250.00}
                ]
            },
            "user_confirmed": True,
            "field_changes": [
                {
                    "field": "invoice_number",
                    "original_value": "INV-2024-001",
                    "new_value": "INV-2024-001-CORRECTED",
                    "timestamp": "2024-01-15T10:30:00Z"
                }
            ]
        }

        # Act
        response = await async_client.post(
            f"/api/v1/documents/{document_id}/confirm",
            json=confirm_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["status"] == "confirmed"
        assert result["data"]["confirmed_at"] is not None
        assert result["data"]["has_corrections"] is True
        assert result["data"]["field_changes_count"] == 1
        assert result["message"] == "Document confirmed successfully"

    async def test_confirm_document_without_corrections(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_completed_document,
    ):
        """Test document confirmation without any user corrections."""
        # Arrange
        document_id = str(test_completed_document.id)
        confirm_data = {
            "ocr_data": test_completed_document.extracted_data,
            "user_confirmed": True,
        }

        # Act
        response = await async_client.post(
            f"/api/v1/documents/{document_id}/confirm",
            json=confirm_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["status"] == "confirmed"
        assert result["data"]["has_corrections"] is False
        assert result["data"]["field_changes_count"] == 0

    async def test_confirm_document_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test confirming non-existent document returns 404."""
        # Arrange
        document_id = str(uuid.uuid4())
        confirm_data = {
            "ocr_data": {"test": "data"},
            "user_confirmed": True,
        }

        # Act
        response = await async_client.post(
            f"/api/v1/documents/{document_id}/confirm",
            json=confirm_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404

    async def test_confirm_document_wrong_status(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pending_document,
    ):
        """Test confirming document in wrong status returns 400."""
        # Arrange
        document_id = str(test_pending_document.id)
        confirm_data = {
            "ocr_data": {"test": "data"},
            "user_confirmed": True,
        }

        # Act
        response = await async_client.post(
            f"/api/v1/documents/{document_id}/confirm",
            json=confirm_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 400
        result = response.json()
        assert "must be 'completed' first" in result["detail"]

    async def test_confirm_document_already_confirmed(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_confirmed_document,
    ):
        """Test confirming already confirmed document returns 409."""
        # Arrange
        document_id = str(test_confirmed_document.id)
        confirm_data = {
            "ocr_data": {"test": "data"},
            "user_confirmed": True,
        }

        # Act
        response = await async_client.post(
            f"/api/v1/documents/{document_id}/confirm",
            json=confirm_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 409
        result = response.json()
        assert "already confirmed" in result["detail"]

    async def test_confirm_document_without_auth(
        self,
        async_client: AsyncClient,
        test_completed_document,
    ):
        """Test confirming document without authentication returns 401."""
        # Arrange
        document_id = str(test_completed_document.id)
        confirm_data = {
            "ocr_data": {"test": "data"},
            "user_confirmed": True,
        }

        # Act
        response = await async_client.post(
            f"/api/v1/documents/{document_id}/confirm",
            json=confirm_data,
        )

        # Assert
        assert response.status_code == 401

    async def test_confirm_document_wrong_user(
        self,
        async_client: AsyncClient,
        test_completed_document,
        other_user_headers,
    ):
        """Test confirming another user's document returns 403."""
        # Arrange
        document_id = str(test_completed_document.id)
        confirm_data = {
            "ocr_data": {"test": "data"},
            "user_confirmed": True,
        }

        # Act
        response = await async_client.post(
            f"/api/v1/documents/{document_id}/confirm",
            json=confirm_data,
            headers=other_user_headers,
        )

        # Assert
        assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentFilePreviewEndpoints:
    """Test document file preview API endpoints."""

    async def test_preview_document_file_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_document_with_file,
    ):
        """Test successful document file preview returns inline content."""
        # Arrange
        document_id = str(test_document_with_file.id)

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{document_id}/file/preview",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "inline" in response.headers["content-disposition"]
        assert "test_preview.pdf" in response.headers["content-disposition"]
        assert "cache-control" in response.headers
        assert len(response.content) > 0

    async def test_preview_document_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test preview for non-existent document returns 404."""
        # Arrange
        non_existent_id = str(uuid.uuid4())

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{non_existent_id}/file/preview",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404

    async def test_preview_document_without_auth(
        self,
        async_client: AsyncClient,
        test_document_with_file,
    ):
        """Test preview without authentication returns 401."""
        # Arrange
        document_id = str(test_document_with_file.id)

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{document_id}/file/preview",
        )

        # Assert
        assert response.status_code == 401

    async def test_preview_document_wrong_user(
        self,
        async_client: AsyncClient,
        other_user_headers: dict,
        test_document_with_file,
    ):
        """Test preview by non-owner returns 403."""
        # Arrange
        document_id = str(test_document_with_file.id)

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{document_id}/file/preview",
            headers=other_user_headers,
        )

        # Assert
        assert response.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
class TestDocumentFileDownloadEndpoints:
    """Test document file download API endpoints."""

    async def test_download_document_file_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_document_with_file,
    ):
        """Test successful document file download returns attachment content."""
        # Arrange
        document_id = str(test_document_with_file.id)

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{document_id}/file/download",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "attachment" in response.headers["content-disposition"]
        assert len(response.content) > 0

    async def test_download_document_not_found(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test download for non-existent document returns 404."""
        # Arrange
        non_existent_id = str(uuid.uuid4())

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{non_existent_id}/file/download",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404

    async def test_download_document_without_auth(
        self,
        async_client: AsyncClient,
        test_document_with_file,
    ):
        """Test download without authentication returns 401."""
        # Arrange
        document_id = str(test_document_with_file.id)

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{document_id}/file/download",
        )

        # Assert
        assert response.status_code == 401

    async def test_download_document_wrong_user(
        self,
        async_client: AsyncClient,
        other_user_headers: dict,
        test_document_with_file,
    ):
        """Test download by non-owner returns 403."""
        # Arrange
        document_id = str(test_document_with_file.id)

        # Act
        response = await async_client.get(
            f"/api/v1/documents/{document_id}/file/download",
            headers=other_user_headers,
        )

        # Assert
        assert response.status_code == 403

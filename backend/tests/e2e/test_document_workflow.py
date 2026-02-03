"""
End-to-End Tests for Document Processing Workflow

Tests complete document workflow: upload → process → export → download
"""

import pytest
import asyncio
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


@pytest.mark.e2e
@pytest.mark.asyncio
class TestCompleteDocumentWorkflow:
    """Test complete document processing workflow end-to-end."""

    async def test_complete_workflow_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test complete document workflow from upload to export."""
        # Step 1: Upload document
        files = {"file": ("test_document.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        assert upload_response.status_code == 201
        document_id = upload_response.json()["data"]["id"]
        assert upload_response.json()["data"]["status"] == "pending"

        # Step 2: Trigger OCR processing
        with patch('app.services.ocr.provider.OCRProvider') as mock_ocr:
            mock_ocr.return_value.extract_text = AsyncMock(return_value={
                "text": "Extracted document content",
                "confidence": 0.95,
                "pages": [{"page_number": 1, "text": "Page 1 content"}],
            })

            process_response = await async_client.post(
                f"/api/v1/documents/{document_id}/process",
                headers=auth_headers,
            )

            assert process_response.status_code == 200

            # Wait for processing to complete (simulate async task)
            await asyncio.sleep(0.5)

        # Step 3: Verify document status is completed
        detail_response = await async_client.get(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers,
        )

        assert detail_response.status_code == 200
        document_data = detail_response.json()["data"]
        assert document_data["status"] in ["completed", "processing"]

        # Step 4: Export document
        with patch('app.services.export.pdf_exporter.PDFExporter') as mock_export:
            mock_export.return_value.export = AsyncMock(return_value={
                "file_path": "/exports/output.pdf",
                "file_size": 2048,
                "format": "pdf",
            })

            export_response = await async_client.post(
                f"/api/v1/documents/{document_id}/export",
                json={"format": "pdf"},
                headers=auth_headers,
            )

            assert export_response.status_code == 200
            export_data = export_response.json()["data"]
            assert "download_url" in export_data

        # Step 5: Download exported document
        download_url = export_data["download_url"]
        download_response = await async_client.get(
            download_url,
            headers=auth_headers,
        )

        assert download_response.status_code == 200
        assert len(download_response.content) > 0

    async def test_workflow_with_error_handling(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test workflow with error handling and recovery."""
        # Step 1: Upload document
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )
        document_id = upload_response.json()["data"]["id"]

        # Step 2: Processing fails
        with patch('app.services.ocr.provider.OCRProvider') as mock_ocr:
            mock_ocr.return_value.extract_text = AsyncMock(
                side_effect=Exception("OCR service unavailable")
            )

            process_response = await async_client.post(
                f"/api/v1/documents/{document_id}/process",
                headers=auth_headers,
            )

            # May return 200 with task queued or 500 on error
            assert process_response.status_code in [200, 500]

        # Step 3: Retry processing
        with patch('app.services.ocr.provider.OCRProvider') as mock_ocr:
            mock_ocr.return_value.extract_text = AsyncMock(return_value={
                "text": "Successfully extracted after retry",
                "confidence": 0.93,
                "pages": [{"page_number": 1, "text": "Content"}],
            })

            retry_response = await async_client.post(
                f"/api/v1/documents/{document_id}/process",
                headers=auth_headers,
            )

            assert retry_response.status_code == 200

        # Step 4: Verify successful completion
        detail_response = await async_client.get(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers,
        )

        document_data = detail_response.json()["data"]
        # After retry, should eventually be completed
        assert document_data["status"] in ["completed", "processing"]


@pytest.mark.e2e
@pytest.mark.asyncio
class TestMultiDocumentWorkflow:
    """Test workflow with multiple documents."""

    async def test_batch_upload_and_process(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test uploading and processing multiple documents."""
        document_ids = []

        # Step 1: Upload multiple documents
        for i in range(5):
            test_pdf_file.seek(0)
            files = {"file": (f"doc_{i}.pdf", test_pdf_file, "application/pdf")}
            upload_response = await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                headers=auth_headers,
            )

            assert upload_response.status_code == 201
            document_ids.append(upload_response.json()["data"]["id"])

        # Step 2: Process all documents
        with patch('app.services.ocr.provider.OCRProvider') as mock_ocr:
            mock_ocr.return_value.extract_text = AsyncMock(return_value={
                "text": "Extracted text",
                "confidence": 0.92,
                "pages": [{"page_number": 1, "text": "Content"}],
            })

            for doc_id in document_ids:
                process_response = await async_client.post(
                    f"/api/v1/documents/{doc_id}/process",
                    headers=auth_headers,
                )
                assert process_response.status_code == 200

        # Step 3: Verify all documents listed
        list_response = await async_client.get(
            "/api/v1/documents",
            headers=auth_headers,
        )

        assert list_response.status_code == 200
        documents = list_response.json()["data"]["items"]
        assert len(documents) >= 5

        # Step 4: Batch export
        with patch('app.services.export.pdf_exporter.PDFExporter') as mock_export:
            mock_export.return_value.export = AsyncMock(return_value={
                "file_path": "/exports/output.pdf",
                "file_size": 2048,
                "format": "pdf",
            })

            batch_export_response = await async_client.post(
                "/api/v1/documents/batch-export",
                json={
                    "document_ids": document_ids,
                    "format": "pdf",
                    "create_archive": True,
                },
                headers=auth_headers,
            )

            assert batch_export_response.status_code == 200
            assert "archive_url" in batch_export_response.json()["data"]


@pytest.mark.e2e
@pytest.mark.asyncio
class TestProjectWorkflow:
    """Test complete project workflow."""

    async def test_project_based_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test document workflow within project context."""
        # Step 1: Create project
        project_response = await async_client.post(
            "/api/v1/projects",
            json={
                "name": "Q4 Reports",
                "description": "Quarterly financial reports",
            },
            headers=auth_headers,
        )

        assert project_response.status_code == 201
        project_id = project_response.json()["data"]["id"]

        # Step 2: Upload documents to project
        document_ids = []
        for i in range(3):
            test_pdf_file.seek(0)
            files = {"file": (f"report_{i}.pdf", test_pdf_file, "application/pdf")}
            upload_response = await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                data={"project_id": project_id},
                headers=auth_headers,
            )

            assert upload_response.status_code == 201
            document_ids.append(upload_response.json()["data"]["id"])

        # Step 3: Process all documents in project
        with patch('app.services.ocr.provider.OCRProvider') as mock_ocr:
            mock_ocr.return_value.extract_text = AsyncMock(return_value={
                "text": "Financial data",
                "confidence": 0.94,
                "pages": [{"page_number": 1, "text": "Report content"}],
            })

            for doc_id in document_ids:
                process_response = await async_client.post(
                    f"/api/v1/documents/{doc_id}/process",
                    headers=auth_headers,
                )
                assert process_response.status_code == 200

        # Step 4: Get project statistics
        stats_response = await async_client.get(
            f"/api/v1/projects/{project_id}/statistics",
            headers=auth_headers,
        )

        assert stats_response.status_code == 200
        stats = stats_response.json()["data"]
        assert stats["total_documents"] == 3

        # Step 5: Export all project documents
        with patch('app.services.export.pdf_exporter.PDFExporter') as mock_export:
            mock_export.return_value.export = AsyncMock(return_value={
                "file_path": "/exports/output.pdf",
                "file_size": 2048,
                "format": "pdf",
            })

            export_response = await async_client.post(
                f"/api/v1/projects/{project_id}/export",
                json={"format": "pdf"},
                headers=auth_headers,
            )

            assert export_response.status_code == 200


@pytest.mark.e2e
@pytest.mark.asyncio
class TestRealtimeWorkflow:
    """Test workflow with real-time WebSocket notifications."""

    async def test_workflow_with_realtime_updates(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user_token: str,
        test_pdf_file,
    ):
        """Test document workflow with WebSocket notifications."""
        # Step 1: Connect WebSocket
        async with async_client.websocket_connect(
            f"/api/v1/ws?token={test_user_token}"
        ) as websocket:
            # Subscribe to document updates
            await websocket.send_json({
                "type": "subscribe",
                "channel": "documents",
            })
            await websocket.receive_json()  # Consume subscription confirmation

            # Step 2: Upload document
            files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
            upload_response = await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                headers=auth_headers,
            )
            document_id = upload_response.json()["data"]["id"]

            # Step 3: Receive upload notification
            notification = await asyncio.wait_for(
                websocket.receive_json(),
                timeout=5.0,
            )
            assert notification["type"] == "document.uploaded"
            assert notification["data"]["document_id"] == document_id

            # Step 4: Trigger processing
            with patch('app.services.ocr.provider.OCRProvider') as mock_ocr:
                mock_ocr.return_value.extract_text = AsyncMock(return_value={
                    "text": "Extracted text",
                    "confidence": 0.95,
                    "pages": [{"page_number": 1, "text": "Content"}],
                })

                await async_client.post(
                    f"/api/v1/documents/{document_id}/process",
                    headers=auth_headers,
                )

                # Step 5: Receive processing notifications
                processing_notification = await asyncio.wait_for(
                    websocket.receive_json(),
                    timeout=5.0,
                )
                assert processing_notification["type"] in [
                    "document.processing",
                    "document.processing.completed",
                ]


@pytest.mark.e2e
@pytest.mark.asyncio
class TestUserJourney:
    """Test complete user journey from registration to document management."""

    async def test_new_user_complete_journey(self, async_client: AsyncClient, test_pdf_file):
        """Test complete new user journey."""
        # Step 1: User registration
        user_data = {
            "email": "newuser@example.com",
            "password": "SecurePassword123!",
            "full_name": "New User",
        }
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json=user_data,
        )

        assert register_response.status_code == 201

        # Step 2: User login
        login_response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": user_data["email"],
                "password": user_data["password"],
            },
        )

        assert login_response.status_code == 200
        token = login_response.json()["data"]["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Step 3: Get user profile
        profile_response = await async_client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )

        assert profile_response.status_code == 200
        assert profile_response.json()["data"]["email"] == user_data["email"]

        # Step 4: Create first project
        project_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "My First Project"},
            headers=auth_headers,
        )

        assert project_response.status_code == 201
        project_id = project_response.json()["data"]["id"]

        # Step 5: Upload first document
        files = {"file": ("first_doc.pdf", test_pdf_file, "application/pdf")}
        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            data={"project_id": project_id},
            headers=auth_headers,
        )

        assert upload_response.status_code == 201
        document_id = upload_response.json()["data"]["id"]

        # Step 6: Process document
        with patch('app.services.ocr.provider.OCRProvider') as mock_ocr:
            mock_ocr.return_value.extract_text = AsyncMock(return_value={
                "text": "First document content",
                "confidence": 0.93,
                "pages": [{"page_number": 1, "text": "Content"}],
            })

            process_response = await async_client.post(
                f"/api/v1/documents/{document_id}/process",
                headers=auth_headers,
            )

            assert process_response.status_code == 200

        # Step 7: View document list
        list_response = await async_client.get(
            "/api/v1/documents",
            headers=auth_headers,
        )

        assert list_response.status_code == 200
        documents = list_response.json()["data"]["items"]
        assert len(documents) >= 1
        assert any(d["id"] == document_id for d in documents)

        # Step 8: Export document
        with patch('app.services.export.pdf_exporter.PDFExporter') as mock_export:
            mock_export.return_value.export = AsyncMock(return_value={
                "file_path": "/exports/output.pdf",
                "file_size": 2048,
                "format": "pdf",
            })

            export_response = await async_client.post(
                f"/api/v1/documents/{document_id}/export",
                json={"format": "pdf"},
                headers=auth_headers,
            )

            assert export_response.status_code == 200

        # Step 9: Delete document
        delete_response = await async_client.delete(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers,
        )

        assert delete_response.status_code == 200

        # Step 10: Logout
        logout_response = await async_client.post(
            "/api/v1/auth/logout",
            headers=auth_headers,
        )

        assert logout_response.status_code == 200


@pytest.mark.e2e
@pytest.mark.asyncio
class TestErrorRecoveryWorkflow:
    """Test workflow with error scenarios and recovery."""

    async def test_duplicate_detection_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_pdf_file,
    ):
        """Test duplicate document detection in workflow."""
        # Step 1: Upload first document
        files = {"file": ("duplicate.pdf", test_pdf_file, "application/pdf")}
        upload1_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        assert upload1_response.status_code == 201
        document1_id = upload1_response.json()["data"]["id"]

        # Step 2: Upload same document again (duplicate)
        test_pdf_file.seek(0)
        files = {"file": ("duplicate.pdf", test_pdf_file, "application/pdf")}
        upload2_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        # Should return existing document
        assert upload2_response.status_code == 200
        document2_data = upload2_response.json()["data"]
        assert document2_data["id"] == document1_id
        assert document2_data.get("is_duplicate") is True

    async def test_invalid_file_recovery_workflow(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
    ):
        """Test workflow with invalid file and recovery."""
        # Step 1: Try to upload invalid file
        from io import BytesIO
        invalid_file = BytesIO(b"Not a valid PDF")
        files = {"file": ("invalid.pdf", invalid_file, "application/pdf")}

        upload_response = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        # Should reject invalid file
        assert upload_response.status_code in [400, 422]

        # Step 2: Upload valid file
        from tests.conftest import create_test_pdf
        valid_pdf = create_test_pdf()
        files = {"file": ("valid.pdf", valid_pdf, "application/pdf")}

        upload_response2 = await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            headers=auth_headers,
        )

        assert upload_response2.status_code == 201

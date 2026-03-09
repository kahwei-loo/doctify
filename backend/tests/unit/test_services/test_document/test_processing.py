"""
Unit tests for DocumentProcessingService.

Tests state machine transitions, validation rules, and status queries.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.document.processing import DocumentProcessingService
from app.core.exceptions import ValidationError, NotFoundError


MODULE = "app.services.document.processing"


def _make_document(
    status="pending",
    extracted_data=None,
    extracted_text=None,
    extraction_metadata=None,
    processing_error=None,
    processing_completed_at=None,
    processing_started_at=None,
    project_id=None,
):
    """Create a mock Document object."""
    doc = MagicMock()
    doc.id = uuid.uuid4()
    doc.status = status
    doc.original_filename = "invoice.pdf"
    doc.file_size = 1024
    doc.file_type = "application/pdf"
    doc.extracted_data = extracted_data
    doc.extracted_text = extracted_text
    doc.extraction_metadata = extraction_metadata
    doc.processing_error = processing_error
    doc.processing_completed_at = processing_completed_at
    doc.processing_started_at = processing_started_at
    doc.project_id = project_id
    doc.created_at = datetime(2026, 1, 1, 12, 0, 0)
    doc.updated_at = datetime(2026, 1, 1, 12, 0, 0)
    return doc


def _build_service():
    """Instantiate DocumentProcessingService with mocked repository."""
    repo = AsyncMock()
    service = DocumentProcessingService(document_repository=repo)
    return service, repo


@pytest.mark.unit
class TestStartProcessing:
    """Tests for start_processing state transition."""

    @pytest.mark.asyncio
    async def test_pending_document_transitions_to_processing(self):
        service, repo = _build_service()
        doc = _make_document(status="pending")
        repo.get_by_id = AsyncMock(return_value=doc)
        repo.update_status = AsyncMock(return_value=_make_document(status="processing"))

        result = await service.start_processing(str(doc.id))

        assert result.status == "processing"
        repo.update_status.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_failed_document_can_restart_processing(self):
        service, repo = _build_service()
        doc = _make_document(status="failed")
        repo.get_by_id = AsyncMock(return_value=doc)
        repo.update_status = AsyncMock(return_value=_make_document(status="processing"))

        result = await service.start_processing(str(doc.id))

        assert result.status == "processing"

    @pytest.mark.asyncio
    async def test_completed_document_cannot_start_processing(self):
        service, repo = _build_service()
        doc = _make_document(status="completed")
        repo.get_by_id = AsyncMock(return_value=doc)

        with pytest.raises(ValidationError, match="Cannot start processing"):
            await service.start_processing(str(doc.id))


@pytest.mark.unit
class TestCompleteProcessing:
    """Tests for complete_processing state transition."""

    @pytest.mark.asyncio
    async def test_processing_document_can_complete(self):
        service, repo = _build_service()
        doc = _make_document(status="processing")
        repo.get_by_id = AsyncMock(return_value=doc)
        repo.update_extraction_result = AsyncMock(
            return_value=_make_document(status="completed")
        )

        result = await service.complete_processing(
            str(doc.id), extracted_data={"text": "Hello"}
        )

        assert result.status == "completed"
        repo.update_extraction_result.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_pending_document_cannot_complete(self):
        service, repo = _build_service()
        doc = _make_document(status="pending")
        repo.get_by_id = AsyncMock(return_value=doc)

        with pytest.raises(ValidationError, match="Cannot complete"):
            await service.complete_processing(
                str(doc.id), extracted_data={"text": "Hello"}
            )

    @pytest.mark.asyncio
    async def test_empty_extracted_data_raises_validation_error(self):
        service, repo = _build_service()
        doc = _make_document(status="processing")
        repo.get_by_id = AsyncMock(return_value=doc)

        with pytest.raises(ValidationError, match="Extracted data cannot be empty"):
            await service.complete_processing(str(doc.id), extracted_data={})


@pytest.mark.unit
class TestFailProcessing:
    """Tests for fail_processing state transition."""

    @pytest.mark.asyncio
    async def test_processing_document_can_fail(self):
        service, repo = _build_service()
        doc = _make_document(status="processing")
        repo.get_by_id = AsyncMock(return_value=doc)
        repo.update_status = AsyncMock(return_value=_make_document(status="failed"))

        result = await service.fail_processing(str(doc.id), "OCR engine timeout")

        assert result.status == "failed"
        repo.update_status.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_completed_document_cannot_fail(self):
        service, repo = _build_service()
        doc = _make_document(status="completed")
        repo.get_by_id = AsyncMock(return_value=doc)

        with pytest.raises(ValidationError, match="Cannot fail"):
            await service.fail_processing(str(doc.id), "Some error")


@pytest.mark.unit
class TestCancelProcessing:
    """Tests for cancel_processing state transition."""

    @pytest.mark.asyncio
    async def test_pending_document_can_be_cancelled(self):
        service, repo = _build_service()
        doc = _make_document(status="pending")
        repo.get_by_id = AsyncMock(return_value=doc)
        repo.update_status = AsyncMock(return_value=_make_document(status="cancelled"))

        result = await service.cancel_processing(str(doc.id))

        assert result.status == "cancelled"

    @pytest.mark.asyncio
    async def test_completed_document_cannot_be_cancelled(self):
        service, repo = _build_service()
        doc = _make_document(status="completed")
        repo.get_by_id = AsyncMock(return_value=doc)

        with pytest.raises(ValidationError, match="Cannot cancel"):
            await service.cancel_processing(str(doc.id))

    @pytest.mark.asyncio
    async def test_failed_document_cannot_be_cancelled(self):
        service, repo = _build_service()
        doc = _make_document(status="failed")
        repo.get_by_id = AsyncMock(return_value=doc)

        with pytest.raises(ValidationError, match="Cannot cancel"):
            await service.cancel_processing(str(doc.id))


@pytest.mark.unit
class TestRetryFailedDocument:
    """Tests for retry_failed_document logic."""

    @pytest.mark.asyncio
    async def test_failed_document_resets_to_pending(self):
        service, repo = _build_service()
        doc = _make_document(status="failed")
        repo.get_by_id = AsyncMock(return_value=doc)
        repo.update_status = AsyncMock(return_value=_make_document(status="pending"))

        result = await service.retry_failed_document(str(doc.id))

        assert result.status == "pending"

    @pytest.mark.asyncio
    async def test_pending_document_returns_as_is(self):
        service, repo = _build_service()
        doc = _make_document(status="pending")
        repo.get_by_id = AsyncMock(return_value=doc)

        result = await service.retry_failed_document(str(doc.id))

        assert result.status == "pending"
        repo.update_status.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_completed_document_cannot_retry(self):
        service, repo = _build_service()
        doc = _make_document(status="completed")
        repo.get_by_id = AsyncMock(return_value=doc)

        with pytest.raises(ValidationError, match="already completed"):
            await service.retry_failed_document(str(doc.id))

    @pytest.mark.asyncio
    async def test_stuck_processing_document_can_retry_after_timeout(self):
        service, repo = _build_service()
        # Processing started 15 minutes ago (exceeds 10-minute threshold)
        started = datetime.now(timezone.utc) - timedelta(minutes=15)
        doc = _make_document(status="processing", processing_started_at=started)
        repo.get_by_id = AsyncMock(return_value=doc)
        repo.update_status = AsyncMock(return_value=_make_document(status="pending"))

        result = await service.retry_failed_document(str(doc.id))

        assert result.status == "pending"

    @pytest.mark.asyncio
    async def test_recently_started_processing_cannot_retry(self):
        service, repo = _build_service()
        # Processing started 2 minutes ago (under 10-minute threshold)
        started = datetime.now(timezone.utc) - timedelta(minutes=2)
        doc = _make_document(status="processing", processing_started_at=started)
        repo.get_by_id = AsyncMock(return_value=doc)

        with pytest.raises(ValidationError, match="still being processed"):
            await service.retry_failed_document(str(doc.id))


@pytest.mark.unit
class TestGetProcessingStatus:
    """Tests for get_processing_status."""

    @pytest.mark.asyncio
    async def test_returns_basic_status_info(self):
        service, repo = _build_service()
        doc = _make_document(status="pending")
        repo.get_by_id = AsyncMock(return_value=doc)

        result = await service.get_processing_status(str(doc.id))

        assert result["status"] == "pending"
        assert result["filename"] == "invoice.pdf"
        assert result["mime_type"] == "application/pdf"

    @pytest.mark.asyncio
    async def test_completed_includes_extraction_result(self):
        service, repo = _build_service()
        doc = _make_document(
            status="completed",
            extracted_data={"text": "Invoice data"},
            extracted_text="Invoice data",
            extraction_metadata={"confidence": 0.95},
            processing_completed_at=datetime(2026, 1, 1, 12, 5, 0),
        )
        repo.get_by_id = AsyncMock(return_value=doc)

        result = await service.get_processing_status(str(doc.id))

        assert "extraction_result" in result
        assert result["extraction_result"]["confidence"] == 0.95
        assert "processing_duration_seconds" in result

    @pytest.mark.asyncio
    async def test_failed_includes_error_message(self):
        service, repo = _build_service()
        doc = _make_document(status="failed", processing_error="OCR timeout")
        repo.get_by_id = AsyncMock(return_value=doc)

        result = await service.get_processing_status(str(doc.id))

        assert result["error_message"] == "OCR timeout"


@pytest.mark.unit
class TestGetDocumentsByStatus:
    """Tests for get_documents_by_status validation."""

    @pytest.mark.asyncio
    async def test_invalid_status_raises_validation_error(self):
        service, repo = _build_service()

        with pytest.raises(ValidationError, match="Invalid status"):
            await service.get_documents_by_status("nonexistent")

    @pytest.mark.asyncio
    async def test_valid_status_delegates_to_repo(self):
        service, repo = _build_service()
        repo.get_by_status = AsyncMock(return_value=[])

        await service.get_documents_by_status("pending")

        repo.get_by_status.assert_awaited_once()

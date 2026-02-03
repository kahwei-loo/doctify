"""
Unit Tests for OCR Service

Tests document OCR extraction and processing operations.
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime
from uuid import uuid4

from app.services.ocr.orchestrator import OCROrchestrator


@pytest.mark.unit
@pytest.mark.asyncio
class TestOCROrchestrator:
    """Test OCR Orchestrator operations."""

    @pytest.fixture
    def mock_document_repository(self):
        """Create mock document repository."""
        mock = AsyncMock()
        mock.get_by_id = AsyncMock()
        mock.update_status = AsyncMock()
        mock.update_extraction_result = AsyncMock()
        return mock

    @pytest.fixture
    def mock_ocr_provider(self):
        """Create mock OCR provider."""
        mock = Mock()
        mock.extract_text = AsyncMock()
        mock.extract_tables = AsyncMock()
        mock.extract_images = AsyncMock()
        return mock

    @pytest.fixture
    def orchestrator(self, mock_document_repository, mock_ocr_provider):
        """Create OCR orchestrator instance."""
        return OCROrchestrator(mock_document_repository, mock_ocr_provider)

    async def test_process_document_success(self, orchestrator, mock_document_repository, mock_ocr_provider):
        """Test successful document OCR processing."""
        # Arrange
        document_id = uuid4()
        document = {
            "id": document_id,
            "file_path": "/uploads/test.pdf",
            "filename": "test.pdf",
            "status": "pending",
            "page_count": 5,
        }

        extraction_result = {
            "text": "Sample extracted text",
            "confidence": 0.95,
            "pages": [
                {"page_number": 1, "text": "Page 1 content", "confidence": 0.96},
                {"page_number": 2, "text": "Page 2 content", "confidence": 0.94},
            ],
            "metadata": {
                "processing_time": 2.5,
                "language": "en",
            },
        }

        mock_document_repository.get_by_id.return_value = document
        mock_ocr_provider.extract_text.return_value = extraction_result
        mock_document_repository.update_extraction_result.return_value = {
            **document,
            "extraction_result": extraction_result,
            "status": "completed",
        }

        # Act
        result = await orchestrator.process_document(document_id)

        # Assert
        assert result is not None
        assert result["status"] == "completed"
        assert "extraction_result" in result

        mock_document_repository.get_by_id.assert_called_once_with(document_id)
        mock_document_repository.update_status.assert_called_with(document_id, "processing")
        mock_ocr_provider.extract_text.assert_called_once()
        mock_document_repository.update_extraction_result.assert_called_once()

    async def test_process_document_not_found(self, orchestrator, mock_document_repository):
        """Test processing fails when document not found."""
        # Arrange
        document_id = uuid4()
        mock_document_repository.get_by_id.return_value = None

        # Act & Assert
        with pytest.raises(ValueError, match="Document not found"):
            await orchestrator.process_document(document_id)

    async def test_process_document_already_processing(self, orchestrator, mock_document_repository):
        """Test processing fails when document already being processed."""
        # Arrange
        document_id = uuid4()
        document = {
            "id": document_id,
            "status": "processing",  # Already processing
        }

        mock_document_repository.get_by_id.return_value = document

        # Act & Assert
        with pytest.raises(ValueError, match="Document is already being processed"):
            await orchestrator.process_document(document_id)

    async def test_process_document_ocr_failure(self, orchestrator, mock_document_repository, mock_ocr_provider):
        """Test processing handles OCR failure."""
        # Arrange
        document_id = uuid4()
        document = {
            "id": document_id,
            "file_path": "/uploads/test.pdf",
            "status": "pending",
        }

        mock_document_repository.get_by_id.return_value = document
        mock_ocr_provider.extract_text.side_effect = Exception("OCR service error")

        # Act & Assert
        with pytest.raises(Exception, match="OCR service error"):
            await orchestrator.process_document(document_id)

        # Should update status to failed
        mock_document_repository.update_status.assert_any_call(document_id, "failed")

    async def test_process_with_custom_config(self, orchestrator, mock_document_repository, mock_ocr_provider):
        """Test processing with custom extraction configuration."""
        # Arrange
        document_id = uuid4()
        document = {
            "id": document_id,
            "file_path": "/uploads/test.pdf",
            "status": "pending",
        }

        custom_config = {
            "extract_tables": True,
            "extract_images": True,
            "language": "en",
            "deskew": True,
        }

        mock_document_repository.get_by_id.return_value = document
        mock_ocr_provider.extract_text.return_value = {
            "text": "Extracted text",
            "confidence": 0.9,
        }

        # Act
        result = await orchestrator.process_document(
            document_id,
            extraction_config=custom_config
        )

        # Assert
        assert result is not None
        mock_ocr_provider.extract_text.assert_called_once()
        call_args = mock_ocr_provider.extract_text.call_args
        assert call_args[1]["config"] == custom_config

    async def test_validate_extraction_quality(self, orchestrator):
        """Test extraction quality validation."""
        # Arrange
        high_quality_result = {
            "text": "Sample text",
            "confidence": 0.95,
        }

        low_quality_result = {
            "text": "Sample text",
            "confidence": 0.45,
        }

        # Act & Assert
        assert orchestrator.validate_quality(high_quality_result, min_confidence=0.75) is True
        assert orchestrator.validate_quality(low_quality_result, min_confidence=0.75) is False

    async def test_validate_extraction_empty_text(self, orchestrator):
        """Test extraction validation fails with empty text."""
        # Arrange
        empty_result = {
            "text": "",
            "confidence": 0.95,
        }

        # Act & Assert
        assert orchestrator.validate_quality(empty_result) is False

    async def test_retry_failed_processing(self, orchestrator, mock_document_repository, mock_ocr_provider):
        """Test retrying failed document processing."""
        # Arrange
        document_id = uuid4()
        failed_document = {
            "id": document_id,
            "file_path": "/uploads/test.pdf",
            "status": "failed",
            "retry_count": 1,
        }

        mock_document_repository.get_by_id.return_value = failed_document
        mock_ocr_provider.extract_text.return_value = {
            "text": "Successful retry",
            "confidence": 0.9,
        }

        # Act
        result = await orchestrator.retry_processing(document_id)

        # Assert
        assert result is not None
        assert result["status"] == "completed"
        mock_document_repository.update_status.assert_called()

    async def test_retry_max_attempts_exceeded(self, orchestrator, mock_document_repository):
        """Test retry fails when max attempts exceeded."""
        # Arrange
        document_id = uuid4()
        document = {
            "id": document_id,
            "status": "failed",
            "retry_count": 5,  # Max retries exceeded
        }

        mock_document_repository.get_by_id.return_value = document

        # Act & Assert
        with pytest.raises(ValueError, match="Maximum retry attempts exceeded"):
            await orchestrator.retry_processing(document_id, max_retries=5)

    async def test_extract_with_language_detection(self, orchestrator, mock_ocr_provider):
        """Test OCR extraction with automatic language detection."""
        # Arrange
        file_path = "/uploads/multilang.pdf"

        mock_ocr_provider.detect_language = AsyncMock(return_value="fr")
        mock_ocr_provider.extract_text.return_value = {
            "text": "Texte français",
            "confidence": 0.92,
            "language": "fr",
        }

        # Act
        result = await orchestrator.extract_with_language_detection(file_path)

        # Assert
        assert result is not None
        assert result["language"] == "fr"
        mock_ocr_provider.detect_language.assert_called_once_with(file_path)

    async def test_batch_process_documents(self, orchestrator, mock_document_repository, mock_ocr_provider):
        """Test batch processing multiple documents."""
        # Arrange
        document_ids = [uuid4(), uuid4(), uuid4()]
        documents = [
            {"id": doc_id, "file_path": f"/uploads/doc{i}.pdf", "status": "pending"}
            for i, doc_id in enumerate(document_ids)
        ]

        mock_document_repository.get_by_id.side_effect = documents
        mock_ocr_provider.extract_text.return_value = {
            "text": "Extracted text",
            "confidence": 0.9,
        }

        # Act
        results = await orchestrator.batch_process(document_ids)

        # Assert
        assert len(results) == 3
        assert all(r["status"] == "completed" for r in results)

    async def test_extract_tables_from_document(self, orchestrator, mock_ocr_provider):
        """Test extracting tables from document."""
        # Arrange
        file_path = "/uploads/table_doc.pdf"
        page_numbers = [1, 2]

        mock_ocr_provider.extract_tables.return_value = [
            {
                "page": 1,
                "table_index": 0,
                "rows": 5,
                "columns": 3,
                "data": [["A", "B", "C"], ["1", "2", "3"]],
            },
            {
                "page": 2,
                "table_index": 0,
                "rows": 3,
                "columns": 2,
                "data": [["X", "Y"], ["10", "20"]],
            },
        ]

        # Act
        result = await orchestrator.extract_tables(file_path, page_numbers)

        # Assert
        assert len(result) == 2
        assert result[0]["page"] == 1
        assert result[1]["page"] == 2
        mock_ocr_provider.extract_tables.assert_called_once_with(file_path, page_numbers)

    async def test_calculate_processing_metrics(self, orchestrator):
        """Test calculation of processing metrics."""
        # Arrange
        start_time = datetime.utcnow()
        extraction_result = {
            "text": "Sample text with multiple words",
            "confidence": 0.95,
            "pages": [
                {"page_number": 1, "confidence": 0.96},
                {"page_number": 2, "confidence": 0.94},
            ],
        }

        # Act
        metrics = orchestrator.calculate_metrics(extraction_result, start_time)

        # Assert
        assert "processing_time" in metrics
        assert "average_confidence" in metrics
        assert "word_count" in metrics
        assert "page_count" in metrics
        assert metrics["average_confidence"] == pytest.approx(0.95, rel=0.01)
        assert metrics["page_count"] == 2

    async def test_handle_low_confidence_pages(self, orchestrator, mock_document_repository):
        """Test handling of pages with low OCR confidence."""
        # Arrange
        document_id = uuid4()
        extraction_result = {
            "text": "Overall text",
            "confidence": 0.85,
            "pages": [
                {"page_number": 1, "text": "Good quality", "confidence": 0.95},
                {"page_number": 2, "text": "Poor quality", "confidence": 0.45},  # Low confidence
                {"page_number": 3, "text": "Good quality", "confidence": 0.90},
            ],
        }

        # Act
        flagged_pages = orchestrator.identify_low_confidence_pages(
            extraction_result,
            threshold=0.75
        )

        # Assert
        assert len(flagged_pages) == 1
        assert flagged_pages[0]["page_number"] == 2
        assert flagged_pages[0]["confidence"] == 0.45

    async def test_extract_metadata_from_result(self, orchestrator):
        """Test extracting metadata from OCR result."""
        # Arrange
        extraction_result = {
            "text": "Sample document text",
            "confidence": 0.92,
            "pages": [{"page_number": 1}],
            "metadata": {
                "author": "Test Author",
                "title": "Test Document",
                "creation_date": "2024-01-01",
            },
        }

        # Act
        metadata = orchestrator.extract_metadata(extraction_result)

        # Assert
        assert metadata is not None
        assert metadata["author"] == "Test Author"
        assert metadata["title"] == "Test Document"
        assert "creation_date" in metadata

"""
Enhanced OCR Attempt Logger with Full Data Capture

Logs complete OCR processing information including:
- Actual extracted data (for accuracy verification)
- AI prompts and raw responses (for debugging)
- Field-level confidence scores (for quality analysis)
- All retry attempts (for decision auditing)

Log types:
1. Single attempt: ocr_{document_id}_{timestamp}.json
2. All attempts: ocr_all_attempts_{document_id}_{timestamp}.json

Benefits:
- Full observability and auditability
- Accuracy verification against ground truth
- AI behavior debugging (prompt → response)
- Retry decision analysis
- Human-readable JSON format
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

# Log directory configuration
# IMPORTANT: Use absolute path to work correctly in Docker container
LOGS_DIR = Path("/app/logs/ocr_attempts")


def ensure_log_directory() -> Path:
    """Ensure log directory exists, create if needed."""
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"OCR log directory ensured: {LOGS_DIR}")
        return LOGS_DIR
    except Exception as e:
        logger.error(f"Failed to create OCR log directory {LOGS_DIR}: {e}")
        raise


def generate_log_filename(
    document_id: str, timestamp: Optional[datetime] = None
) -> str:
    """
    Generate timestamped log filename.

    Format: ocr_{document_id}_{timestamp}.json
    Example: ocr_3f42afd8-4af7-43ef-af18-53f6ee02fa41_20260131_103045_123.json

    Args:
        document_id: Document UUID
        timestamp: Optional timestamp (defaults to now)

    Returns:
        Filename string
    """
    if timestamp is None:
        timestamp = datetime.utcnow()

    # Format: YYYYMMDD_HHMMSS_mmm (milliseconds)
    timestamp_str = timestamp.strftime("%Y%m%d_%H%M%S_%f")[:-3]

    return f"ocr_{document_id}_{timestamp_str}.json"


def log_ocr_attempt(
    document_id: str,
    attempt_number: int,
    model: str,
    tokens: Dict[str, int],
    confidence: float,
    doc_type: str,
    line_items_count: int,
    validation_errors: int,
    extracted_data: Optional[Dict[str, Any]] = None,
    prompt_used: Optional[str] = None,
    raw_response: Optional[str] = None,
    field_confidences: Optional[Dict[str, float]] = None,
    additional_data: Optional[Dict[str, Any]] = None,
) -> Path:
    """
    Log OCR attempt with complete data capture.

    Args:
        document_id: Document UUID
        attempt_number: Attempt number (1, 2, 3...)
        model: AI model used (e.g., "google/gemini-2.0-flash-001")
        tokens: Token usage dict with prompt_tokens, completion_tokens, total_tokens
        confidence: Overall confidence score (0.0-1.0)
        doc_type: Detected document type (e.g., "receipt", "invoice")
        line_items_count: Number of line items extracted
        validation_errors: Number of validation errors
        extracted_data: Actual extracted data (for accuracy verification)
        prompt_used: Complete prompt sent to AI (for debugging)
        raw_response: Raw AI response before parsing (for debugging)
        field_confidences: Per-field confidence scores (for quality analysis)
        additional_data: Optional additional metadata

    Returns:
        Path to created log file

    Example:
        >>> log_ocr_attempt(
        ...     document_id="3f42afd8-4af7-43ef-af18-53f6ee02fa41",
        ...     attempt_number=1,
        ...     model="google/gemini-2.0-flash-001",
        ...     tokens={"prompt_tokens": 15000, "completion_tokens": 11566, "total_tokens": 26566},
        ...     confidence=0.85,
        ...     doc_type="CASH BILL",
        ...     line_items_count=2,
        ...     validation_errors=0,
        ...     extracted_data={"documentNo": "227/143", "totalAmount": 3315.00},
        ...     field_confidences={"documentNo": 0.95, "totalAmount": 0.92}
        ... )
    """
    # Ensure log directory exists
    log_dir = ensure_log_directory()

    # Generate filename with timestamp
    timestamp = datetime.utcnow()
    filename = generate_log_filename(document_id, timestamp)
    log_file = log_dir / filename

    # Prepare log data with complete information
    log_data = {
        "document_id": document_id,
        "timestamp": timestamp.isoformat() + "Z",  # ISO 8601 format with Z for UTC
        "attempt_number": attempt_number,
        "model": model,
        "tokens": tokens,
        "confidence": confidence,
        "doc_type": doc_type,
        "line_items_count": line_items_count,
        "validation_errors": validation_errors,
    }

    # Add extracted data for accuracy verification
    if extracted_data is not None:
        log_data["extracted_data"] = extracted_data

    # Add field-level confidence scores
    if field_confidences is not None:
        log_data["field_confidences"] = field_confidences

    # Add prompt and raw response for AI debugging
    if prompt_used is not None:
        log_data["prompt_used"] = prompt_used

    if raw_response is not None:
        log_data["raw_response"] = raw_response

    # Add optional additional data
    if additional_data:
        log_data.update(additional_data)

    # Write JSON file (pretty-printed for human readability)
    try:
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        logger.info(f"✅ OCR attempt {attempt_number} logged to: {log_file}")
        return log_file

    except Exception as e:
        logger.error(f"❌ Failed to write OCR log file {log_file}: {e}", exc_info=True)
        # Also print to stdout for celery logs visibility
        print(f"❌ OCR LOGGER ERROR: Failed to write {log_file}: {e}")
        raise


def get_document_attempts(document_id: str) -> list:
    """
    Get all OCR attempts for a specific document.

    Args:
        document_id: Document UUID

    Returns:
        List of attempt data dictionaries, sorted by timestamp
    """
    log_dir = ensure_log_directory()
    pattern = f"ocr_{document_id}_*.json"

    attempts = []
    for log_file in log_dir.glob(pattern):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                attempts.append(json.load(f))
        except Exception as e:
            logger.error(f"Failed to read log file {log_file}: {e}")

    # Sort by timestamp
    attempts.sort(key=lambda x: x.get("timestamp", ""))
    return attempts


def log_all_attempts(
    document_id: str,
    all_results: List[Dict[str, Any]],
    all_confidences: List[float],
    all_field_confidences: List[Dict[str, float]],
    selected_index: int,
    models_used: List[str],
    retry_reasons: Optional[List[List[str]]] = None,
) -> Path:
    """
    Log all retry attempts for comparison and auditing.

    This creates a separate log file containing all attempts, allowing for:
    - Decision auditing (why was this result selected?)
    - Accuracy comparison (which attempt was actually best?)
    - Model performance analysis (which model performs better?)
    - Retry strategy optimization

    Args:
        document_id: Document UUID
        all_results: List of extracted data from all attempts
        all_confidences: List of overall confidence scores
        all_field_confidences: List of field-level confidence dicts
        selected_index: Index of the selected result (0-based)
        models_used: List of models used for each attempt
        retry_reasons: Optional list of retry reasons for each attempt

    Returns:
        Path to created log file

    Example:
        >>> log_all_attempts(
        ...     document_id="3f42afd8-4af7-43ef-af18-53f6ee02fa41",
        ...     all_results=[
        ...         {"documentNo": "227/143", "totalAmount": 3315.00},
        ...         {"documentNo": "227/143", "totalAmount": 3310.00},
        ...         {"documentNo": "227/143", "totalAmount": 3315.00}
        ...     ],
        ...     all_confidences=[0.45, 0.43, 0.42],
        ...     all_field_confidences=[
        ...         {"documentNo": 0.95, "totalAmount": 0.45},
        ...         {"documentNo": 0.93, "totalAmount": 0.43},
        ...         {"documentNo": 0.92, "totalAmount": 0.42}
        ...     ],
        ...     selected_index=0,
        ...     models_used=["openai/gpt-4o-mini", "openai/gpt-4o", "anthropic/claude-3-5-sonnet"],
        ...     retry_reasons=[[], ["low_confidence"], ["low_confidence"]]
        ... )
    """
    # Ensure log directory exists
    log_dir = ensure_log_directory()

    # Generate filename with timestamp
    timestamp = datetime.utcnow()
    timestamp_str = timestamp.strftime("%Y%m%d_%H%M%S_%f")[:-3]
    filename = f"ocr_all_attempts_{document_id}_{timestamp_str}.json"
    log_file = log_dir / filename

    # Prepare comprehensive log data
    log_data = {
        "document_id": document_id,
        "timestamp": timestamp.isoformat() + "Z",
        "total_attempts": len(all_results),
        "selected_attempt": selected_index + 1,  # 1-based for human readability
        "selected_confidence": (
            all_confidences[selected_index]
            if selected_index < len(all_confidences)
            else None
        ),
        "confidence_range": {
            "min": min(all_confidences) if all_confidences else 0.0,
            "max": max(all_confidences) if all_confidences else 0.0,
            "avg": (
                sum(all_confidences) / len(all_confidences) if all_confidences else 0.0
            ),
        },
        "attempts": [],
    }

    # Add detailed information for each attempt
    for i in range(len(all_results)):
        attempt_data = {
            "attempt_number": i + 1,
            "model": models_used[i] if i < len(models_used) else "unknown",
            "confidence": all_confidences[i] if i < len(all_confidences) else 0.0,
            "extracted_data": all_results[i],
            "field_confidences": (
                all_field_confidences[i] if i < len(all_field_confidences) else {}
            ),
            "is_selected": i == selected_index,
        }

        # Add retry reasons if available
        if retry_reasons and i < len(retry_reasons):
            attempt_data["retry_reasons"] = retry_reasons[i]

        log_data["attempts"].append(attempt_data)

    # Write JSON file (pretty-printed for human readability)
    try:
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        logger.info(f"✅ All {len(all_results)} OCR attempts logged to: {log_file}")
        return log_file

    except Exception as e:
        logger.error(
            f"❌ Failed to write all-attempts log file {log_file}: {e}", exc_info=True
        )
        # Also print to stdout for celery logs visibility
        print(f"❌ OCR LOGGER ERROR: Failed to write all-attempts log {log_file}: {e}")
        raise


def cleanup_old_logs(days_to_keep: int = 30) -> int:
    """
    Clean up log files older than specified days.

    Args:
        days_to_keep: Number of days to retain logs (default: 30)

    Returns:
        Number of files deleted
    """
    log_dir = ensure_log_directory()
    cutoff_time = datetime.utcnow().timestamp() - (days_to_keep * 86400)

    deleted_count = 0
    for log_file in log_dir.glob("ocr_*.json"):
        try:
            if log_file.stat().st_mtime < cutoff_time:
                log_file.unlink()
                deleted_count += 1
        except Exception as e:
            logger.error(f"Failed to delete old log file {log_file}: {e}")

    if deleted_count > 0:
        logger.info(
            f"Cleaned up {deleted_count} old OCR log files (older than {days_to_keep} days)"
        )

    return deleted_count

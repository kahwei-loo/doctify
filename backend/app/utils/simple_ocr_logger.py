"""
Simple OCR Logger for MVP - JSON format for analysis and debugging

Features:
- JSON file logging (machine-readable, easy to analyze)
- Clear stdout output (human-readable, real-time monitoring)
- Fault-tolerant design (logging failures don't affect business logic)
- Complete information (Prompt, Response, Tokens, performance metrics)
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Log directory
LOGS_DIR = Path("/app/logs/ocr_attempts")


def ensure_log_directory() -> Path:
    """Ensure the log directory exists."""
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        return LOGS_DIR
    except Exception as e:
        logger.error(f"Failed to create log directory {LOGS_DIR}: {e}")
        # Fallback: use temporary directory
        fallback_dir = Path("/tmp/ocr_logs")
        fallback_dir.mkdir(parents=True, exist_ok=True)
        return fallback_dir


def log_ocr_request(
    # Basic information
    document_id: str,
    user_id: Optional[str] = None,
    filename: str = "unknown",

    # Processing information
    attempt_number: int = 1,
    model: str = "unknown",

    # Prompt & Response
    prompt: Optional[str] = None,
    raw_response: Optional[str] = None,

    # Structured output
    extracted_data: Optional[Dict[str, Any]] = None,

    # Function/Tool Calling
    tools_called: Optional[List[str]] = None,

    # Token usage
    tokens: Optional[Dict[str, int]] = None,

    # Performance metrics
    processing_time_seconds: Optional[float] = None,

    # Quality metrics
    confidence: Optional[float] = None,
    doc_type: Optional[str] = None,
    validation_errors: int = 0,

    # Additional information
    additional_data: Optional[Dict[str, Any]] = None,
) -> Optional[Path]:
    """
    Log complete OCR request information.

    Strategy:
    1. Clear stdout output (with separators, visible in Docker logs)
    2. Structured JSON file (complete data, easy to analyze)
    3. Fault-tolerant design (logging failures don't affect business logic)

    Returns:
        Log file path on success, None on failure.
    """
    timestamp = datetime.utcnow()

    # ========================================================================
    # Step 1: Clear stdout output (real-time visibility)
    # ========================================================================
    try:
        _print_stdout_log(
            timestamp=timestamp,
            document_id=document_id,
            user_id=user_id,
            filename=filename,
            attempt_number=attempt_number,
            model=model,
            tokens=tokens,
            processing_time_seconds=processing_time_seconds,
            confidence=confidence,
            doc_type=doc_type,
            validation_errors=validation_errors,
        )
    except Exception as e:
        logger.error(f"Failed to print stdout log: {e}")

    # ========================================================================
    # Step 2: JSON file log (complete data)
    # ========================================================================
    try:
        log_dir = ensure_log_directory()

        # Filename: ocr_<document_id>_attempt<N>_<timestamp>.json
        timestamp_str = timestamp.strftime("%Y%m%d_%H%M%S")
        log_filename = f"ocr_{document_id}_attempt{attempt_number}_{timestamp_str}.json"
        log_file = log_dir / log_filename

        # Build complete log data
        log_data = {
            # Metadata
            "timestamp": timestamp.isoformat() + "Z",
            "log_version": "1.0",

            # Basic information
            "document_id": document_id,
            "user_id": user_id,
            "filename": filename,
            "attempt_number": attempt_number,

            # AI model information
            "model": model,
            "tokens": tokens or {},
            "processing_time_seconds": processing_time_seconds,

            # Prompt & Response
            "prompt": prompt,
            "raw_response": raw_response,

            # Structured output
            "extracted_data": extracted_data,

            # Function/Tool Calling
            "tools_called": tools_called or [],

            # Quality metrics
            "confidence": confidence,
            "doc_type": doc_type,
            "validation_errors": validation_errors,

            # Additional information
            "additional_data": additional_data or {},
        }

        # Write JSON file (formatted for readability)
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        logger.info(f"✅ OCR log saved: {log_file}")
        print(f"✅ Log saved: {log_file}")

        return log_file

    except Exception as e:
        # Logging failures don't affect business logic
        logger.error(f"Failed to write OCR log file: {e}", exc_info=True)
        print(f"❌ OCR_LOG_ERROR: {e}")
        return None


def _print_stdout_log(
    timestamp: datetime,
    document_id: str,
    user_id: Optional[str],
    filename: str,
    attempt_number: int,
    model: str,
    tokens: Optional[Dict[str, int]],
    processing_time_seconds: Optional[float],
    confidence: Optional[float],
    doc_type: Optional[str],
    validation_errors: int,
):
    """Print clear stdout log with separators."""

    # Format timestamp
    time_str = timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")

    # Format tokens
    if tokens:
        prompt_tokens = tokens.get("prompt_tokens", 0)
        completion_tokens = tokens.get("completion_tokens", 0)
        total_tokens = tokens.get("total_tokens", 0)
        token_str = f"{total_tokens:,} ({prompt_tokens:,} prompt + {completion_tokens:,} completion)"
    else:
        token_str = "N/A"

    # Format duration
    if processing_time_seconds is not None:
        if processing_time_seconds >= 1:
            time_str_duration = f"{processing_time_seconds:.2f}s"
        else:
            time_str_duration = f"{int(processing_time_seconds * 1000)}ms"
    else:
        time_str_duration = "N/A"

    # Format confidence
    conf_str = f"{confidence:.1%}" if confidence is not None else "N/A"

    # Print separated log
    print("=" * 80)
    print(f"📊 OCR Request #{attempt_number} [{time_str}]")
    print("=" * 80)
    print(f"Document:   {document_id}")
    if user_id:
        print(f"User:       {user_id}")
    print(f"File:       {filename}")
    print(f"Model:      {model}")
    print(f"Tokens:     {token_str}")
    print(f"Time:       {time_str_duration}")
    print(f"Confidence: {conf_str}")
    if doc_type:
        print(f"Doc Type:   {doc_type}")
    if validation_errors > 0:
        print(f"Errors:     {validation_errors}")
    print("-" * 80)


def log_all_attempts_summary(
    document_id: str,
    attempts: List[Dict[str, Any]],
    selected_attempt: int,
) -> Optional[Path]:
    """
    Log a summary comparison of all attempts (JSON format).

    Useful for analyzing:
    - Which attempt performed best?
    - Performance comparison across different models
    - Whether the retry strategy was effective
    """
    try:
        log_dir = ensure_log_directory()
        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        log_filename = f"ocr_summary_{document_id}_{timestamp_str}.json"
        log_file = log_dir / log_filename

        # Build summary data
        summary_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "document_id": document_id,
            "total_attempts": len(attempts),
            "selected_attempt": selected_attempt,
            "attempts": attempts,

            # Statistics
            "statistics": {
                "avg_confidence": sum(a.get("confidence", 0) for a in attempts) / len(attempts) if attempts else 0,
                "max_confidence": max((a.get("confidence", 0) for a in attempts), default=0),
                "min_confidence": min((a.get("confidence", 0) for a in attempts), default=0),
                "total_tokens": sum(a.get("tokens", {}).get("total_tokens", 0) for a in attempts),
                "total_time": sum(a.get("processing_time", 0) for a in attempts),
            }
        }

        # Write file
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(summary_data, f, indent=2, ensure_ascii=False)

        logger.info(f"✅ Summary log saved: {log_file}")
        print(f"✅ Summary saved: {log_file}")

        return log_file

    except Exception as e:
        logger.error(f"Failed to write summary log: {e}", exc_info=True)
        return None


def get_recent_logs(limit: int = 10) -> List[Path]:
    """Get a list of the most recent log files."""
    try:
        log_dir = ensure_log_directory()
        log_files = sorted(
            log_dir.glob("ocr_*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        return log_files[:limit]
    except Exception as e:
        logger.error(f"Failed to get recent logs: {e}")
        return []


def read_log(log_file: Path) -> Optional[Dict[str, Any]]:
    """Read a log file and return its JSON data."""
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read log file {log_file}: {e}")
        return None


def analyze_logs(
    document_id: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    Analyze log files and generate a statistical report.

    Useful for:
    - Tracking average token usage
    - Comparing model performance
    - Analyzing processing times
    """
    try:
        log_dir = ensure_log_directory()

        # Find log files
        if document_id:
            pattern = f"ocr_{document_id}_*.json"
        else:
            pattern = "ocr_*.json"

        log_files = sorted(
            log_dir.glob(pattern),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )[:limit]

        if not log_files:
            return {"error": "No log files found"}

        # Statistics
        total_requests = 0
        total_tokens = 0
        total_time = 0
        model_stats = {}
        confidence_scores = []

        for log_file in log_files:
            try:
                data = read_log(log_file)
                if not data:
                    continue

                total_requests += 1

                # Token statistics
                tokens = data.get("tokens", {})
                total_tokens += tokens.get("total_tokens", 0)

                # Processing time statistics
                proc_time = data.get("processing_time_seconds", 0)
                if proc_time:
                    total_time += proc_time

                # Model statistics
                model = data.get("model", "unknown")
                if model not in model_stats:
                    model_stats[model] = {"count": 0, "total_tokens": 0}
                model_stats[model]["count"] += 1
                model_stats[model]["total_tokens"] += tokens.get("total_tokens", 0)

                # Confidence statistics
                conf = data.get("confidence")
                if conf is not None:
                    confidence_scores.append(conf)

            except Exception as e:
                logger.error(f"Error analyzing log {log_file}: {e}")

        # Generate report
        report = {
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "avg_tokens_per_request": total_tokens / total_requests if total_requests > 0 else 0,
            "total_processing_time": total_time,
            "avg_processing_time": total_time / total_requests if total_requests > 0 else 0,
            "model_statistics": model_stats,
            "confidence_statistics": {
                "avg": sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0,
                "max": max(confidence_scores) if confidence_scores else 0,
                "min": min(confidence_scores) if confidence_scores else 0,
            } if confidence_scores else None,
        }

        return report

    except Exception as e:
        logger.error(f"Failed to analyze logs: {e}", exc_info=True)
        return {"error": str(e)}


def cleanup_old_logs(days_to_keep: int = 30) -> int:
    """Clean up old log files."""
    try:
        log_dir = ensure_log_directory()
        cutoff_time = datetime.utcnow().timestamp() - (days_to_keep * 86400)

        deleted_count = 0
        for log_file in log_dir.glob("ocr_*.json"):
            if log_file.stat().st_mtime < cutoff_time:
                log_file.unlink()
                deleted_count += 1

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old OCR logs (>{days_to_keep} days)")

        return deleted_count

    except Exception as e:
        logger.error(f"Failed to cleanup logs: {e}")
        return 0

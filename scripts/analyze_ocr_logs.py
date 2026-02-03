#!/usr/bin/env python3
"""
Simple OCR Logfile Analysis Script

Analyzes OCR attempt logfiles to identify patterns, bottlenecks, and optimization opportunities.

Usage:
    python scripts/analyze_ocr_logs.py
    python scripts/analyze_ocr_logs.py --days 7
    python scripts/analyze_ocr_logs.py --model "google/gemini-2.0-flash-001"
    python scripts/analyze_ocr_logs.py --min-confidence 0.5

Examples:
    # Analyze all logs
    python scripts/analyze_ocr_logs.py

    # Analyze last 7 days only
    python scripts/analyze_ocr_logs.py --days 7

    # Find low confidence attempts
    python scripts/analyze_ocr_logs.py --max-confidence 0.5

    # Analyze specific model performance
    python scripts/analyze_ocr_logs.py --model "openai/gpt-4o"
"""

import argparse
import json
import glob
import sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Dict, Any


def load_logs(
    log_dir: str = "logs/ocr_attempts",
    days: int = None,
    model: str = None,
    min_confidence: float = None,
    max_confidence: float = None,
) -> List[Dict[str, Any]]:
    """
    Load OCR attempt logs with optional filters.

    Args:
        log_dir: Directory containing log files
        days: Only load logs from last N days
        model: Filter by specific model name
        min_confidence: Minimum confidence threshold
        max_confidence: Maximum confidence threshold

    Returns:
        List of log dictionaries
    """
    log_path = Path(log_dir)
    if not log_path.exists():
        print(f"[ERROR] Log directory not found: {log_dir}")
        return []

    pattern = log_path / "ocr_*.json"
    cutoff_time = None
    if days:
        cutoff_time = datetime.utcnow() - timedelta(days=days)

    logs = []
    for log_file in glob.glob(str(pattern)):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                log_data = json.load(f)

            # Apply filters
            if days and cutoff_time:
                log_time = datetime.fromisoformat(log_data["timestamp"].replace("Z", ""))
                if log_time < cutoff_time:
                    continue

            if model and log_data.get("model") != model:
                continue

            if min_confidence and log_data.get("confidence", 0) < min_confidence:
                continue

            if max_confidence and log_data.get("confidence", 1) > max_confidence:
                continue

            logs.append(log_data)

        except Exception as e:
            print(f"[WARN]  Failed to read {log_file}: {e}")

    return logs


def analyze_model_performance(logs: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Calculate performance metrics per model.

    Returns:
        {
            "model_name": {
                "count": 10,
                "avg_confidence": 0.75,
                "min_confidence": 0.35,
                "max_confidence": 0.95,
                "avg_tokens": 26500,
                "success_rate": 0.80  # confidence > 0.7
            }
        }
    """
    model_stats = defaultdict(lambda: {
        "confidences": [],
        "tokens": [],
        "line_items": [],
        "validation_errors": [],
    })

    for log in logs:
        model = log.get("model", "unknown")
        model_stats[model]["confidences"].append(log.get("confidence", 0))
        model_stats[model]["tokens"].append(log.get("tokens", {}).get("total_tokens", 0))
        model_stats[model]["line_items"].append(log.get("line_items_count", 0))
        model_stats[model]["validation_errors"].append(log.get("validation_errors", 0))

    # Calculate aggregates
    results = {}
    for model, stats in model_stats.items():
        confidences = stats["confidences"]
        tokens = stats["tokens"]
        line_items = stats["line_items"]
        validation_errors = stats["validation_errors"]

        results[model] = {
            "count": len(confidences),
            "avg_confidence": sum(confidences) / len(confidences) if confidences else 0,
            "min_confidence": min(confidences) if confidences else 0,
            "max_confidence": max(confidences) if confidences else 0,
            "avg_tokens": int(sum(tokens) / len(tokens)) if tokens else 0,
            "avg_line_items": sum(line_items) / len(line_items) if line_items else 0,
            "success_rate": sum(1 for c in confidences if c >= 0.7) / len(confidences) if confidences else 0,
            "error_rate": sum(1 for e in validation_errors if e > 0) / len(validation_errors) if validation_errors else 0,
        }

    return results


def find_problem_patterns(logs: List[Dict[str, Any]]) -> List[tuple]:
    """
    Identify common problem patterns in failed attempts.

    Returns:
        List of (pattern_name, count) sorted by frequency
    """
    problem_patterns = defaultdict(int)

    low_confidence_logs = [log for log in logs if log.get("confidence", 0) < 0.5]

    for log in low_confidence_logs:
        # Track validation errors
        if log.get("validation_errors", 0) > 0:
            problem_patterns["low_confidence_with_validation_errors"] += 1

        # Track low line item extraction
        if log.get("line_items_count", 0) < 2:
            problem_patterns["insufficient_line_items"] += 1

        # Track document type confidence
        doc_type_conf = log.get("additional_data", {}).get("doc_type_confidence", 1.0)
        if doc_type_conf < 0.5:
            problem_patterns["uncertain_document_type"] += 1

        # Track retry reasons
        retry_reasons = log.get("additional_data", {}).get("retry_reasons", [])
        for reason in retry_reasons:
            problem_patterns[f"retry_reason_{reason}"] += 1

    return sorted(problem_patterns.items(), key=lambda x: x[1], reverse=True)


def analyze_escalation_patterns(logs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze model escalation patterns.

    Returns:
        {
            "total_documents": 100,
            "documents_with_retry": 30,
            "escalation_rate": 0.30,
            "avg_attempts_per_doc": 1.5,
            "escalation_success_rate": 0.80  # improved confidence after escalation
        }
    """
    # Group by document_id
    doc_attempts = defaultdict(list)
    for log in logs:
        doc_id = log.get("document_id", "unknown")
        doc_attempts[doc_id].append(log)

    # Sort each document's attempts by attempt_number
    for doc_id, attempts in doc_attempts.items():
        doc_attempts[doc_id] = sorted(attempts, key=lambda x: x.get("attempt_number", 0))

    # Calculate metrics
    total_docs = len(doc_attempts)
    docs_with_retry = sum(1 for attempts in doc_attempts.values() if len(attempts) > 1)

    total_attempts = sum(len(attempts) for attempts in doc_attempts.values())
    avg_attempts = total_attempts / total_docs if total_docs > 0 else 0

    # Calculate escalation success (confidence improved after retry)
    escalation_successes = 0
    escalation_attempts = 0

    for attempts in doc_attempts.values():
        if len(attempts) > 1:
            escalation_attempts += 1
            first_conf = attempts[0].get("confidence", 0)
            last_conf = attempts[-1].get("confidence", 0)
            if last_conf > first_conf:
                escalation_successes += 1

    escalation_success_rate = escalation_successes / escalation_attempts if escalation_attempts > 0 else 0

    return {
        "total_documents": total_docs,
        "documents_with_retry": docs_with_retry,
        "escalation_rate": docs_with_retry / total_docs if total_docs > 0 else 0,
        "avg_attempts_per_doc": avg_attempts,
        "escalation_success_rate": escalation_success_rate,
    }


def print_summary(logs: List[Dict[str, Any]]):
    """Print comprehensive analysis summary."""
    if not logs:
        print("[STATS] No logs found matching criteria")
        return

    print("\n" + "="*60)
    print("[STATS] OCR LOGFILE ANALYSIS SUMMARY")
    print("="*60)

    # Basic stats
    print(f"\n[BASIC] Basic Statistics:")
    print(f"  Total Attempts: {len(logs)}")
    print(f"  Date Range: {min(log['timestamp'] for log in logs)} -> {max(log['timestamp'] for log in logs)}")

    # Model performance
    print(f"\n[MODEL] Model Performance:")
    model_perf = analyze_model_performance(logs)
    for model, stats in sorted(model_perf.items(), key=lambda x: x[1]['avg_confidence'], reverse=True):
        print(f"\n  {model}:")
        print(f"    Count: {stats['count']}")
        print(f"    Avg Confidence: {stats['avg_confidence']:.3f}")
        print(f"    Min/Max: {stats['min_confidence']:.3f} / {stats['max_confidence']:.3f}")
        print(f"    Avg Tokens: {stats['avg_tokens']:,}")
        print(f"    Avg Line Items: {stats['avg_line_items']:.1f}")
        print(f"    Success Rate (>=0.7): {stats['success_rate']*100:.1f}%")
        print(f"    Error Rate: {stats['error_rate']*100:.1f}%")

    # Problem patterns
    print(f"\n[WARN] Problem Patterns (Top 5):")
    problems = find_problem_patterns(logs)
    for pattern, count in problems[:5]:
        print(f"  - {pattern}: {count} occurrences")

    # Escalation analysis
    print(f"\n[ESCALATION] Model Escalation Analysis:")
    escalation = analyze_escalation_patterns(logs)
    print(f"  Total Documents: {escalation['total_documents']}")
    print(f"  Documents with Retry: {escalation['documents_with_retry']}")
    print(f"  Escalation Rate: {escalation['escalation_rate']*100:.1f}%")
    print(f"  Avg Attempts per Doc: {escalation['avg_attempts_per_doc']:.2f}")
    print(f"  Escalation Success Rate: {escalation['escalation_success_rate']*100:.1f}%")

    # Confidence distribution
    print(f"\n[STATS] Confidence Distribution:")
    confidences = [log.get("confidence", 0) for log in logs]
    ranges = [
        ("Critical (0.0-0.3)", lambda c: c < 0.3),
        ("Low (0.3-0.5)", lambda c: 0.3 <= c < 0.5),
        ("Medium (0.5-0.7)", lambda c: 0.5 <= c < 0.7),
        ("Good (0.7-0.9)", lambda c: 0.7 <= c < 0.9),
        ("Excellent (0.9-1.0)", lambda c: c >= 0.9),
    ]

    for label, predicate in ranges:
        count = sum(1 for c in confidences if predicate(c))
        pct = count / len(confidences) * 100 if confidences else 0
        bar = "#" * int(pct / 2)  # 50% = 25 blocks
        print(f"  {label:20s}: {count:3d} ({pct:5.1f}%) {bar}")

    print("\n" + "="*60)


def main():
    parser = argparse.ArgumentParser(description="Analyze OCR attempt logfiles")
    parser.add_argument("--days", type=int, help="Analyze logs from last N days only")
    parser.add_argument("--model", type=str, help="Filter by specific model")
    parser.add_argument("--min-confidence", type=float, help="Minimum confidence threshold")
    parser.add_argument("--max-confidence", type=float, help="Maximum confidence threshold")
    parser.add_argument("--log-dir", type=str, default="logs/ocr_attempts", help="Log directory path")

    args = parser.parse_args()

    print(f"[LOAD] Loading OCR logs from: {args.log_dir}")
    if args.days:
        print(f"   Filtering: Last {args.days} days")
    if args.model:
        print(f"   Filtering: Model = {args.model}")
    if args.min_confidence:
        print(f"   Filtering: Confidence >= {args.min_confidence}")
    if args.max_confidence:
        print(f"   Filtering: Confidence <= {args.max_confidence}")

    logs = load_logs(
        log_dir=args.log_dir,
        days=args.days,
        model=args.model,
        min_confidence=args.min_confidence,
        max_confidence=args.max_confidence,
    )

    if not logs:
        print("\n[ERROR] No logs found. Make sure OCR has been run and logs directory exists.")
        sys.exit(1)

    print_summary(logs)


if __name__ == "__main__":
    main()

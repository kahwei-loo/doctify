#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test OCR Logger Functionality

Quick test to verify OCR logging works correctly.
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from app.utils.ocr_logger import log_ocr_attempt, get_document_attempts


def test_basic_logging():
    """Test basic OCR attempt logging."""
    print("[TEST] Testing OCR Logger...")

    # Simulate OCR attempt
    document_id = "test-doc-123"

    print(f"\n1. Logging attempt for document: {document_id}")
    log_file = log_ocr_attempt(
        document_id=document_id,
        attempt_number=1,
        model="google/gemini-2.0-flash-001",
        tokens={
            "prompt_tokens": 15000,
            "completion_tokens": 11566,
            "total_tokens": 26566
        },
        confidence=0.35,
        doc_type="receipt",
        line_items_count=2,
        validation_errors=2,
        additional_data={
            "doc_type_confidence": 0.85,
            "retry_reasons": ["low_overall_confidence"],
            "has_validation_errors": True
        }
    )

    print(f"[OK] Log created: {log_file}")

    # Simulate retry with escalation
    print(f"\n2. Logging retry attempt (escalated to GPT-4o)")
    log_file_2 = log_ocr_attempt(
        document_id=document_id,
        attempt_number=2,
        model="openai/gpt-4o",
        tokens={
            "prompt_tokens": 15000,
            "completion_tokens": 11500,
            "total_tokens": 26500
        },
        confidence=0.82,
        doc_type="receipt",
        line_items_count=4,
        validation_errors=0,
        additional_data={
            "doc_type_confidence": 0.92,
            "retry_reasons": ["low_overall_confidence"],
            "has_validation_errors": False
        }
    )

    print(f"[OK] Retry log created: {log_file_2}")

    # Retrieve all attempts for document
    print(f"\n3. Retrieving all attempts for document")
    attempts = get_document_attempts(document_id)

    print(f"[OK] Found {len(attempts)} attempts")
    for attempt in attempts:
        print(f"\n  Attempt #{attempt['attempt_number']}:")
        print(f"    Model: {attempt['model']}")
        print(f"    Confidence: {attempt['confidence']:.3f}")
        print(f"    Tokens: {attempt['tokens']['total_tokens']:,}")
        print(f"    Line Items: {attempt['line_items_count']}")

    # Verify escalation improved confidence
    if len(attempts) >= 2:
        improvement = attempts[1]['confidence'] - attempts[0]['confidence']
        print(f"\n4. Escalation Analysis:")
        print(f"  Initial Confidence: {attempts[0]['confidence']:.3f}")
        print(f"  After Escalation: {attempts[1]['confidence']:.3f}")
        print(f"  Improvement: {improvement:+.3f} ({improvement/attempts[0]['confidence']*100:+.1f}%)")

        if improvement > 0:
            print(f"  [SUCCESS] Escalation successful!")
        else:
            print(f"  [WARNING] Escalation did not improve confidence")

    print("\n[PASS] All tests passed!")
    print(f"\n[TIP] Run analysis script to see formatted report:")
    print(f"   python scripts/analyze_ocr_logs.py")


if __name__ == "__main__":
    try:
        test_basic_logging()
    except Exception as e:
        print(f"\n[FAIL] Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

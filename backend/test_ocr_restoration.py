"""
Quick test to verify OCR pipeline restoration changes.

This script tests:
1. Field aliases are working correctly
2. Expected output schema includes all new fields
3. Model escalation chain is configured (with Google Gemini)
4. Prompt includes PAGE-BY-PAGE instructions
5. Enhanced JSON schema constraints (P1)
"""
import sys
import io
import json

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from app.services.ocr.l25_orchestrator import (
    L25Orchestrator,
    _default_expected_output_dict,
    normalize_field_names,
    FIELD_ALIASES,
    LINE_ITEM_FIELD_ALIASES,
)


def test_schema_completeness():
    """Test that expected output schema has all required fields."""
    schema = _default_expected_output_dict()

    required_fields = [
        "totalDiscountAmount",
        "serviceCharge",
        "serviceChargeRate",
        "totalRoundingAmount",
        "paymentMethod",
        "documentTime",
        "sellerTradeName",
        "cardLastFour",
        "taxRate",
        "totalBeforeTax",
        "totalAfterTax",
    ]

    print("Testing schema completeness...")
    missing_fields = [f for f in required_fields if f not in schema]

    if missing_fields:
        print(f"  ✗ FAILED: Missing fields: {missing_fields}")
        return False
    else:
        print(f"  ✓ PASSED: All {len(required_fields)} new fields present")
        return True


def test_field_aliases():
    """Test that field aliases are working correctly."""
    print("\nTesting field aliases...")

    # Test document-level aliases
    test_cases = [
        ("totalDiscount", "total_discount_amount"),
        ("sst", "tax_amount"),
        ("potongan", "total_discount_amount"),
        ("serviceCharge", "service_charge"),
        ("rounding", "total_rounding_amount"),
    ]

    passed = 0
    for input_field, expected_output in test_cases:
        result = FIELD_ALIASES.get(input_field)
        if result == expected_output:
            print(f"  ✓ {input_field} → {expected_output}")
            passed += 1
        else:
            print(f"  ✗ {input_field} → {result} (expected {expected_output})")

    print(f"  Summary: {passed}/{len(test_cases)} aliases passed")
    return passed == len(test_cases)


def test_line_item_aliases():
    """Test that line item field aliases are working correctly."""
    print("\nTesting line item field normalization...")

    # Test input with regional variations
    raw_output = {
        "lineItems": [
            {
                "desc": "HM AyamGoreng McD",
                "qty": 1,
                "price": 18.90,
                "amount": 18.90,
            },
            {
                "description": "S IceLemonTea",
                "quantity": 1,
                "unitPrice": 7.90,
                "totalPrice": 7.90,
            },
        ]
    }

    normalized = normalize_field_names(raw_output, is_strict_mode=False)

    # Check if line items were normalized correctly
    if "line_items" in normalized and isinstance(normalized["line_items"], list):
        item1 = normalized["line_items"][0]
        item2 = normalized["line_items"][1]

        # Check first item (should have aliases applied)
        checks = [
            ("description" in item1, "desc → description"),
            ("quantity" in item1, "qty → quantity"),
            ("unit_price" in item1 or "unitPrice" in item1, "price → unit_price/unitPrice"),
        ]

        passed = sum(1 for check, _ in checks if check)
        for check, desc in checks:
            status = "✓" if check else "✗"
            print(f"  {status} {desc}")

        print(f"  Summary: {passed}/{len(checks)} normalizations passed")
        return passed == len(checks)
    else:
        print("  ✗ FAILED: line_items not found or not normalized")
        return False


def test_model_escalation():
    """Test that model escalation chain is configured."""
    print("\nTesting model escalation...")

    orchestrator = L25Orchestrator()

    if hasattr(orchestrator, "model_escalation_chain"):
        chain = orchestrator.model_escalation_chain
        print(f"  ✓ Model escalation chain configured with {len(chain)} models:")
        for i, model in enumerate(chain):
            print(f"    Retry {i}: {model}")

        # Check for Google Gemini support
        has_gemini = any("gemini" in m.lower() or "google/" in m.lower() for m in chain)
        if has_gemini:
            print(f"  ✓ Google Gemini support enabled")
        else:
            print(f"  ⚠ Google Gemini not in escalation chain")

        # Check that we have at least 4 models for escalation (including Gemini)
        return len(chain) >= 4 and has_gemini
    else:
        print("  ✗ FAILED: model_escalation_chain not found")
        return False


def test_prompt_enhancement():
    """Test that prompt includes PAGE-BY-PAGE instructions."""
    print("\nTesting prompt enhancement...")

    orchestrator = L25Orchestrator()

    # Prepare a test config
    config = {
        "message_content": "Extract receipt data",
        "expected_json_output": '{"docType": "receipt"}',
    }

    # Get the text content (this includes the prompt)
    text_content = orchestrator._prepare_text_content(config, image_count=1)

    # Check for key phrases
    checks = [
        ("PAGE-BY-PAGE EXTRACTION" in text_content, "PAGE-BY-PAGE instructions"),
        ("count carefully" in text_content.lower(), "Counting directives"),
        ("FIELD MAPPINGS" in text_content, "Field mapping section"),
        ("SST" in text_content or "Discount" in text_content, "Regional variations"),
        ("EXAMPLE OUTPUT FORMAT" in text_content, "Example output"),
    ]

    passed = sum(1 for check, _ in checks if check)
    for check, desc in checks:
        status = "✓" if check else "✗"
        print(f"  {status} {desc}")

    print(f"  Summary: {passed}/{len(checks)} prompt elements passed")
    print(f"  Prompt length: {len(text_content)} chars (was 416, target >1000)")

    return passed >= 4 and len(text_content) > 1000


def test_schema_constraints():
    """Test that JSON schema has enhanced constraints."""
    print("\nTesting enhanced schema constraints...")

    orchestrator = L25Orchestrator()

    # Test with default schema
    config = {"expected_json_output": json.dumps(_default_expected_output_dict())}

    # Build schema for OpenAI (with constraints)
    openai_functions = orchestrator._build_function_schema(config, for_google=False)
    openai_schema = openai_functions[0]["parameters"]

    # Build schema for Gemini (without enum constraints)
    gemini_functions = orchestrator._build_function_schema(config, for_google=True)
    gemini_schema = gemini_functions[0]["parameters"]

    checks = [
        (
            "additionalProperties" in openai_schema
            and openai_schema["additionalProperties"] is False,
            "additionalProperties=false (prevents hallucinated fields)",
        ),
        (
            "minimum" in openai_schema["properties"]["doc_type_confidence"],
            "doc_type_confidence has minimum constraint",
        ),
        (
            "maximum" in openai_schema["properties"]["doc_type_confidence"],
            "doc_type_confidence has maximum constraint",
        ),
        (
            openai_schema["properties"]["doc_type_confidence"]["minimum"] == 0.0,
            "Confidence minimum is 0.0",
        ),
        (
            openai_schema["properties"]["doc_type_confidence"]["maximum"] == 1.0,
            "Confidence maximum is 1.0",
        ),
        (
            "additionalProperties" not in gemini_schema
            or gemini_schema["additionalProperties"] is not False,
            "Gemini schema allows additionalProperties (compatibility)",
        ),
    ]

    passed = sum(1 for check, _ in checks if check)
    for check, desc in checks:
        status = "✓" if check else "✗"
        print(f"  {status} {desc}")

    print(f"  Summary: {passed}/{len(checks)} schema constraints passed")

    return passed >= 5


def main():
    """Run all tests."""
    print("=" * 70)
    print("OCR Pipeline Restoration - Verification Tests (P0 + P1)")
    print("=" * 70)

    results = {
        "Schema Completeness": test_schema_completeness(),
        "Field Aliases": test_field_aliases(),
        "Line Item Normalization": test_line_item_aliases(),
        "Model Escalation (with Gemini)": test_model_escalation(),
        "Prompt Enhancement": test_prompt_enhancement(),
        "Enhanced Schema Constraints": test_schema_constraints(),
    }

    print("\n" + "=" * 70)
    print("Test Results Summary")
    print("=" * 70)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for test_name, result in results.items():
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name:.<50} {status}")

    print("=" * 70)
    print(f"Overall: {passed}/{total} tests passed")

    if passed == total:
        print("\n✓ All tests passed! OCR restoration with P1 enhancements is ready.")
        print("\nP1 Enhancements Completed:")
        print("  • Google Gemini support added to model escalation chain")
        print("  • Enhanced JSON schema constraints (min/max, additionalProperties)")
        print("  • Provider-specific schema adjustments (Gemini compatibility)")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed. Please review the issues above.")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())

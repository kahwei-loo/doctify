"""
L2.5 Upgrade Module: Low Confidence Retry Strategy

This module implements intelligent retry logic for OCR processing when
confidence scores fall below acceptable thresholds.

Architecture:
- Layer 3 (Highest Priority): User's Project Config
- Layer 2: Retry Strategy enhancements
- Layer 1: System defaults

Migrated from old Doctify project for PostgreSQL + SQLAlchemy stack.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum


class RetryReason(Enum):
    """Reasons for triggering a retry."""

    LOW_OVERALL_CONFIDENCE = "low_overall_confidence"
    MISSING_CRITICAL_FIELDS = "missing_critical_fields"
    LOW_FIELD_CONFIDENCE = "low_field_confidence"
    AMOUNT_MISMATCH = "amount_mismatch"
    SST_VALIDATION_FAILED = "sst_validation_failed"


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""

    # Confidence thresholds (aligned with Taggun's 0.7-0.8 recommendations)
    min_acceptable_confidence: float = 0.70
    high_confidence_threshold: float = 0.85

    # Retry limits
    max_retries: int = 2

    # Field-level thresholds
    min_field_confidence: float = 0.60
    critical_field_min_confidence: float = 0.75

    # Cost control
    enable_retry: bool = True
    retry_cost_multiplier: float = 1.5  # Consider cost vs accuracy tradeoff


@dataclass
class RetryContext:
    """Context for tracking retry state across attempts."""

    attempt_number: int = 0
    max_attempts: int = 3
    previous_results: List[Dict[str, Any]] = field(default_factory=list)
    previous_confidences: List[float] = field(default_factory=list)
    retry_reasons: List[RetryReason] = field(default_factory=list)
    missing_fields: List[str] = field(default_factory=list)
    low_confidence_fields: Dict[str, float] = field(default_factory=dict)

    @property
    def is_first_attempt(self) -> bool:
        return self.attempt_number == 1

    @property
    def can_retry(self) -> bool:
        return self.attempt_number < self.max_attempts

    @property
    def best_result(self) -> Optional[Dict[str, Any]]:
        """Return the result with highest confidence."""
        if not self.previous_results:
            return None
        if not self.previous_confidences:
            return self.previous_results[-1]

        best_idx = self.previous_confidences.index(max(self.previous_confidences))
        return self.previous_results[best_idx]

    @property
    def best_confidence(self) -> Optional[float]:
        """Return the highest confidence achieved."""
        if not self.previous_confidences:
            return None
        return max(self.previous_confidences)


class RetryDecisionEngine:
    """
    Determines whether a retry should be attempted based on OCR results.

    Decision factors:
    1. Overall document confidence
    2. Field-level confidence for critical fields
    3. Missing required fields
    4. Validation errors (amount mismatch, SST issues)
    """

    def __init__(self, config: Optional[RetryConfig] = None):
        self.config = config or RetryConfig()

    def should_retry(
        self,
        result: Dict[str, Any],
        confidence: float,
        context: RetryContext,
        doc_type: str = "other",
        validation_errors: Optional[List[Dict]] = None,
    ) -> Tuple[bool, List[RetryReason]]:
        """
        Determine if a retry should be attempted.

        Returns:
            Tuple of (should_retry: bool, reasons: List[RetryReason])
        """
        if not self.config.enable_retry:
            return False, []

        if not context.can_retry:
            return False, []

        reasons: List[RetryReason] = []

        # Check 1: Overall confidence
        if confidence < self.config.min_acceptable_confidence:
            reasons.append(RetryReason.LOW_OVERALL_CONFIDENCE)

        # Check 2: Missing critical fields
        missing = self._find_missing_critical_fields(result, doc_type)
        if missing:
            reasons.append(RetryReason.MISSING_CRITICAL_FIELDS)
            context.missing_fields = missing

        # Check 3: Low field-level confidence
        field_confidences = result.get("field_confidences", {})
        low_conf_fields = self._find_low_confidence_fields(field_confidences, doc_type)
        if low_conf_fields:
            reasons.append(RetryReason.LOW_FIELD_CONFIDENCE)
            context.low_confidence_fields = low_conf_fields

        # Check 4: Validation errors
        if validation_errors:
            for err in validation_errors:
                code = err.get("code", "")
                if "amount" in code.lower() or "mismatch" in code.lower():
                    reasons.append(RetryReason.AMOUNT_MISMATCH)
                elif "sst" in code.lower() or "tax" in code.lower():
                    reasons.append(RetryReason.SST_VALIDATION_FAILED)

        # Decision: Retry if we have reasons and confidence is improvable
        should_retry = (
            len(reasons) > 0 and confidence < self.config.high_confidence_threshold
        )

        return should_retry, reasons

    def _find_missing_critical_fields(
        self,
        result: Dict[str, Any],
        doc_type: str,
    ) -> List[str]:
        """Find critical fields that are missing from the result."""
        critical_fields = CRITICAL_FIELDS_BY_DOC_TYPE.get(
            doc_type, CRITICAL_FIELDS_BY_DOC_TYPE["other"]
        )

        missing = []
        for field_name in critical_fields:
            value = result.get(field_name)
            if value is None or (isinstance(value, str) and not value.strip()):
                # Also check camelCase variant
                camel = self._to_camel_case(field_name)
                camel_value = result.get(camel)
                if camel_value is None or (
                    isinstance(camel_value, str) and not camel_value.strip()
                ):
                    missing.append(field_name)

        return missing

    def _find_low_confidence_fields(
        self,
        field_confidences: Dict[str, float],
        doc_type: str,
    ) -> Dict[str, float]:
        """Find fields with confidence below threshold."""
        critical_fields = CRITICAL_FIELDS_BY_DOC_TYPE.get(
            doc_type, CRITICAL_FIELDS_BY_DOC_TYPE["other"]
        )

        low_conf = {}
        for field_name, conf in field_confidences.items():
            if not isinstance(conf, (int, float)):
                continue

            # Use stricter threshold for critical fields
            threshold = (
                self.config.critical_field_min_confidence
                if field_name in critical_fields
                or self._to_snake_case(field_name) in critical_fields
                else self.config.min_field_confidence
            )

            if conf < threshold:
                low_conf[field_name] = conf

        return low_conf

    @staticmethod
    def _to_camel_case(snake_str: str) -> str:
        """Convert snake_case to camelCase."""
        components = snake_str.split("_")
        return components[0] + "".join(x.title() for x in components[1:])

    @staticmethod
    def _to_snake_case(camel_str: str) -> str:
        """Convert camelCase to snake_case."""
        result = []
        for i, char in enumerate(camel_str):
            if char.isupper() and i > 0:
                result.append("_")
            result.append(char.lower())
        return "".join(result)


def select_best_result(
    results: List[Dict[str, Any]],
    confidences: List[float],
    token_usages: Optional[List[Dict[str, int]]] = None,
) -> Tuple[Dict[str, Any], float]:
    """
    Select the best result from multiple retry attempts.

    Strategy (improved):
    1. Prefer highest confidence (lowered threshold to 0.03 for better sensitivity)
    2. If confidence is similar (within 0.03), prefer more complete result
    3. If both confidence and completeness are equal, prefer lower token usage (P1 fix)
    4. Add detailed logging for decision auditing

    Args:
        results: List of extracted data dictionaries
        confidences: List of overall confidence scores
        token_usages: Optional list of token usage dicts (for tiebreaker)

    Returns:
        Tuple of (best_result, best_confidence)
    """
    import logging

    logger = logging.getLogger(__name__)

    if not results:
        raise ValueError("No results to select from")

    if len(results) == 1:
        return results[0], confidences[0] if confidences else 0.0

    # Lowered threshold from 0.05 to 0.03 for better sensitivity
    CONFIDENCE_THRESHOLD = 0.03

    # Find result with highest confidence
    best_idx = 0
    best_conf = confidences[0] if confidences else 0.0

    for i, conf in enumerate(confidences[1:], 1):
        if conf > best_conf + CONFIDENCE_THRESHOLD:  # Significant improvement
            logger.debug(
                f"Attempt {i+1} has significantly higher confidence "
                f"({conf:.3f} > {best_conf:.3f} + {CONFIDENCE_THRESHOLD}), selecting it"
            )
            best_idx = i
            best_conf = conf
        elif abs(conf - best_conf) <= CONFIDENCE_THRESHOLD:  # Similar confidence
            # Compare completeness when confidences are similar
            curr_filled = _count_filled_fields(results[i])
            best_filled = _count_filled_fields(results[best_idx])
            if curr_filled > best_filled:
                logger.debug(
                    f"Attempt {i+1} has similar confidence ({conf:.3f} vs {best_conf:.3f}) "
                    f"but more complete fields ({curr_filled} > {best_filled}), selecting it"
                )
                best_idx = i
                best_conf = conf
            elif curr_filled == best_filled and token_usages:
                # P1 Fix: Tiebreaker - prefer lower token usage when confidence and completeness are equal
                curr_tokens = token_usages[i].get("total_tokens", float("inf"))
                best_tokens = token_usages[best_idx].get("total_tokens", float("inf"))
                if curr_tokens < best_tokens:
                    logger.debug(
                        f"Attempt {i+1} has similar confidence ({conf:.3f} vs {best_conf:.3f}), "
                        f"same completeness ({curr_filled} fields), but lower token usage "
                        f"({curr_tokens} < {best_tokens}), selecting it"
                    )
                    best_idx = i
                    best_conf = conf

    logger.info(
        f"Selected attempt {best_idx + 1} with confidence {best_conf:.3f} "
        f"from {len(results)} attempts"
    )

    return results[best_idx], best_conf


def merge_results(
    results: List[Dict[str, Any]],
    field_confidences_list: List[Dict[str, float]],
) -> Dict[str, Any]:
    """
    Merge multiple results, taking the highest-confidence value for each field.

    This allows combining partial successes from different attempts.
    """
    if not results:
        return {}

    if len(results) == 1:
        return results[0]

    merged = {}
    all_keys = set()
    for r in results:
        all_keys.update(r.keys())

    for key in all_keys:
        if key in ("field_confidences", "errors"):
            continue

        best_value = None
        best_conf = -1.0

        for i, result in enumerate(results):
            if key not in result:
                continue

            value = result[key]
            if value is None or (isinstance(value, str) and not value.strip()):
                continue

            # Get field confidence for this key
            fc = field_confidences_list[i] if i < len(field_confidences_list) else {}
            conf = fc.get(key, 0.5)  # Default to 0.5 if no confidence

            if conf > best_conf:
                best_conf = conf
                best_value = value

        if best_value is not None:
            merged[key] = best_value

    return merged


def _count_filled_fields(result: Dict[str, Any]) -> int:
    """Count non-empty fields in a result."""
    count = 0
    for key, value in result.items():
        if key in ("field_confidences", "errors"):
            continue
        if value is not None and (not isinstance(value, str) or value.strip()):
            count += 1
    return count


# Critical fields by document type - these require higher confidence
CRITICAL_FIELDS_BY_DOC_TYPE = {
    "invoice": [
        "total_amount",
        "vendor_name",
        "date",
        "document_number",
        "tax_amount",
    ],
    "receipt": [
        "total_amount",
        "vendor_name",
        "date",
        "payment_method",
    ],
    "bill": [
        "total_amount",
        "vendor_name",
        "due_date",
        "account_number",
    ],
    "quote": [
        "total_amount",
        "vendor_name",
        "date",
        "validity_period",
    ],
    "purchase_order": [
        "total_amount",
        "vendor_name",
        "date",
        "document_number",
    ],
    "delivery_note": [
        "vendor_name",
        "date",
        "document_number",
        "line_items",
    ],
    "credit_note": [
        "total_amount",
        "vendor_name",
        "date",
        "original_invoice_number",
    ],
    "debit_note": [
        "total_amount",
        "vendor_name",
        "date",
        "original_invoice_number",
    ],
    "bank_statement": [
        "account_number",
        "date",
        "opening_balance",
        "closing_balance",
    ],
    "payslip": [
        "employee_name",
        "date",
        "gross_salary",
        "net_salary",
    ],
    "expense_report": [
        "total_amount",
        "date",
        "employee_name",
        "line_items",
    ],
    "contract": [
        "date",
        "parties",
        "contract_value",
    ],
    "other": [
        "date",
        "total_amount",
    ],
}

"""
L2.5 Upgrade Module: Validation Layer with Malaysia Localization

This module provides post-processing validation for OCR results,
with special focus on Malaysia-specific rules (SST, MYR, company formats).

Architecture Priority:
- Layer 3 (Highest): User's Project Config validation rules
- Layer 2: Localization validation (this module supplements, doesn't override)
- Layer 1: Basic structural validation

SST Processing Modes:
- EXTRACTION (default/MVP): Extract and report SST info without judging correctness.
- VALIDATION (future): Validate against known rates (5%, 6%, 10%).

Migrated from old Doctify project for PostgreSQL + SQLAlchemy stack.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum


class ValidationSeverity(Enum):
    """Severity levels for validation issues."""

    ERROR = "error"  # Must be corrected
    WARNING = "warning"  # Should review
    INFO = "info"  # FYI only


class ValidationType(Enum):
    """Types of validation checks."""

    SST_TAX = "sst_tax"
    SST_EXTRACTION = "sst_extraction"  # Info extraction mode (MVP)
    MYR_ROUNDING = "myr_rounding"
    COMPANY_FORMAT = "company_format"
    AMOUNT_MATH = "amount_math"
    DATE_FORMAT = "date_format"
    FIELD_COMPLETENESS = "field_completeness"
    LINE_ITEM_TOTALS = "line_item_totals"


class SSTMode(Enum):
    """SST processing mode."""

    EXTRACTION = "extraction"  # Default: Extract info only, no correctness judgment
    VALIDATION = "validation"  # Future: Validate against known rates


@dataclass
class ValidationResult:
    """Result of a single validation check."""

    passed: bool
    check_type: ValidationType
    severity: ValidationSeverity
    code: str
    message: str
    field: Optional[str] = None
    expected_value: Optional[Any] = None
    actual_value: Optional[Any] = None
    auto_corrected: bool = False
    corrected_value: Optional[Any] = None


@dataclass
class ValidationReport:
    """Complete validation report for a document."""

    is_valid: bool = True
    errors: List[ValidationResult] = field(default_factory=list)
    warnings: List[ValidationResult] = field(default_factory=list)
    infos: List[ValidationResult] = field(default_factory=list)
    corrections: Dict[str, Any] = field(default_factory=dict)
    confidence_adjustment: float = 0.0

    def add_result(self, result: ValidationResult):
        """Add a validation result to the appropriate list."""
        if result.severity == ValidationSeverity.ERROR:
            self.errors.append(result)
            if not result.passed:
                self.is_valid = False
        elif result.severity == ValidationSeverity.WARNING:
            self.warnings.append(result)
        else:
            self.infos.append(result)

        # Track auto-corrections
        if result.auto_corrected and result.field:
            self.corrections[result.field] = result.corrected_value

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "is_valid": self.is_valid,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": [
                {
                    "code": e.code,
                    "message": e.message,
                    "field": e.field,
                    "severity": e.severity.value,
                }
                for e in self.errors
            ],
            "warnings": [
                {
                    "code": w.code,
                    "message": w.message,
                    "field": w.field,
                }
                for w in self.warnings
            ],
            "corrections": self.corrections,
            "confidence_adjustment": self.confidence_adjustment,
        }


@dataclass
class MalaysiaValidationConfig:
    """Configuration for Malaysia-specific validation."""

    # SST rates (kept for future validation mode)
    sst_service_rate: float = 0.06  # 6% service tax
    sst_sales_rate_5: float = 0.05  # 5% sales tax
    sst_sales_rate_10: float = 0.10  # 10% sales tax
    sst_tolerance: float = 0.02  # 2% tolerance for tax calculation

    # SST Processing Mode
    sst_mode: SSTMode = SSTMode.EXTRACTION

    # Rounding
    rounding_to_sen: int = 5  # Round to nearest 5 sen

    # Company registration patterns
    ssm_new_pattern: str = r"^\d{12}$"  # 12 digits
    ssm_old_pattern: str = r"^\d{6,7}-[A-Z]$"  # 123456-A
    roc_pattern: str = r"^[A-Z]{2}\d{7}$"  # SA1234567

    # Enable/disable specific validations
    validate_sst: bool = True  # Enable SST processing (extraction or validation)
    validate_rounding: bool = True
    validate_company_format: bool = True
    auto_correct_rounding: bool = True


class MalaysiaValidator:
    """
    Validator for Malaysia-specific document rules.

    Does NOT override user's Project Config - only supplements with
    localization-aware checks.
    """

    def __init__(self, config: Optional[MalaysiaValidationConfig] = None):
        self.config = config or MalaysiaValidationConfig()

    def validate(
        self,
        result: Dict[str, Any],
        doc_type: str,
        project_config: Optional[Dict[str, Any]] = None,
    ) -> ValidationReport:
        """
        Run all applicable validations on the OCR result.

        Args:
            result: The OCR extraction result
            doc_type: Document type
            project_config: User's custom config (for respecting their rules)

        Returns:
            ValidationReport with all findings and corrections
        """
        report = ValidationReport()

        # Check if user disabled our validations in their config
        if project_config:
            user_validation = project_config.get("validation", {})
            if user_validation.get("disable_localization_validation"):
                return report  # User explicitly disabled, respect that

        # Get currency - only run MYR checks if document is MYR
        currency = self._get_currency(result)

        # Run validations based on context
        if currency == "MYR" or self._looks_malaysian(result):
            # SST processing (extraction or validation based on mode)
            if self.config.validate_sst:
                if self.config.sst_mode == SSTMode.EXTRACTION:
                    # MVP: Extract SST info without judging correctness
                    sst_result = self._extract_sst_info(result, doc_type)
                else:
                    # Future: Validate against known rates (has limitations)
                    sst_result = self._validate_sst_strict(result, doc_type)
                if sst_result:
                    report.add_result(sst_result)

            # MYR rounding validation
            if self.config.validate_rounding:
                rounding_results = self._validate_myr_rounding(result)
                for r in rounding_results:
                    report.add_result(r)

            # Company registration format
            if self.config.validate_company_format:
                company_result = self._validate_company_format(result)
                if company_result:
                    report.add_result(company_result)

        # Universal validations (regardless of locale)
        amount_results = self._validate_amount_math(result, doc_type)
        for r in amount_results:
            report.add_result(r)

        line_item_result = self._validate_line_item_totals(result)
        if line_item_result:
            report.add_result(line_item_result)

        # Calculate confidence adjustment based on validation results
        report.confidence_adjustment = self._calculate_confidence_adjustment(report)

        return report

    def _get_currency(self, result: Dict[str, Any]) -> Optional[str]:
        """Extract currency from result."""
        currency = result.get("currency") or result.get("currencyCode")
        if isinstance(currency, str):
            return currency.upper().strip()
        return None

    def _looks_malaysian(self, result: Dict[str, Any]) -> bool:
        """Heuristic check if document appears to be Malaysian."""
        indicators = 0

        # Check for MYR or RM
        total = str(result.get("total_amount", "") or result.get("totalAmount", ""))
        if "RM" in total.upper() or "MYR" in total.upper():
            indicators += 1

        # Check for Malaysian phone format (+60)
        phone = str(result.get("vendor_phone", "") or result.get("vendorPhone", ""))
        if "+60" in phone or phone.startswith("60"):
            indicators += 1

        # Check for SST mentions
        raw_text = str(result.get("raw_text", "") or result.get("notes", ""))
        if "SST" in raw_text.upper() or "CUKAI" in raw_text.upper():
            indicators += 1

        # Check address for Malaysian states
        address = str(
            result.get("vendor_address", "") or result.get("vendorAddress", "")
        )
        my_states = [
            "selangor",
            "kuala lumpur",
            "johor",
            "penang",
            "perak",
            "sabah",
            "sarawak",
            "melaka",
            "kedah",
            "kelantan",
        ]
        if any(state in address.lower() for state in my_states):
            indicators += 1

        return indicators >= 2

    def _extract_sst_info(
        self,
        result: Dict[str, Any],
        doc_type: str,
    ) -> Optional[ValidationResult]:
        """
        Extract SST information without judging correctness (MVP mode).

        This mode only reports what SST info was found, without trying to
        validate if the tax rate is "correct" - because in reality:
        - Some receipts have SST, some don't
        - Some products are exempt, some aren't
        - Mixed items on same receipt = unpredictable effective rate
        """
        if doc_type not in ["invoice", "receipt", "bill"]:
            return None

        # Get amounts
        subtotal = self._parse_amount(
            result.get("subtotal")
            or result.get("total_excluding_tax")
            or result.get("totalExcludingTax")
        )
        tax_amount = self._parse_amount(
            result.get("tax_amount")
            or result.get("taxAmount")
            or result.get("sst_amount")
            or result.get("sstAmount")
        )

        # Report what was extracted
        if tax_amount is not None and tax_amount > 0:
            # Calculate effective rate if possible (for info only)
            effective_rate = None
            rate_info = "unknown"
            if subtotal is not None and subtotal > 0:
                effective_rate = float(tax_amount) / float(subtotal)
                rate_info = f"{effective_rate:.1%}"

            return ValidationResult(
                passed=True,  # Always pass in extraction mode
                check_type=ValidationType.SST_EXTRACTION,
                severity=ValidationSeverity.INFO,
                code="sst_extracted",
                message=f"SST found: RM{float(tax_amount):.2f} (effective rate: {rate_info})",
                field="tax_amount",
                actual_value={
                    "tax_amount": float(tax_amount),
                    "subtotal": float(subtotal) if subtotal else None,
                    "effective_rate": effective_rate,
                    "note": "Effective rate may vary due to mixed exempt/taxable items",
                },
            )
        elif tax_amount == 0 or tax_amount is None:
            return ValidationResult(
                passed=True,
                check_type=ValidationType.SST_EXTRACTION,
                severity=ValidationSeverity.INFO,
                code="sst_not_found",
                message="No SST/tax amount found on document",
                field="tax_amount",
                actual_value=None,
            )

        return None

    def _validate_sst_strict(
        self,
        result: Dict[str, Any],
        doc_type: str,
    ) -> Optional[ValidationResult]:
        """
        Validate SST (Sales and Service Tax) calculation (STRICT MODE - Future Use).

        WARNING: This validation has known limitations:
        - Fails for mixed exempt/taxable items on same receipt
        - Assumes uniform tax rate across all items
        - May incorrectly flag valid receipts as "unusual"
        """
        if doc_type not in ["invoice", "receipt", "bill"]:
            return None

        # Get amounts
        subtotal = self._parse_amount(
            result.get("subtotal")
            or result.get("total_excluding_tax")
            or result.get("totalExcludingTax")
        )
        tax_amount = self._parse_amount(
            result.get("tax_amount")
            or result.get("taxAmount")
            or result.get("sst_amount")
            or result.get("sstAmount")
        )
        _total = self._parse_amount(
            result.get("total_amount")
            or result.get("totalAmount")
            or result.get("total_payable_amount")
            or result.get("totalPayableAmount")
        )  # Reserved for future total validation

        if subtotal is None or tax_amount is None:
            return None  # Not enough data to validate

        if tax_amount == 0:
            return None  # No tax, nothing to validate

        # Calculate expected tax rates
        if subtotal == 0:
            return None

        actual_rate = float(tax_amount) / float(subtotal)

        # Check against known SST rates
        valid_rates = [
            (self.config.sst_service_rate, "6% Service Tax"),
            (self.config.sst_sales_rate_5, "5% Sales Tax"),
            (self.config.sst_sales_rate_10, "10% Sales Tax"),
        ]

        for rate, rate_name in valid_rates:
            if abs(actual_rate - rate) <= self.config.sst_tolerance:
                return ValidationResult(
                    passed=True,
                    check_type=ValidationType.SST_TAX,
                    severity=ValidationSeverity.INFO,
                    code="sst_valid",
                    message=f"SST validation passed: {rate_name}",
                    field="tax_amount",
                    expected_value=rate_name,
                    actual_value=f"{actual_rate:.1%}",
                )

        # Tax rate doesn't match any known SST rate
        return ValidationResult(
            passed=False,
            check_type=ValidationType.SST_TAX,
            severity=ValidationSeverity.WARNING,
            code="sst_rate_unusual",
            message=f"Tax rate {actual_rate:.1%} doesn't match standard SST rates (5%, 6%, 10%). Note: May be valid for mixed exempt/taxable items.",
            field="tax_amount",
            expected_value="5%, 6%, or 10%",
            actual_value=f"{actual_rate:.1%}",
        )

    def _validate_myr_rounding(
        self,
        result: Dict[str, Any],
    ) -> List[ValidationResult]:
        """Validate MYR rounding to nearest 5 sen."""
        results = []

        # Fields that should be rounded
        amount_fields = [
            ("total_amount", "totalAmount"),
            ("total_payable_amount", "totalPayableAmount"),
            ("change", "changeAmount"),
        ]

        for snake_field, camel_field in amount_fields:
            amount = self._parse_amount(
                result.get(snake_field) or result.get(camel_field)
            )
            if amount is None:
                continue

            # Check if rounded to 5 sen
            sen = int((amount % 1) * 100)
            remainder = sen % 5

            if remainder != 0:
                # Calculate corrected value
                corrected = self._round_to_5_sen(amount)

                validation = ValidationResult(
                    passed=False,
                    check_type=ValidationType.MYR_ROUNDING,
                    severity=ValidationSeverity.WARNING,
                    code="myr_rounding_issue",
                    message=f"Amount {amount} not rounded to 5 sen (expected {corrected})",
                    field=snake_field,
                    expected_value=float(corrected),
                    actual_value=float(amount),
                    auto_corrected=self.config.auto_correct_rounding,
                    corrected_value=(
                        float(corrected) if self.config.auto_correct_rounding else None
                    ),
                )
                results.append(validation)

        return results

    def _round_to_5_sen(self, amount: Decimal) -> Decimal:
        """Round amount to nearest 5 sen."""
        return (amount * 20).quantize(Decimal("1"), rounding=ROUND_HALF_UP) / 20

    def _validate_company_format(
        self,
        result: Dict[str, Any],
    ) -> Optional[ValidationResult]:
        """Validate Malaysian company registration number format."""
        reg_no = (
            result.get("vendor_tax_id")
            or result.get("vendorTaxId")
            or result.get("company_registration")
            or result.get("ssm_number")
            or result.get("ssmNumber")
        )

        if not reg_no or not isinstance(reg_no, str):
            return None

        reg_no = reg_no.strip()

        # Check against patterns
        patterns = [
            (self.config.ssm_new_pattern, "SSM New Format (12 digits)"),
            (self.config.ssm_old_pattern, "SSM Old Format (e.g., 123456-A)"),
            (self.config.roc_pattern, "ROC Format (e.g., SA1234567)"),
        ]

        for pattern, format_name in patterns:
            if re.match(pattern, reg_no):
                return ValidationResult(
                    passed=True,
                    check_type=ValidationType.COMPANY_FORMAT,
                    severity=ValidationSeverity.INFO,
                    code="company_format_valid",
                    message=f"Company registration matches {format_name}",
                    field="vendor_tax_id",
                    actual_value=reg_no,
                )

        # Doesn't match any known pattern
        return ValidationResult(
            passed=False,
            check_type=ValidationType.COMPANY_FORMAT,
            severity=ValidationSeverity.INFO,  # Info only, might be valid but non-standard
            code="company_format_unknown",
            message=f"Company registration '{reg_no}' doesn't match standard Malaysian formats",
            field="vendor_tax_id",
            expected_value="12 digits, 123456-A, or SA1234567",
            actual_value=reg_no,
        )

    def _validate_amount_math(
        self,
        result: Dict[str, Any],
        doc_type: str,
    ) -> List[ValidationResult]:
        """Validate amount calculations (subtotal + tax = total)."""
        results = []

        subtotal = self._parse_amount(
            result.get("subtotal")
            or result.get("total_excluding_tax")
            or result.get("totalExcludingTax")
        )
        tax = self._parse_amount(
            result.get("tax_amount")
            or result.get("taxAmount")
            or result.get("total_tax_amount")
            or result.get("totalTaxAmount")
        )
        discount = self._parse_amount(
            result.get("discount_amount") or result.get("discountAmount")
        ) or Decimal(0)
        total = self._parse_amount(
            result.get("total_amount")
            or result.get("totalAmount")
            or result.get("total_payable_amount")
            or result.get("totalPayableAmount")
        )

        if subtotal is not None and tax is not None and total is not None:
            expected_total = subtotal + tax - discount
            difference = abs(expected_total - total)

            # Allow small tolerance (rounding, etc.)
            tolerance = Decimal("0.10")

            if difference > tolerance:
                results.append(
                    ValidationResult(
                        passed=False,
                        check_type=ValidationType.AMOUNT_MATH,
                        severity=ValidationSeverity.WARNING,
                        code="amount_mismatch",
                        message=f"Total mismatch: subtotal({subtotal}) + tax({tax}) - discount({discount}) = {expected_total}, but total is {total}",
                        field="total_amount",
                        expected_value=float(expected_total),
                        actual_value=float(total),
                    )
                )
            else:
                results.append(
                    ValidationResult(
                        passed=True,
                        check_type=ValidationType.AMOUNT_MATH,
                        severity=ValidationSeverity.INFO,
                        code="amount_math_valid",
                        message="Amount calculation verified",
                        field="total_amount",
                    )
                )

        return results

    def _validate_line_item_totals(
        self,
        result: Dict[str, Any],
    ) -> Optional[ValidationResult]:
        """Validate that line items sum to subtotal."""
        line_items = result.get("line_items") or result.get("lineItems") or []

        if not isinstance(line_items, list) or len(line_items) == 0:
            return None

        items_total = Decimal(0)
        for item in line_items:
            if not isinstance(item, dict):
                continue
            amount = self._parse_amount(
                item.get("amount") or item.get("total") or item.get("line_total")
            )
            if amount:
                items_total += amount

        subtotal = self._parse_amount(
            result.get("subtotal") or result.get("total_excluding_tax")
        )

        if subtotal is None:
            return None

        difference = abs(items_total - subtotal)

        # Calculate percentage difference for more reliable detection
        # Use 10% threshold - more strict than previous $1 absolute tolerance
        if subtotal > 0:
            delta_pct = (difference / subtotal) * 100
            threshold_exceeded = delta_pct > Decimal("10.0")  # 10% threshold
        else:
            # For zero subtotal, use small absolute tolerance
            threshold_exceeded = difference > Decimal("0.10")
            delta_pct = Decimal("0.0")

        if threshold_exceeded:
            return ValidationResult(
                passed=False,
                check_type=ValidationType.LINE_ITEM_TOTALS,
                severity=ValidationSeverity.ERROR,  # Changed from WARNING to ERROR to trigger retry
                code="line_items_mismatch",
                message=f"Line items total ({items_total}) differs from subtotal ({subtotal}) by {delta_pct:.1f}%",
                field="line_items",
                expected_value=float(subtotal),
                actual_value=float(items_total),
            )

        return ValidationResult(
            passed=True,
            check_type=ValidationType.LINE_ITEM_TOTALS,
            severity=ValidationSeverity.INFO,
            code="line_items_valid",
            message="Line items sum correctly",
            field="line_items",
        )

    def _parse_amount(self, value: Any) -> Optional[Decimal]:
        """Parse various amount formats to Decimal."""
        if value is None:
            return None

        if isinstance(value, (int, float)):
            try:
                return Decimal(str(value))
            except InvalidOperation:
                return None

        if isinstance(value, str):
            # Remove common currency symbols and formatting
            cleaned = value.strip()
            cleaned = re.sub(r"[RM$\u20ac\xa3\xa5,\s]", "", cleaned)
            cleaned = re.sub(r"^-", "", cleaned)  # Handle negative

            try:
                return Decimal(cleaned)
            except InvalidOperation:
                return None

        return None

    def _calculate_confidence_adjustment(
        self,
        report: ValidationReport,
    ) -> float:
        """
        Calculate how much to adjust confidence based on validation.

        Positive = increase confidence (validations passed)
        Negative = decrease confidence (validations failed)

        Note: SST extraction mode (SST_EXTRACTION) does not penalize confidence
        since it only extracts info without judging correctness.
        """
        adjustment = 0.0

        # Errors decrease confidence
        for error in report.errors:
            if error.check_type == ValidationType.AMOUNT_MATH:
                adjustment -= 0.15
            elif error.check_type == ValidationType.SST_TAX:
                # Only penalize in strict validation mode, not extraction mode
                adjustment -= 0.10
            elif error.check_type == ValidationType.SST_EXTRACTION:
                # Extraction mode: never penalize, just informational
                pass
            else:
                adjustment -= 0.05

        # Passed validations increase confidence slightly
        # Count infos that indicate successful extraction/validation
        passed_count = sum(1 for e in report.infos if e.passed)
        adjustment += min(passed_count * 0.02, 0.10)

        # Clamp to reasonable range
        return max(-0.3, min(0.1, adjustment))


def validate_ocr_result(
    result: Dict[str, Any],
    doc_type: str,
    region: str = "MY",
    project_config: Optional[Dict[str, Any]] = None,
) -> Tuple[ValidationReport, Dict[str, Any]]:
    """
    Convenience function to validate an OCR result.

    Returns:
        Tuple of (ValidationReport, corrected_result)
    """
    if region == "MY":
        validator = MalaysiaValidator()
    else:
        validator = MalaysiaValidator(
            MalaysiaValidationConfig(
                validate_sst=False,
                validate_rounding=False,
                validate_company_format=False,
            )
        )

    report = validator.validate(result, doc_type, project_config)

    # Apply corrections to result
    corrected_result = dict(result)
    for field_name, value in report.corrections.items():
        corrected_result[field_name] = value

    # Add validation info to result
    corrected_result["_validation"] = report.to_dict()

    return report, corrected_result

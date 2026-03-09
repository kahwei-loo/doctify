"""
L2.5 Upgrade Module: Document Type-Specific Prompt Templates

This module provides specialized prompts for different document types,
with Malaysia localization support and retry-specific enhancements.

Architecture Priority:
- Layer 3 (Highest): User's Project Config (message_content)
- Layer 2: Document type-specific prompts (this module)
- Layer 1: System defaults (_default_message_content)

Migrated from old Doctify project for PostgreSQL + SQLAlchemy stack.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class LocalizationConfig:
    """Configuration for regional document processing."""

    region: str = "MY"  # Malaysia default
    language_hints: List[str] = None
    currency: str = "MYR"
    tax_system: str = "SST"  # Sales and Service Tax

    def __post_init__(self):
        if self.language_hints is None:
            self.language_hints = ["en", "zh", "ms"]  # English, Chinese, Malay


# Malaysia-specific constants
MALAYSIA_SST_RATES = {
    "service_tax": 0.06,  # 6% Service Tax
    "sales_tax_5": 0.05,  # 5% Sales Tax (general)
    "sales_tax_10": 0.10,  # 10% Sales Tax (specific goods)
    "exempt": 0.0,  # SST Exempt
}

MALAYSIA_COMPANY_PATTERNS = {
    "ssm_new": r"^\d{12}$",  # New format: 12 digits (e.g., 202401012345)
    "ssm_old": r"^\d{6,7}-[A-Z]$",  # Old format: 6-7 digits + letter (e.g., 123456-A)
    "roc": r"^[A-Z]{2}\d{7}$",  # ROC format (e.g., SA1234567)
}


class PromptTemplateEngine:
    """
    Generates specialized prompts based on document type and context.

    This engine supplements (not replaces) user's Project Config.
    """

    def __init__(self, localization: Optional[LocalizationConfig] = None):
        self.localization = localization or LocalizationConfig()

    def get_enhanced_prompt(
        self,
        doc_type: str,
        project_config: Optional[Dict[str, Any]] = None,
        is_retry: bool = False,
        retry_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate an enhanced prompt for document processing.

        Priority:
        1. If project_config has message_content, use it as base (user takes priority)
        2. Add document-type specific enhancements as supplementary hints
        3. Add retry-specific guidance if this is a retry attempt

        Returns:
            Enhanced prompt string
        """
        # Check if user has custom message_content (takes priority)
        user_prompt = None
        if project_config:
            user_prompt = project_config.get("message_content")

        # Get document-type specific template
        doc_type_template = self._get_doc_type_template(doc_type)

        # Get localization hints
        locale_hints = self._get_localization_hints()

        # Build final prompt
        if user_prompt:
            # User config takes priority - add our hints as supplementary
            final_prompt = self._merge_prompts(
                base=user_prompt,
                doc_type_hints=doc_type_template.get("hints", ""),
                locale_hints=locale_hints,
                is_retry=is_retry,
                retry_context=retry_context,
            )
        else:
            # No user config - use our full template
            final_prompt = self._build_full_prompt(
                doc_type_template=doc_type_template,
                locale_hints=locale_hints,
                is_retry=is_retry,
                retry_context=retry_context,
            )

        return final_prompt

    def _get_doc_type_template(self, doc_type: str) -> Dict[str, Any]:
        """Get template for specific document type."""
        templates = {
            "invoice": {
                "name": "Invoice",
                "name_zh": "发票",
                "name_ms": "Invois",
                "priority_fields": [
                    "document_number",
                    "date",
                    "due_date",
                    "vendor_name",
                    "vendor_address",
                    "vendor_tax_id",
                    "customer_name",
                    "customer_address",
                    "subtotal",
                    "tax_amount",
                    "total_amount",
                    "line_items",
                    "payment_terms",
                ],
                "hints": (
                    "INVOICE SPECIFIC:\n"
                    "- Look for invoice number (No. / Invois No. / 发票号)\n"
                    "- Extract tax breakdown (SST/GST/VAT if present)\n"
                    "- Capture vendor SSM/ROC registration number\n"
                    "- Identify payment terms and due date\n"
                    "- Line items should include: description, quantity, unit price, amount\n"
                ),
                "validation": ["tax_calculation", "line_item_totals"],
            },
            "receipt": {
                "name": "Receipt",
                "name_zh": "收据",
                "name_ms": "Resit",
                "priority_fields": [
                    "date",
                    "time",
                    "vendor_name",
                    "vendor_address",
                    "total_amount",
                    "payment_method",
                    "change",
                    "line_items",
                ],
                "hints": (
                    "RECEIPT SPECIFIC:\n"
                    "- Look for transaction date AND time\n"
                    "- Capture payment method (Cash/Card/E-wallet)\n"
                    "- Extract card last 4 digits if credit card\n"
                    "- For Malaysian receipts, look for SST amounts\n"
                    "- Capture rounding adjustment if present\n"
                ),
                "validation": ["total_matches_items"],
            },
            "bill": {
                "name": "Bill",
                "name_zh": "账单",
                "name_ms": "Bil",
                "priority_fields": [
                    "date",
                    "due_date",
                    "account_number",
                    "vendor_name",
                    "customer_name",
                    "previous_balance",
                    "current_charges",
                    "total_due",
                ],
                "hints": (
                    "BILL SPECIFIC (Utility/Service):\n"
                    "- Capture account/reference number\n"
                    "- Extract billing period dates\n"
                    "- Identify payment due date\n"
                    "- Look for previous balance and payments\n"
                    "- For utilities: capture usage details (kWh, m3, etc.)\n"
                ),
                "validation": ["balance_calculation"],
            },
            "expense_report": {
                "name": "Expense Report",
                "name_zh": "费用报告",
                "name_ms": "Laporan Perbelanjaan",
                "priority_fields": [
                    "date",
                    "employee_name",
                    "department",
                    "expense_category",
                    "total_amount",
                    "line_items",
                    "approval_status",
                ],
                "hints": (
                    "EXPENSE REPORT SPECIFIC:\n"
                    "- Identify submitter/employee name\n"
                    "- Categorize expenses (Travel/Meals/Entertainment/etc.)\n"
                    "- Look for approval signatures or status\n"
                    "- Capture expense period dates\n"
                    "- Each item: date, description, category, amount\n"
                ),
                "validation": ["category_totals"],
            },
            "bank_statement": {
                "name": "Bank Statement",
                "name_zh": "银行对账单",
                "name_ms": "Penyata Bank",
                "priority_fields": [
                    "account_number",
                    "account_holder",
                    "statement_period_start",
                    "statement_period_end",
                    "opening_balance",
                    "closing_balance",
                    "total_credits",
                    "total_debits",
                    "transactions",
                ],
                "hints": (
                    "BANK STATEMENT SPECIFIC:\n"
                    "- Capture full account number (may be masked)\n"
                    "- Extract statement period (from-to dates)\n"
                    "- Opening and closing balances are critical\n"
                    "- Each transaction: date, description, debit/credit, balance\n"
                    "- Look for running balance after each transaction\n"
                ),
                "validation": ["balance_reconciliation"],
            },
            "payslip": {
                "name": "Payslip",
                "name_zh": "工资单",
                "name_ms": "Slip Gaji",
                "priority_fields": [
                    "employee_name",
                    "employee_id",
                    "pay_period",
                    "basic_salary",
                    "allowances",
                    "deductions",
                    "gross_salary",
                    "net_salary",
                    "epf_employee",
                    "epf_employer",
                    "socso",
                    "eis",
                ],
                "hints": (
                    "PAYSLIP SPECIFIC (Malaysia):\n"
                    "- Extract EPF (KWSP) contributions: employee & employer\n"
                    "- Capture SOCSO (PERKESO) deductions\n"
                    "- Look for EIS contribution\n"
                    "- Identify PCB/MTD (tax deduction)\n"
                    "- Allowances: housing, transport, meal, etc.\n"
                    "- Gross = Basic + Allowances\n"
                    "- Net = Gross - Deductions\n"
                ),
                "validation": ["salary_calculation", "statutory_deductions"],
            },
            "purchase_order": {
                "name": "Purchase Order",
                "name_zh": "采购订单",
                "name_ms": "Pesanan Pembelian",
                "priority_fields": [
                    "po_number",
                    "date",
                    "vendor_name",
                    "ship_to_address",
                    "bill_to_address",
                    "line_items",
                    "subtotal",
                    "tax",
                    "total",
                    "delivery_date",
                    "payment_terms",
                ],
                "hints": (
                    "PURCHASE ORDER SPECIFIC:\n"
                    "- PO number is critical for tracking\n"
                    "- Capture delivery/ship-to address\n"
                    "- Expected delivery date if specified\n"
                    "- Line items: SKU/part number, description, qty, unit price\n"
                    "- Terms and conditions summary\n"
                ),
                "validation": ["line_item_totals"],
            },
            "quote": {
                "name": "Quotation",
                "name_zh": "报价单",
                "name_ms": "Sebut Harga",
                "priority_fields": [
                    "quote_number",
                    "date",
                    "valid_until",
                    "vendor_name",
                    "customer_name",
                    "line_items",
                    "subtotal",
                    "tax",
                    "total",
                ],
                "hints": (
                    "QUOTATION SPECIFIC:\n"
                    "- Quote/Reference number\n"
                    "- Validity period is important\n"
                    "- Terms and conditions\n"
                    "- Optional vs included items\n"
                    "- Warranty/guarantee terms if present\n"
                ),
                "validation": ["line_item_totals"],
            },
            "delivery_note": {
                "name": "Delivery Note",
                "name_zh": "送货单",
                "name_ms": "Nota Penghantaran",
                "priority_fields": [
                    "document_number",
                    "date",
                    "vendor_name",
                    "delivery_address",
                    "receiver_name",
                    "line_items",
                    "reference_po",
                ],
                "hints": (
                    "DELIVERY NOTE SPECIFIC:\n"
                    "- Link to PO or invoice number\n"
                    "- Receiver name and signature if visible\n"
                    "- Delivery date and time\n"
                    "- Item quantities delivered\n"
                    "- Condition notes if present\n"
                ),
                "validation": [],
            },
            "credit_note": {
                "name": "Credit Note",
                "name_zh": "贷项通知单",
                "name_ms": "Nota Kredit",
                "priority_fields": [
                    "document_number",
                    "date",
                    "original_invoice",
                    "vendor_name",
                    "customer_name",
                    "reason",
                    "line_items",
                    "credit_amount",
                ],
                "hints": (
                    "CREDIT NOTE SPECIFIC:\n"
                    "- Original invoice reference is critical\n"
                    "- Reason for credit (return/error/discount)\n"
                    "- Credit amount (usually shown as negative or bracketed)\n"
                    "- Tax adjustment if applicable\n"
                ),
                "validation": ["tax_adjustment"],
            },
            "debit_note": {
                "name": "Debit Note",
                "name_zh": "借项通知单",
                "name_ms": "Nota Debit",
                "priority_fields": [
                    "document_number",
                    "date",
                    "original_invoice",
                    "vendor_name",
                    "customer_name",
                    "reason",
                    "line_items",
                    "debit_amount",
                ],
                "hints": (
                    "DEBIT NOTE SPECIFIC:\n"
                    "- Original invoice/document reference\n"
                    "- Reason for additional charge\n"
                    "- Additional amount due\n"
                    "- New total if specified\n"
                ),
                "validation": [],
            },
            "contract": {
                "name": "Contract",
                "name_zh": "合同",
                "name_ms": "Kontrak",
                "priority_fields": [
                    "contract_number",
                    "date",
                    "effective_date",
                    "parties",
                    "contract_value",
                    "duration",
                    "terms_summary",
                ],
                "hints": (
                    "CONTRACT SPECIFIC:\n"
                    "- Identify all parties (names and roles)\n"
                    "- Contract value/amount if monetary\n"
                    "- Effective date and duration/end date\n"
                    "- Key terms and conditions summary\n"
                    "- Signature dates if visible\n"
                ),
                "validation": [],
            },
        }

        return templates.get(
            doc_type,
            {
                "name": "Document",
                "priority_fields": ["date", "total_amount"],
                "hints": "",
                "validation": [],
            },
        )

    def _get_localization_hints(self) -> str:
        """Get Malaysia-specific localization hints."""
        if self.localization.region != "MY":
            return ""

        return (
            "\n\nMALAYSIA LOCALIZATION:\n"
            "- Currency: MYR (RM) - Malaysian Ringgit\n"
            "- SST (Sales & Service Tax): 5%, 6%, or 10%\n"
            "- Company registration: SSM format (12 digits: 202401012345) or old format (123456-A)\n"
            "- Date formats: DD/MM/YYYY or DD-MM-YYYY (day first)\n"
            "- Languages: English, Bahasa Malaysia (Malay), Chinese (Mandarin)\n"
            "- Rounding: Round to nearest 5 sen (0.05 MYR)\n"
            "- Common terms:\n"
            "  - Resit = Receipt, Invois = Invoice, Bil = Bill\n"
            "  - Jumlah = Total, Cukai = Tax, Tarikh = Date\n"
            "  - Tunai = Cash, Kad = Card\n"
        )

    def _merge_prompts(
        self,
        base: str,
        doc_type_hints: str,
        locale_hints: str,
        is_retry: bool,
        retry_context: Optional[Dict[str, Any]],
    ) -> str:
        """Merge user's base prompt with supplementary hints."""
        parts = [base]

        # Add document type hints if not already covered
        if doc_type_hints and "SPECIFIC" not in base.upper():
            parts.append(f"\n\nADDITIONAL GUIDANCE:\n{doc_type_hints}")

        # Add localization if not covered
        if (
            locale_hints
            and "MALAYSIA" not in base.upper()
            and "MYR" not in base.upper()
        ):
            parts.append(locale_hints)

        # Add retry guidance
        if is_retry and retry_context:
            retry_hints = self._get_retry_hints(retry_context)
            parts.append(retry_hints)

        return "".join(parts)

    def _build_full_prompt(
        self,
        doc_type_template: Dict[str, Any],
        locale_hints: str,
        is_retry: bool,
        retry_context: Optional[Dict[str, Any]],
    ) -> str:
        """Build a full prompt from scratch (when no user config)."""
        doc_name = doc_type_template.get("name", "Document")
        hints = doc_type_template.get("hints", "")

        base = (
            f"You are an expert document data extractor specializing in {doc_name}s.\n\n"
            "CRITICAL RULES:\n"
            "1. EXTRACT EVERYTHING: Capture every piece of information visible in the document.\n"
            "2. NO FABRICATION: Only include information that EXISTS. If a field is not visible, "
            "do NOT include it. Do NOT guess.\n"
            "3. PRESERVE ACCURACY: Keep original formatting for dates, currencies, phone numbers.\n"
            "4. CONFIDENCE SCORES: For each field, provide confidence (0-1) in 'field_confidences'.\n"
        )

        parts = [base]

        if hints:
            parts.append(f"\n{hints}")

        if locale_hints:
            parts.append(locale_hints)

        if is_retry and retry_context:
            retry_hints = self._get_retry_hints(retry_context)
            parts.append(retry_hints)

        parts.append(
            "\n\nRemember: Quality over assumptions. Only report what you can SEE."
        )

        return "".join(parts)

    def _get_retry_hints(self, retry_context: Dict[str, Any]) -> str:
        """Generate retry-specific hints based on previous attempt results."""
        hints = ["\n\nRETRY ATTEMPT - FOCUS AREAS:"]

        # Missing fields
        missing = retry_context.get("missing_fields", [])
        if missing:
            hints.append("\nMISSING FIELDS (look carefully for these):")
            for field in missing[:5]:  # Limit to avoid prompt bloat
                hints.append(f"  - {field}")

        # Low confidence fields
        low_conf = retry_context.get("low_confidence_fields", {})
        if low_conf:
            hints.append("\nLOW CONFIDENCE FIELDS (verify these):")
            for field, conf in list(low_conf.items())[:5]:
                hints.append(f"  - {field}: previous confidence {conf:.2f}")

        # Validation errors
        errors = retry_context.get("validation_errors", [])
        if errors:
            hints.append("\nVALIDATION ISSUES:")
            for err in errors[:3]:
                hints.append(f"  - {err.get('message', err.get('code', 'unknown'))}")

        hints.append(
            "\nPay extra attention to these areas and provide higher-quality extraction."
        )

        return "".join(hints)


def get_retry_prompt_enhancements(
    missing_fields: List[str],
    low_confidence_fields: Dict[str, float],
    doc_type: str,
) -> str:
    """
    Generate prompt enhancements specifically for retry attempts.

    This is a simpler interface for the retry_strategy module to use.
    """
    engine = PromptTemplateEngine()
    retry_context = {
        "missing_fields": missing_fields,
        "low_confidence_fields": low_confidence_fields,
    }

    # Just return the retry hints portion
    return engine._get_retry_hints(retry_context)


# Pre-built templates for common scenarios
MALAYSIA_INVOICE_TEMPLATE = PromptTemplateEngine(
    LocalizationConfig(region="MY", tax_system="SST")
).get_enhanced_prompt("invoice")

MALAYSIA_RECEIPT_TEMPLATE = PromptTemplateEngine(
    LocalizationConfig(region="MY", tax_system="SST")
).get_enhanced_prompt("receipt")

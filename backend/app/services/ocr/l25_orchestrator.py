"""
L2.5 Upgrade Module: OCR Processing Orchestrator (Async Version)

This module orchestrates the L2.5 enhanced OCR processing pipeline:
1. Document type-specific prompts
2. Low confidence retry mechanism
3. Malaysia localization validation

Migrated from old Doctify project for PostgreSQL + SQLAlchemy stack.
Converted to async/await patterns for FastAPI compatibility.

Usage:
    from app.services.ocr.l25_orchestrator import process_with_l25_enhancements
    result = await process_with_l25_enhancements(
        file_path=file_path,
        project_config=project_config,
        enable_retry=True,
        enable_validation=True,
    )
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
import tempfile
import shutil
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from openai import AsyncOpenAI
from pdf2image import convert_from_path
from PIL import Image

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceError, ValidationError
from app.utils.simple_ocr_logger import log_ocr_request, log_all_attempts_summary

from .retry_strategy import (
    RetryConfig,
    RetryContext,
    RetryDecisionEngine,
    select_best_result,
)
from .prompt_templates import (
    PromptTemplateEngine,
    LocalizationConfig,
)
from .validation_layer import (
    validate_ocr_result,
    ValidationReport,
    MalaysiaValidator,
)

logger = logging.getLogger(__name__)
settings = get_settings()


# =============================================================================
# Configuration Constants
# =============================================================================

POPPLER_PATH = os.getenv("POPPLER_PATH") or None
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
PDF_DPI = 400  # Higher DPI for better OCR accuracy

# Extended document type list (12 types)
DOC_TYPES = [
    "invoice",
    "receipt",
    "bill",
    "quote",
    "purchase_order",
    "delivery_note",
    "credit_note",
    "debit_note",
    "bank_statement",
    "payslip",
    "expense_report",
    "contract",
    "other",
]


# =============================================================================
# L2.5 Configuration and Result Dataclasses
# =============================================================================


@dataclass
class L25Config:
    """Configuration for L2.5 enhanced processing."""

    # Feature flags
    enable_retry: bool = True
    enable_type_specific_prompts: bool = True
    enable_validation: bool = True
    enable_localization: bool = True

    # Retry settings
    retry_config: Optional[RetryConfig] = None

    # Localization settings
    localization_region: str = "MY"

    # Prompt enhancement
    enhance_prompts: bool = True

    # Cost control
    max_total_cost_multiplier: float = 2.5

    def __post_init__(self):
        if self.retry_config is None:
            self.retry_config = RetryConfig()


@dataclass
class L25Result:
    """Result from L2.5 enhanced processing."""

    # Core result
    standardized_output: Optional[Dict[str, Any]]
    raw_output: Any
    confidence: Optional[float]
    doc_type: Optional[str]
    doc_type_confidence: Optional[float]

    # Token usage
    token_usage: Dict[str, int]
    total_token_usage: Dict[str, int]

    # L2.5 enhancements
    validation_report: Optional[ValidationReport]
    retry_count: int
    retry_reasons: List[str]
    was_corrected: bool
    corrections: Dict[str, Any]

    # Errors
    errors: List[Dict[str, Any]]

    # Metadata
    l25_enabled: bool
    prompt_enhanced: bool
    process_time: float = 0.0

    # Model information (track which models were actually used)
    model: Optional[str] = None  # Final model used
    models_used: List[Dict[str, Any]] = None  # History of all attempts with models

    def __post_init__(self):
        """Initialize mutable default values."""
        if self.models_used is None:
            self.models_used = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/serialization."""
        return {
            "standardized_output": self.standardized_output,
            "raw_output": self.raw_output,
            "confidence": self.confidence,
            "doc_type": self.doc_type,
            "doc_type_confidence": self.doc_type_confidence,
            "token_usage": self.token_usage,
            "total_token_usage": self.total_token_usage,
            "validation": (
                self.validation_report.to_dict() if self.validation_report else None
            ),
            "retry_count": self.retry_count,
            "retry_reasons": self.retry_reasons,
            "was_corrected": self.was_corrected,
            "corrections": self.corrections,
            "errors": self.errors,
            "process_time": self.process_time,
            "model": self.model,  # Add model info
            "models_used": self.models_used,  # Add model history
            "l25_metadata": {
                "l25_enabled": self.l25_enabled,
                "prompt_enhanced": self.prompt_enhanced,
                "retry_count": self.retry_count,
                "models_used": self.models_used,  # Also include in l25_metadata for backward compatibility
            },
        }


# =============================================================================
# Field Normalization
# =============================================================================

# Line item field aliases for normalizing nested item structures
LINE_ITEM_FIELD_ALIASES: Dict[str, str] = {
    # Item number variations
    "itemNo": "item_number",
    "ItemNo": "item_number",
    "itemNumber": "item_number",
    "lineNo": "item_number",
    "no": "item_number",
    "No": "item_number",
    "#": "item_number",
    # SKU/Product code
    "sku": "sku",
    "SKU": "sku",
    "productCode": "sku",
    "itemCode": "sku",
    # Barcode
    "barcode": "barcode",
    "Barcode": "barcode",
    # Description variations
    "description": "description",
    "Description": "description",
    "desc": "description",
    "Desc": "description",
    "itemDescription": "description",
    "productName": "description",
    "name": "description",
    "Name": "description",
    "item": "description",
    "product": "description",
    # Quantity variations
    "quantity": "quantity",
    "Quantity": "quantity",
    "qty": "quantity",
    "Qty": "quantity",
    "QTY": "quantity",
    "count": "quantity",
    "kuantiti": "quantity",
    # Unit of measure
    "unit": "unit",
    "Unit": "unit",
    "uom": "unit",
    "UOM": "unit",
    # Unit price variations
    "unitPrice": "unit_price",
    "UnitPrice": "unit_price",
    "price": "unit_price",
    "Price": "unit_price",
    "rate": "unit_price",
    "harga": "unit_price",
    "unitCost": "unit_price",
    # Discount variations
    "discount": "discount",
    "Discount": "discount",
    "discountAmount": "discount",
    "itemDiscount": "discount",
    # Discount percentage
    "discountPercentage": "discount_percentage",
    "discountPercent": "discount_percentage",
    "discountRate": "discount_percentage",
    # Tax rate variations
    "taxRate": "tax_rate",
    "TaxRate": "tax_rate",
    "vatRate": "tax_rate",
    "taxPercent": "tax_rate",
    # Tax amount variations
    "taxAmount": "tax_amount",
    "TaxAmount": "tax_amount",
    "itemTax": "tax_amount",
    "vat": "tax_amount",
    # Subtotal variations
    "subtotal": "subtotal",
    "Subtotal": "subtotal",
    "lineTotal": "subtotal",
    # Amount/Total variations
    "amount": "amount",
    "Amount": "amount",
    "total": "amount",
    "Total": "amount",
    "lineAmount": "amount",
    "extendedPrice": "amount",
    "totalPrice": "amount",
    "jumlah": "amount",
}

FIELD_ALIASES: Dict[str, str] = {
    # Amount fields
    "totalAmount": "total_amount",
    "TotalAmount": "total_amount",
    "Total": "total_amount",
    "total": "total_amount",
    "grandTotal": "total_amount",
    "grand_total": "total_amount",
    "GrandTotal": "total_amount",
    "totalPayable": "total_payable_amount",
    "totalPayableAmount": "total_payable_amount",
    "amountDue": "amount_due",
    "AmountDue": "amount_due",
    # Subtotal
    "subTotal": "subtotal",
    "SubTotal": "subtotal",
    "sub_total": "subtotal",
    "Subtotal": "subtotal",
    "totalExcludingTax": "total_excluding_tax",
    "totalExclTax": "total_excluding_tax",
    "totalBeforeTax": "total_before_tax",
    # Tax fields (Malaysia SST, Singapore GST, etc.)
    "taxAmount": "tax_amount",
    "TaxAmount": "tax_amount",
    "Tax": "tax_amount",
    "tax": "tax_amount",
    "VAT": "tax_amount",
    "vat": "tax_amount",
    "totalTax": "total_tax_amount",
    "totalTaxAmount": "total_tax_amount",
    "sst": "tax_amount",
    "SST": "tax_amount",
    "gst": "tax_amount",
    "GST": "tax_amount",
    "service_tax": "tax_amount",
    "ServiceTax": "tax_amount",
    "cukai": "tax_amount",
    # Discount fields
    "discountAmount": "discount_amount",
    "DiscountAmount": "discount_amount",
    "Discount": "discount_amount",
    "discount": "discount_amount",
    "totalDiscount": "total_discount_amount",
    "totalDiscountAmount": "total_discount_amount",
    "potongan": "total_discount_amount",
    "Potongan": "total_discount_amount",
    "rebate": "total_discount_amount",
    "off": "total_discount_amount",
    # Service charge
    "serviceCharge": "service_charge",
    "ServiceCharge": "service_charge",
    "serviceFee": "service_charge",
    "servis": "service_charge",
    "Servis": "service_charge",
    # Rounding
    "rounding": "total_rounding_amount",
    "Rounding": "total_rounding_amount",
    "totalRounding": "total_rounding_amount",
    "totalRoundingAmount": "total_rounding_amount",
    "pembundaran": "total_rounding_amount",
    "Pembundaran": "total_rounding_amount",
    # Shipping
    "shippingCost": "shipping_cost",
    "ShippingCost": "shipping_cost",
    "shipping": "shipping_cost",
    "deliveryFee": "shipping_cost",
    # Tips
    "tipAmount": "tip_amount",
    "Tip": "tip_amount",
    "tip": "tip_amount",
    "gratuity": "tip_amount",
    # Document number variations
    "documentNo": "document_number",
    "documentNumber": "document_number",
    "DocumentNumber": "document_number",
    "docNo": "document_number",
    "DocNo": "document_number",
    "invoiceNo": "document_number",
    "invoiceNumber": "document_number",
    "InvoiceNumber": "document_number",
    "receiptNo": "document_number",
    "receiptNumber": "document_number",
    "ReceiptNumber": "document_number",
    "billNo": "document_number",
    "orderNo": "document_number",
    "orderNumber": "document_number",
    "poNumber": "document_number",
    "PONumber": "document_number",
    # Reference number
    "referenceNo": "reference_number",
    "referenceNumber": "reference_number",
    "refNo": "reference_number",
    # Date variations
    "documentDate": "date",
    "DocumentDate": "date",
    "invoiceDate": "date",
    "InvoiceDate": "date",
    "receiptDate": "date",
    "billDate": "date",
    "transactionDate": "date",
    "Date": "date",
    # Due date
    "dueDate": "due_date",
    "DueDate": "due_date",
    "paymentDueDate": "due_date",
    # Vendor/Seller/Supplier variations
    "vendorName": "vendor_name",
    "VendorName": "vendor_name",
    "vendor": "vendor_name",
    "Vendor": "vendor_name",
    "supplierName": "vendor_name",
    "supplier": "vendor_name",
    "Supplier": "vendor_name",
    "sellerName": "vendor_name",
    "seller": "vendor_name",
    "Seller": "vendor_name",
    "merchantName": "vendor_name",
    "merchant": "vendor_name",
    "Merchant": "vendor_name",
    "storeName": "vendor_name",
    "store": "vendor_name",
    "companyName": "vendor_name",
    # Vendor contact info
    "vendorAddress": "vendor_address",
    "sellerAddress": "vendor_address",
    "storeAddress": "vendor_address",
    "vendorPhone": "vendor_phone",
    "sellerPhone": "vendor_phone",
    "storePhone": "vendor_phone",
    "vendorTaxId": "vendor_tax_id",
    "sellerTaxId": "vendor_tax_id",
    "taxId": "vendor_tax_id",
    "TaxID": "vendor_tax_id",
    # Customer/Buyer variations
    "customerName": "customer_name",
    "CustomerName": "customer_name",
    "customer": "customer_name",
    "Customer": "customer_name",
    "buyerName": "customer_name",
    "buyer": "customer_name",
    "Buyer": "customer_name",
    "clientName": "customer_name",
    "client": "customer_name",
    # Customer contact info
    "customerAddress": "customer_address",
    "buyerAddress": "customer_address",
    "customerPhone": "customer_phone",
    "buyerPhone": "customer_phone",
    # Trade name
    "tradeName": "seller_trade_name",
    "sellerTradeName": "seller_trade_name",
    # Payment variations
    "paymentMethod": "payment_method",
    "PaymentMethod": "payment_method",
    "payment": "payment_method",
    "payMethod": "payment_method",
    "paymentType": "payment_method",
    # Payment terms
    "paymentTerms": "payment_terms",
    "PaymentTerms": "payment_terms",
    "terms": "payment_terms",
    # Card info
    "cardLast4": "card_last_four",
    "cardLastFour": "card_last_four",
    "cardNumber": "card_last_four",
    "lastFourDigits": "card_last_four",
    # Transaction ID
    "transactionId": "transaction_id",
    "TransactionID": "transaction_id",
    "txnId": "transaction_id",
    # Currency
    "currencyCode": "currency",
    "Currency": "currency",
    # Line items variations
    "lineItems": "line_items",
    "LineItems": "line_items",
    "items": "line_items",
    "Items": "line_items",
    "products": "line_items",
    "Products": "line_items",
    # Notes/Remarks
    "notes": "notes",
    "Notes": "notes",
    "remarks": "notes",
    "Remarks": "notes",
    "memo": "notes",
    "comment": "notes",
}


def _to_snake_case(name: str) -> str:
    """Convert camelCase or PascalCase to snake_case."""
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    s2 = re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1)
    return s2.lower()


def _to_camel_case(snake_str: str) -> str:
    """Convert snake_case to camelCase."""
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def normalize_field_names(raw_output: dict, is_strict_mode: bool = False) -> dict:
    """Normalize AI output field names to standard snake_case format."""
    if is_strict_mode:
        return raw_output

    normalized: Dict[str, Any] = {}
    for key, value in raw_output.items():
        canonical_key = FIELD_ALIASES.get(key, _to_snake_case(key))

        # Special handling for line items - normalize nested structure
        if canonical_key in ["line_items", "lineItems"] and isinstance(value, list):
            normalized_items = []
            for item in value:
                if isinstance(item, dict):
                    normalized_item = {}
                    for item_key, item_value in item.items():
                        normalized_item_key = LINE_ITEM_FIELD_ALIASES.get(
                            item_key, _to_snake_case(item_key)
                        )
                        normalized_item[normalized_item_key] = item_value
                    normalized_items.append(normalized_item)
                else:
                    normalized_items.append(item)
            normalized[canonical_key] = normalized_items
        else:
            normalized[canonical_key] = value

    return normalized


# =============================================================================
# Document Processing Utilities
# =============================================================================


def _default_expected_output_dict() -> Dict[str, Any]:
    """Default field template for Malaysian business documents."""
    return {
        "docType": "invoice",
        "documentNo": "",
        "documentDate": "YYYY-MM-DD",
        "documentTime": "",
        "currency": "",
        "totalExcludingTax": 0,
        "totalTaxAmount": 0,
        "totalPayableAmount": 0,
        "totalDiscountAmount": 0.0,
        "serviceCharge": 0.0,
        "serviceChargeRate": 0.0,
        "totalRoundingAmount": 0.0,
        "paymentMethod": "",
        "taxType": "",
        "taxRate": 0.0,
        "totalBeforeTax": 0.0,
        "totalAfterTax": 0.0,
        "sellerName": "",
        "sellerTradeName": "",
        "sellerRegNo": "",
        "sellerTaxId": "",
        "buyerName": "",
        "cardLastFour": "",
        "lineItems": [
            {
                "itemNo": "",
                "description": "",
                "quantity": 0,
                "unitPrice": 0,
                "amount": 0,
            }
        ],
    }


def _default_message_content() -> str:
    """Default prompt for Auto Detect mode."""
    return (
        "You are an expert document data extractor. Extract ALL visible information from this document.\n\n"
        "CRITICAL RULES:\n"
        "1. EXTRACT EVERYTHING: Capture every piece of information visible in the document.\n"
        "2. NO FABRICATION: Only include information that EXISTS in the document.\n"
        "3. PRESERVE ACCURACY: Keep original formatting for dates, currencies, phone numbers.\n"
        "4. DOCUMENT TYPE: Analyze content to determine doc_type (invoice, receipt, bill, etc.).\n"
        "5. CONFIDENCE SCORES: For each extracted field, provide a confidence score (0-1).\n"
        "Remember: Quality over assumptions. Only report what you can SEE in the document."
    )


def _ensure_project_config(project_config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Ensure project config has required defaults."""
    cfg: Dict[str, Any] = {} if project_config is None else dict(project_config)
    cfg["message_content"] = cfg.get("message_content") or _default_message_content()
    if "expected_json_output" not in cfg:
        cfg["expected_json_output"] = json.dumps(
            _default_expected_output_dict(), ensure_ascii=False
        )
    elif isinstance(cfg["expected_json_output"], dict):
        cfg["expected_json_output"] = json.dumps(
            cfg["expected_json_output"], ensure_ascii=False
        )
    return cfg


def extract_json_from_content(content: str) -> Optional[dict]:
    """Extract JSON from AI response content."""
    match = re.search(r"```json\s*([\s\S]+?)\s*```", content)
    json_str = match.group(1) if match else content
    try:
        return json.loads(json_str)
    except Exception as e:
        logger.warning(f"Unable to parse json_output: {e}")
        return None


# =============================================================================
# Confidence Calculation
# =============================================================================

REQUIRED_FIELDS_BY_DOC_TYPE: Dict[str, List[str]] = {
    "invoice": [
        "documentNo",
        "documentDate",
        "currency",
        "totalExcludingTax",
        "totalTaxAmount",
        "totalPayableAmount",
    ],
    "receipt": ["documentDate", "totalPayableAmount", "sellerName"],
    "bill": ["documentDate", "totalPayableAmount", "dueDate"],
    "quote": ["documentNo", "documentDate", "totalPayableAmount", "validUntil"],
    "purchase_order": [
        "documentNo",
        "documentDate",
        "totalPayableAmount",
        "sellerName",
    ],
    "delivery_note": ["documentNo", "documentDate", "buyerName"],
    "credit_note": ["documentNo", "documentDate", "totalPayableAmount"],
    "debit_note": ["documentNo", "documentDate", "totalPayableAmount"],
    "bank_statement": [
        "documentDate",
        "accountNumber",
        "openingBalance",
        "closingBalance",
    ],
    "payslip": ["documentDate", "employeeName", "netPay", "grossPay"],
    "expense_report": ["documentDate", "totalPayableAmount", "submitterName"],
    "contract": ["documentDate", "contractParties", "effectiveDate"],
    "other": ["totalPayableAmount"],
}


def compute_document_confidence(
    std_output: Optional[Dict[str, Any]],
    errors: Optional[List[dict]] = None,
    doc_type_confidence: Optional[float] = None,
) -> Optional[float]:
    """Calculate document-level confidence score (0-1)."""
    if not isinstance(std_output, dict):
        return None

    doc_type_val = std_output.get("doc_type", "other")
    if doc_type_val not in REQUIRED_FIELDS_BY_DOC_TYPE:
        doc_type_val = "other"

    required_keys = REQUIRED_FIELDS_BY_DOC_TYPE.get(
        doc_type_val, ["totalPayableAmount"]
    )

    def _filled(v: Any) -> bool:
        if v is None:
            return False
        if isinstance(v, str) and not v.strip():
            return False
        return True

    field_confidences = std_output.get("field_confidences", {})
    has_field_confidences = (
        isinstance(field_confidences, dict) and len(field_confidences) > 0
    )

    filled_count = 0
    field_conf_sum = 0.0
    field_conf_count = 0
    total_required = len(required_keys)

    for key in required_keys:
        # Required keys are in camelCase, but std_output is normalized to snake_case
        # Convert to snake_case to match normalized data
        snake_key = _to_snake_case(key)

        # Try snake_case first (most common after normalization)
        val = std_output.get(snake_key)

        # Fallback to original camelCase key
        if not _filled(val):
            val = std_output.get(key)

        # Check field aliases (e.g., sellerName → vendor_name)
        if not _filled(val):
            canonical_key = FIELD_ALIASES.get(snake_key) or FIELD_ALIASES.get(key)
            if canonical_key:
                val = std_output.get(canonical_key)

        if _filled(val):
            filled_count += 1
            if has_field_confidences:
                # Try to find field confidence with same search order
                fc = (
                    field_confidences.get(snake_key)
                    or field_confidences.get(key)
                    or (field_confidences.get(canonical_key) if canonical_key else None)
                )
                if isinstance(fc, (int, float)):
                    field_conf_sum += float(fc)
                    field_conf_count += 1

    completeness = filled_count / total_required if total_required else 1.0
    avg_field_conf = field_conf_sum / field_conf_count if field_conf_count > 0 else None
    self_conf = (
        doc_type_confidence if isinstance(doc_type_confidence, (int, float)) else 0.5
    )
    self_conf = max(0.0, min(float(self_conf), 1.0))

    if avg_field_conf is not None:
        final = (
            0.3 * completeness + 0.25 * avg_field_conf + 0.25 * 0.7 + 0.2 * self_conf
        )
    else:
        final = 0.5 * completeness + 0.3 * 0.7 + 0.2 * self_conf

    final = max(0.0, min(final, 1.0))

    low_doc_conf = (
        isinstance(doc_type_confidence, (int, float))
        and float(doc_type_confidence) < 0.4
    )
    if doc_type_val == "other" or low_doc_conf:
        if errors is not None:
            errors.append(
                {
                    "code": "low_doc_type_confidence",
                    "doc_type": doc_type_val,
                    "doc_type_confidence": doc_type_confidence,
                }
            )
        final = min(final, 0.4)

    return final


# =============================================================================
# Async L2.5 Orchestrator
# =============================================================================


class L25Orchestrator:
    """
    Async L2.5 Enhanced OCR Processing Orchestrator.

    Coordinates:
    1. Prompt enhancement based on document type
    2. OCR processing with async AI calls
    3. Confidence evaluation
    4. Retry decision and execution
    5. Validation with Malaysia localization
    """

    def __init__(self, config: Optional[L25Config] = None):
        self.config = config or L25Config()
        self.prompt_engine = PromptTemplateEngine(
            LocalizationConfig(region=self.config.localization_region)
        )
        self.retry_engine = RetryDecisionEngine(self.config.retry_config)
        self.validator = (
            MalaysiaValidator() if self.config.localization_region == "MY" else None
        )

        # Initialize async OpenAI client
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL or "https://api.openai.com/v1",
        )

        # Model escalation: cost-effective models with fallback chain
        # Using OpenRouter model IDs (format: vendor/model-name)
        # Updated to use Qwen3 and Gemini 3 models for optimal cost/performance
        base_model = settings.AI_MODEL or "qwen/qwen3-vl-8b-instruct"
        self.model_escalation_chain = [
            base_model,  # Retry 0: Qwen3 VL 8B (fast & cost-effective)
            "qwen/qwen3-vl-32b-instruct",  # Retry 1: Qwen3 VL 32B (higher accuracy)
            "google/gemini-3-flash-preview",  # Retry 2: Gemini 3 Flash Preview (latest)
        ]
        # Remove duplicates while preserving order
        seen = set()
        self.model_escalation_chain = [
            m for m in self.model_escalation_chain if not (m in seen or seen.add(m))
        ]
        self.model = self.model_escalation_chain[0]

    async def process(
        self,
        file_path: str,
        project_config: Optional[Dict[str, Any]] = None,
        doc_type_hint: Optional[str] = None,
    ) -> L25Result:
        """
        Process a document with L2.5 enhancements.

        Args:
            file_path: Path to the document file
            project_config: User's project configuration (takes priority)
            doc_type_hint: Optional hint about document type

        Returns:
            L25Result with enhanced processing results
        """
        import time

        start_time = time.time()

        # Initialize tracking
        retry_context = RetryContext(
            max_attempts=self.config.retry_config.max_retries + 1
        )
        all_results: List[Dict[str, Any]] = []
        all_confidences: List[float] = []
        all_field_confidences: List[Dict[str, float]] = []
        total_token_usage = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }
        all_errors: List[Dict[str, Any]] = []
        models_used: List[Dict[str, Any]] = []  # Track model usage per attempt

        effective_config = _ensure_project_config(project_config)

        # Check if user disabled L2.5 features
        if project_config and project_config.get("disable_l25"):
            result = await self._process_without_l25(file_path, project_config)
            result.process_time = time.time() - start_time
            return result

        prompt_enhanced = False
        token_usage = {}
        raw_parsed = None

        while True:
            retry_context.attempt_number += 1
            is_retry = not retry_context.is_first_attempt

            # Model escalation: Use progressively better models on retries
            model_index = min(
                retry_context.attempt_number - 1, len(self.model_escalation_chain) - 1
            )
            current_model = self.model_escalation_chain[model_index]
            self.model = current_model

            # Track this attempt's model usage
            import datetime
            attempt_info = {
                "attempt": retry_context.attempt_number,
                "model": current_model,
                "timestamp": datetime.datetime.utcnow().isoformat(),
            }

            if is_retry:
                logger.info(
                    f"L2.5 retry {retry_context.attempt_number}: Escalating to model {current_model} "
                    f"(previous attempts: {retry_context.attempt_number - 1})"
                )

            # Step 1: Enhance prompt if enabled
            if self.config.enable_type_specific_prompts and self.config.enhance_prompts:
                enhanced_prompt = self._get_enhanced_prompt(
                    doc_type=doc_type_hint,
                    project_config=project_config,
                    is_retry=is_retry,
                    retry_context=retry_context if is_retry else None,
                )
                if enhanced_prompt:
                    prompt_enhanced = True
                    if not project_config or not project_config.get("message_content"):
                        effective_config["message_content"] = enhanced_prompt

            # Step 2: Call OCR
            try:
                ai_response = await self._call_document_intelligence(
                    file_path, effective_config
                )
            except Exception as e:
                logger.error(
                    f"OCR call failed on attempt {retry_context.attempt_number}: {e}"
                )
                all_errors.append(
                    {
                        "code": "ocr_call_failed",
                        "attempt": retry_context.attempt_number,
                        "error": str(e),
                    }
                )
                if retry_context.can_retry:
                    await asyncio.sleep(
                        2**retry_context.attempt_number
                    )  # Exponential backoff
                    continue
                else:
                    raise ExternalServiceError(f"OCR processing failed: {str(e)}")

            # Track token usage
            token_usage = ai_response.get("token_usage", {})
            for key in total_token_usage:
                total_token_usage[key] += token_usage.get(key, 0)

            # Step 3: Parse and normalize result
            raw_content = ai_response.get("content")
            std_output = self._parse_response(raw_content)
            raw_parsed = std_output

            # Normalize field names
            if isinstance(std_output, dict):
                std_output = normalize_field_names(
                    std_output,
                    is_strict_mode=bool(
                        project_config and project_config.get("expected_json_output")
                    ),
                )

            # Extract doc_type
            doc_type = (
                std_output.get("doc_type") if isinstance(std_output, dict) else None
            )
            doc_type_conf = (
                std_output.get("doc_type_confidence")
                if isinstance(std_output, dict)
                else None
            )

            if doc_type and not doc_type_hint:
                doc_type_hint = doc_type

            # Step 4: Calculate confidence
            confidence = compute_document_confidence(
                std_output, all_errors, doc_type_conf
            )

            # Track for best-result selection
            all_results.append(std_output)
            all_confidences.append(confidence or 0.0)
            field_confs = (
                std_output.get("field_confidences", {})
                if isinstance(std_output, dict)
                else {}
            )
            all_field_confidences.append(field_confs)

            retry_context.previous_results.append(std_output)
            retry_context.previous_confidences.append(confidence or 0.0)

            # Step 5: Validate
            validation_report = None
            if (
                self.config.enable_validation
                and self.validator
                and isinstance(std_output, dict)
            ):
                validation_report, corrected_output = validate_ocr_result(
                    std_output,
                    doc_type or "other",
                    region=self.config.localization_region,
                    project_config=project_config,
                )

                if validation_report.corrections:
                    std_output = corrected_output
                    all_results[-1] = std_output

                for err in validation_report.errors:
                    all_errors.append(
                        {
                            "code": err.code,
                            "message": err.message,
                            "field": err.field,
                            "severity": err.severity.value,
                        }
                    )

                if confidence is not None:
                    confidence = max(
                        0.0,
                        min(1.0, confidence + validation_report.confidence_adjustment),
                    )
                    all_confidences[-1] = confidence

            # Update attempt info with results
            attempt_info.update({
                "tokens": token_usage,
                "confidence": confidence or 0.0,
                "doc_type": doc_type,
                "line_items_count": len(std_output.get("lineItems", [])) if isinstance(std_output, dict) else 0,
                "validation_errors": len([e for e in all_errors if e.get("severity") == "error"]),
            })
            models_used.append(attempt_info)

            # Enhanced logging for each attempt
            logger.warning(
                f"✅ Attempt #{retry_context.attempt_number} Summary:\n"
                f"  Model: {current_model}\n"
                f"  Tokens: {token_usage.get('total_tokens', 0)}\n"
                f"  Confidence: {(confidence or 0.0):.3f}\n"
                f"  Doc Type: {doc_type} ({(doc_type_conf or 0.0):.2f})\n"
                f"  Line Items: {len(std_output.get('lineItems', [])) if isinstance(std_output, dict) else 0}\n"
                f"  Validation Errors: {len([e for e in all_errors if e.get('severity') == 'error'])}"
            )

            # Write attempt to logfile (MVP approach - simple and debuggable)
            try:
                # Get document_id and user_id from orchestrator attributes or extract from path
                document_id = "unknown"
                user_id = None
                filename = Path(file_path).name if file_path else "unknown"

                # Priority 1: Use explicitly set IDs from orchestrator
                if hasattr(self, 'current_document_id') and self.current_document_id:
                    document_id = self.current_document_id
                if hasattr(self, 'current_user_id') and self.current_user_id:
                    user_id = self.current_user_id

                # Priority 2: Try to extract from path (fallback for legacy paths)
                if document_id == "unknown" and file_path:
                    import re
                    # Extract document_id (UUID pattern)
                    path_match = re.search(r'/([a-f0-9-]{36})/', file_path)
                    if path_match:
                        document_id = path_match.group(1)

                if not user_id and file_path:
                    import re
                    # Extract user_id (first UUID in path)
                    user_match = re.search(r'uploads/([a-f0-9-]{36})/', file_path)
                    if user_match:
                        user_id = user_match.group(1)

                logger.info(f"Logging OCR attempt {retry_context.attempt_number} for document {document_id} with model {current_model}")

                # Use simple OCR logger
                log_ocr_request(
                    document_id=document_id,
                    user_id=user_id,
                    filename=filename,
                    attempt_number=retry_context.attempt_number,
                    model=current_model,
                    prompt=ai_response.get("prompt"),
                    raw_response=ai_response.get("raw_response"),
                    extracted_data=std_output if isinstance(std_output, dict) else None,
                    tools_called=None,  # Can be enhanced if using function calling
                    tokens=token_usage,
                    processing_time_seconds=ai_response.get("processing_time"),
                    confidence=confidence,
                    doc_type=doc_type,
                    validation_errors=len([e for e in all_errors if e.get("severity") == "error"]),
                    additional_data={
                        "doc_type_confidence": doc_type_conf,
                        "retry_reasons": [r.value for r in retry_context.retry_reasons] if retry_context.retry_reasons else [],
                        "field_confidences": field_confs,
                        "line_items_count": len(std_output.get("line_items", [])) if isinstance(std_output, dict) else 0,  # Fixed: use normalized field name
                    }
                )
            except Exception as log_error:
                # Don't fail the OCR process if logging fails
                logger.error(f"❌ Failed to write OCR log: {log_error}", exc_info=True)
                print(f"❌ OCR_LOG_ERROR: Attempt {retry_context.attempt_number} failed to log: {log_error}")

            # Step 6: Decide whether to retry
            if not self.config.enable_retry:
                break

            should_retry, retry_reasons = self.retry_engine.should_retry(
                result=std_output,
                confidence=confidence or 0.0,
                context=retry_context,
                doc_type=doc_type or "other",
                validation_errors=[
                    e for e in all_errors if e.get("severity") == "error"
                ],
            )

            if should_retry:
                retry_context.retry_reasons.extend(retry_reasons)
                logger.info(
                    f"L2.5 triggering retry {retry_context.attempt_number + 1}, "
                    f"reasons: {[r.value for r in retry_reasons]}, "
                    f"current confidence: {confidence}"
                )
                continue
            else:
                break

        # Step 7: Select best result
        selected_index = 0
        if len(all_results) > 1:
            # Extract token usages for tiebreaker (P1 fix)
            token_usages = [attempt.get("tokens", {}) for attempt in models_used]
            best_result, best_confidence = select_best_result(
                all_results, all_confidences, token_usages
            )
            # Find which attempt was selected
            selected_index = all_confidences.index(best_confidence) if best_confidence in all_confidences else 0

            # Improved logging message (fixed misleading "improved from" wording)
            confidence_history = ', '.join(f'{c:.2f}' for c in all_confidences)
            logger.info(
                f"L2.5 completed {len(all_results)} attempts with confidences: [{confidence_history}]. "
                f"Selected attempt {selected_index + 1} with confidence {best_confidence:.2f}"
            )

            # Log all attempts summary for auditing and comparison
            try:
                # Extract document_id from file_path
                document_id = None
                if isinstance(file_path, str):
                    import re
                    path_match = re.search(r'/([a-f0-9-]{36})/', file_path)
                    if path_match:
                        document_id = path_match.group(1)

                if document_id and len(all_results) > 1:
                    logger.info(f"Logging all {len(all_results)} attempts for document {document_id}")

                    # Prepare attempts data for summary
                    attempts_data = []
                    for i in range(len(all_results)):
                        attempts_data.append({
                            "model": models_used[i].get("model") if i < len(models_used) else "unknown",
                            "confidence": all_confidences[i] if i < len(all_confidences) else 0.0,
                            "tokens": models_used[i].get("tokens") if i < len(models_used) else {},
                            "validation_errors": 0,  # Can be enhanced
                            "processing_time": 0,  # Can be enhanced
                        })

                    log_all_attempts_summary(
                        document_id=document_id,
                        attempts=attempts_data,
                        selected_attempt=selected_index + 1,
                    )
                elif not document_id:
                    logger.warning(f"Could not extract document_id from file_path: {file_path}, skipping summary log")
            except Exception as log_error:
                # Don't fail the OCR process if logging fails
                logger.error(f"❌ Failed to write summary log: {log_error}", exc_info=True)
                print(f"❌ OCR_LOG_ERROR: Summary logging failed: {log_error}")
        else:
            best_result = all_results[0] if all_results else None
            best_confidence = all_confidences[0] if all_confidences else None

        final_doc_type = (
            best_result.get("doc_type") if isinstance(best_result, dict) else None
        )
        final_doc_type_conf = (
            best_result.get("doc_type_confidence")
            if isinstance(best_result, dict)
            else None
        )

        # Final validation on best result
        final_validation = None
        corrections = {}
        if (
            self.config.enable_validation
            and self.validator
            and isinstance(best_result, dict)
        ):
            final_validation, corrected = validate_ocr_result(
                best_result,
                final_doc_type or "other",
                region=self.config.localization_region,
                project_config=project_config,
            )
            corrections = final_validation.corrections
            if corrections:
                best_result = corrected

        process_time = time.time() - start_time

        return L25Result(
            standardized_output=best_result,
            raw_output=raw_parsed,
            confidence=best_confidence,
            doc_type=final_doc_type,
            doc_type_confidence=final_doc_type_conf,
            token_usage=token_usage,
            total_token_usage=total_token_usage,
            validation_report=final_validation,
            retry_count=retry_context.attempt_number - 1,
            retry_reasons=[r.value for r in retry_context.retry_reasons],
            was_corrected=bool(corrections),
            corrections=corrections,
            errors=all_errors,
            l25_enabled=True,
            prompt_enhanced=prompt_enhanced,
            process_time=process_time,
            model=self.model,  # Final model used
            models_used=models_used,  # Complete history of all attempts
        )

    def _get_enhanced_prompt(
        self,
        doc_type: Optional[str],
        project_config: Optional[Dict[str, Any]],
        is_retry: bool,
        retry_context: Optional[RetryContext],
    ) -> Optional[str]:
        """Get enhanced prompt based on document type and retry context."""
        retry_ctx_dict = None
        if is_retry and retry_context:
            retry_ctx_dict = {
                "missing_fields": retry_context.missing_fields,
                "low_confidence_fields": retry_context.low_confidence_fields,
                "attempt_number": retry_context.attempt_number,
            }

        return self.prompt_engine.get_enhanced_prompt(
            doc_type=doc_type or "other",
            project_config=project_config,
            is_retry=is_retry,
            retry_context=retry_ctx_dict,
        )

    def _parse_response(self, raw_content: Any) -> Optional[Dict[str, Any]]:
        """Parse AI response to structured output."""
        if isinstance(raw_content, dict):
            return raw_content
        elif isinstance(raw_content, str):
            try:
                return json.loads(raw_content)
            except Exception:
                return extract_json_from_content(raw_content)
        return None

    async def _process_without_l25(
        self,
        file_path: str,
        project_config: Optional[Dict[str, Any]],
    ) -> L25Result:
        """Fallback processing without L2.5 enhancements."""
        effective_config = _ensure_project_config(project_config)
        ai_response = await self._call_document_intelligence(
            file_path, effective_config
        )

        raw_content = ai_response.get("content")
        std_output = self._parse_response(raw_content)
        raw_parsed = std_output

        if isinstance(std_output, dict):
            std_output = normalize_field_names(std_output, is_strict_mode=False)

        doc_type = std_output.get("doc_type") if isinstance(std_output, dict) else None
        doc_type_conf = (
            std_output.get("doc_type_confidence")
            if isinstance(std_output, dict)
            else None
        )
        confidence = compute_document_confidence(std_output, [], doc_type_conf)

        token_usage = ai_response.get("token_usage", {})

        return L25Result(
            standardized_output=std_output,
            raw_output=raw_parsed,
            confidence=confidence,
            doc_type=doc_type,
            doc_type_confidence=doc_type_conf,
            token_usage=token_usage,
            total_token_usage=token_usage,
            validation_report=None,
            retry_count=0,
            retry_reasons=[],
            was_corrected=False,
            corrections={},
            errors=[],
            l25_enabled=False,
            prompt_enhanced=False,
            model=self.model,  # Include model even without L2.5
            models_used=[{  # Single attempt without retry
                "attempt": 1,
                "model": self.model,
                "tokens": token_usage,
                "confidence": confidence or 0.0,
            }],
        )

    async def _call_document_intelligence(
        self,
        file_path: str,
        project_config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Call AI provider for document intelligence."""
        import time

        start_time = time.time()

        # Process document and get message content
        message_content = await self._process_document(file_path, project_config)

        messages = [
            {
                "role": "system",
                "content": "You are a helpful assistant that processes documents. Analyze all provided images carefully.",
            },
            {"role": "user", "content": message_content},
        ]

        # Detect Google Gemini models for schema compatibility
        is_gemini = "gemini" in self.model.lower() or "google/" in self.model.lower()

        # Build function schema (adjusted for Gemini if needed)
        functions = self._build_function_schema(project_config, for_google=is_gemini)

        try:
            # Use full model ID for OpenRouter (includes vendor prefix like google/, openai/, etc.)
            # Don't strip the prefix - OpenRouter requires full model ID
            # Convert functions to tools format (functions/function_call are deprecated)
            tools = [{"type": "function", "function": func} for func in functions]

            # Try with tool use first
            try:
                completion = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=tools,
                    tool_choice={
                        "type": "function",
                        "function": {"name": "extract_document_data"},
                    },
                    timeout=120,
                )
            except Exception as tool_error:
                # Check if error is related to tool use not being supported
                error_msg = str(tool_error).lower()
                if any(keyword in error_msg for keyword in [
                    "tool use", "tool_use", "function calling", "function_calling",
                    "no endpoints found that support", "not supported"
                ]):
                    logger.warning(
                        f"Model {self.model} does not support tool use. "
                        f"Falling back to text-based extraction. Error: {tool_error}"
                    )

                    # Fallback: Call without tools and parse from content
                    # Add explicit instruction to return JSON in the user message
                    fallback_messages = messages.copy()
                    fallback_messages[1]["content"].append({
                        "type": "text",
                        "text": "\n\nIMPORTANT: Since function calling is not available, please return your response as a JSON object in the following format:\n" +
                        json.dumps(functions[0]["parameters"], indent=2) +
                        "\n\nReturn ONLY the JSON object, no additional text."
                    })

                    completion = await self.client.chat.completions.create(
                        model=self.model,
                        messages=fallback_messages,
                        timeout=120,
                    )
                else:
                    # If it's a different error, re-raise it
                    raise

            process_time = time.time() - start_time
            logger.info(f"AI call completed in {process_time:.2f} seconds")

            message = completion.choices[0].message

            # Capture raw response for logging and debugging
            raw_response_data = None
            if hasattr(message, "tool_calls") and message.tool_calls:
                raw_response_data = message.tool_calls[0].function.arguments
                output_data = json.loads(raw_response_data)
            elif hasattr(message, "function_call") and message.function_call:
                raw_response_data = message.function_call.arguments
                output_data = json.loads(raw_response_data)
            elif hasattr(message, "content") and message.content:
                logger.warning("No function call returned, falling back to content.")
                raw_response_data = message.content
                output_data = extract_json_from_content(message.content)
                if output_data is None:
                    raise ValueError("No usable response returned from model.")
            else:
                raise ValueError(
                    "No function_call, tool_calls, or content found in response."
                )

            # Build prompt text for logging (simplified for debugging)
            prompt_text = f"System: {messages[0]['content']}\n\nUser: [Document images with instructions]"

            return {
                "content": output_data,
                "token_usage": {
                    "prompt_tokens": completion.usage.prompt_tokens,
                    "completion_tokens": completion.usage.completion_tokens,
                    "total_tokens": completion.usage.total_tokens,
                },
                "process_time": process_time,
                "prompt": prompt_text,
                "raw_response": raw_response_data,
            }

        except Exception as e:
            logger.error(f"Error in AI API call: {str(e)}")
            raise ExternalServiceError(f"AI provider API call failed: {str(e)}")

    async def _process_document(
        self,
        file_path: str,
        project_config: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Process document file and prepare message content for AI."""
        import mimetypes
        import imghdr

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = os.path.getsize(file_path)
        if file_size > MAX_FILE_SIZE:
            raise ValueError(f"File too large: {file_size} bytes")

        mime_type = mimetypes.guess_type(file_path)[0]
        if not mime_type:
            file_type = imghdr.what(file_path)
            mime_type = f"image/{file_type}" if file_type else None

        if not mime_type or (
            not mime_type.startswith("image/") and mime_type != "application/pdf"
        ):
            raise ValueError(f"Unsupported file type: {mime_type}")

        message_content = []

        if mime_type == "application/pdf":
            # Convert PDF to images
            with tempfile.TemporaryDirectory() as temp_dir:
                convert_kwargs = {"pdf_path": file_path, "dpi": PDF_DPI}
                if POPPLER_PATH:
                    convert_kwargs["poppler_path"] = POPPLER_PATH
                images = convert_from_path(**convert_kwargs)

                if len(images) > 0:
                    total_width = sum(img.width for img in images)
                    max_height = max(img.height for img in images)

                    combined_image = Image.new(
                        "RGB", (total_width, max_height), (255, 255, 255)
                    )
                    x_offset = 0
                    for img in images:
                        combined_image.paste(img, (x_offset, 0))
                        x_offset += img.width

                    temp_file = os.path.join(temp_dir, "combined_image.jpeg")
                    combined_image.save(temp_file, "JPEG", quality=95)

                    with open(temp_file, "rb") as f:
                        base64_image = base64.b64encode(f.read()).decode("utf-8")

                    message_content.append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            },
                        }
                    )
                    message_content.append(
                        {
                            "type": "text",
                            "text": self._prepare_text_content(
                                project_config, len(images)
                            ),
                        }
                    )
        else:
            # Direct image processing
            with open(file_path, "rb") as f:
                base64_image = base64.b64encode(f.read()).decode("utf-8")

            message_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{mime_type};base64,{base64_image}"},
                }
            )
            message_content.append(
                {"type": "text", "text": self._prepare_text_content(project_config, 1)}
            )

        return message_content

    def _prepare_text_content(
        self, project_config: Dict[str, Any], image_count: int = 1
    ) -> str:
        """Prepare text content for AI message."""
        content = project_config.get("message_content", _default_message_content())
        expected_output = project_config.get(
            "expected_json_output", json.dumps(_default_expected_output_dict())
        )

        # Get expected output keys for field mapping
        try:
            expected_dict = (
                expected_output
                if isinstance(expected_output, dict)
                else json.loads(expected_output)
            )
            expected_output_keys = list(expected_dict.keys())
        except Exception:
            expected_output_keys = list(_default_expected_output_dict().keys())

        return f"""
You are processing a document with {image_count} page(s).

--- PAGE-BY-PAGE EXTRACTION ---
For **each page**, you must:
1. Identify and label the page number.
2. **Detect and count all line items** - count carefully before extracting
3. Extract **all item details**, even if some fields are missing or unclear
4. If an item line includes only text (e.g., description without price), **still extract it**
5. Preserve item order and quantity exactly as shown

Important:
- **Do not skip** any pages or items, even if they seem incomplete or repetitive
- If item numbering continues across pages, make sure **no items are missed**
- When in doubt, extract the item - false positives are better than false negatives
- Pay special attention to discount lines (often marked with "-" or "Discount"/"Potongan")

--- STRUCTURED EXTRACTION ---
You must extract data into these exact fields: {", ".join(expected_output_keys)}

--- FIELD MAPPINGS ---
Common variations to watch for:
- Tax: "SST"/"GST"/"Service Tax"/"Cukai" → taxAmount/totalTaxAmount
- Discount: "Discount"/"Potongan"/"Rebate" → totalDiscountAmount
- Service: "Service Charge"/"Servis" → serviceCharge
- Total: "Total"/"Jumlah"/"Grand Total" → totalPayableAmount/grandTotal
- Rounding: "Rounding"/"Pembundaran" → totalRoundingAmount
- Subtotal: "Subtotal"/"Sub Total" → subtotal/totalExcludingTax

--- EXTRACTION INSTRUCTIONS ---
{content}

--- OUTPUT FORMAT ---
Return a JSON object following this schema:
{expected_output}

--- EXAMPLE OUTPUT FORMAT ---
{{
  "docType": "receipt",
  "documentDate": "2024-01-15",
  "lineItems": [
    {{
      "description": "HM AyamGoreng McD",
      "quantity": 1,
      "unitPrice": 18.90,
      "amount": 18.90
    }}
  ],
  "subtotal": 85.03,
  "totalDiscountAmount": 5.73,
  "totalTaxAmount": 6.00,
  "totalPayableAmount": 85.30
}}

IMPORTANT:
- Extract all visible information accurately
- Use empty string "" for missing text fields
- Use 0 for missing numerical fields
- Include doc_type and doc_type_confidence
- Include field_confidences for each extracted field
- Preserve negative values for discounts (e.g., -5.73)
""".strip()

    def _build_function_schema(
        self, config: Dict[str, Any], for_google: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Build function schema for AI function calling.

        Args:
            config: Project configuration
            for_google: If True, adjust schema format for Google Gemini compatibility

        Returns:
            List of function definitions suitable for the AI provider
        """
        properties = {}
        required = []

        expected_json_output = config.get("expected_json_output")
        if expected_json_output:
            try:
                parsed = (
                    expected_json_output
                    if isinstance(expected_json_output, dict)
                    else json.loads(expected_json_output)
                )
                if isinstance(parsed, dict):
                    for key, value in parsed.items():
                        properties[key] = self._schema_from_example(value, for_google)
                    required = list(properties.keys())
            except Exception:
                logger.warning(
                    "Failed to parse expected_json_output for schema generation"
                )

        if not properties:
            default_schema = _default_expected_output_dict()
            for key, value in default_schema.items():
                properties[key] = self._schema_from_example(value, for_google)
            required = list(properties.keys())

        # Always include doc_type and confidence fields with enhanced constraints
        if "doc_type" not in properties:
            doc_type_schema = {
                "type": "string",
                "description": "Detected document type (invoice, receipt, bill, statement, etc.)",
            }
            # Gemini doesn't support enum in the same way
            if not for_google:
                doc_type_schema["enum"] = DOC_TYPES
            properties["doc_type"] = doc_type_schema

        if "doc_type_confidence" not in properties:
            properties["doc_type_confidence"] = {
                "type": "number",
                "description": "Confidence score for doc_type (0-1)",
                "minimum": 0.0,
                "maximum": 1.0,
            }
        if "field_confidences" not in properties:
            properties["field_confidences"] = {
                "type": "object",
                "description": "Confidence scores (0-1) for each extracted field",
                "additionalProperties": {"type": "number", "minimum": 0.0, "maximum": 1.0},
            }

        if "doc_type" not in required:
            required.append("doc_type")

        # Add enhanced schema constraints
        schema_params = {
            "type": "object",
            "properties": properties,
            "required": required,
        }

        # Add additionalProperties constraint to prevent hallucinated fields
        if not for_google:
            schema_params["additionalProperties"] = False

        return [
            {
                "name": "extract_document_data",
                "description": "Extract structured data from business documents. Return ONLY the fields defined in the schema.",
                "parameters": schema_params,
            }
        ]

    def _schema_from_example(self, value: Any, for_google: bool = False) -> Dict[str, Any]:
        """
        Generate JSON schema from example value with enhanced constraints.

        Args:
            value: Example value to generate schema from
            for_google: If True, adjust schema format for Google Gemini compatibility

        Returns:
            JSON schema dictionary with type constraints
        """
        if isinstance(value, dict):
            props = {k: self._schema_from_example(v, for_google) for k, v in value.items()}
            schema = {"type": "object", "properties": props}
            # Prevent hallucinated nested fields
            if not for_google:
                schema["additionalProperties"] = False
            return schema

        if isinstance(value, list):
            item_schema = (
                self._schema_from_example(value[0], for_google) if value else {"type": "object"}
            )
            schema = {"type": "array", "items": item_schema}
            # Require at least one item for non-empty arrays in examples
            if value and not for_google:
                schema["minItems"] = 0  # Allow empty arrays but define structure
            return schema

        if isinstance(value, bool):
            return {"type": "boolean"}

        if isinstance(value, (int, float)):
            schema = {"type": "number"}
            # Add reasonable constraints for numeric fields
            if not for_google:
                # Most amounts should be non-negative
                if value >= 0:
                    schema["minimum"] = 0.0
            return schema

        # String type with format hints
        schema = {"type": "string"}
        # Don't add strict constraints to avoid rejection of valid variations
        return schema


# =============================================================================
# Convenience Function
# =============================================================================


async def process_with_l25_enhancements(
    file_path: str,
    project_config: Optional[Dict[str, Any]] = None,
    enable_retry: bool = True,
    enable_validation: bool = True,
    region: str = "MY",
    document_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> L25Result:
    """
    Process a document with L2.5 enhancements.

    This is the main entry point for L2.5 enhanced processing.

    Args:
        file_path: Path to the document file
        project_config: User's project configuration
        enable_retry: Enable low-confidence retry
        enable_validation: Enable validation with localization
        region: Localization region (default: MY for Malaysia)
        document_id: Optional document ID for logging
        user_id: Optional user ID for logging

    Returns:
        L25Result with enhanced processing results
    """
    config = L25Config(
        enable_retry=enable_retry,
        enable_validation=enable_validation,
        localization_region=region,
    )

    orchestrator = L25Orchestrator(config)

    # Set document_id and user_id for logging if provided
    if document_id:
        orchestrator.current_document_id = document_id
    if user_id:
        orchestrator.current_user_id = user_id

    return await orchestrator.process(file_path, project_config)

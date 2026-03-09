"""
Security & Validation Layer for RAG

Implements input validation, output sanitization, and security checks.
Phase 11 - RAG Implementation
"""

import re
from typing import Optional
import bleach

from app.core.exceptions import ValidationError


class RAGSecurityValidator:
    """
    Security validation for RAG inputs and outputs.

    Prevents:
    - Prompt injection attacks
    - PII leakage in embeddings
    - XSS in LLM outputs
    """

    # Patterns that indicate potential prompt injection
    FORBIDDEN_PATTERNS = [
        r"ignore\s+(previous|above|all)\s+instructions?",
        r"system\s+prompt",
        r"act\s+as\s+if",
        r"pretend\s+you\s+are",
        r"you\s+are\s+now",
        r"disregard\s+(previous|all|above)",
        r"forget\s+(everything|all|previous)",
        r"new\s+instructions?",
    ]

    # PII patterns to redact before embedding
    PII_PATTERNS = {
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
        "credit_card": r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
        "nric_sg": r"\b[STFG]\d{7}[A-Z]\b",  # Singapore NRIC
        "nric_my": r"\b\d{6}-\d{2}-\d{4}\b",  # Malaysia IC
    }

    def validate_query_safety(self, query: str) -> bool:
        """
        Detect potential prompt injection attempts.

        Args:
            query: User query to validate

        Returns:
            True if query is safe

        Raises:
            ValidationError: If query contains forbidden patterns
        """
        if not query or not query.strip():
            raise ValidationError("Query cannot be empty")

        # Check length
        if len(query) > 2000:
            raise ValidationError("Query too long (max 2000 characters)")

        # Check for prompt injection patterns
        query_lower = query.lower()
        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, query_lower, re.IGNORECASE):
                raise ValidationError(
                    "Query contains forbidden patterns. "
                    "Please rephrase your question."
                )

        return True

    def sanitize_text_before_embedding(self, text: str, redact_pii: bool = True) -> str:
        """
        Sanitize text before generating embeddings.

        Removes or redacts sensitive information to prevent PII leakage.

        Args:
            text: Text to sanitize
            redact_pii: Whether to redact PII patterns

        Returns:
            Sanitized text
        """
        if not text:
            return ""

        sanitized = text

        # Redact PII if enabled
        if redact_pii:
            for pii_type, pattern in self.PII_PATTERNS.items():
                sanitized = re.sub(pattern, f"[{pii_type.upper()}_REDACTED]", sanitized)

        return sanitized

    def sanitize_llm_output(self, text: str) -> str:
        """
        Sanitize LLM output to prevent XSS attacks.

        Removes HTML tags and potentially dangerous content.

        Args:
            text: LLM-generated text

        Returns:
            Sanitized text safe for display
        """
        if not text:
            return ""

        # Remove all HTML tags and attributes
        sanitized = bleach.clean(text, tags=[], strip=True)  # No tags allowed

        return sanitized

    def validate_document_text(
        self,
        text: str,
        min_length: int = 10,
        max_length: int = 10_000_000,  # 10MB worth of text
    ) -> bool:
        """
        Validate document text before processing.

        Args:
            text: Document text to validate
            min_length: Minimum text length
            max_length: Maximum text length

        Returns:
            True if valid

        Raises:
            ValidationError: If validation fails
        """
        if not text or not text.strip():
            raise ValidationError("Document text cannot be empty")

        text_length = len(text)

        if text_length < min_length:
            raise ValidationError(
                f"Document text too short (min {min_length} characters)"
            )

        if text_length > max_length:
            raise ValidationError(
                f"Document text too long (max {max_length} characters)"
            )

        return True

    def check_content_appropriateness(
        self, text: str, strict: bool = False
    ) -> tuple[bool, Optional[str]]:
        """
        Check if content is appropriate for processing.

        Basic content filtering for obviously problematic content.

        Args:
            text: Text to check
            strict: Whether to use strict filtering

        Returns:
            Tuple of (is_appropriate, reason_if_not)
        """
        if not text:
            return True, None

        # Basic checks for obviously inappropriate content
        # Add more sophisticated checks if needed
        inappropriate_indicators = [
            r"<script",  # HTML injection
            r"javascript:",  # XSS attempts
            r"data:text/html",  # Data URI XSS
        ]

        text_lower = text.lower()
        for indicator in inappropriate_indicators:
            if re.search(indicator, text_lower):
                return False, "Content contains potentially malicious patterns"

        return True, None


class RAGRateLimiter:
    """
    Rate limiting for RAG operations.

    Prevents abuse and manages costs.
    """

    # Default quotas (per user)
    DEFAULT_EMBEDDING_QUOTA_MONTHLY = 10_000  # chunks
    DEFAULT_QUERY_QUOTA_DAILY = 100  # queries
    DEFAULT_QUERY_QUOTA_HOURLY = 20  # queries

    def __init__(self, redis_client=None):
        """
        Initialize rate limiter.

        Args:
            redis_client: Redis client for distributed rate limiting
        """
        self.redis_client = redis_client

    async def check_embedding_quota(
        self, user_id: str, chunks_to_embed: int
    ) -> tuple[bool, Optional[str]]:
        """
        Check if user has quota for embedding generation.

        Args:
            user_id: User identifier
            chunks_to_embed: Number of chunks to embed

        Returns:
            Tuple of (has_quota, error_message_if_not)
        """
        # This would integrate with Redis for distributed tracking
        # For now, just return True (implement Redis integration later)
        return True, None

    async def check_query_quota(self, user_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if user has quota for RAG queries.

        Args:
            user_id: User identifier

        Returns:
            Tuple of (has_quota, error_message_if_not)
        """
        # This would integrate with Redis for distributed tracking
        # For now, just return True (implement Redis integration later)
        return True, None

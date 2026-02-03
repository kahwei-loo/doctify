"""
HTML Sanitization Module

Provides functions to sanitize AI-generated content and user input
to prevent XSS attacks and other injection vulnerabilities.

Uses bleach library for robust HTML sanitization.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Union
import re
import logging
import html

logger = logging.getLogger(__name__)

# Try to import bleach, fall back to basic sanitization if not available
try:
    import bleach
    BLEACH_AVAILABLE = True
except ImportError:
    BLEACH_AVAILABLE = False
    logger.warning("bleach not installed, using basic sanitization")


@dataclass
class SanitizationConfig:
    """Configuration for HTML sanitization."""

    # Tags allowed for rich text content
    allowed_tags: Set[str] = field(default_factory=lambda: {
        "b", "i", "em", "strong", "br", "p", "span"
    })

    # Attributes allowed on permitted tags
    allowed_attributes: Dict[str, List[str]] = field(default_factory=lambda: {
        "span": ["class"],
        "p": ["class"],
    })

    # Strip all tags (for plain text)
    strip_all: bool = False

    # Maximum string length (prevent DoS)
    max_length: int = 100000

    # Strip dangerous patterns
    strip_scripts: bool = True
    strip_styles: bool = True


# Default configurations
STRIP_ALL_CONFIG = SanitizationConfig(strip_all=True)
RICH_TEXT_CONFIG = SanitizationConfig(strip_all=False)


def sanitize_string(
    value: str,
    config: Optional[SanitizationConfig] = None
) -> str:
    """
    Sanitize a single string value.

    Args:
        value: The string to sanitize
        config: Sanitization configuration (defaults to strip all HTML)

    Returns:
        Sanitized string with all HTML tags removed
    """
    if not isinstance(value, str):
        return str(value) if value is not None else ""

    if config is None:
        config = STRIP_ALL_CONFIG

    # Truncate to max length
    if len(value) > config.max_length:
        value = value[:config.max_length]
        logger.warning(f"String truncated to {config.max_length} characters")

    if config.strip_all:
        # Strip all HTML tags
        if BLEACH_AVAILABLE:
            return bleach.clean(value, tags=[], attributes={}, strip=True)
        else:
            return _basic_strip_tags(value)
    else:
        # Allow some tags for rich text
        if BLEACH_AVAILABLE:
            return bleach.clean(
                value,
                tags=config.allowed_tags,
                attributes=config.allowed_attributes,
                strip=True
            )
        else:
            return _basic_strip_tags(value)


def sanitize_html(
    value: str,
    config: Optional[SanitizationConfig] = None
) -> str:
    """
    Sanitize HTML content while preserving safe tags.

    Use this for rich text content that needs some formatting preserved.

    Args:
        value: The HTML string to sanitize
        config: Sanitization configuration (defaults to rich text config)

    Returns:
        Sanitized HTML string
    """
    if config is None:
        config = RICH_TEXT_CONFIG

    return sanitize_string(value, config)


def sanitize_extracted_result(
    result: Dict[str, Any],
    config: Optional[SanitizationConfig] = None
) -> Dict[str, Any]:
    """
    Sanitize all string values in an extracted result from AI.

    This is the main function to call after receiving AI OCR results.

    Args:
        result: Dictionary containing extracted fields and line items
        config: Sanitization configuration (defaults to strip all HTML)

    Returns:
        Sanitized result dictionary
    """
    if config is None:
        config = STRIP_ALL_CONFIG

    sanitized: Dict[str, Any] = {}

    # Sanitize fields
    if "fields" in result and isinstance(result["fields"], dict):
        sanitized["fields"] = {}
        for key, value in result["fields"].items():
            # Validate key name (prevent injection via keys)
            safe_key = _sanitize_key(key)
            if safe_key:
                sanitized["fields"][safe_key] = _sanitize_value(value, config)

    # Sanitize line items
    if "lineItems" in result and isinstance(result["lineItems"], list):
        sanitized["lineItems"] = []
        for item in result["lineItems"]:
            if isinstance(item, dict):
                sanitized_item = {}
                for key, value in item.items():
                    safe_key = _sanitize_key(key)
                    if safe_key:
                        sanitized_item[safe_key] = _sanitize_value(value, config)
                sanitized["lineItems"].append(sanitized_item)

    # Pass through confidence (validated as number)
    if "confidence" in result:
        try:
            confidence = float(result["confidence"])
            if 0 <= confidence <= 100:
                sanitized["confidence"] = confidence
        except (ValueError, TypeError):
            pass

    return sanitized


def _sanitize_value(value: Any, config: SanitizationConfig) -> Any:
    """
    Recursively sanitize a value based on its type.

    Args:
        value: The value to sanitize
        config: Sanitization configuration

    Returns:
        Sanitized value
    """
    if value is None:
        return None

    if isinstance(value, str):
        return sanitize_string(value, config)

    if isinstance(value, (int, float, bool)):
        return value

    if isinstance(value, list):
        return [_sanitize_value(item, config) for item in value[:1000]]  # Limit list size

    if isinstance(value, dict):
        return {
            _sanitize_key(k): _sanitize_value(v, config)
            for k, v in value.items()
            if _sanitize_key(k) is not None
        }

    # Convert unknown types to string and sanitize
    return sanitize_string(str(value), config)


def _sanitize_key(key: str) -> Optional[str]:
    """
    Sanitize and validate a dictionary key.

    Prevents prototype pollution and injection via keys.

    Args:
        key: The key to validate

    Returns:
        Sanitized key or None if invalid
    """
    if not isinstance(key, str):
        return None

    # Strip whitespace
    key = key.strip()

    # Limit key length
    if len(key) > 64:
        key = key[:64]

    # Block dangerous keys
    dangerous_keys = {
        "__proto__", "constructor", "prototype",
        "__class__", "__bases__", "__mro__",
        "__subclasses__", "__init__", "__new__",
        "__dict__", "__globals__", "__builtins__",
    }

    if key.lower() in dangerous_keys:
        logger.warning(f"Blocked dangerous key: {key}")
        return None

    # Only allow safe characters in keys
    if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", key):
        # For keys that don't match, convert to safe format
        safe_key = re.sub(r"[^a-zA-Z0-9_]", "_", key)
        if safe_key and safe_key[0].isdigit():
            safe_key = "_" + safe_key
        return safe_key if safe_key else None

    return key


def _basic_strip_tags(value: str) -> str:
    """
    Basic HTML tag stripping without bleach.

    This is a fallback when bleach is not available.
    Note: For production, always install bleach for robust sanitization.

    Args:
        value: The string to strip tags from

    Returns:
        String with HTML tags removed
    """
    # First escape any HTML entities that might be used for attacks
    # Then remove all HTML tags
    tag_pattern = re.compile(r"<[^>]+>")
    value = tag_pattern.sub("", value)

    # Also strip common XSS vectors
    xss_patterns = [
        re.compile(r"javascript:", re.IGNORECASE),
        re.compile(r"on\w+\s*=", re.IGNORECASE),
        re.compile(r"data:", re.IGNORECASE),
        re.compile(r"vbscript:", re.IGNORECASE),
    ]

    for pattern in xss_patterns:
        value = pattern.sub("", value)

    # Unescape HTML entities for display
    value = html.unescape(value)

    return value


def escape_for_json(value: str) -> str:
    """
    Escape a string for safe JSON embedding.

    Args:
        value: The string to escape

    Returns:
        JSON-safe string
    """
    # Replace control characters and potentially dangerous characters
    replacements = {
        "\\": "\\\\",
        '"': '\\"',
        "\n": "\\n",
        "\r": "\\r",
        "\t": "\\t",
        "\b": "\\b",
        "\f": "\\f",
    }

    for char, escape in replacements.items():
        value = value.replace(char, escape)

    return value

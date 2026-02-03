"""
Database Security Module

Provides security utilities for database operations with PostgreSQL/SQLAlchemy.
Implements input sanitization and safe query construction patterns.
"""

from typing import Any, Dict, List, Optional, Union
import re
from app.core.exceptions import ValidationError


def sanitize_query_params(params: Any) -> Any:
    """
    Sanitize query parameters for safe database operations.

    While SQLAlchemy provides parameterized queries that prevent SQL injection,
    this function provides additional input validation for:
    1. Validating parameter types
    2. Blocking potentially dangerous patterns
    3. Sanitizing nested structures

    Args:
        params: Query parameters to sanitize (dict, list, or basic type)

    Returns:
        Sanitized query parameters safe for database operations

    Raises:
        ValidationError: If parameters contain invalid types or dangerous patterns

    Example:
        >>> sanitize_query_params({"email": "user@example.com"})
        {"email": "user@example.com"}
    """
    # Handle None
    if params is None:
        return None

    # Handle basic types (str, int, float, bool)
    if isinstance(params, (str, int, float, bool)):
        return params

    # Handle lists - recursively sanitize each element
    if isinstance(params, list):
        return [sanitize_query_params(item) for item in params]

    # Handle dictionaries - the main case for query parameters
    if isinstance(params, dict):
        sanitized = {}

        for key, value in params.items():
            # Validate key is a string
            if not isinstance(key, str):
                raise ValidationError(
                    f"Query parameter keys must be strings, got {type(key).__name__}",
                    details={"invalid_key_type": type(key).__name__}
                )

            # Block potentially dangerous keys
            dangerous_keys = ['__proto__', 'constructor', 'prototype']
            if key.lower() in dangerous_keys:
                raise ValidationError(
                    f"Potentially dangerous key '{key}' not allowed in query",
                    details={"blocked_key": key}
                )

            # Recursively sanitize the value
            sanitized[key] = sanitize_query_params(value)

        return sanitized

    # For any other type, raise an error
    raise ValidationError(
        f"Unsupported parameter type: {type(params).__name__}",
        details={"unsupported_type": type(params).__name__}
    )


def safe_like_pattern(pattern: str, escape_char: str = "\\") -> str:
    """
    Create a safe LIKE pattern for PostgreSQL text search.

    Escapes SQL LIKE special characters (%, _) in user input to prevent
    unexpected pattern matching behavior.

    Args:
        pattern: User input search pattern
        escape_char: Escape character to use (default: backslash)

    Returns:
        Escaped pattern safe for use in LIKE queries

    Example:
        >>> safe_like_pattern("user@example.com")
        "user@example.com"

        >>> safe_like_pattern("50%_discount")
        "50\\%\\_discount"

    Usage with SQLAlchemy:
        >>> stmt = select(User).where(
        ...     User.email.like(f"%{safe_like_pattern(search_term)}%", escape="\\")
        ... )
    """
    # Escape the escape character first
    result = pattern.replace(escape_char, escape_char + escape_char)
    # Escape LIKE special characters
    result = result.replace("%", escape_char + "%")
    result = result.replace("_", escape_char + "_")
    return result


def validate_sort_field(field_name: str, allowed_fields: Optional[List[str]] = None) -> str:
    """
    Validate and sanitize sort field names.

    Ensures sort fields contain only alphanumeric characters and underscores,
    and optionally validates against a whitelist of allowed fields.

    Args:
        field_name: Sort field name to validate
        allowed_fields: Optional list of explicitly allowed field names

    Returns:
        Validated field name

    Raises:
        ValidationError: If field name contains invalid characters or
                        is not in the allowed fields list

    Example:
        >>> validate_sort_field("created_at")
        "created_at"

        >>> validate_sort_field("user; DROP TABLE--")
        ValidationError: Invalid sort field

        >>> validate_sort_field("admin", allowed_fields=["created_at", "email"])
        ValidationError: Sort field 'admin' not in allowed fields
    """
    # Check for valid characters (alphanumeric, underscore only for PostgreSQL columns)
    if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]*$', field_name):
        raise ValidationError(
            f"Invalid sort field: {field_name}",
            details={"field_name": field_name, "reason": "invalid_characters"}
        )

    # Check against whitelist if provided
    if allowed_fields is not None:
        if field_name not in allowed_fields:
            raise ValidationError(
                f"Sort field '{field_name}' not in allowed fields",
                details={"field_name": field_name, "allowed_fields": allowed_fields}
            )

    return field_name


def validate_column_name(column_name: str) -> str:
    """
    Validate a column name for safe use in dynamic queries.

    Args:
        column_name: Column name to validate

    Returns:
        Validated column name

    Raises:
        ValidationError: If column name contains invalid characters

    Example:
        >>> validate_column_name("user_email")
        "user_email"

        >>> validate_column_name("'; DROP TABLE users;--")
        ValidationError: Invalid column name
    """
    # PostgreSQL column names must start with letter or underscore,
    # followed by letters, digits, or underscores
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', column_name):
        raise ValidationError(
            f"Invalid column name: {column_name}",
            details={"column_name": column_name, "reason": "invalid_characters"}
        )

    # Maximum length for PostgreSQL identifiers
    if len(column_name) > 63:
        raise ValidationError(
            f"Column name too long (max 63 characters): {column_name}",
            details={"column_name": column_name, "length": len(column_name)}
        )

    return column_name


def validate_table_name(table_name: str, allowed_tables: Optional[List[str]] = None) -> str:
    """
    Validate a table name for safe use in dynamic queries.

    Args:
        table_name: Table name to validate
        allowed_tables: Optional whitelist of allowed table names

    Returns:
        Validated table name

    Raises:
        ValidationError: If table name is invalid or not in allowed list

    Example:
        >>> validate_table_name("users")
        "users"

        >>> validate_table_name("admin", allowed_tables=["users", "documents"])
        ValidationError: Table 'admin' not in allowed tables
    """
    # PostgreSQL table names follow same rules as column names
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', table_name):
        raise ValidationError(
            f"Invalid table name: {table_name}",
            details={"table_name": table_name, "reason": "invalid_characters"}
        )

    # Maximum length for PostgreSQL identifiers
    if len(table_name) > 63:
        raise ValidationError(
            f"Table name too long (max 63 characters): {table_name}",
            details={"table_name": table_name, "length": len(table_name)}
        )

    # Check against whitelist if provided
    if allowed_tables is not None:
        if table_name not in allowed_tables:
            raise ValidationError(
                f"Table '{table_name}' not in allowed tables",
                details={"table_name": table_name, "allowed_tables": allowed_tables}
            )

    return table_name


def sanitize_text_search(search_term: str, max_length: int = 255) -> str:
    """
    Sanitize user input for full-text search operations.

    Args:
        search_term: User search input
        max_length: Maximum allowed length for search term

    Returns:
        Sanitized search term

    Raises:
        ValidationError: If search term exceeds maximum length

    Example:
        >>> sanitize_text_search("invoice report")
        "invoice report"

        >>> sanitize_text_search("a" * 300)
        ValidationError: Search term too long
    """
    # Strip whitespace
    search_term = search_term.strip()

    # Check length
    if len(search_term) > max_length:
        raise ValidationError(
            f"Search term too long (max {max_length} characters)",
            details={"length": len(search_term), "max_length": max_length}
        )

    # Remove null bytes
    search_term = search_term.replace('\x00', '')

    return search_term


def validate_uuid(uuid_string: str) -> str:
    """
    Validate a UUID string format.

    Args:
        uuid_string: String to validate as UUID

    Returns:
        Validated UUID string

    Raises:
        ValidationError: If string is not a valid UUID format

    Example:
        >>> validate_uuid("550e8400-e29b-41d4-a716-446655440000")
        "550e8400-e29b-41d4-a716-446655440000"

        >>> validate_uuid("not-a-uuid")
        ValidationError: Invalid UUID format
    """
    # UUID v4 pattern (also matches other versions)
    uuid_pattern = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE
    )

    if not uuid_pattern.match(uuid_string):
        raise ValidationError(
            f"Invalid UUID format: {uuid_string}",
            details={"value": uuid_string}
        )

    return uuid_string.lower()


def validate_pagination(
    skip: int = 0,
    limit: int = 100,
    max_limit: int = 1000
) -> tuple[int, int]:
    """
    Validate pagination parameters.

    Args:
        skip: Number of records to skip (offset)
        limit: Maximum number of records to return
        max_limit: Maximum allowed limit value

    Returns:
        Tuple of (validated_skip, validated_limit)

    Raises:
        ValidationError: If pagination parameters are invalid

    Example:
        >>> validate_pagination(skip=10, limit=50)
        (10, 50)

        >>> validate_pagination(skip=-1, limit=50)
        ValidationError: Skip must be non-negative
    """
    if skip < 0:
        raise ValidationError(
            "Skip must be non-negative",
            details={"skip": skip}
        )

    if limit < 1:
        raise ValidationError(
            "Limit must be at least 1",
            details={"limit": limit}
        )

    if limit > max_limit:
        raise ValidationError(
            f"Limit exceeds maximum allowed ({max_limit})",
            details={"limit": limit, "max_limit": max_limit}
        )

    return (skip, limit)

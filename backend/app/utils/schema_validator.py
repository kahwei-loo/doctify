"""
Schema Validator Module

Provides L2 validation for AI-extracted document data.
Validates field names, types, and structure to prevent injection attacks
and ensure data integrity.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Union
import re
import logging

logger = logging.getLogger(__name__)


class FieldType(str, Enum):
    """Supported field types for Schema Builder."""
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"
    ENUM = "enum"
    ARRAY = "array"


# Security: Reserved names that could be used for prototype pollution or injection
RESERVED_NAMES = frozenset([
    "__proto__",
    "constructor",
    "prototype",
    "eval",
    "function",
    "this",
    "window",
    "document",
    "global",
    "process",
    "__class__",
    "__bases__",
    "__mro__",
    "__subclasses__",
    "__init__",
    "__new__",
    "__del__",
    "__dict__",
    "__globals__",
    "__builtins__",
    "__import__",
    "__code__",
])

# Valid field name pattern: starts with letter, alphanumeric + underscore, max 64 chars
FIELD_NAME_PATTERN = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]{0,63}$")


@dataclass
class FieldDefinition:
    """Definition of a single field in the schema."""
    name: str
    type: FieldType
    description: Optional[str] = None
    required: bool = False
    enum_options: Optional[List[str]] = None
    array_item_type: Optional[FieldType] = None

    def __post_init__(self):
        """Validate field definition on creation."""
        if not validate_field_name(self.name):
            raise ValueError(f"Invalid field name: {self.name}")

        if self.type == FieldType.ENUM and not self.enum_options:
            raise ValueError(f"Enum field '{self.name}' must have enum_options")

        if self.type == FieldType.ARRAY and not self.array_item_type:
            raise ValueError(f"Array field '{self.name}' must have array_item_type")


@dataclass
class TableConfig:
    """Configuration for the line items table."""
    description: str
    columns: List[FieldDefinition] = field(default_factory=list)

    def __post_init__(self):
        """Validate table configuration."""
        if len(self.description) > 1000:
            raise ValueError("Table description must be 1000 characters or less")
        if len(self.columns) > 20:
            raise ValueError("Table can have at most 20 columns")


@dataclass
class ProjectSchema:
    """Complete schema definition for a project."""
    title: str
    description: str
    fields: List[FieldDefinition] = field(default_factory=list)
    table_config: Optional[TableConfig] = None

    def __post_init__(self):
        """Validate project schema."""
        if not self.title or len(self.title) > 200:
            raise ValueError("Title must be 1-200 characters")
        if len(self.description) > 500:
            raise ValueError("Description must be 500 characters or less")
        if len(self.fields) > 50:
            raise ValueError("Schema can have at most 50 fields")


def validate_field_name(name: str) -> bool:
    """
    Validate a field name for security and format.

    Args:
        name: The field name to validate

    Returns:
        True if valid, False otherwise
    """
    if not name or not isinstance(name, str):
        return False

    # Check against reserved names (case-insensitive)
    if name.lower() in RESERVED_NAMES:
        return False

    # Check pattern
    if not FIELD_NAME_PATTERN.match(name):
        return False

    return True


def validate_project_schema(schema_dict: Dict[str, Any]) -> tuple[bool, Optional[ProjectSchema], Optional[str]]:
    """
    Validate and parse a project schema dictionary.

    Args:
        schema_dict: Raw schema dictionary from user input or API

    Returns:
        Tuple of (is_valid, parsed_schema, error_message)
    """
    try:
        # Validate required fields
        if "title" not in schema_dict:
            return False, None, "Schema must have a title"

        title = schema_dict.get("title", "")
        description = schema_dict.get("description", "")

        # Parse fields
        fields = []
        for field_dict in schema_dict.get("fields", []):
            try:
                field_type = FieldType(field_dict.get("type", "text"))
                array_item_type = None
                if field_dict.get("arrayItemType"):
                    array_item_type = FieldType(field_dict["arrayItemType"])

                field_def = FieldDefinition(
                    name=field_dict.get("name", ""),
                    type=field_type,
                    description=field_dict.get("description"),
                    required=field_dict.get("required", False),
                    enum_options=field_dict.get("enumOptions"),
                    array_item_type=array_item_type,
                )
                fields.append(field_def)
            except (ValueError, KeyError) as e:
                return False, None, f"Invalid field definition: {e}"

        # Parse table config if present
        table_config = None
        if "tableConfig" in schema_dict:
            tc = schema_dict["tableConfig"]
            columns = []
            for col_dict in tc.get("columns", []):
                try:
                    col = FieldDefinition(
                        name=col_dict.get("name", ""),
                        type=FieldType(col_dict.get("type", "text")),
                        description=col_dict.get("description"),
                    )
                    columns.append(col)
                except (ValueError, KeyError) as e:
                    return False, None, f"Invalid column definition: {e}"

            table_config = TableConfig(
                description=tc.get("description", ""),
                columns=columns,
            )

        # Create and validate project schema
        project_schema = ProjectSchema(
            title=title,
            description=description,
            fields=fields,
            table_config=table_config,
        )

        return True, project_schema, None

    except Exception as e:
        logger.error(f"Schema validation error: {e}")
        return False, None, str(e)


class SchemaValidator:
    """
    L2 Schema Validator for AI-extracted data.

    Validates that AI output conforms to the user-defined schema,
    providing a fallback layer of validation beyond AI instructions.
    """

    def __init__(self, schema: ProjectSchema):
        """
        Initialize validator with a project schema.

        Args:
            schema: The ProjectSchema to validate against
        """
        self.schema = schema
        self._field_map = {f.name: f for f in schema.fields}
        self._column_map = {}
        if schema.table_config:
            self._column_map = {c.name: c for c in schema.table_config.columns}

    def validate_extracted_fields(
        self,
        fields: Dict[str, Any]
    ) -> tuple[bool, Dict[str, Any], List[str]]:
        """
        Validate extracted fields against schema.

        Args:
            fields: Dictionary of field_name -> extracted_value

        Returns:
            Tuple of (is_valid, coerced_fields, errors)
        """
        errors = []
        coerced = {}

        for name, value in fields.items():
            # Skip unknown fields (they may be from AI but not in schema)
            if name not in self._field_map:
                logger.warning(f"Unknown field '{name}' not in schema, skipping")
                continue

            field_def = self._field_map[name]

            # Check required fields
            if field_def.required and (value is None or value == ""):
                errors.append(f"Required field '{name}' is missing or empty")
                continue

            # Coerce and validate type
            try:
                coerced[name] = self._coerce_value(value, field_def)
            except ValueError as e:
                errors.append(f"Field '{name}': {e}")

        # Check for missing required fields
        for field_def in self.schema.fields:
            if field_def.required and field_def.name not in fields:
                errors.append(f"Required field '{field_def.name}' is missing")

        return len(errors) == 0, coerced, errors

    def validate_line_items(
        self,
        items: List[Dict[str, Any]]
    ) -> tuple[bool, List[Dict[str, Any]], List[str]]:
        """
        Validate line items against table config.

        Args:
            items: List of line item dictionaries

        Returns:
            Tuple of (is_valid, coerced_items, errors)
        """
        if not self.schema.table_config:
            return True, items, []

        errors = []
        coerced_items = []

        # Limit items to prevent DoS
        MAX_LINE_ITEMS = 1000
        if len(items) > MAX_LINE_ITEMS:
            errors.append(f"Too many line items: {len(items)} > {MAX_LINE_ITEMS}")
            items = items[:MAX_LINE_ITEMS]

        for idx, item in enumerate(items):
            coerced_item = {}

            for name, value in item.items():
                # Skip unknown columns
                if name not in self._column_map:
                    continue

                col_def = self._column_map[name]
                try:
                    coerced_item[name] = self._coerce_value(value, col_def)
                except ValueError as e:
                    errors.append(f"Line item {idx}, column '{name}': {e}")

            coerced_items.append(coerced_item)

        return len(errors) == 0, coerced_items, errors

    def validate_extracted_result(
        self,
        result: Dict[str, Any]
    ) -> tuple[bool, Dict[str, Any], List[str]]:
        """
        Validate complete extracted result (fields + line items).

        Args:
            result: Dictionary with 'fields' and optional 'lineItems'

        Returns:
            Tuple of (is_valid, validated_result, errors)
        """
        all_errors = []
        validated = {}

        # Validate fields
        if "fields" in result:
            is_valid, coerced_fields, field_errors = self.validate_extracted_fields(
                result["fields"]
            )
            validated["fields"] = coerced_fields
            all_errors.extend(field_errors)

        # Validate line items
        if "lineItems" in result:
            is_valid, coerced_items, item_errors = self.validate_line_items(
                result["lineItems"]
            )
            validated["lineItems"] = coerced_items
            all_errors.extend(item_errors)

        # Pass through confidence if present
        if "confidence" in result:
            confidence = result["confidence"]
            if isinstance(confidence, (int, float)) and 0 <= confidence <= 100:
                validated["confidence"] = float(confidence)

        return len(all_errors) == 0, validated, all_errors

    def _coerce_value(self, value: Any, field_def: FieldDefinition) -> Any:
        """
        Coerce a value to the expected type.

        Args:
            value: The value to coerce
            field_def: The field definition with expected type

        Returns:
            Coerced value

        Raises:
            ValueError: If value cannot be coerced to expected type
        """
        if value is None:
            return self._get_default(field_def.type)

        field_type = field_def.type

        if field_type == FieldType.TEXT:
            return str(value)[:10000]  # Limit text length

        elif field_type == FieldType.NUMBER:
            try:
                num = float(value)
                # Limit to reasonable range
                if num < -999999999999 or num > 999999999999:
                    raise ValueError(f"Number {num} out of range")
                return num
            except (ValueError, TypeError):
                raise ValueError(f"Cannot convert '{value}' to number")

        elif field_type == FieldType.BOOLEAN:
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.lower() in ("true", "1", "yes", "on")
            return bool(value)

        elif field_type == FieldType.DATE:
            # Accept ISO format strings
            if isinstance(value, str):
                # Basic validation - could use dateutil for more robust parsing
                if len(value) > 100:
                    raise ValueError("Date string too long")
                return value
            return str(value)

        elif field_type == FieldType.ENUM:
            str_value = str(value)
            if field_def.enum_options and str_value not in field_def.enum_options:
                raise ValueError(
                    f"Value '{str_value}' not in allowed options: {field_def.enum_options}"
                )
            return str_value

        elif field_type == FieldType.ARRAY:
            if not isinstance(value, list):
                value = [value]
            # Limit array size
            MAX_ARRAY_SIZE = 100
            if len(value) > MAX_ARRAY_SIZE:
                value = value[:MAX_ARRAY_SIZE]
            return value

        return value

    def _get_default(self, field_type: FieldType) -> Any:
        """Get default value for a field type."""
        defaults = {
            FieldType.TEXT: "",
            FieldType.NUMBER: 0,
            FieldType.BOOLEAN: False,
            FieldType.DATE: "",
            FieldType.ENUM: "",
            FieldType.ARRAY: [],
        }
        return defaults.get(field_type)

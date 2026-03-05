"""
Project Domain Entity

Encapsulates project business logic and behavior.
"""

from typing import Optional, Dict, Any, List
from datetime import datetime


class ProjectEntity:
    """
    Project domain entity with business logic.

    Represents a project in the system with document processing configuration.
    """

    def __init__(
        self,
        id: str,
        user_id: str,
        name: str,
        description: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
        is_active: bool = True,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None,
        archived_at: Optional[datetime] = None,
    ):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.description = description
        self.config = config or self._default_config()
        self.is_active = is_active
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.archived_at = archived_at

    @staticmethod
    def _default_config() -> Dict[str, Any]:
        """
        Get default project configuration.

        Structure matches ProjectConfig Pydantic model in app.models.project.
        """
        return {
            # Basic OCR settings
            "ocr_enabled": True,
            "ai_model": "openai/gpt-4o-mini",
            "language": "en",
            "output_format": "json",
            # Field configuration (core feature from old project)
            "fields": [],
            # Table configuration (core feature from old project)
            "tables": [],
            # Custom prompt (Layer 3 - highest priority)
            "message_content": None,
            # Sample output for AI few-shot learning
            "sample_output": None,
            # Validation rules
            "validation_rules": {},
        }

    def can_process_documents(self) -> bool:
        """Check if project can process documents."""
        return self.is_active

    def is_archived(self) -> bool:
        """Check if project is archived."""
        return not self.is_active and self.archived_at is not None

    def archive(self) -> None:
        """Archive the project."""
        if not self.is_active:
            raise ValueError("Project is already archived")

        self.is_active = False
        self.archived_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def restore(self) -> None:
        """Restore an archived project."""
        if self.is_active:
            raise ValueError("Project is already active")

        self.is_active = True
        self.archived_at = None
        self.updated_at = datetime.utcnow()

    def update_config(self, config_updates: Dict[str, Any]) -> None:
        """
        Update project configuration.

        Args:
            config_updates: Dictionary of configuration updates
        """
        self.config.update(config_updates)
        self.updated_at = datetime.utcnow()

    def get_config_value(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value.

        Args:
            key: Configuration key
            default: Default value if key not found

        Returns:
            Configuration value
        """
        return self.config.get(key, default)

    def set_config_value(self, key: str, value: Any) -> None:
        """
        Set a configuration value.

        Args:
            key: Configuration key
            value: Configuration value
        """
        self.config[key] = value
        self.updated_at = datetime.utcnow()

    def add_extraction_field(self, field: Dict[str, Any]) -> None:
        """
        Add an extraction field to configuration.

        Args:
            field: Field definition dictionary
        """
        fields = self.config.get("extraction_fields", [])

        # Check for duplicate field name
        field_name = field.get("name")
        if any(f.get("name") == field_name for f in fields):
            raise ValueError(f"Extraction field '{field_name}' already exists")

        fields.append(field)
        self.config["extraction_fields"] = fields
        self.updated_at = datetime.utcnow()

    def remove_extraction_field(self, field_name: str) -> None:
        """
        Remove an extraction field from configuration.

        Args:
            field_name: Name of field to remove
        """
        fields = self.config.get("extraction_fields", [])
        self.config["extraction_fields"] = [
            f for f in fields if f.get("name") != field_name
        ]
        self.updated_at = datetime.utcnow()

    def get_extraction_fields(self) -> List[Dict[str, Any]]:
        """
        Get extraction fields configuration.

        Returns:
            List of extraction field definitions
        """
        return self.config.get("extraction_fields", [])

    def add_validation_rule(self, field_name: str, rule: Dict[str, Any]) -> None:
        """
        Add a validation rule for a field.

        Args:
            field_name: Field name
            rule: Validation rule definition
        """
        rules = self.config.get("validation_rules", {})
        rules[field_name] = rule
        self.config["validation_rules"] = rules
        self.updated_at = datetime.utcnow()

    def remove_validation_rule(self, field_name: str) -> None:
        """
        Remove validation rule for a field.

        Args:
            field_name: Field name
        """
        rules = self.config.get("validation_rules", {})
        rules.pop(field_name, None)
        self.config["validation_rules"] = rules
        self.updated_at = datetime.utcnow()

    def get_validation_rules(self) -> Dict[str, Any]:
        """
        Get validation rules configuration.

        Returns:
            Dictionary of validation rules
        """
        return self.config.get("validation_rules", {})

    def validate_config(self) -> bool:
        """
        Validate project configuration.

        Returns:
            True if configuration is valid

        Raises:
            ValueError: If configuration is invalid
        """
        # Validate AI model
        valid_models = ["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "claude-3-sonnet"]
        model = self.config.get("ai_model")
        if model not in valid_models:
            raise ValueError(f"Invalid AI model: {model}")

        # Validate output format
        valid_formats = ["json", "xml", "csv"]
        output_format = self.config.get("output_format")
        if output_format not in valid_formats:
            raise ValueError(f"Invalid output format: {output_format}")

        # Validate extraction fields
        fields = self.config.get("extraction_fields", [])
        field_names = set()
        for field in fields:
            if "name" not in field:
                raise ValueError("Extraction field missing 'name'")
            if field["name"] in field_names:
                raise ValueError(f"Duplicate extraction field: {field['name']}")
            field_names.add(field["name"])

        return True

    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "config": self.config,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "archived_at": self.archived_at,
        }

    def __repr__(self) -> str:
        return (
            f"ProjectEntity(id={self.id}, name={self.name}, is_active={self.is_active})"
        )

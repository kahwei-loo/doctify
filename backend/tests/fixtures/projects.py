"""
Project Test Fixtures

Provides sample project data and factory functions for project-related tests.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# =============================================================================
# Sample Project Data
# =============================================================================

SAMPLE_PROJECT_DATA: Dict[str, Any] = {
    "name": "Test Project",
    "description": "A test project for unit tests",
}

SAMPLE_PROJECT_WITH_SETTINGS: Dict[str, Any] = {
    "name": "Project with Settings",
    "description": "A project with custom settings",
    "settings": {
        "auto_process": True,
        "default_extraction_config": {
            "extract_tables": True,
            "extract_images": False,
            "language": "en",
        },
        "notifications": {
            "email_on_complete": True,
            "webhook_url": "https://example.com/webhook",
        },
    },
}


# =============================================================================
# Project Factory Functions
# =============================================================================

def create_project_data(
    name: Optional[str] = None,
    description: Optional[str] = None,
    settings: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Create project data with customizable fields.

    Args:
        name: Project name (auto-generated if not provided)
        description: Project description
        settings: Project settings
        user_id: Owner user ID
        **kwargs: Additional fields

    Returns:
        Dictionary with project data
    """
    unique_id = uuid.uuid4().hex[:8]

    return {
        "name": name or f"Project {unique_id}",
        "description": description or f"Description for project {unique_id}",
        "settings": settings or {},
        "user_id": user_id,
        **kwargs,
    }


class ProjectFactory:
    """
    Factory class for creating project test data with various configurations.
    """

    _counter = 0

    @classmethod
    def _next_id(cls) -> int:
        cls._counter += 1
        return cls._counter

    @classmethod
    def reset(cls) -> None:
        """Reset the counter (useful between tests)."""
        cls._counter = 0

    @classmethod
    def create(cls, **overrides) -> Dict[str, Any]:
        """Create a single project with default or overridden values."""
        idx = cls._next_id()
        defaults = {
            "name": f"Project {idx}",
            "description": f"Test project {idx} description",
            "settings": {},
        }
        return {**defaults, **overrides}

    @classmethod
    def create_batch(cls, count: int, **overrides) -> List[Dict[str, Any]]:
        """Create multiple projects with the same overrides."""
        return [cls.create(**overrides) for _ in range(count)]

    @classmethod
    def create_with_auto_process(cls, **overrides) -> Dict[str, Any]:
        """Create a project with auto-processing enabled."""
        return cls.create(
            settings={
                "auto_process": True,
                "default_extraction_config": {
                    "extract_tables": True,
                    "extract_images": True,
                },
            },
            **overrides,
        )

    @classmethod
    def create_with_webhook(cls, webhook_url: str = "https://example.com/webhook", **overrides) -> Dict[str, Any]:
        """Create a project with webhook notifications."""
        return cls.create(
            settings={
                "notifications": {
                    "email_on_complete": True,
                    "webhook_url": webhook_url,
                },
            },
            **overrides,
        )

    @classmethod
    def create_for_user(cls, user_id: str, **overrides) -> Dict[str, Any]:
        """Create a project for a specific user."""
        return cls.create(user_id=user_id, **overrides)

    @classmethod
    def create_with_extraction_config(
        cls,
        extract_tables: bool = True,
        extract_images: bool = True,
        language: str = "en",
        **overrides,
    ) -> Dict[str, Any]:
        """Create a project with custom extraction configuration."""
        return cls.create(
            settings={
                "auto_process": True,
                "default_extraction_config": {
                    "extract_tables": extract_tables,
                    "extract_images": extract_images,
                    "language": language,
                },
            },
            **overrides,
        )


# =============================================================================
# Project Settings Fixtures
# =============================================================================

SAMPLE_EXTRACTION_CONFIG: Dict[str, Any] = {
    "extract_tables": True,
    "extract_images": True,
    "language": "en",
    "confidence_threshold": 0.8,
    "providers": ["openai", "anthropic"],
}

SAMPLE_NOTIFICATION_CONFIG: Dict[str, Any] = {
    "email_on_complete": True,
    "email_on_failure": True,
    "webhook_url": "https://example.com/webhook",
    "webhook_secret": "webhook_secret_key",
}


# =============================================================================
# Database Model Data
# =============================================================================

def create_project_db_data(
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Create project data suitable for direct database insertion.

    Args:
        project_id: Project UUID (auto-generated if not provided)
        user_id: Owner user ID
        **kwargs: Additional fields

    Returns:
        Dictionary with database-ready project data
    """
    base_data = create_project_data(**kwargs)

    return {
        "id": project_id or str(uuid.uuid4()),
        "user_id": user_id or str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        **base_data,
    }

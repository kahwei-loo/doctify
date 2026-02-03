"""
Test Fixtures Package

Provides reusable test data and fixtures for all tests.
Import fixtures from this package in conftest.py or directly in test files.
"""

from .users import (
    SAMPLE_USER_DATA,
    SAMPLE_SUPERUSER_DATA,
    SAMPLE_INACTIVE_USER_DATA,
    SAMPLE_UNVERIFIED_USER_DATA,
    create_user_data,
    UserFactory,
)

from .documents import (
    SAMPLE_DOCUMENT_DATA,
    SAMPLE_PROCESSED_DOCUMENT_DATA,
    SAMPLE_FAILED_DOCUMENT_DATA,
    create_document_data,
    DocumentFactory,
)

from .projects import (
    SAMPLE_PROJECT_DATA,
    SAMPLE_PROJECT_WITH_SETTINGS,
    create_project_data,
    ProjectFactory,
)

from .api_keys import (
    SAMPLE_API_KEY_DATA,
    create_api_key_data,
    ApiKeyFactory,
)

from .files import (
    create_test_pdf,
    create_test_image,
    create_test_text_file,
    FileFactory,
)

from .mocks import (
    MockOCRService,
    MockS3Client,
    MockRedisClient,
    MockCeleryTask,
)

__all__ = [
    # Users
    "SAMPLE_USER_DATA",
    "SAMPLE_SUPERUSER_DATA",
    "SAMPLE_INACTIVE_USER_DATA",
    "SAMPLE_UNVERIFIED_USER_DATA",
    "create_user_data",
    "UserFactory",
    # Documents
    "SAMPLE_DOCUMENT_DATA",
    "SAMPLE_PROCESSED_DOCUMENT_DATA",
    "SAMPLE_FAILED_DOCUMENT_DATA",
    "create_document_data",
    "DocumentFactory",
    # Projects
    "SAMPLE_PROJECT_DATA",
    "SAMPLE_PROJECT_WITH_SETTINGS",
    "create_project_data",
    "ProjectFactory",
    # API Keys
    "SAMPLE_API_KEY_DATA",
    "create_api_key_data",
    "ApiKeyFactory",
    # Files
    "create_test_pdf",
    "create_test_image",
    "create_test_text_file",
    "FileFactory",
    # Mocks
    "MockOCRService",
    "MockS3Client",
    "MockRedisClient",
    "MockCeleryTask",
]

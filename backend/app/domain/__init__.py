"""
Domain Layer

Contains business entities and value objects.
"""

from app.domain.entities.document import DocumentEntity, DocumentStatus
from app.domain.entities.user import UserEntity
from app.domain.entities.project import ProjectEntity
from app.domain.value_objects.token_usage import TokenUsage, TokenUsageSummary
from app.domain.value_objects.file_metadata import FileMetadata, DocumentDimensions
from app.domain.value_objects.confidence_score import (
    ConfidenceScore,
    ConfidenceLevel,
    FieldConfidence,
)

__all__ = [
    # Entities
    "DocumentEntity",
    "DocumentStatus",
    "UserEntity",
    "ProjectEntity",
    # Value Objects
    "TokenUsage",
    "TokenUsageSummary",
    "FileMetadata",
    "DocumentDimensions",
    "ConfidenceScore",
    "ConfidenceLevel",
    "FieldConfidence",
]

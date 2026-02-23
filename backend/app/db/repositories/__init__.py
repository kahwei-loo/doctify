"""
Repository Layer

Data access layer using Repository Pattern with SQLAlchemy.
"""

from app.db.repositories.base import BaseRepository
from app.db.repositories.document import DocumentRepository
from app.db.repositories.user import UserRepository, ApiKeyRepository
from app.db.repositories.project import ProjectRepository
from app.db.repositories.insights import (
    InsightsDatasetRepository,
    InsightsConversationRepository,
    InsightsQueryRepository,
)
from app.db.repositories.rag import (
    DocumentEmbeddingRepository,
    RAGQueryRepository,
)
from app.db.repositories.knowledge_base import (
    KnowledgeBaseRepository,
    DataSourceRepository,
)
from app.db.repositories.assistant_repository import AssistantRepository
from app.db.repositories.assistant_conversation_repository import (
    AssistantConversationRepository,
    AssistantMessageRepository,
)
from app.db.repositories.model_catalog_repository import ModelCatalogRepository

__all__ = [
    # Base
    "BaseRepository",
    # Document Repositories
    "DocumentRepository",
    # User Repositories
    "UserRepository",
    "ApiKeyRepository",
    # Project Repositories
    "ProjectRepository",
    # Insights Repositories
    "InsightsDatasetRepository",
    "InsightsConversationRepository",
    "InsightsQueryRepository",
    # RAG Repositories
    "DocumentEmbeddingRepository",
    "RAGQueryRepository",
    # Knowledge Base Repositories
    "KnowledgeBaseRepository",
    "DataSourceRepository",
    # AI Assistants Repositories
    "AssistantRepository",
    "AssistantConversationRepository",
    "AssistantMessageRepository",
    # Model Catalog
    "ModelCatalogRepository",
]

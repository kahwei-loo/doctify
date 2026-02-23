"""
SQLAlchemy Models Package

All database models for PostgreSQL with SQLAlchemy 2.0.
"""

from .base import BaseModel, TimestampMixin, UUIDMixin
from .user import User
from .api_key import ApiKey
from .document import Document
from .project import Project
from .user_settings import UserSettings
from .template import Template
from .edit_history import EditHistory
from .insights import InsightsDataset, InsightsConversation, InsightsQuery
from .rag import DocumentEmbedding, RAGQuery
from .assistant import Assistant
from .assistant_conversation import AssistantConversation, AssistantMessage
from .ai_model_setting import AIModelSetting
from .model_catalog import ModelCatalog

__all__ = [
    # Base classes
    "BaseModel",
    "TimestampMixin",
    "UUIDMixin",
    # Models
    "User",
    "ApiKey",
    "Document",
    "Project",
    "UserSettings",
    "Template",
    "EditHistory",
    # Insights models
    "InsightsDataset",
    "InsightsConversation",
    "InsightsQuery",
    # RAG models
    "DocumentEmbedding",
    "RAGQuery",
    # AI Assistants models
    "Assistant",
    "AssistantConversation",
    "AssistantMessage",
    # AI Model Settings
    "AIModelSetting",
    # Model Catalog
    "ModelCatalog",
]

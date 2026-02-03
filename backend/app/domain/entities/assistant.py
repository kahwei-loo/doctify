"""
Assistant Domain Entity

Domain model for AI Assistants feature.
Week 5 - Backend API Development (Day 11-12)
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID, uuid4


@dataclass
class AssistantModelConfig:
    """Configuration for the AI model used by an assistant."""

    provider: str = "openai"  # openai, anthropic, google
    model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 2048
    system_prompt: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "provider": self.provider,
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "system_prompt": self.system_prompt,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AssistantModelConfig":
        """Create from dictionary."""
        return cls(
            provider=data.get("provider", "openai"),
            model=data.get("model", "gpt-4"),
            temperature=data.get("temperature", 0.7),
            max_tokens=data.get("max_tokens", 2048),
            system_prompt=data.get("system_prompt"),
        )


@dataclass
class AssistantEntity:
    """
    AI Assistant domain entity.

    Represents an AI assistant that can handle conversations
    with users through the public chat widget or internal inbox.
    """

    id: UUID = field(default_factory=uuid4)
    user_id: UUID = field(default_factory=uuid4)  # Owner of the assistant
    name: str = ""
    description: Optional[str] = None
    model_config: AssistantModelConfig = field(default_factory=AssistantModelConfig)
    is_active: bool = True

    # Knowledge base integration (optional)
    knowledge_base_id: Optional[UUID] = None

    # Widget customization
    widget_config: Dict[str, Any] = field(default_factory=dict)

    # Statistics (computed fields, not stored directly)
    total_conversations: int = 0
    unresolved_count: int = 0

    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def activate(self) -> None:
        """Activate the assistant."""
        self.is_active = True
        self.updated_at = datetime.utcnow()

    def deactivate(self) -> None:
        """Deactivate the assistant."""
        self.is_active = False
        self.updated_at = datetime.utcnow()

    def update_model_config(self, config: Dict[str, Any]) -> None:
        """Update model configuration."""
        self.model_config = AssistantModelConfig.from_dict(config)
        self.updated_at = datetime.utcnow()

    def update_widget_config(self, config: Dict[str, Any]) -> None:
        """Update widget customization."""
        self.widget_config.update(config)
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary."""
        return {
            "assistant_id": str(self.id),
            "user_id": str(self.user_id),
            "name": self.name,
            "description": self.description,
            "model_config": self.model_config.to_dict(),
            "is_active": self.is_active,
            "knowledge_base_id": str(self.knowledge_base_id) if self.knowledge_base_id else None,
            "widget_config": self.widget_config,
            "total_conversations": self.total_conversations,
            "unresolved_count": self.unresolved_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


@dataclass
class AssistantStatsEntity:
    """Statistics for all assistants owned by a user."""

    total_assistants: int = 0
    active_assistants: int = 0
    total_conversations: int = 0
    unresolved_conversations: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "total_assistants": self.total_assistants,
            "active_assistants": self.active_assistants,
            "total_conversations": self.total_conversations,
            "unresolved_conversations": self.unresolved_conversations,
        }

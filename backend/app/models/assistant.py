"""
AI Assistants Pydantic Models

Request/Response models for AI Assistants feature.
Week 5 - Backend API Development (Day 13-14)
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

# ============================================
# Enums
# ============================================


class ConversationStatus(str, Enum):
    """Conversation status values."""

    UNRESOLVED = "unresolved"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class MessageRole(str, Enum):
    """Message role values."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ============================================
# Model Config Models
# ============================================


class ModelConfig(BaseModel):
    """AI model configuration."""

    provider: str = Field(
        default="openai", description="AI provider (openai, anthropic, google)"
    )
    model: str = Field(default="gpt-4", description="Model identifier")
    temperature: float = Field(
        default=0.7, ge=0, le=2, description="Temperature for generation"
    )
    max_tokens: int = Field(
        default=2048, gt=0, le=8192, description="Maximum tokens in response"
    )
    system_prompt: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="System prompt defining assistant behavior",
    )


class WidgetConfig(BaseModel):
    """Public chat widget configuration."""

    primary_color: str = Field(
        default="#3b82f6", description="Primary widget color (hex)"
    )
    position: str = Field(default="bottom-right", description="Widget position on page")
    welcome_message: Optional[str] = Field(None, description="Initial greeting message")
    placeholder_text: Optional[str] = Field(None, description="Input placeholder text")


# ============================================
# Assistant API Models
# ============================================


class AssistantCreate(BaseModel):
    """Request model for creating an assistant."""

    name: str = Field(..., min_length=1, max_length=100, description="Assistant name")
    description: Optional[str] = Field(
        None, max_length=500, description="Assistant description"
    )
    ai_model_config: Optional[ModelConfig] = Field(
        None, description="AI model configuration", alias="model_config"
    )
    widget_config: Optional[WidgetConfig] = Field(
        None, description="Widget appearance config"
    )
    knowledge_base_id: Optional[str] = Field(
        None, description="Connected knowledge base ID"
    )

    model_config = ConfigDict(populate_by_name=True)


class AssistantUpdate(BaseModel):
    """Request model for updating an assistant."""

    name: Optional[str] = Field(
        None, min_length=1, max_length=100, description="Assistant name"
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Assistant description"
    )
    ai_model_config: Optional[ModelConfig] = Field(
        None, description="AI model configuration", alias="model_config"
    )
    widget_config: Optional[WidgetConfig] = Field(
        None, description="Widget appearance config"
    )
    knowledge_base_id: Optional[str] = Field(
        None, description="Connected knowledge base ID"
    )
    is_active: Optional[bool] = Field(None, description="Whether assistant is active")

    model_config = ConfigDict(populate_by_name=True)


class AssistantResponse(BaseModel):
    """Response model for assistant."""

    id: str = Field(..., description="Assistant UUID")
    user_id: str = Field(..., description="Owner user UUID")
    name: str = Field(..., description="Assistant name")
    description: Optional[str] = Field(None, description="Assistant description")
    ai_model_config: Dict[str, Any] = Field(
        ..., description="AI model configuration", alias="model_configuration"
    )
    widget_config: Dict[str, Any] = Field(..., description="Widget appearance config")
    is_active: bool = Field(..., description="Whether assistant is active")
    knowledge_base_id: Optional[str] = Field(
        None, description="Connected knowledge base ID"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AssistantWithStats(BaseModel):
    """Response model for assistant with statistics."""

    id: str = Field(..., description="Assistant UUID")
    user_id: str = Field(..., description="Owner user UUID")
    name: str = Field(..., description="Assistant name")
    description: Optional[str] = Field(None, description="Assistant description")
    ai_model_config: Dict[str, Any] = Field(
        ..., description="AI model configuration", alias="model_configuration"
    )
    widget_config: Dict[str, Any] = Field(..., description="Widget appearance config")
    is_active: bool = Field(..., description="Whether assistant is active")
    knowledge_base_id: Optional[str] = Field(
        None, description="Connected knowledge base ID"
    )
    total_conversations: int = Field(default=0, description="Total conversation count")
    unresolved_count: int = Field(
        default=0, description="Unresolved conversation count"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AssistantListResponse(BaseModel):
    """Response model for listing assistants."""

    assistants: List[AssistantWithStats]
    total: int


class AssistantStatsResponse(BaseModel):
    """Response model for aggregate assistant stats."""

    total_assistants: int = Field(..., description="Total number of assistants")
    active_assistants: int = Field(..., description="Number of active assistants")
    total_conversations: int = Field(
        ..., description="Total conversations across all assistants"
    )
    unresolved_conversations: int = Field(
        ..., description="Total unresolved conversations"
    )


class AssistantAnalyticsResponse(BaseModel):
    """Response model for assistant analytics."""

    assistant_id: str = Field(..., description="Assistant UUID")
    period_days: int = Field(..., description="Analytics period in days")
    total_conversations: int = Field(
        default=0, description="Total conversations in period"
    )
    resolved_conversations: int = Field(default=0, description="Resolved conversations")
    resolution_rate: float = Field(
        default=0.0, description="Resolution rate percentage"
    )
    avg_messages_per_conversation: float = Field(
        default=0.0, description="Average messages per conversation"
    )
    total_messages: int = Field(default=0, description="Total messages in period")


# ============================================
# Conversation API Models
# ============================================


class ConversationResponse(BaseModel):
    """Response model for conversation."""

    id: str = Field(..., description="Conversation UUID")
    assistant_id: str = Field(..., description="Assistant UUID")
    user_id: Optional[str] = Field(None, description="Authenticated user UUID")
    session_id: Optional[str] = Field(None, description="Anonymous session ID")
    status: ConversationStatus = Field(..., description="Conversation status")
    last_message_preview: str = Field(default="", description="Preview of last message")
    last_message_at: datetime = Field(..., description="Timestamp of last message")
    message_count: int = Field(default=0, description="Number of messages")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Conversation context"
    )
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class ConversationListResponse(BaseModel):
    """Response model for listing conversations."""

    conversations: List[ConversationResponse]
    total: int


class ConversationStatusUpdate(BaseModel):
    """Request model for updating conversation status."""

    status: ConversationStatus = Field(..., description="New status")


# ============================================
# Message API Models
# ============================================


class MessageResponse(BaseModel):
    """Response model for message."""

    id: str = Field(..., description="Message UUID")
    conversation_id: str = Field(..., description="Conversation UUID")
    role: MessageRole = Field(..., description="Message role")
    content: str = Field(..., description="Message content")
    model_used: Optional[str] = Field(None, description="AI model used for response")
    tokens_used: Optional[int] = Field(None, description="Tokens consumed")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class MessageListResponse(BaseModel):
    """Response model for listing messages."""

    messages: List[MessageResponse]
    total: int


class SendMessageRequest(BaseModel):
    """Request model for sending a message (staff reply)."""

    content: str = Field(
        ..., min_length=1, max_length=4000, description="Message content"
    )


# ============================================
# Public Chat API Models
# ============================================


class PublicChatRequest(BaseModel):
    """Request model for public chat message."""

    session_id: str = Field(
        ..., min_length=1, max_length=128, description="Session ID from localStorage"
    )
    content: str = Field(
        ..., min_length=1, max_length=4000, description="Message content"
    )
    context: Optional[Dict[str, Any]] = Field(
        None, description="Additional context (page URL, etc.)"
    )


class PublicChatResponse(BaseModel):
    """Response model for public chat."""

    conversation_id: str = Field(..., description="Conversation UUID")
    message_id: str = Field(..., description="Assistant message UUID")
    content: str = Field(..., description="Assistant response content")
    model_used: Optional[str] = Field(None, description="AI model used")

    model_config = ConfigDict(protected_namespaces=())

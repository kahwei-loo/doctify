"""
Chat API Models

Pydantic models for chat API request and response validation.
Phase 13 - Chatbot Implementation
"""

from __future__ import annotations


from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime


class ChatConversationCreate(BaseModel):
    """Request to create conversation."""

    title: Optional[str] = Field(None, max_length=200)


class ChatConversationResponse(BaseModel):
    """Response model for conversation."""

    id: UUID
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    """Response model for chat message."""

    id: UUID
    role: str
    content: str
    tool_used: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

"""
User Settings Pydantic Models

Request and response models for user settings API.
"""

from __future__ import annotations


from typing import Optional
from pydantic import BaseModel, Field


class UserSettingsResponse(BaseModel):
    """Response model for user settings."""

    theme: str = Field(
        default="system",
        description="UI theme: light, dark, or system",
    )
    language: str = Field(
        default="en",
        description="Language code: en, zh-CN, ms, etc.",
    )
    notifications_email: bool = Field(
        default=True,
        description="Whether to receive email notifications",
    )
    notifications_push: bool = Field(
        default=True,
        description="Whether to receive push notifications",
    )
    display_density: str = Field(
        default="comfortable",
        description="Display density: compact, comfortable, spacious",
    )
    date_format: str = Field(
        default="YYYY-MM-DD",
        description="Date format for display",
    )
    timezone: str = Field(
        default="Asia/Kuala_Lumpur",
        description="User's timezone",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "theme": "dark",
                "language": "en",
                "notifications_email": True,
                "notifications_push": True,
                "display_density": "comfortable",
                "date_format": "YYYY-MM-DD",
                "timezone": "Asia/Kuala_Lumpur",
            }
        }
    }


class UserSettingsUpdate(BaseModel):
    """Request model for updating user settings (partial update)."""

    theme: Optional[str] = Field(
        default=None,
        description="UI theme: light, dark, or system",
    )
    language: Optional[str] = Field(
        default=None,
        description="Language code: en, zh-CN, ms, etc.",
    )
    notifications_email: Optional[bool] = Field(
        default=None,
        description="Whether to receive email notifications",
    )
    notifications_push: Optional[bool] = Field(
        default=None,
        description="Whether to receive push notifications",
    )
    display_density: Optional[str] = Field(
        default=None,
        description="Display density: compact, comfortable, spacious",
    )
    date_format: Optional[str] = Field(
        default=None,
        description="Date format for display",
    )
    timezone: Optional[str] = Field(
        default=None,
        description="User's timezone",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "theme": "dark",
            }
        }
    }


class SettingsApiResponse(BaseModel):
    """Standard API response wrapper for settings."""

    success: bool = True
    data: UserSettingsResponse

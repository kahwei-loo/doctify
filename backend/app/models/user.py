"""
User Request/Response Models

Pydantic models for user-related API endpoints.
"""

from __future__ import annotations


from typing import Optional
from pydantic import BaseModel, Field, validator


class UserPreferencesSchema(BaseModel):
    """
    User preferences schema with whitelist validation.

    Only allows specific preference fields to prevent injection attacks
    and unauthorized privilege escalation through preferences field.
    """

    # Allowed preference fields
    language: Optional[str] = Field(
        None, pattern="^(en|zh|es|fr|de|ja)$", description="User interface language"
    )
    timezone: Optional[str] = Field(
        None, max_length=50, description="User timezone (IANA format)"
    )
    theme: Optional[str] = Field(
        None, pattern="^(light|dark|auto)$", description="UI theme preference"
    )
    notifications_enabled: Optional[bool] = Field(
        None, description="Whether notifications are enabled"
    )
    email_notifications: Optional[bool] = Field(
        None, description="Whether email notifications are enabled"
    )
    date_format: Optional[str] = Field(
        None,
        pattern="^(YYYY-MM-DD|DD/MM/YYYY|MM/DD/YYYY)$",
        description="Date format preference",
    )
    time_format: Optional[str] = Field(
        None, pattern="^(12h|24h)$", description="Time format preference"
    )

    class Config:
        # Forbid extra fields to prevent injection of permissions, roles, etc.
        extra = "forbid"
        json_schema_extra = {
            "example": {
                "language": "en",
                "timezone": "UTC",
                "theme": "dark",
                "notifications_enabled": True,
                "email_notifications": False,
                "date_format": "YYYY-MM-DD",
                "time_format": "24h",
            }
        }

    @validator("*", pre=True)
    def prevent_dangerous_values(cls, v):
        """Prevent dangerous values in any field."""
        if isinstance(v, str):
            # Block potential injection attempts
            dangerous_patterns = ["__", "admin", "role", "permission", "sudo", "root"]
            v_lower = v.lower()
            if any(pattern in v_lower for pattern in dangerous_patterns):
                raise ValueError(
                    f"Invalid preference value: contains restricted pattern"
                )
        return v


class UpdateUserRequest(BaseModel):
    """Request model for updating user profile."""

    full_name: Optional[str] = Field(
        None, min_length=1, max_length=100, description="User's full name"
    )
    preferences: Optional[UserPreferencesSchema] = Field(
        None, description="User preferences (validated against whitelist)"
    )

    @validator("preferences")
    def validate_preferences(cls, v):
        """Additional validation for preferences."""
        if v is not None:
            # Convert to dict excluding None values
            return v.dict(exclude_none=True)
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "full_name": "John Doe",
                "preferences": {"language": "en", "theme": "dark"},
            }
        }


class UserResponse(BaseModel):
    """User response model."""

    id: str = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    username: str = Field(..., description="Username")
    full_name: Optional[str] = Field(None, description="Full name")
    is_active: bool = Field(..., description="Whether user is active")
    is_verified: bool = Field(..., description="Whether email is verified")
    role: str = Field(..., description="User role")
    preferences: Optional[dict] = Field(None, description="User preferences")
    created_at: str = Field(..., description="Account creation timestamp")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "email": "user@example.com",
                "username": "johndoe",
                "full_name": "John Doe",
                "is_active": True,
                "is_verified": True,
                "role": "user",
                "preferences": {"language": "en", "theme": "dark"},
                "created_at": "2024-01-15T10:00:00Z",
            }
        }

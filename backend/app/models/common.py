"""
Common Response Models

Standardized response formats for API endpoints.
"""

from __future__ import annotations


from typing import Any, Dict, List, Optional, Generic, TypeVar
from pydantic import BaseModel, Field
from datetime import datetime

DataT = TypeVar("DataT")


class SuccessResponse(BaseModel, Generic[DataT]):
    """
    Standard success response format.

    Generic type allows specifying response data type.
    """

    success: bool = Field(True, description="Operation success status")
    message: Optional[str] = Field(None, description="Optional success message")
    data: Optional[DataT] = Field(None, description="Response data")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Response timestamp"
    )

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class ErrorDetail(BaseModel):
    """Error detail information."""

    field: Optional[str] = Field(None, description="Field that caused the error")
    message: str = Field(..., description="Error message")
    code: Optional[str] = Field(None, description="Error code")


class ErrorResponse(BaseModel):
    """
    Standard error response format.

    Provides structured error information for debugging.
    """

    success: bool = Field(False, description="Operation success status")
    error: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(
        None, description="Additional error details"
    )
    errors: Optional[List[ErrorDetail]] = Field(None, description="Validation errors")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Error timestamp"
    )

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")


class PaginatedResponse(BaseModel, Generic[DataT]):
    """
    Paginated response format.

    Used for list endpoints with pagination.
    """

    success: bool = Field(True, description="Operation success status")
    data: List[DataT] = Field(..., description="List of items")
    pagination: PaginationMeta = Field(..., description="Pagination metadata")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Response timestamp"
    )

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class MessageResponse(BaseModel):
    """Simple message response."""

    success: bool = Field(True, description="Operation success status")
    message: str = Field(..., description="Response message")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Response timestamp"
    )

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class StatusResponse(BaseModel):
    """Status check response."""

    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Response timestamp"
    )

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


# =============================================================================
# Response Helper Functions
# =============================================================================


def success_response(
    data: Optional[Any] = None,
    message: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create success response dictionary.

    Args:
        data: Response data
        message: Optional success message

    Returns:
        Success response dictionary
    """
    response = SuccessResponse(
        success=True,
        message=message,
        data=data,
    )
    return response.dict(exclude_none=True)


def error_response(
    error: str,
    details: Optional[Dict[str, Any]] = None,
    errors: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Create error response dictionary.

    Args:
        error: Error message
        details: Additional error details
        errors: Validation errors

    Returns:
        Error response dictionary
    """
    error_details = None
    if errors:
        error_details = [ErrorDetail(**e) for e in errors]

    response = ErrorResponse(
        success=False,
        error=error,
        details=details,
        errors=error_details,
    )
    return response.dict(exclude_none=True)


def paginated_response(
    items: List[Any],
    total: int,
    page: int,
    per_page: int,
) -> Dict[str, Any]:
    """
    Create paginated response dictionary.

    Args:
        items: List of items for current page
        total: Total number of items
        page: Current page number
        per_page: Items per page

    Returns:
        Paginated response dictionary
    """
    total_pages = (total + per_page - 1) // per_page  # Ceiling division

    pagination = PaginationMeta(
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )

    response = PaginatedResponse(
        success=True,
        data=items,
        pagination=pagination,
    )
    return response.dict()


def message_response(message: str) -> Dict[str, Any]:
    """
    Create simple message response.

    Args:
        message: Response message

    Returns:
        Message response dictionary
    """
    response = MessageResponse(
        success=True,
        message=message,
    )
    return response.dict()


# =============================================================================
# Request Models
# =============================================================================


class PaginationParams(BaseModel):
    """Common pagination parameters."""

    page: int = Field(1, ge=1, description="Page number")
    per_page: int = Field(20, ge=1, le=100, description="Items per page")

    def get_skip(self) -> int:
        """Calculate skip value for database query."""
        return (self.page - 1) * self.per_page

    def get_limit(self) -> int:
        """Get limit value for database query."""
        return self.per_page


class SortParams(BaseModel):
    """Common sorting parameters."""

    sort_by: str = Field("created_at", description="Field to sort by")
    sort_order: int = Field(
        -1, description="Sort order (1 for ascending, -1 for descending)"
    )


class FilterParams(BaseModel):
    """Common filtering parameters."""

    search: Optional[str] = Field(None, description="Search query")
    status: Optional[str] = Field(None, description="Status filter")
    start_date: Optional[datetime] = Field(None, description="Start date filter")
    end_date: Optional[datetime] = Field(None, description="End date filter")


# =============================================================================
# WebSocket Message Models
# =============================================================================


class WebSocketMessage(BaseModel):
    """WebSocket message format."""

    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(..., description="Message data")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Message timestamp"
    )

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }


class WebSocketError(BaseModel):
    """WebSocket error message format."""

    type: str = Field("error", description="Message type")
    error: str = Field(..., description="Error message")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Error timestamp"
    )

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }

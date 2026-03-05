"""
Dashboard Response Models

Pydantic models for dashboard statistics and analytics endpoints.
"""

from __future__ import annotations

from typing import List, Optional, Literal, Dict, Any
import datetime
from pydantic import BaseModel, Field


class DashboardStats(BaseModel):
    """
    Dashboard statistics model.

    Contains key metrics for the user's document processing activity.
    """

    total_projects: int = Field(default=0, description="Total number of projects")
    total_documents: int = Field(default=0, description="Total number of documents")
    processed_documents: int = Field(
        default=0, description="Number of successfully processed documents"
    )
    pending_documents: int = Field(
        default=0, description="Number of documents pending processing"
    )
    processing_documents: int = Field(
        default=0, description="Number of documents currently being processed"
    )
    failed_documents: int = Field(
        default=0, description="Number of failed document processing attempts"
    )
    success_rate: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Processing success rate (0.0 - 1.0)"
    )
    total_tokens_used: int = Field(default=0, description="Total AI tokens used")
    estimated_cost: float = Field(
        default=0.0, ge=0.0, description="Estimated AI processing cost in USD"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "total_projects": 5,
                "total_documents": 150,
                "processed_documents": 140,
                "pending_documents": 5,
                "processing_documents": 2,
                "failed_documents": 3,
                "success_rate": 0.93,
                "total_tokens_used": 1500000,
                "estimated_cost": 15.00,
            }
        }


class TrendDataPoint(BaseModel):
    """
    Single data point in a trend chart.

    Represents document activity for a specific date.
    """

    date: datetime.date = Field(..., description="Date of the data point")
    uploaded: int = Field(default=0, ge=0, description="Number of documents uploaded")
    processed: int = Field(default=0, ge=0, description="Number of documents processed")
    failed: int = Field(
        default=0, ge=0, description="Number of failed processing attempts"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "date": "2026-01-20",
                "uploaded": 10,
                "processed": 8,
                "failed": 1,
            }
        }


class TrendData(BaseModel):
    """
    Trend data response model.

    Contains historical document processing trends.
    """

    days: int = Field(..., ge=7, le=90, description="Number of days in the trend data")
    data: List[TrendDataPoint] = Field(
        default_factory=list, description="List of trend data points"
    )
    total_uploaded: int = Field(
        default=0, description="Total documents uploaded in the period"
    )
    total_processed: int = Field(
        default=0, description="Total documents processed in the period"
    )
    total_failed: int = Field(
        default=0, description="Total failed documents in the period"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "days": 30,
                "data": [
                    {"date": "2026-01-01", "uploaded": 5, "processed": 4, "failed": 0},
                    {"date": "2026-01-02", "uploaded": 8, "processed": 7, "failed": 1},
                ],
                "total_uploaded": 150,
                "total_processed": 140,
                "total_failed": 5,
            }
        }


class ProjectDistribution(BaseModel):
    """
    Document distribution by project.

    Shows how documents are distributed across projects.
    """

    project_id: str = Field(..., description="Project unique identifier")
    project_name: str = Field(..., description="Project display name")
    document_count: int = Field(
        default=0, ge=0, description="Number of documents in the project"
    )
    percentage: float = Field(
        default=0.0, ge=0.0, le=100.0, description="Percentage of total documents"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "550e8400-e29b-41d4-a716-446655440000",
                "project_name": "Invoice Processing",
                "document_count": 50,
                "percentage": 33.33,
            }
        }


class RecentDocument(BaseModel):
    """
    Recent document summary for dashboard.

    Lightweight document info for recent activity display.
    """

    document_id: str = Field(..., description="Document unique identifier")
    filename: str = Field(..., description="Original filename")
    status: str = Field(..., description="Processing status")
    project_id: Optional[str] = Field(None, description="Associated project ID")
    project_name: Optional[str] = Field(None, description="Associated project name")
    created_at: datetime.datetime = Field(..., description="Upload timestamp")
    processed_at: Optional[datetime.datetime] = Field(
        None, description="Processing completion timestamp"
    )

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }
        json_schema_extra = {
            "example": {
                "document_id": "550e8400-e29b-41d4-a716-446655440001",
                "filename": "invoice_2026_01.pdf",
                "status": "completed",
                "project_id": "550e8400-e29b-41d4-a716-446655440000",
                "project_name": "Invoice Processing",
                "created_at": "2026-01-20T10:30:00Z",
                "processed_at": "2026-01-20T10:31:30Z",
            }
        }


class DashboardResponse(BaseModel):
    """
    Complete dashboard data response.

    Combines stats, trends, and recent activity.
    """

    stats: DashboardStats = Field(..., description="Dashboard statistics")
    recent_documents: List[RecentDocument] = Field(
        default_factory=list, description="Recent document activity"
    )
    project_distribution: List[ProjectDistribution] = Field(
        default_factory=list, description="Document distribution by project"
    )

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }


class StatsResponse(BaseModel):
    """Response wrapper for dashboard stats."""

    success: bool = Field(True, description="Operation success status")
    data: DashboardStats = Field(..., description="Dashboard statistics")
    cached: bool = Field(False, description="Whether data was served from cache")
    cache_ttl: Optional[int] = Field(None, description="Cache TTL in seconds")

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }


class TrendsResponse(BaseModel):
    """Response wrapper for trends data."""

    success: bool = Field(True, description="Operation success status")
    data: TrendData = Field(..., description="Trend data")
    cached: bool = Field(False, description="Whether data was served from cache")

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }


class RecentDocumentsResponse(BaseModel):
    """Response wrapper for recent documents."""

    success: bool = Field(True, description="Operation success status")
    data: List[RecentDocument] = Field(..., description="Recent documents")

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }


class DistributionResponse(BaseModel):
    """Response wrapper for project distribution."""

    success: bool = Field(True, description="Operation success status")
    data: List[ProjectDistribution] = Field(..., description="Distribution data")

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }


# =============================================================================
# Unified Dashboard Models (Week 6 Optimization)
# =============================================================================


class TrendComparison(BaseModel):
    """
    Week-over-week trend comparison for documents and conversations.

    Shows activity changes between current and previous week.
    """

    documents_this_week: int = Field(
        default=0, ge=0, description="Documents uploaded this week"
    )
    documents_last_week: int = Field(
        default=0, ge=0, description="Documents uploaded last week"
    )
    documents_change_percent: float = Field(
        default=0.0, description="Percentage change in documents (can be negative)"
    )
    conversations_this_week: int = Field(
        default=0, ge=0, description="Conversations started this week"
    )
    conversations_last_week: int = Field(
        default=0, ge=0, description="Conversations started last week"
    )
    conversations_change_percent: float = Field(
        default=0.0, description="Percentage change in conversations (can be negative)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "documents_this_week": 25,
                "documents_last_week": 20,
                "documents_change_percent": 25.0,
                "conversations_this_week": 15,
                "conversations_last_week": 12,
                "conversations_change_percent": 25.0,
            }
        }


class UnifiedStats(DashboardStats):
    """
    Unified dashboard statistics with KB, Assistant, and trend data.

    Extends DashboardStats with knowledge base and assistant metrics
    plus week-over-week trend comparison.
    """

    # Knowledge Base stats
    total_knowledge_bases: int = Field(
        default=0, ge=0, description="Total number of knowledge bases"
    )
    total_data_sources: int = Field(
        default=0, ge=0, description="Total number of data sources across all KBs"
    )
    total_embeddings: int = Field(
        default=0, ge=0, description="Total number of document embeddings"
    )

    # Assistant stats
    total_assistants: int = Field(
        default=0, ge=0, description="Total number of AI assistants"
    )
    active_assistants: int = Field(
        default=0, ge=0, description="Number of active AI assistants"
    )
    total_conversations: int = Field(
        default=0,
        ge=0,
        description="Total number of conversations across all assistants",
    )
    unresolved_conversations: int = Field(
        default=0, ge=0, description="Number of unresolved conversations"
    )

    # Trend comparison
    trend_comparison: Optional[TrendComparison] = Field(
        None, description="Week-over-week trend comparison"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "total_projects": 5,
                "total_documents": 150,
                "processed_documents": 140,
                "pending_documents": 5,
                "processing_documents": 2,
                "failed_documents": 3,
                "success_rate": 0.93,
                "total_tokens_used": 1500000,
                "estimated_cost": 15.00,
                "total_knowledge_bases": 3,
                "total_data_sources": 8,
                "total_embeddings": 2500,
                "total_assistants": 2,
                "active_assistants": 2,
                "total_conversations": 45,
                "unresolved_conversations": 5,
                "trend_comparison": {
                    "documents_this_week": 25,
                    "documents_last_week": 20,
                    "documents_change_percent": 25.0,
                    "conversations_this_week": 15,
                    "conversations_last_week": 12,
                    "conversations_change_percent": 25.0,
                },
            }
        }


class RecentActivity(BaseModel):
    """
    Unified activity item for dashboard.

    Represents either a document upload or conversation activity.
    """

    activity_id: str = Field(..., description="Unique activity identifier")
    activity_type: Literal["document", "conversation"] = Field(
        ..., description="Type of activity"
    )
    title: str = Field(
        ..., description="Activity title (filename or conversation summary)"
    )
    subtitle: Optional[str] = Field(
        None, description="Additional context (project name, assistant name)"
    )
    status: str = Field(..., description="Activity status")
    timestamp: datetime.datetime = Field(..., description="Activity timestamp")
    metadata: Dict[str, Any] = Field(
        default_factory=dict, description="Additional activity-specific metadata"
    )

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }
        json_schema_extra = {
            "example": {
                "activity_id": "550e8400-e29b-41d4-a716-446655440001",
                "activity_type": "document",
                "title": "invoice_2026_01.pdf",
                "subtitle": "Invoice Processing",
                "status": "completed",
                "timestamp": "2026-01-20T10:30:00Z",
                "metadata": {
                    "project_id": "550e8400-e29b-41d4-a716-446655440000",
                    "file_size": 1024000,
                },
            }
        }


class UnifiedStatsResponse(BaseModel):
    """Response wrapper for unified dashboard stats."""

    success: bool = Field(True, description="Operation success status")
    data: UnifiedStats = Field(..., description="Unified dashboard statistics")
    cached: bool = Field(False, description="Whether data was served from cache")
    cache_ttl: Optional[int] = Field(None, description="Cache TTL in seconds")

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }


class RecentActivityResponse(BaseModel):
    """Response wrapper for recent activity."""

    success: bool = Field(True, description="Operation success status")
    data: List[RecentActivity] = Field(..., description="Recent activity items")

    class Config:
        json_encoders = {
            datetime.datetime: lambda v: v.isoformat(),
        }

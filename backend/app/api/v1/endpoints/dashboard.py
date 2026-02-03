"""
Dashboard API Endpoints

Provides dashboard statistics and analytics endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Response

from app.api.v1.deps import get_current_verified_user
from app.db.models.user import User
from app.db.database import get_db
from app.db.redis import get_redis, RedisClient, CacheTTL
from app.services.analytics.dashboard_service import DashboardService
from app.models.dashboard import (
    StatsResponse,
    TrendsResponse,
    RecentDocumentsResponse,
    DistributionResponse,
    DashboardStats,
    TrendData,
    RecentDocument,
    ProjectDistribution,
    UnifiedStatsResponse,
    RecentActivityResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# =============================================================================
# Dependencies
# =============================================================================

async def get_dashboard_service(
    db: AsyncSession = Depends(get_db),
) -> DashboardService:
    """Get dashboard service with optional Redis."""
    try:
        redis_client = await get_redis()
    except Exception:
        redis_client = None

    return DashboardService(db, redis_client)


# =============================================================================
# Dashboard Endpoints
# =============================================================================

@router.get("/stats", response_model=StatsResponse)
async def get_dashboard_stats(
    response: Response,
    current_user: User = Depends(get_current_verified_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    no_cache: bool = Query(False, description="Bypass cache"),
):
    """
    Get dashboard statistics for the current user.

    Returns aggregated statistics including:
    - Total projects and documents
    - Processing status breakdown
    - Success rate
    - Token usage and estimated cost

    Uses Redis caching with 5-minute TTL for performance.
    """
    stats, is_cached = await dashboard_service.get_dashboard_stats(
        user_id=str(current_user.id),
        use_cache=not no_cache,
    )

    # Set cache control headers
    if is_cached:
        response.headers["X-Cache"] = "HIT"
    else:
        response.headers["X-Cache"] = "MISS"

    response.headers["Cache-Control"] = f"max-age={CacheTTL.DASHBOARD_STATS}"

    return StatsResponse(
        success=True,
        data=stats,
        cached=is_cached,
        cache_ttl=CacheTTL.DASHBOARD_STATS,
    )


@router.get("/trends", response_model=TrendsResponse)
async def get_dashboard_trends(
    response: Response,
    days: int = Query(30, ge=7, le=90, description="Number of days to include"),
    current_user: User = Depends(get_current_verified_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    no_cache: bool = Query(False, description="Bypass cache"),
):
    """
    Get document processing trends for the last N days.

    Returns daily upload, processing, and failure counts.

    Parameters:
    - **days**: Number of days to include (7-90, default 30)
    """
    trends, is_cached = await dashboard_service.get_trends(
        user_id=str(current_user.id),
        days=days,
        use_cache=not no_cache,
    )

    # Set cache control headers
    if is_cached:
        response.headers["X-Cache"] = "HIT"
    else:
        response.headers["X-Cache"] = "MISS"

    response.headers["Cache-Control"] = f"max-age={CacheTTL.DASHBOARD_TRENDS}"

    return TrendsResponse(
        success=True,
        data=trends,
        cached=is_cached,
    )


@router.get("/recent", response_model=RecentDocumentsResponse)
async def get_recent_documents(
    limit: int = Query(5, ge=1, le=20, description="Maximum documents to return"),
    current_user: User = Depends(get_current_verified_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    """
    Get recent documents for dashboard quick access.

    Returns the most recently uploaded documents with their
    processing status and project association.

    Parameters:
    - **limit**: Maximum number of documents (1-20, default 5)
    """
    documents = await dashboard_service.get_recent_documents(
        user_id=str(current_user.id),
        limit=limit,
    )

    return RecentDocumentsResponse(
        success=True,
        data=documents,
    )


@router.get("/distribution", response_model=DistributionResponse)
async def get_project_distribution(
    current_user: User = Depends(get_current_verified_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    """
    Get document distribution across projects.

    Returns how documents are distributed among the user's
    projects, useful for pie charts and allocation views.
    """
    distribution = await dashboard_service.get_project_distribution(
        user_id=str(current_user.id),
    )

    return DistributionResponse(
        success=True,
        data=distribution,
    )


@router.post("/invalidate-cache")
async def invalidate_dashboard_cache(
    current_user: User = Depends(get_current_verified_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    """
    Manually invalidate dashboard cache for the current user.

    Useful when you want to force a refresh of dashboard data.
    """
    await dashboard_service.invalidate_user_cache(str(current_user.id))

    return {
        "success": True,
        "message": "Dashboard cache invalidated",
    }


# =============================================================================
# Unified Dashboard Endpoints (Week 6 Optimization)
# =============================================================================


@router.get("/unified-stats", response_model=UnifiedStatsResponse)
async def get_unified_stats(
    response: Response,
    current_user: User = Depends(get_current_verified_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    no_cache: bool = Query(False, description="Bypass cache"),
):
    """
    Get unified dashboard statistics for the current user.

    Returns aggregated statistics including:
    - Total projects and documents (base stats)
    - Processing status breakdown
    - Success rate, token usage, estimated cost
    - Knowledge base statistics (KBs, data sources, embeddings)
    - Assistant statistics (assistants, conversations, unresolved)
    - Week-over-week trend comparison

    This is a comprehensive endpoint designed to reduce multiple
    API calls on dashboard load.

    Uses Redis caching with 5-minute TTL for performance.
    """
    stats, is_cached = await dashboard_service.get_unified_stats(
        user_id=str(current_user.id),
        use_cache=not no_cache,
    )

    # Set cache control headers
    if is_cached:
        response.headers["X-Cache"] = "HIT"
    else:
        response.headers["X-Cache"] = "MISS"

    response.headers["Cache-Control"] = f"max-age={CacheTTL.DASHBOARD_STATS}"

    return UnifiedStatsResponse(
        success=True,
        data=stats,
        cached=is_cached,
        cache_ttl=CacheTTL.DASHBOARD_STATS,
    )


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    limit: int = Query(5, ge=1, le=20, description="Maximum items to return"),
    current_user: User = Depends(get_current_verified_user),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    """
    Get recent activity feed for dashboard.

    Returns a combined feed of:
    - Recent document uploads with processing status
    - Recent assistant conversations with status

    Items are sorted by timestamp (most recent first) and
    provide a unified view of user activity across the platform.

    Parameters:
    - **limit**: Maximum number of items (1-20, default 5)
    """
    activities = await dashboard_service.get_recent_activity(
        user_id=str(current_user.id),
        limit=limit,
    )

    return RecentActivityResponse(
        success=True,
        data=activities,
    )

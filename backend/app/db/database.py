"""
PostgreSQL Database Module with SQLAlchemy 2.0 Async Support

This module provides:
- Async database engine configuration
- Session management with async_sessionmaker
- Database lifecycle management (init, close, health check)
- Dependency injection for FastAPI routes
"""

from typing import AsyncGenerator
from contextlib import asynccontextmanager
import logging

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# =============================================================================
# SQLAlchemy Base Model
# =============================================================================


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.

    All models should inherit from this class to be included
    in Alembic migrations and database operations.
    """

    pass


# =============================================================================
# Database Engine and Session Factory
# =============================================================================

# Global engine instance (initialized on startup)
_engine: AsyncEngine | None = None

# Global session factory (initialized on startup)
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """
    Get the database engine instance.

    Returns:
        AsyncEngine: The SQLAlchemy async engine

    Raises:
        RuntimeError: If engine is not initialized
    """
    if _engine is None:
        raise RuntimeError("Database engine not initialized. Call init_db() first.")
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """
    Get the session factory instance.

    Returns:
        async_sessionmaker: The async session factory

    Raises:
        RuntimeError: If session factory is not initialized
    """
    if _async_session_factory is None:
        raise RuntimeError("Session factory not initialized. Call init_db() first.")
    return _async_session_factory


# =============================================================================
# Database Initialization and Shutdown
# =============================================================================


async def init_db() -> None:
    """
    Initialize the database engine and session factory.

    This should be called during application startup.
    Creates the async engine with connection pooling and
    initializes the session factory.
    """
    global _engine, _async_session_factory

    logger.info("Initializing PostgreSQL database connection...")

    # Build connection arguments
    connect_args = {}

    # Add SSL configuration for production
    if settings.POSTGRES_SSL:
        connect_args["ssl"] = True
        logger.info("PostgreSQL SSL enabled")

    # Create async engine with connection pooling
    _engine = create_async_engine(
        settings.database_url,
        echo=settings.DEBUG,  # Log SQL queries in debug mode
        pool_size=settings.POSTGRES_POOL_SIZE,
        max_overflow=settings.POSTGRES_MAX_OVERFLOW,
        pool_pre_ping=True,  # Verify connections before use
        pool_recycle=3600,  # Recycle connections after 1 hour
        connect_args=connect_args,
    )

    # Create async session factory
    _async_session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,  # Don't expire objects after commit
        autocommit=False,
        autoflush=False,
    )

    logger.info(
        f"Database initialized with pool_size={settings.POSTGRES_POOL_SIZE}, "
        f"max_overflow={settings.POSTGRES_MAX_OVERFLOW}"
    )


async def close_db() -> None:
    """
    Close the database connection and clean up resources.

    This should be called during application shutdown.
    Disposes of the engine and cleans up connection pool.
    """
    global _engine, _async_session_factory

    if _engine is not None:
        logger.info("Closing PostgreSQL database connection...")
        await _engine.dispose()
        _engine = None
        _async_session_factory = None
        logger.info("Database connection closed")


async def check_db_health() -> dict:
    """
    Check database connectivity and health.

    Returns:
        dict: Health check result with status and details

    Example:
        {
            "status": "healthy",
            "database": "postgresql",
            "connection": "ok",
            "pool_size": 10
        }
    """
    try:
        engine = get_engine()

        async with engine.connect() as conn:
            # Simple query to verify connection
            result = await conn.execute(text("SELECT 1"))
            result.scalar()

        return {
            "status": "healthy",
            "database": "postgresql",
            "connection": "ok",
            "pool_size": settings.POSTGRES_POOL_SIZE,
        }

    except RuntimeError as e:
        return {
            "status": "unhealthy",
            "database": "postgresql",
            "connection": "not_initialized",
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "postgresql",
            "connection": "failed",
            "error": str(e),
        }


# =============================================================================
# Dependency Injection for FastAPI
# =============================================================================


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.

    Yields an async session and ensures proper cleanup after use.
    Use this in route dependencies for database operations.

    Usage:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            ...

    Yields:
        AsyncSession: Database session for the request
    """
    session_factory = get_session_factory()

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database sessions outside of FastAPI routes.

    Use this for background tasks, scripts, or CLI operations
    that need database access outside the request lifecycle.

    Usage:
        async with get_db_session() as session:
            result = await session.execute(query)
            ...

    Yields:
        AsyncSession: Database session
    """
    session_factory = get_session_factory()

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# =============================================================================
# Utility Functions
# =============================================================================


async def create_all_tables() -> None:
    """
    Create all tables defined in SQLAlchemy models.

    Note: In production, use Alembic migrations instead.
    This is provided for development and testing purposes.
    """
    engine = get_engine()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("All database tables created")


async def drop_all_tables() -> None:
    """
    Drop all tables defined in SQLAlchemy models.

    WARNING: This is destructive and should only be used
    in development or testing environments.
    """
    if settings.is_production:
        raise RuntimeError("Cannot drop tables in production environment")

    engine = get_engine()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    logger.warning("All database tables dropped")

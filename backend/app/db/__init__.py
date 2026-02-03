"""
Database Package

Provides PostgreSQL database access with SQLAlchemy 2.0 async support.
"""

from .database import (
    Base,
    init_db,
    close_db,
    check_db_health,
    get_db,
    get_db_session,
    get_engine,
    get_session_factory,
    create_all_tables,
    drop_all_tables,
)

__all__ = [
    # Base model class
    "Base",
    # Lifecycle management
    "init_db",
    "close_db",
    "check_db_health",
    # Dependency injection
    "get_db",
    "get_db_session",
    # Low-level access
    "get_engine",
    "get_session_factory",
    # Development utilities
    "create_all_tables",
    "drop_all_tables",
]

"""
API Dependencies

Dependency injection configuration for FastAPI endpoints.
Provides repository, service, and authentication dependencies.
"""

import logging
from typing import Optional, AsyncGenerator, Tuple
from fastapi import Depends, HTTPException, status, Header, Query, WebSocket, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import verify_token_with_blacklist

logger = logging.getLogger(__name__)

# Repositories
from app.db.repositories.document import DocumentRepository
from app.db.repositories.user import UserRepository, ApiKeyRepository
from app.db.repositories.project import ProjectRepository

# Services
from app.services.auth.authentication import AuthenticationService
from app.services.auth.api_key import ApiKeyService
from app.services.document.upload import DocumentUploadService
from app.services.document.processing import DocumentProcessingService
from app.services.document.export import DocumentExportService
from app.services.ocr.orchestrator import OCROrchestrator
from app.services.storage.factory import get_storage_service
from app.services.notification.websocket import (
    WebSocketManager,
    WebSocketNotificationService,
)
from app.services.notification.redis_events import (
    RedisEventService,
    RedisNotificationService,
)
from app.services.edit_history.edit_history_service import EditHistoryService
from app.services.insights import DatasetService, QueryService

# SQLAlchemy Models
from app.db.models.user import User
from app.db.models.api_key import ApiKey
from app.db.models.document import Document
from app.db.models.project import Project

from app.core.config import get_settings

settings = get_settings()

# Security
# Set auto_error=False to allow fallback to API key authentication
# when no Bearer token is provided
security = HTTPBearer(auto_error=False)


# =============================================================================
# Database Dependencies
# =============================================================================


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get async database session.

    Yields:
        SQLAlchemy async session
    """
    async for session in get_db():
        yield session


# =============================================================================
# Repository Dependencies
# =============================================================================


async def get_document_repository(
    session: AsyncSession = Depends(get_db_session),
) -> DocumentRepository:
    """Get document repository instance."""
    return DocumentRepository(session)


async def get_user_repository(
    session: AsyncSession = Depends(get_db_session),
) -> UserRepository:
    """Get user repository instance."""
    return UserRepository(session)


async def get_api_key_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ApiKeyRepository:
    """Get API key repository instance."""
    return ApiKeyRepository(session)


async def get_project_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ProjectRepository:
    """Get project repository instance."""
    return ProjectRepository(session)


# =============================================================================
# Service Dependencies
# =============================================================================


async def get_auth_service(
    user_repository: UserRepository = Depends(get_user_repository),
) -> AuthenticationService:
    """Get authentication service instance."""
    return AuthenticationService(user_repository)


async def get_api_key_service(
    api_key_repository: ApiKeyRepository = Depends(get_api_key_repository),
) -> ApiKeyService:
    """Get API key service instance."""
    return ApiKeyService(api_key_repository)


async def get_document_upload_service(
    document_repository: DocumentRepository = Depends(get_document_repository),
    project_repository: ProjectRepository = Depends(get_project_repository),
) -> DocumentUploadService:
    """Get document upload service instance."""
    storage_service = get_storage_service()
    # Use UPLOAD_DIR from config (default: ./uploads)
    upload_directory = getattr(settings, "UPLOAD_DIR", "./uploads")
    return DocumentUploadService(
        document_repository,
        upload_directory,
        project_repository=project_repository,
    )


async def get_document_processing_service(
    document_repository: DocumentRepository = Depends(get_document_repository),
) -> DocumentProcessingService:
    """Get document processing service instance."""
    return DocumentProcessingService(document_repository)


async def get_document_export_service(
    document_repository: DocumentRepository = Depends(get_document_repository),
) -> DocumentExportService:
    """Get document export service instance."""
    return DocumentExportService(document_repository)


async def get_ocr_orchestrator() -> OCROrchestrator:
    """Get OCR orchestrator instance."""
    return OCROrchestrator()


async def get_edit_history_service(
    session: AsyncSession = Depends(get_db_session),
) -> EditHistoryService:
    """Get edit history service instance."""
    return EditHistoryService(session)


async def get_insights_dataset_service(
    session: AsyncSession = Depends(get_db_session),
) -> DatasetService:
    """Get insights dataset service instance."""
    return DatasetService(session)


async def get_insights_query_service(
    session: AsyncSession = Depends(get_db_session),
) -> QueryService:
    """Get insights query service instance."""
    return QueryService(session)


# =============================================================================
# Notification Dependencies
# =============================================================================

# Singleton WebSocket manager
websocket_manager = WebSocketManager()


def get_websocket_manager() -> WebSocketManager:
    """Get WebSocket manager singleton."""
    return websocket_manager


def get_websocket_notification_service(
    manager: WebSocketManager = Depends(get_websocket_manager),
) -> WebSocketNotificationService:
    """Get WebSocket notification service instance."""
    return WebSocketNotificationService(manager)


# Redis event service singleton
redis_event_service: Optional[RedisEventService] = None


async def get_redis_event_service() -> RedisEventService:
    """Get Redis event service singleton."""
    global redis_event_service

    if redis_event_service is None:
        redis_event_service = RedisEventService()
        await redis_event_service.connect()

    return redis_event_service


async def get_redis_notification_service(
    redis_service: RedisEventService = Depends(get_redis_event_service),
) -> RedisNotificationService:
    """Get Redis notification service instance."""
    return RedisNotificationService(redis_service)


# =============================================================================
# Authentication Dependencies
# =============================================================================


async def get_current_user_from_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    auth_service: AuthenticationService = Depends(get_auth_service),
) -> Optional[User]:
    """
    Get current user from JWT token.

    Args:
        credentials: HTTP Bearer credentials (optional with auto_error=False)
        auth_service: Authentication service

    Returns:
        Current user or None if no valid token provided

    Raises:
        HTTPException: If token is provided but invalid
    """
    # No Bearer token provided - return None to allow API key fallback
    if not credentials:
        return None

    try:
        token = credentials.credentials
        user = await auth_service.get_current_user(token)
        return user

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_token_from_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> str:
    """
    Extract JWT token from Authorization header.

    Args:
        credentials: HTTP Bearer credentials (optional with auto_error=False)

    Returns:
        JWT token string

    Raises:
        HTTPException: If credentials are missing
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return credentials.credentials


async def get_current_user_from_api_key(
    x_api_key: Optional[str] = Header(None),
    api_key_service: ApiKeyService = Depends(get_api_key_service),
    user_repository: UserRepository = Depends(get_user_repository),
) -> Optional[User]:
    """
    Get current user from API key.

    Args:
        x_api_key: API key from header
        api_key_service: API key service
        user_repository: User repository

    Returns:
        Current user or None if no API key provided

    Raises:
        HTTPException: If API key is provided but invalid
    """
    # No API key provided - return None to allow Bearer token fallback
    if not x_api_key:
        return None

    try:
        # Validate API key
        api_key_record = await api_key_service.validate_api_key(x_api_key)

        # Update last used timestamp
        await api_key_service.update_last_used(str(api_key_record.id))

        # Get user
        user = await user_repository.get_by_id(str(api_key_record.user_id))

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive",
            )

        return user

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "ApiKey"},
        )


async def get_current_user(
    token_user: Optional[User] = Depends(get_current_user_from_token),
    api_key_user: Optional[User] = Depends(get_current_user_from_api_key),
) -> User:
    """
    Get current user from either JWT token or API key.

    Tries JWT token first, then falls back to API key.

    Args:
        token_user: User from JWT token
        api_key_user: User from API key

    Returns:
        Current user

    Raises:
        HTTPException: If authentication fails
    """
    # Prefer token authentication
    if token_user:
        return token_user

    # Fall back to API key
    if api_key_user:
        return api_key_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current active user.

    Args:
        current_user: Current user

    Returns:
        Active user

    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current verified user.

    Args:
        current_user: Current user

    Returns:
        Verified user

    Raises:
        HTTPException: If user is not verified
    """
    # Skip email verification in development environment
    if settings.ENVIRONMENT == "development":
        return current_user

    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required",
        )

    return current_user


async def get_current_superuser(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get current superuser.

    Args:
        current_user: Current user

    Returns:
        Superuser

    Raises:
        HTTPException: If user is not a superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required",
        )

    return current_user


# =============================================================================
# WebSocket Authentication Dependencies
# =============================================================================


async def authenticate_websocket(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
) -> Tuple[str, User]:
    """
    Authenticate WebSocket connection using JWT token from query parameter.

    WebSocket connections cannot use standard HTTP headers for auth,
    so token must be passed as query parameter.

    Args:
        websocket: WebSocket connection object
        token: JWT token from query parameter

    Returns:
        Tuple of (user_id, User) for authenticated connection

    Raises:
        WebSocketException: If authentication fails (closes connection with 4001)

    Usage:
        @app.websocket("/ws")
        async def websocket_endpoint(
            websocket: WebSocket,
            auth_result: Tuple[str, User] = Depends(authenticate_websocket),
        ):
            user_id, user = auth_result
            # ... handle connection
    """
    from fastapi import WebSocketException
    from app.db.database import get_session_factory

    logger.info("🔐 [WS AUTH] authenticate_websocket() dependency called")
    logger.info(f"🔐 [WS AUTH] WebSocket state: {websocket.client_state}")
    logger.info(f"🔐 [WS AUTH] Token present: {token is not None}")

    if not token:
        logger.warning("❌ [WS AUTH] No token provided - CALLING websocket.close()")
        await websocket.close(code=4001, reason="Missing authentication token")
        logger.warning("❌ [WS AUTH] websocket.close() completed - raising exception")
        raise WebSocketException(code=4001, reason="Missing authentication token")

    try:
        logger.info("🔐 [WS AUTH] Verifying token with blacklist check...")
        # Verify token with blacklist check
        payload = await verify_token_with_blacklist(token)
        logger.info("✅ [WS AUTH] Token verification successful")

        user_id = payload.get("sub")
        if not user_id:
            logger.warning(
                "❌ [WS AUTH] Invalid token: missing subject - CALLING websocket.close()"
            )
            await websocket.close(code=4001, reason="Invalid token: missing subject")
            logger.warning(
                "❌ [WS AUTH] websocket.close() completed - raising exception"
            )
            raise WebSocketException(code=4001, reason="Invalid token")

        logger.info(f"🔐 [WS AUTH] Token subject (user_id): {user_id}")

        # Get user from database using a new session
        logger.info("🔐 [WS AUTH] Fetching user from database...")
        async with get_session_factory()() as session:
            user_repository = UserRepository(session)
            user = await user_repository.get_by_id(user_id)

            if not user:
                logger.warning(
                    f"❌ [WS AUTH] User not found: {user_id} - CALLING websocket.close()"
                )
                await websocket.close(code=4001, reason="User not found")
                logger.warning(
                    "❌ [WS AUTH] websocket.close() completed - raising exception"
                )
                raise WebSocketException(code=4001, reason="User not found")

            if not user.is_active:
                logger.warning(
                    f"❌ [WS AUTH] User account inactive: {user.email} - CALLING websocket.close()"
                )
                await websocket.close(code=4003, reason="User account is inactive")
                logger.warning(
                    "❌ [WS AUTH] websocket.close() completed - raising exception"
                )
                raise WebSocketException(code=4003, reason="User account is inactive")

            logger.info(
                f"✅ [WS AUTH] Authentication successful for user: {user.email}"
            )
            logger.info("✅ [WS AUTH] Returning (user_id, user) tuple to endpoint")
            return (user_id, user)

    except AuthenticationError as e:
        logger.error(
            f"❌ [WS AUTH] AuthenticationError: {e.message} - CALLING websocket.close()"
        )
        await websocket.close(code=4001, reason=str(e.message))
        logger.error("❌ [WS AUTH] websocket.close() completed - raising exception")
        raise WebSocketException(code=4001, reason="Authentication failed")
    except Exception as e:
        logger.error(f"❌ [WS AUTH] Unexpected error: {e} - CALLING websocket.close()")
        await websocket.close(code=4001, reason="Authentication error")
        logger.error("❌ [WS AUTH] websocket.close() completed - raising exception")
        raise WebSocketException(code=4001, reason="Authentication error")


async def get_websocket_user_id(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
) -> str:
    """
    Get user ID from WebSocket authentication.

    Simplified version that only returns user_id for basic WebSocket operations.

    Args:
        websocket: WebSocket connection object
        token: JWT token from query parameter

    Returns:
        User ID string

    Raises:
        WebSocketException: If authentication fails
    """
    user_id, _ = await authenticate_websocket(websocket, token)
    return user_id


# =============================================================================
# Permission Dependencies
# =============================================================================


def require_permission(permission: str):
    """
    Create dependency for requiring specific permission.

    Args:
        permission: Required permission name

    Returns:
        Dependency function

    Usage:
        @router.get("/admin", dependencies=[Depends(require_permission("admin"))])
    """

    async def check_permission(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if not current_user.is_superuser:
            user_permissions = (
                current_user.preferences.get("permissions", [])
                if current_user.preferences
                else []
            )
            if permission not in user_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required",
                )
        return current_user

    return check_permission


# =============================================================================
# Resource Ownership Dependencies
# =============================================================================


async def verify_document_ownership(
    document_id: str,
    current_user: User = Depends(get_current_active_user),
    document_repository: DocumentRepository = Depends(get_document_repository),
) -> bool:
    """
    Verify user owns the document.

    Args:
        document_id: Document ID
        current_user: Current user
        document_repository: Document repository

    Returns:
        True if user owns document

    Raises:
        HTTPException: If user doesn't own document
    """
    document = await document_repository.get_by_id(document_id)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Debug logging
    logger.debug(
        f"Verifying document ownership: document_id={document_id}, document.user_id={document.user_id}, current_user.id={current_user.id}"
    )

    if str(document.user_id) != str(current_user.id) and not current_user.is_superuser:
        logger.error(
            f"Authorization failed: document.user_id={document.user_id} != current_user.id={current_user.id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this document",
        )

    return True


async def verify_project_ownership(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
) -> bool:
    """
    Verify user owns the project.

    Args:
        project_id: Project ID
        current_user: Current user
        project_repository: Project repository

    Returns:
        True if user owns project

    Raises:
        HTTPException: If user doesn't own project
    """
    project = await project_repository.get_by_id(project_id)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if str(project.user_id) != str(current_user.id) and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this project",
        )

    return True

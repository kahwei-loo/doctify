"""
Doctify Backend Application Entry Point

FastAPI application with comprehensive middleware and configuration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import get_settings
from app.middleware import SecurityHeadersMiddleware, RateLimitMiddleware, get_security_middleware_config
from app.api.v1.endpoints import auth, documents, projects, dashboard, settings, templates, edit_history, insights, rag, chat, websockets, knowledge_bases, data_sources, embeddings, assistants, public_chat, ai_model_settings
from app.db.database import init_db, close_db
from app.db.redis import init_redis, close_redis
from app.core.exceptions import (
    AppException,
    AuthenticationError,
    AuthorizationError,
    ValidationError,
    NotFoundError,
    DatabaseError,
    FileProcessingError,
    ExternalServiceError,
    RateLimitError,
    ConflictError,
)

# Initialize configuration
config = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO if not config.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# Application Factory
# ============================================================================


def create_application() -> FastAPI:
    """
    Create and configure FastAPI application.

    Returns:
        FastAPI application instance
    """
    # Create FastAPI application
    app = FastAPI(
        title=config.project_name,
        description="AI-Powered Document Intelligence Platform",
        version="1.0.0",
        docs_url="/docs" if not config.is_production else None,
        redoc_url="/redoc" if not config.is_production else None,
        openapi_url="/openapi.json" if not config.is_production else None,
        # Disable automatic slash redirects to prevent losing Authorization headers
        redirect_slashes=False,
    )

    # ========================================================================
    # Middleware Configuration
    # ========================================================================

    # 1. Security Headers Middleware (FIRST - applies to all responses)
    security_config = get_security_middleware_config()
    app.add_middleware(SecurityHeadersMiddleware, **security_config)

    # 2. CORS Middleware
    # Security: Explicitly specify allowed headers instead of wildcard
    # This prevents potential header injection attacks
    allowed_headers = [
        "Authorization",          # JWT Bearer token
        "Content-Type",           # Request body type
        "Accept",                 # Response type negotiation
        "Accept-Language",        # Localization
        "X-API-Key",              # API key authentication
        "X-Request-ID",           # Request tracing
        "X-Requested-With",       # AJAX detection (CSRF protection)
        "Cache-Control",          # Caching directives
        "If-None-Match",          # ETag caching
        "If-Modified-Since",      # Conditional requests
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=config.cors_credentials,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=allowed_headers,
        expose_headers=[
            "X-Request-ID",
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset",
            "Content-Disposition",  # For file downloads
        ],
        max_age=3600,  # Cache preflight requests for 1 hour
    )

    # 3. Rate Limiting Middleware (Production-safe with Redis)
    # Note: Gracefully degrades if Redis unavailable (fails open for availability)
    if config.REDIS_URL:
        app.add_middleware(
            RateLimitMiddleware,
            redis_url=config.REDIS_URL,
            default_calls=100,
            default_period=60,
        )
        logger.info("Rate limiting middleware enabled")
    else:
        logger.warning("Rate limiting disabled: REDIS_URL not configured")

    # 4. GZip Compression (for responses > 1KB)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # ========================================================================
    # Event Handlers
    # ========================================================================

    @app.on_event("startup")
    async def startup_event():
        """Initialize application on startup."""
        logger.info(f"Starting {config.project_name} in {config.environment} mode")

        # Initialize database connections
        await init_db()
        logger.info("Database connection initialized")

        # Initialize Redis cache
        if config.REDIS_URL:
            try:
                await init_redis()
                logger.info("Redis connection initialized")
            except Exception as e:
                logger.warning(f"Redis initialization failed (non-critical): {e}")

        # Pre-load AI model settings from DB into gateway cache
        try:
            from app.db.database import get_session_factory
            from app.services.ai.gateway import load_settings_into_cache
            await load_settings_into_cache(get_session_factory())
        except Exception as e:
            logger.warning(f"AI model settings cache load skipped: {e}")

        logger.info("Application startup complete")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on application shutdown."""
        logger.info("Shutting down application...")

        # Close database connections
        await close_db()
        logger.info("Database connection closed")

        # Close Redis cache connections
        await close_redis()
        logger.info("Redis connection closed")

        logger.info("Application shutdown complete")

    # ========================================================================
    # Health Check Endpoints
    # ========================================================================

    @app.get("/health")
    async def health_check():
        """
        Health check endpoint for load balancers and monitoring.

        Returns:
            Health status and basic application info
        """
        return JSONResponse(
            status_code=200,
            content={
                "status": "healthy",
                "service": config.project_name,
                "version": "1.0.0",
                "environment": config.environment,
            }
        )

    @app.get("/")
    async def root():
        """
        Root endpoint.

        Returns:
            Basic API information
        """
        return JSONResponse(
            content={
                "message": "Doctify API",
                "version": "1.0.0",
                "docs": "/docs" if not config.is_production else "Documentation disabled in production",
            }
        )

    # ========================================================================
    # API Routes
    # ========================================================================

    # API v1 routers
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
    app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
    app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
    app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
    app.include_router(settings.router, prefix="/api/v1/settings", tags=["Settings"])
    app.include_router(templates.router, prefix="/api/v1/templates", tags=["Templates"])
    app.include_router(edit_history.router, prefix="/api/v1/edit-history", tags=["Edit History"])
    app.include_router(insights.router, prefix="/api/v1/insights", tags=["Insights"])
    app.include_router(knowledge_bases.router, prefix="/api/v1", tags=["Knowledge Bases"])  # Phase 1: Knowledge Base endpoints
    app.include_router(data_sources.router, prefix="/api/v1", tags=["Data Sources"])  # Phase 1: Data Source endpoints
    app.include_router(embeddings.router, prefix="/api/v1", tags=["Embeddings"])  # Phase 1: Embedding endpoints
    app.include_router(rag.router, prefix="/api/v1", tags=["RAG"])  # Phase 11: RAG endpoints
    app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])  # Phase 13: Chat endpoints
    app.include_router(websockets.router, prefix="/api/v1", tags=["WebSockets"])  # Phase 11: Real-time WebSocket endpoints
    app.include_router(assistants.router, prefix="/api/v1/assistants", tags=["AI Assistants"])  # Week 5: AI Assistants endpoints
    app.include_router(public_chat.router, prefix="/api/v1", tags=["Public Chat"])  # Week 5: Public Chat Widget endpoints
    app.include_router(ai_model_settings.router, prefix="/api/v1/admin/ai-models", tags=["AI Model Settings"])

    # ========================================================================
    # Exception Handlers
    # ========================================================================

    # Security: Whitelist of safe detail keys that can be exposed to clients
    # Never expose internal implementation details, stack traces, or sensitive data
    SAFE_DETAIL_KEYS = {"field", "validation_errors", "retry_after", "limit_type"}

    def sanitize_error_details(details: dict, is_production: bool) -> dict:
        """
        Sanitize error details to prevent information leakage.

        Args:
            details: Original error details
            is_production: Whether running in production mode

        Returns:
            Sanitized details safe for client exposure
        """
        if not details:
            return {}

        if is_production:
            # Only return whitelisted keys in production
            return {k: v for k, v in details.items() if k in SAFE_DETAIL_KEYS}
        else:
            # In development, filter out potentially sensitive keys
            sensitive_keys = {"sql", "query", "password", "token", "secret", "key", "trace"}
            return {
                k: v for k, v in details.items()
                if not any(s in k.lower() for s in sensitive_keys)
            }

    @app.exception_handler(AppException)
    async def app_exception_handler(request, exc: AppException):
        """
        Handle all application-specific exceptions.

        Security: Sanitizes error details to prevent information leakage.
        """
        # Log the full error for debugging
        logger.warning(
            f"AppException: {exc.__class__.__name__} - {exc.message}",
            extra={"details": exc.details, "path": str(request.url)}
        )

        sanitized_details = sanitize_error_details(exc.details, config.is_production)

        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.__class__.__name__,
                "message": exc.message,
                **({"details": sanitized_details} if sanitized_details else {})
            }
        )

    @app.exception_handler(AuthenticationError)
    async def authentication_error_handler(request, exc: AuthenticationError):
        """Handle authentication errors with security-conscious messages."""
        logger.warning(
            f"Authentication failed: {exc.message}",
            extra={"path": str(request.url), "ip": request.client.host if request.client else "unknown"}
        )

        # Generic message in production to prevent enumeration attacks
        message = "Authentication failed" if config.is_production else exc.message

        return JSONResponse(
            status_code=401,
            content={"error": "AuthenticationError", "message": message},
            headers={"WWW-Authenticate": "Bearer"}
        )

    @app.exception_handler(AuthorizationError)
    async def authorization_error_handler(request, exc: AuthorizationError):
        """Handle authorization errors."""
        logger.warning(
            f"Authorization denied: {exc.message}",
            extra={"path": str(request.url)}
        )

        return JSONResponse(
            status_code=403,
            content={"error": "AuthorizationError", "message": "Access denied"}
        )

    @app.exception_handler(DatabaseError)
    async def database_error_handler(request, exc: DatabaseError):
        """
        Handle database errors without exposing internal details.

        Security: Never expose database error messages to clients.
        """
        logger.error(
            f"Database error: {exc.message}",
            extra={"details": exc.details, "path": str(request.url)},
            exc_info=True
        )

        # Always return generic message for database errors
        return JSONResponse(
            status_code=500,
            content={
                "error": "DatabaseError",
                "message": "A database error occurred. Please try again later."
            }
        )

    @app.exception_handler(ExternalServiceError)
    async def external_service_error_handler(request, exc: ExternalServiceError):
        """Handle external service errors without exposing service details."""
        logger.error(
            f"External service error: {exc.message}",
            extra={"details": exc.details, "path": str(request.url)}
        )

        return JSONResponse(
            status_code=503,
            content={
                "error": "ExternalServiceError",
                "message": "An external service is temporarily unavailable. Please try again later."
            }
        )

    @app.exception_handler(404)
    async def not_found_handler(request, exc):
        """Handle 404 errors."""
        return JSONResponse(
            status_code=404,
            content={"error": "NotFoundError", "message": "Resource not found"}
        )

    @app.exception_handler(500)
    async def internal_error_handler(request, exc):
        """
        Handle 500 errors.

        Security: Never expose internal error details in production.
        """
        logger.error(f"Internal server error: {exc}", exc_info=True)

        # Never expose error details in production
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred. Please try again later."
            }
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request, exc: Exception):
        """
        Catch-all handler for unhandled exceptions.

        Security: Prevents any accidental information leakage from unhandled errors.
        """
        logger.error(
            f"Unhandled exception: {type(exc).__name__} - {str(exc)}",
            extra={"path": str(request.url)},
            exc_info=True
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "An unexpected error occurred. Please try again later."
            }
        )

    logger.info(f"Application configuration complete. Debug mode: {config.debug}")

    return app


# ============================================================================
# Create Application Instance
# ============================================================================

app = create_application()

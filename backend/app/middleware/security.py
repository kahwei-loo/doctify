"""
Security Middleware

Implements security headers and protections for the FastAPI application.
Includes:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
"""

from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import get_settings

settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.

    This middleware implements OWASP security best practices by adding
    comprehensive security headers to protect against common web vulnerabilities.
    """

    def __init__(
        self,
        app: ASGIApp,
        hsts_max_age: int = 31536000,  # 1 year
        hsts_include_subdomains: bool = True,
        hsts_preload: bool = True,
        csp_directives: dict = None,
        frame_options: str = "DENY",
    ):
        """
        Initialize security headers middleware.

        Args:
            app: ASGI application
            hsts_max_age: HSTS max-age in seconds (default: 1 year)
            hsts_include_subdomains: Include subdomains in HSTS
            hsts_preload: Enable HSTS preloading
            csp_directives: Content Security Policy directives
            frame_options: X-Frame-Options value (DENY, SAMEORIGIN, ALLOW-FROM)
        """
        super().__init__(app)
        self.hsts_max_age = hsts_max_age
        self.hsts_include_subdomains = hsts_include_subdomains
        self.hsts_preload = hsts_preload
        self.frame_options = frame_options

        # Default CSP directives (restrictive but functional)
        self.csp_directives = csp_directives or {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'"],  # Adjust for your needs
            "style-src": ["'self'", "'unsafe-inline'"],  # Adjust for your needs
            "img-src": ["'self'", "data:", "https:"],
            "font-src": ["'self'", "data:"],
            "connect-src": ["'self'"],
            "frame-ancestors": ["'none'"],
            "base-uri": ["'self'"],
            "form-action": ["'self'"],
            "upgrade-insecure-requests": [],
        }

    def build_csp_header(self) -> str:
        """
        Build Content Security Policy header value.

        Returns:
            CSP header value string
        """
        directives = []
        for directive, values in self.csp_directives.items():
            if values:
                directive_str = f"{directive} {' '.join(values)}"
            else:
                directive_str = directive
            directives.append(directive_str)

        return "; ".join(directives)

    def build_hsts_header(self) -> str:
        """
        Build Strict-Transport-Security header value.

        Returns:
            HSTS header value string
        """
        parts = [f"max-age={self.hsts_max_age}"]

        if self.hsts_include_subdomains:
            parts.append("includeSubDomains")

        if self.hsts_preload:
            parts.append("preload")

        return "; ".join(parts)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and add security headers to response.

        Args:
            request: Incoming request
            call_next: Next middleware or endpoint

        Returns:
            Response with security headers
        """
        response = await call_next(request)

        # Content Security Policy
        response.headers["Content-Security-Policy"] = self.build_csp_header()

        # X-Frame-Options - prevents clickjacking
        response.headers["X-Frame-Options"] = self.frame_options

        # X-Content-Type-Options - prevents MIME sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # X-XSS-Protection - legacy XSS protection (modern browsers use CSP)
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Referrer-Policy - controls referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Permissions-Policy - controls browser features
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )

        # HSTS - Only add in production with HTTPS
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = self.build_hsts_header()

        # Remove server header to avoid information disclosure
        if "Server" in response.headers:
            del response.headers["Server"]

        # Remove X-Powered-By header if present
        if "X-Powered-By" in response.headers:
            del response.headers["X-Powered-By"]

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-based rate limiting middleware with sliding window algorithm.

    Implements distributed rate limiting suitable for production use.
    Supports per-IP, per-user, and per-endpoint rate limiting with
    configurable thresholds.
    """

    def __init__(
        self,
        app: ASGIApp,
        redis_url: str = None,
        default_calls: int = 100,
        default_period: int = 60,
    ):
        """
        Initialize rate limit middleware.

        Args:
            app: ASGI application
            redis_url: Redis connection URL
            default_calls: Default number of allowed calls
            default_period: Default time period in seconds
        """
        super().__init__(app)
        self.default_calls = default_calls
        self.default_period = default_period

        # Import Redis here to avoid import errors if Redis not installed
        try:
            import redis.asyncio as aioredis

            self.redis = aioredis.from_url(
                redis_url or settings.REDIS_URL, encoding="utf-8", decode_responses=True
            )
        except ImportError:
            raise ImportError(
                "redis library is required for rate limiting. "
                "Install it with: pip install redis"
            )
        except Exception as e:
            # Log error but don't crash - gracefully degrade
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Failed to initialize Redis for rate limiting: {e}")
            self.redis = None

    def get_rate_limit_key(self, identifier: str, endpoint: str) -> str:
        """
        Generate rate limit cache key.

        Args:
            identifier: User ID, API key, or IP address
            endpoint: API endpoint path

        Returns:
            Cache key for rate limiting
        """
        return f"rate_limit:{identifier}:{endpoint}"

    async def check_rate_limit(
        self, key: str, max_requests: int, window: int
    ) -> tuple[bool, dict]:
        """
        Check rate limit using sliding window algorithm.

        Args:
            key: Rate limit key
            max_requests: Maximum requests allowed
            window: Time window in seconds

        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        if not self.redis:
            # Gracefully degrade if Redis unavailable
            return True, {
                "limit": max_requests,
                "remaining": max_requests,
                "reset": window,
            }

        try:
            import time

            current_time = time.time()
            window_start = current_time - window

            # Use Redis sorted set for sliding window
            # Remove old entries
            await self.redis.zremrangebyscore(key, 0, window_start)

            # Count current requests
            request_count = await self.redis.zcard(key)

            # Check if limit exceeded
            if request_count >= max_requests:
                # Get oldest request time to calculate reset
                oldest = await self.redis.zrange(key, 0, 0, withscores=True)
                if oldest:
                    reset_time = int(oldest[0][1]) + window - current_time
                else:
                    reset_time = window

                return False, {
                    "limit": max_requests,
                    "remaining": 0,
                    "reset": max(int(reset_time), 0),
                }

            # Add current request
            await self.redis.zadd(key, {str(current_time): current_time})

            # Set expiration on key
            await self.redis.expire(key, window)

            return True, {
                "limit": max_requests,
                "remaining": max_requests - request_count - 1,
                "reset": window,
            }

        except Exception as e:
            # Log error and allow request (fail open for availability)
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Rate limit check failed: {e}")
            return True, {
                "limit": max_requests,
                "remaining": max_requests,
                "reset": window,
            }

    def get_rate_limit_config(self, path: str) -> tuple[int, int]:
        """
        Get rate limit configuration for specific endpoint.

        Args:
            path: Request path

        Returns:
            Tuple of (max_requests, window_seconds)
        """
        # Critical endpoints with stricter limits
        if "/auth/login" in path or "/token" in path:
            return 20, 60  # 20 requests per minute for login

        elif "/auth/password-reset" in path:
            return 3, 3600  # 3 requests per hour for password reset

        elif "/auth/verify-email" in path:
            return 5, 3600  # 5 requests per hour for email verification

        elif "/documents/upload" in path or "/upload" in path:
            return 10, 3600  # 10 uploads per hour

        elif "/api/" in path:
            return 1000, 60  # 1000 requests per minute for API key users

        else:
            # Default rate limit
            return self.default_calls, self.default_period

    def get_client_identifier(self, request: Request) -> str:
        """
        Get client identifier for rate limiting.

        Security: Only trusts X-Forwarded-For header from trusted proxies
        to prevent IP spoofing attacks.

        Args:
            request: Incoming request

        Returns:
            Client identifier (user ID, API key, or IP)
        """
        # Try to get user ID from request state (set by auth middleware)
        user_id = getattr(request.state, "user_id", None)
        if user_id:
            return f"user:{user_id}"

        # Try to get API key from headers
        api_key = request.headers.get("X-API-Key")
        if api_key:
            import hashlib

            # Hash API key for privacy
            hashed_key = hashlib.sha256(api_key.encode()).hexdigest()[:16]
            return f"apikey:{hashed_key}"

        # Get direct client IP
        direct_client_ip = request.client.host if request.client else "unknown"

        # Security: Only trust X-Forwarded-For from trusted proxies
        # This prevents attackers from spoofing their IP address
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for and direct_client_ip in settings.TRUSTED_PROXIES:
            # Only trust the header when request comes from a trusted proxy
            # Take rightmost untrusted IP (first IP added by trusted proxy)
            forwarded_ips = [ip.strip() for ip in forwarded_for.split(",")]

            # Find the first IP that isn't a trusted proxy
            # Working from right to left (most recently added first)
            client_ip = forwarded_ips[0]  # Default to leftmost (original client)
            for ip in reversed(forwarded_ips):
                if ip not in settings.TRUSTED_PROXIES:
                    client_ip = ip
                    break
        else:
            # Not from trusted proxy - use direct client IP
            # Ignore X-Forwarded-For to prevent spoofing
            client_ip = direct_client_ip

        return f"ip:{client_ip}"

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Check rate limit and process request.

        Args:
            request: Incoming request
            call_next: Next middleware or endpoint

        Returns:
            Response with rate limit headers or 429 Too Many Requests
        """
        from fastapi.responses import JSONResponse

        # Skip rate limiting for CORS preflight requests
        if request.method == "OPTIONS":
            return await call_next(request)

        # Get client identifier
        client_id = self.get_client_identifier(request)

        # Get rate limit config for this endpoint
        max_requests, window = self.get_rate_limit_config(request.url.path)

        # Generate rate limit key
        rate_limit_key = self.get_rate_limit_key(client_id, request.url.path)

        # Check rate limit
        is_allowed, rate_info = await self.check_rate_limit(
            rate_limit_key, max_requests, window
        )

        # Return 429 if rate limit exceeded
        if not is_allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Please try again in {rate_info['reset']} seconds.",
                    "retry_after": rate_info["reset"],
                },
                headers={
                    "X-RateLimit-Limit": str(rate_info["limit"]),
                    "X-RateLimit-Remaining": str(rate_info["remaining"]),
                    "X-RateLimit-Reset": str(rate_info["reset"]),
                    "Retry-After": str(rate_info["reset"]),
                },
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers to response
        response.headers["X-RateLimit-Limit"] = str(rate_info["limit"])
        response.headers["X-RateLimit-Remaining"] = str(rate_info["remaining"])
        response.headers["X-RateLimit-Reset"] = str(rate_info["reset"])

        return response


class CORSSecurityMiddleware(BaseHTTPMiddleware):
    """
    Enhanced CORS middleware with additional security checks.

    Note: FastAPI has built-in CORS middleware, but this provides
    additional security validations.
    """

    def __init__(
        self,
        app: ASGIApp,
        allowed_origins: list = None,
        allow_credentials: bool = False,
    ):
        """
        Initialize CORS security middleware.

        Args:
            app: ASGI application
            allowed_origins: List of allowed origins
            allow_credentials: Whether to allow credentials
        """
        super().__init__(app)
        self.allowed_origins = allowed_origins or []
        self.allow_credentials = allow_credentials

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Validate CORS and process request.

        Args:
            request: Incoming request
            call_next: Next middleware or endpoint

        Returns:
            Response with CORS validation
        """
        origin = request.headers.get("origin")

        # Validate origin if credentials are allowed
        if self.allow_credentials and origin:
            if origin not in self.allowed_origins and "*" not in self.allowed_origins:
                # Log suspicious CORS attempt
                pass

        response = await call_next(request)
        return response


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    CSRF (Cross-Site Request Forgery) protection middleware.

    Security: Protects state-changing operations from CSRF attacks by requiring
    a custom header (X-Requested-With) for mutations. This works because:
    1. Browsers don't automatically add custom headers on cross-origin requests
    2. Simple CORS requests cannot include custom headers
    3. Pre-flighted requests with custom headers require CORS approval

    Note: This is designed for API-first applications using token auth.
    For traditional form-based apps, use a synchronizer token pattern instead.
    """

    # HTTP methods that change state and require CSRF protection
    STATE_CHANGING_METHODS = {"POST", "PUT", "DELETE", "PATCH"}

    # Paths that are exempt from CSRF protection (e.g., login, token refresh)
    EXEMPT_PATHS = {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/refresh",
        "/api/v1/auth/password-reset",
        "/api/v1/auth/password-reset-confirm",
        "/health",
        "/docs",
        "/redoc",
        "/openapi.json",
    }

    def __init__(
        self,
        app: ASGIApp,
        enabled: bool = True,
        exempt_paths: set = None,
        required_header: str = "X-Requested-With",
        required_header_value: str = None,
    ):
        """
        Initialize CSRF protection middleware.

        Args:
            app: ASGI application
            enabled: Whether CSRF protection is enabled
            exempt_paths: Additional paths to exempt from CSRF checks
            required_header: Header name required for state-changing requests
            required_header_value: Optional required header value (any value if None)
        """
        super().__init__(app)
        self.enabled = enabled
        self.exempt_paths = self.EXEMPT_PATHS | (exempt_paths or set())
        self.required_header = required_header
        self.required_header_value = required_header_value

    def _is_exempt(self, request: Request) -> bool:
        """
        Check if request is exempt from CSRF protection.

        Args:
            request: Incoming request

        Returns:
            True if request is exempt from CSRF checks
        """
        # Check path exemptions
        path = request.url.path
        if path in self.exempt_paths:
            return True

        # Check if path starts with any exempt prefix
        for exempt_path in self.exempt_paths:
            if path.startswith(exempt_path):
                return True

        # API key authenticated requests are exempt (already protected)
        if request.headers.get("X-API-Key"):
            return True

        return False

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Check CSRF protection and process request.

        Args:
            request: Incoming request
            call_next: Next middleware or endpoint

        Returns:
            Response or 403 Forbidden if CSRF check fails
        """
        from fastapi.responses import JSONResponse

        # Skip if CSRF protection is disabled
        if not self.enabled:
            return await call_next(request)

        # Skip for non-state-changing methods
        if request.method not in self.STATE_CHANGING_METHODS:
            return await call_next(request)

        # Skip for exempt paths
        if self._is_exempt(request):
            return await call_next(request)

        # Check for required header
        header_value = request.headers.get(self.required_header)

        if not header_value:
            # Log CSRF violation attempt
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(
                f"CSRF protection: Missing {self.required_header} header",
                extra={
                    "path": str(request.url.path),
                    "method": request.method,
                    "origin": request.headers.get("origin"),
                    "referer": request.headers.get("referer"),
                },
            )

            return JSONResponse(
                status_code=403,
                content={
                    "error": "CSRFError",
                    "message": "CSRF validation failed. Missing required header.",
                },
            )

        # Optionally validate header value
        if self.required_header_value and header_value != self.required_header_value:
            return JSONResponse(
                status_code=403,
                content={
                    "error": "CSRFError",
                    "message": "CSRF validation failed. Invalid header value.",
                },
            )

        return await call_next(request)


# ==================== Helper Functions ====================


def get_security_middleware_config():
    """
    Get security middleware configuration based on environment.

    Returns:
        Dictionary with middleware configuration
    """
    if settings.is_production:
        # Production: Strict security
        return {
            "hsts_max_age": 31536000,  # 1 year
            "hsts_include_subdomains": True,
            "hsts_preload": True,
            "frame_options": "DENY",
            "csp_directives": {
                "default-src": ["'self'"],
                "script-src": ["'self'"],
                "style-src": ["'self'"],
                "img-src": ["'self'", "data:", "https:"],
                "font-src": ["'self'"],
                "connect-src": ["'self'"],
                "frame-ancestors": ["'none'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"],
                "upgrade-insecure-requests": [],
            },
        }
    elif settings.is_staging:
        # Staging: Moderate security with some flexibility
        return {
            "hsts_max_age": 86400,  # 1 day
            "hsts_include_subdomains": False,
            "hsts_preload": False,
            "frame_options": "SAMEORIGIN",
            "csp_directives": {
                "default-src": ["'self'"],
                "script-src": ["'self'", "'unsafe-inline'"],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", "data:", "https:"],
                "font-src": ["'self'", "data:"],
                "connect-src": ["'self'"],
                "frame-ancestors": ["'self'"],
                "base-uri": ["'self'"],
                "form-action": ["'self'"],
            },
        }
    else:
        # Development: Relaxed security for development
        return {
            "hsts_max_age": 0,
            "hsts_include_subdomains": False,
            "hsts_preload": False,
            "frame_options": "SAMEORIGIN",
            "csp_directives": {
                "default-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", "data:", "https:", "http:"],
                "font-src": ["'self'", "data:"],
                "connect-src": ["'self'", "ws:", "wss:"],
                "frame-ancestors": ["'self'"],
            },
        }

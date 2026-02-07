"""
Application configuration management using Pydantic Settings v2.

This module provides a centralized configuration system that:
- Loads settings from environment variables
- Supports multiple environments (dev, staging, production)
- Validates configuration on startup
- Provides type-safe access to settings
"""

import json
from functools import lru_cache
from typing import Any, Dict, List, Optional

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Main application settings.

    Settings are loaded from environment variables, with support for
    .env files. The loading order is:
    1. Environment variables
    2. .env.{environment} file (e.g., .env.development)
    3. .env file
    4. Default values
    """

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.development", ".env.staging", ".env.production"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ============================================================================
    # Application Settings
    # ============================================================================

    APP_NAME: str = Field(
        default="Doctify",
        description="Application name displayed in logs and responses"
    )

    APP_VERSION: str = Field(
        default="1.0.0",
        description="Application version"
    )

    DEBUG: bool = Field(
        default=False,
        description="Enable debug mode (never use in production)"
    )

    ENVIRONMENT: str = Field(
        default="development",
        description="Application environment: development, staging, or production"
    )

    API_V1_STR: str = Field(
        default="/api/v1",
        description="API version 1 prefix"
    )

    # ============================================================================
    # Server Settings
    # ============================================================================

    HOST: str = Field(
        default="0.0.0.0",
        description="Server host address"
    )

    PORT: int = Field(
        default=8000,
        description="Server port"
    )

    # ============================================================================
    # Database Settings - PostgreSQL
    # ============================================================================

    POSTGRES_HOST: str = Field(
        default="localhost",
        description="PostgreSQL server hostname"
    )

    POSTGRES_PORT: int = Field(
        default=5432,
        description="PostgreSQL server port"
    )

    POSTGRES_USER: str = Field(
        default="doctify",
        description="PostgreSQL username"
    )

    POSTGRES_PASSWORD: str = Field(
        default="doctify_dev_password",
        description="PostgreSQL password"
    )

    POSTGRES_DB: str = Field(
        default="doctify",
        description="PostgreSQL database name"
    )

    POSTGRES_POOL_SIZE: int = Field(
        default=10,
        description="PostgreSQL connection pool size"
    )

    POSTGRES_MAX_OVERFLOW: int = Field(
        default=20,
        description="Maximum overflow connections beyond pool size"
    )

    POSTGRES_SSL: bool = Field(
        default=False,
        description="Enable SSL for PostgreSQL connection (required in production)"
    )

    # ============================================================================
    # Cache Settings - Redis
    # ============================================================================

    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )

    REDIS_MAX_CONNECTIONS: int = Field(
        default=50,
        description="Maximum Redis connection pool size"
    )

    CACHE_TTL: int = Field(
        default=3600,
        description="Default cache time-to-live in seconds (1 hour)"
    )

    # ============================================================================
    # Task Queue Settings - Celery
    # ============================================================================

    CELERY_BROKER_URL: str = Field(
        default="redis://localhost:6379/1",
        description="Celery broker URL"
    )

    CELERY_RESULT_BACKEND: str = Field(
        default="redis://localhost:6379/1",
        description="Celery result backend URL"
    )

    CELERY_TASK_TIME_LIMIT: int = Field(
        default=300,
        description="Maximum task execution time in seconds (5 minutes)"
    )

    CELERY_TASK_SOFT_TIME_LIMIT: int = Field(
        default=270,
        description="Soft time limit before hard limit (4.5 minutes)"
    )

    # ============================================================================
    # Authentication Settings - JWT
    # ============================================================================

    SECRET_KEY: str = Field(
        description="Secret key for JWT token generation (required)"
    )

    ALGORITHM: str = Field(
        default="HS256",
        description="JWT signing algorithm"
    )

    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        description="Access token expiration time in minutes"
    )

    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        description="Refresh token expiration time in days"
    )

    # ============================================================================
    # Security Settings
    # ============================================================================

    PASSWORD_MIN_LENGTH: int = Field(
        default=8,
        description="Minimum password length"
    )

    PASSWORD_REQUIRE_UPPERCASE: bool = Field(
        default=True,
        description="Require at least one uppercase letter in password"
    )

    PASSWORD_REQUIRE_LOWERCASE: bool = Field(
        default=True,
        description="Require at least one lowercase letter in password"
    )

    PASSWORD_REQUIRE_DIGIT: bool = Field(
        default=True,
        description="Require at least one digit in password"
    )

    PASSWORD_REQUIRE_SPECIAL: bool = Field(
        default=False,
        description="Require at least one special character in password"
    )

    MAX_LOGIN_ATTEMPTS: int = Field(
        default=5,
        description="Maximum failed login attempts before account lockout"
    )

    LOGIN_LOCKOUT_MINUTES: int = Field(
        default=15,
        description="Account lockout duration in minutes after max failed attempts"
    )

    # Security: Trusted proxy configuration
    # Only trust X-Forwarded-For headers from these IPs
    TRUSTED_PROXIES: List[str] = Field(
        default=["127.0.0.1", "::1"],
        description="List of trusted proxy IPs that can set X-Forwarded-For header"
    )

    # ============================================================================
    # CORS Settings
    # ============================================================================

    BACKEND_CORS_ORIGINS: List[str] = Field(
        default=[],
        description="List of allowed CORS origins"
    )

    BACKEND_CORS_ALLOW_CREDENTIALS: bool = Field(
        default=True,
        description="Allow credentials in CORS requests"
    )

    BACKEND_CORS_ALLOW_METHODS: List[str] = Field(
        default=["*"],
        description="Allowed HTTP methods for CORS"
    )

    BACKEND_CORS_ALLOW_HEADERS: List[str] = Field(
        default=["*"],
        description="Allowed HTTP headers for CORS"
    )

    # ============================================================================
    # AI Provider Settings
    # ============================================================================

    OPENAI_BASE_URL: Optional[str] = Field(
        default=None,
        description="OpenAI API base URL (use OpenRouter or custom endpoint)"
    )

    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAI API key"
    )

    COHERE_API_KEY: Optional[str] = Field(
        default=None,
        description="Cohere API key for reranking (P1.1)"
    )

    AI_MODEL: Optional[str] = Field(
        default=None,
        description="AI model identifier (e.g., gpt-4, claude-3-opus)"
    )

    AI_TEMPERATURE: float = Field(
        default=0.1,
        description="AI model temperature (0.0-1.0, lower = more deterministic)"
    )

    AI_MAX_TOKENS: int = Field(
        default=4000,
        description="Maximum tokens for AI response"
    )

    AI_TIMEOUT: int = Field(
        default=60,
        description="AI API request timeout in seconds"
    )

    # ============================================================================
    # File Upload Settings
    # ============================================================================

    MAX_PAGES_HARD: int = Field(
        default=30,
        description="Hard limit for maximum pages per document"
    )

    MAX_PAGES_WARN: int = Field(
        default=10,
        description="Warning threshold for page count"
    )

    MAX_FILE_SIZE_MB: int = Field(
        default=50,
        description="Maximum file size in megabytes"
    )

    ALLOWED_MIME_TYPES: List[str] = Field(
        default=[
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/tiff",
            "image/webp",
        ],
        description="Allowed MIME types for document upload"
    )

    ALLOWED_EXTENSIONS: List[str] = Field(
        default=[".pdf", ".jpg", ".jpeg", ".png", ".tiff", ".webp"],
        description="Allowed file extensions for upload"
    )

    # ============================================================================
    # Storage Settings
    # ============================================================================

    STORAGE_BACKEND: str = Field(
        default="local",
        description="Storage backend: 'local' or 's3'"
    )

    # Local storage settings
    UPLOAD_DIR: str = Field(
        default="./uploads",
        description="Local upload directory path"
    )

    # S3 storage settings
    S3_ENDPOINT_URL: Optional[str] = Field(
        default=None,
        description="S3-compatible endpoint URL (for MinIO, DigitalOcean Spaces, etc.)"
    )

    S3_ACCESS_KEY: Optional[str] = Field(
        default=None,
        description="S3 access key ID"
    )

    S3_SECRET_KEY: Optional[str] = Field(
        default=None,
        description="S3 secret access key"
    )

    S3_BUCKET_NAME: Optional[str] = Field(
        default=None,
        description="S3 bucket name"
    )

    S3_REGION: Optional[str] = Field(
        default="us-east-1",
        description="S3 region"
    )

    # ============================================================================
    # WebSocket Settings
    # ============================================================================

    WS_MESSAGE_QUEUE_SIZE: int = Field(
        default=100,
        description="WebSocket message queue size"
    )

    WS_HEARTBEAT_INTERVAL: int = Field(
        default=30,
        description="WebSocket heartbeat interval in seconds"
    )

    # ============================================================================
    # Monitoring & Logging Settings
    # ============================================================================

    LOG_LEVEL: str = Field(
        default="INFO",
        description="Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL"
    )

    LOG_FORMAT: str = Field(
        default="json",
        description="Log format: 'json' or 'text'"
    )

    ENABLE_PROMETHEUS: bool = Field(
        default=False,
        description="Enable Prometheus metrics endpoint"
    )

    PROMETHEUS_PORT: int = Field(
        default=9090,
        description="Prometheus metrics port"
    )

    # ============================================================================
    # Validators
    # ============================================================================

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment is one of the allowed values."""
        allowed = ["development", "staging", "production", "test"]
        if v not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {allowed}")
        return v

    @field_validator("STORAGE_BACKEND")
    @classmethod
    def validate_storage_backend(cls, v: str) -> str:
        """Validate storage backend is supported."""
        allowed = ["local", "s3"]
        if v not in allowed:
            raise ValueError(f"STORAGE_BACKEND must be one of {allowed}")
        return v

    @field_validator("LOG_LEVEL")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """Validate log level is valid."""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v = v.upper()
        if v not in allowed:
            raise ValueError(f"LOG_LEVEL must be one of {allowed}")
        return v

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            # Try JSON parsing first (for ["url1", "url2"] format)
            if v.startswith("["):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed if origin]
                except json.JSONDecodeError:
                    pass
            # Fall back to comma-separated format
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return []

    @field_validator("TRUSTED_PROXIES", mode="before")
    @classmethod
    def assemble_trusted_proxies(cls, v: Any) -> List[str]:
        """Parse trusted proxies from string or list."""
        if isinstance(v, str):
            return [ip.strip() for ip in v.split(",") if ip.strip()]
        elif isinstance(v, list):
            return v
        return ["127.0.0.1", "::1"]

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Validate critical settings in production environment."""
        if self.ENVIRONMENT == "production":
            # Ensure debug is disabled in production
            if self.DEBUG:
                raise ValueError("DEBUG must be False in production environment")

            # Ensure CORS origins are explicitly set in production
            if not self.BACKEND_CORS_ORIGINS:
                raise ValueError(
                    "BACKEND_CORS_ORIGINS must be explicitly set in production"
                )

            # Ensure AI credentials are set if AI features are used
            if self.OPENAI_API_KEY and not self.OPENAI_BASE_URL:
                raise ValueError(
                    "OPENAI_BASE_URL must be set when OPENAI_API_KEY is provided"
                )

            # Ensure S3 settings are complete if S3 storage is used
            if self.STORAGE_BACKEND == "s3":
                required_s3_fields = [
                    "S3_ACCESS_KEY",
                    "S3_SECRET_KEY",
                    "S3_BUCKET_NAME",
                ]
                missing = [
                    field for field in required_s3_fields
                    if not getattr(self, field)
                ]
                if missing:
                    raise ValueError(
                        f"S3 storage requires these settings: {', '.join(missing)}"
                    )

            # Security: Recommend PostgreSQL SSL in production
            if not self.POSTGRES_SSL:
                import warnings
                warnings.warn(
                    "POSTGRES_SSL is disabled in production. "
                    "Consider enabling SSL for database connections.",
                    UserWarning
                )

        return self

    # ============================================================================
    # Helper Properties
    # ============================================================================

    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT == "production"

    @property
    def is_staging(self) -> bool:
        """Check if running in staging environment."""
        return self.ENVIRONMENT == "staging"

    @property
    def max_file_size_bytes(self) -> int:
        """Get maximum file size in bytes."""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def database_url(self) -> str:
        """Get async PostgreSQL connection URL for SQLAlchemy."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def database_url_sync(self) -> str:
        """Get sync PostgreSQL connection URL for Alembic migrations."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def cors_origins_list(self) -> List[str]:
        """Get parsed CORS origins as list."""
        return self.BACKEND_CORS_ORIGINS

    @property
    def cors_origins(self) -> List[str]:
        """Alias for BACKEND_CORS_ORIGINS for easier access."""
        return self.BACKEND_CORS_ORIGINS

    @property
    def cors_credentials(self) -> bool:
        """Alias for BACKEND_CORS_ALLOW_CREDENTIALS for easier access."""
        return self.BACKEND_CORS_ALLOW_CREDENTIALS

    @property
    def project_name(self) -> str:
        """Alias for APP_NAME for easier access."""
        return self.APP_NAME

    @property
    def environment(self) -> str:
        """Alias for ENVIRONMENT for easier access."""
        return self.ENVIRONMENT

    @property
    def debug(self) -> bool:
        """Alias for DEBUG for easier access."""
        return self.DEBUG


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings instance.

    This function uses lru_cache to ensure settings are loaded only once
    and reused throughout the application lifecycle.

    Returns:
        Settings: Application settings instance
    """
    return Settings()


# Export settings instance for convenient import
settings = get_settings()

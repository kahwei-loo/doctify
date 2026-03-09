"""
Security Utilities

Provides authentication, authorization, and cryptographic utilities.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
import secrets
import hashlib
import uuid

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.password_policy import PasswordPolicy

settings = get_settings()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==================== Password Utilities ====================


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        plain_password: Plain text password
        hashed_password: Bcrypt hashed password

    Returns:
        True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Bcrypt hashed password
    """
    return pwd_context.hash(password)


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength using NIST-compliant PasswordPolicy.

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)

    Note:
        This function delegates to PasswordPolicy for NIST-compliant validation
        including common password detection, sequential pattern checking, and
        repeated character detection.
    """
    is_valid, errors = PasswordPolicy.validate_password(password)

    if not is_valid:
        # Join all error messages into a single string
        error_message = "; ".join(errors)
        return False, error_message

    return True, ""


# ==================== JWT Token Utilities ====================


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create JWT access token with unique JWT ID (jti) for revocation support.

    Args:
        data: Data to encode in token
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token with jti field
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Add unique JWT ID for revocation support
    jti = str(uuid.uuid4())

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": jti,
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create JWT refresh token with unique JWT ID (jti) for revocation support.

    Args:
        data: Data to encode in token
        expires_delta: Optional expiration time delta

    Returns:
        Encoded JWT token with jti field
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    # Add unique JWT ID for revocation support
    jti = str(uuid.uuid4())

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh",
            "jti": jti,
        }
    )

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )

    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate JWT token.

    Args:
        token: JWT token to decode

    Returns:
        Decoded token payload

    Raises:
        AuthenticationError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return payload

    except JWTError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify JWT token and extract payload.

    Args:
        token: JWT token to verify

    Returns:
        Decoded token payload

    Raises:
        AuthenticationError: If token is invalid or expired
    """
    payload = decode_token(token)

    # Verify token has required fields
    if "sub" not in payload:
        raise AuthenticationError("Token missing subject claim")

    # Check if token is expired
    exp = payload.get("exp")
    if exp is None or datetime.fromtimestamp(exp) < datetime.utcnow():
        raise AuthenticationError("Token has expired")

    return payload


async def verify_token_with_blacklist(token: str) -> Dict[str, Any]:
    """
    Verify JWT token and check against blacklist (async).

    This function should be used in API dependencies to ensure
    revoked tokens are rejected.

    Args:
        token: JWT token to verify

    Returns:
        Decoded token payload

    Raises:
        AuthenticationError: If token is invalid, expired, or revoked
    """
    # First, verify token structure and expiration
    payload = verify_token(token)

    # Check if token has been revoked
    # Import here to avoid circular dependency
    from app.services.auth.token_blacklist import TokenBlacklistService

    is_revoked = await TokenBlacklistService.is_token_revoked(token)

    if is_revoked:
        raise AuthenticationError(
            "Token has been revoked", details={"jti": payload.get("jti")}
        )

    return payload


# ==================== API Key Utilities ====================


def generate_api_key() -> str:
    """
    Generate a secure API key.

    Returns:
        Secure random API key
    """
    return secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for storage.

    Args:
        api_key: Plain API key

    Returns:
        SHA-256 hashed API key
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(plain_key: str, hashed_key: str) -> bool:
    """
    Verify API key against its hash.

    Args:
        plain_key: Plain API key
        hashed_key: SHA-256 hashed API key

    Returns:
        True if key matches, False otherwise
    """
    return hash_api_key(plain_key) == hashed_key


# ==================== File Security ====================


def calculate_file_hash(file_content: bytes) -> str:
    """
    Calculate SHA-256 hash of file content.

    Args:
        file_content: File content as bytes

    Returns:
        SHA-256 hash as hex string
    """
    return hashlib.sha256(file_content).hexdigest()


def validate_file_type(filename: str, allowed_extensions: list[str]) -> bool:
    """
    Validate file type by extension.

    Args:
        filename: Filename to validate
        allowed_extensions: List of allowed extensions (without dot)

    Returns:
        True if file type is allowed, False otherwise
    """
    if "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[-1].lower()
    return extension in [ext.lower() for ext in allowed_extensions]


def sanitize_filename(filename: str) -> str:
    """
    Enhanced filename sanitization with security improvements.

    Args:
        filename: Original filename

    Returns:
        Sanitized filename safe for filesystem operations
    """
    import unicodedata
    import re
    import os

    # Unicode normalization (prevent homoglyph attacks)
    filename = unicodedata.normalize("NFKD", filename)

    # Get just the basename (remove any path components)
    filename = os.path.basename(filename)

    # Remove path traversal attempts
    filename = filename.replace("../", "").replace("..\\", "")

    # Remove NULL bytes (prevent truncation attacks)
    filename = filename.replace("\x00", "")

    # Replace unsafe characters with underscore
    unsafe_chars = ["<", ">", ":", '"', "/", "\\", "|", "?", "*"]
    for char in unsafe_chars:
        filename = filename.replace(char, "_")

    # Remove any remaining non-printable characters
    filename = "".join(char if char.isprintable() else "_" for char in filename)

    # Prevent hidden files (files starting with .)
    if filename.startswith("."):
        filename = "_" + filename

    # Limit length (leave room for file extension)
    max_length = 255
    if len(filename) > max_length:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        max_name_length = max_length - len(ext) - 1  # -1 for the dot
        filename = f"{name[:max_name_length]}.{ext}" if ext else name[:max_length]

    # Final safety check: ensure we have a valid filename
    if not filename or filename in [".", ".."]:
        filename = "unnamed_file"

    return filename


def validate_file_content(
    file_content: bytes, allowed_mime_types: list[str]
) -> tuple[bool, str]:
    """
    Validate file content using magic bytes (MIME type detection).

    Uses python-magic library to detect actual file type from content,
    preventing malicious files disguised with fake extensions.

    Args:
        file_content: File content bytes (first 2048 bytes minimum)
        allowed_mime_types: List of allowed MIME types

    Returns:
        Tuple of (is_valid, detected_mime_type)

    Raises:
        ValidationError: If MIME type detection fails or type not allowed

    Example:
        >>> validate_file_content(pdf_bytes, ['application/pdf'])
        (True, 'application/pdf')
    """
    try:
        import magic
    except ImportError:
        raise ImportError(
            "python-magic library is required for file content validation. "
            "Install it with: pip install python-magic python-magic-bin (Windows) "
            "or pip install python-magic (Linux/Mac with libmagic installed)"
        )

    try:
        # Detect MIME type from file content (magic bytes)
        mime = magic.Magic(mime=True)
        detected_mime = mime.from_buffer(file_content[:2048])  # Check first 2KB

        # Validate against allowed MIME types
        is_valid = detected_mime in allowed_mime_types

        return (is_valid, detected_mime)

    except Exception as e:
        raise ValidationError(
            f"Failed to validate file content: {str(e)}", details={"error": str(e)}
        )


def validate_file_stream_size(
    file_stream,
    max_size: int = 50 * 1024 * 1024,  # 50MB default
    chunk_size: int = 8192,  # 8KB chunks
) -> tuple[bytes, int]:
    """
    Validate file size while streaming (prevents memory exhaustion).

    Reads file in chunks to validate size without loading entire file into memory.
    This prevents ZIP bomb attacks and memory exhaustion from huge files.

    Args:
        file_stream: File-like object with read() method
        max_size: Maximum allowed file size in bytes
        chunk_size: Size of chunks to read (default 8KB)

    Returns:
        Tuple of (file_content, total_size)

    Raises:
        ValidationError: If file exceeds maximum size

    Example:
        >>> content, size = validate_file_stream_size(file, max_size=10*1024*1024)
        >>> print(f"File size: {size} bytes")
    """
    chunks = []
    total_size = 0

    try:
        while True:
            chunk = file_stream.read(chunk_size)
            if not chunk:
                break

            total_size += len(chunk)

            # Check size limit before accumulating
            if total_size > max_size:
                max_size_mb = max_size / (1024 * 1024)
                raise ValidationError(
                    f"File size exceeds maximum allowed size of {max_size_mb}MB",
                    details={"size": total_size, "max_size": max_size},
                )

            chunks.append(chunk)

        # Combine all chunks
        file_content = b"".join(chunks)

        return (file_content, total_size)

    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError(
            f"Failed to read file stream: {str(e)}", details={"error": str(e)}
        )


# Allowed MIME types mapping for validation
ALLOWED_MIME_TYPES = {
    "application/pdf": ["pdf"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/tiff": ["tiff", "tif"],
    "image/bmp": ["bmp"],
    "application/msword": ["doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
    "application/vnd.ms-excel": ["xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
}


def get_expected_mime_types(allowed_extensions: list[str]) -> list[str]:
    """
    Get expected MIME types for allowed file extensions.

    Args:
        allowed_extensions: List of allowed extensions (e.g., ['pdf', 'jpg'])

    Returns:
        List of corresponding MIME types

    Example:
        >>> get_expected_mime_types(['pdf', 'jpg'])
        ['application/pdf', 'image/jpeg']
    """
    expected_mimes = []
    for mime_type, extensions in ALLOWED_MIME_TYPES.items():
        if any(ext in allowed_extensions for ext in extensions):
            expected_mimes.append(mime_type)
    return expected_mimes


# ==================== Verification Token Utilities ====================


def create_verification_token(email: str) -> str:
    """
    Create email verification token.

    Args:
        email: User email

    Returns:
        Verification token
    """
    data = {"email": email, "purpose": "email_verification"}
    return create_access_token(data, expires_delta=timedelta(hours=24))


def create_password_reset_token(email: str) -> str:
    """
    Create password reset token.

    Args:
        email: User email

    Returns:
        Password reset token
    """
    data = {"email": email, "purpose": "password_reset"}
    return create_access_token(data, expires_delta=timedelta(hours=1))


def verify_verification_token(token: str, purpose: str) -> str:
    """
    Verify and extract email from verification token.

    Args:
        token: Verification token
        purpose: Expected token purpose

    Returns:
        Email address from token

    Raises:
        AuthenticationError: If token is invalid or wrong purpose
    """
    payload = verify_token(token)

    if payload.get("purpose") != purpose:
        raise AuthenticationError("Invalid token purpose")

    email = payload.get("email")
    if not email:
        raise AuthenticationError("Token missing email")

    return email


# ==================== CORS Utilities ====================


def parse_cors_origins(origins_str: str) -> list[str]:
    """
    Parse CORS origins from comma-separated string.

    Args:
        origins_str: Comma-separated origins string

    Returns:
        List of origin URLs
    """
    if not origins_str:
        return []

    origins = [origin.strip() for origin in origins_str.split(",")]
    return [origin for origin in origins if origin]


# ==================== Rate Limiting Utilities ====================


def generate_rate_limit_key(identifier: str, endpoint: str) -> str:
    """
    Generate rate limit cache key.

    Args:
        identifier: User ID, API key, or IP address
        endpoint: API endpoint

    Returns:
        Cache key for rate limiting
    """
    return f"rate_limit:{identifier}:{endpoint}"

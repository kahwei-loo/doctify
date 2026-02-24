"""
Authentication Service

Handles user authentication, JWT token management, and session operations.
"""

from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta

from jose import JWTError

from app.services.base import BaseService
from app.db.repositories.user import UserRepository
from app.db.models.user import User
from app.core.exceptions import (
    AuthenticationError,
    ValidationError,
    NotFoundError,
)
from app.core.security import (
    verify_password,
    get_password_hash,
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.core.config import get_settings
from app.core.audit_log import AuditLogger, AuditEventType

settings = get_settings()


class AuthenticationService(BaseService[User, UserRepository]):
    """
    Service for user authentication and token management.

    Coordinates login, registration, token operations, and password management.
    """

    async def register_user(
        self,
        email: str,
        username: str,
        password: str,
        full_name: Optional[str] = None,
    ) -> User:
        """
        Register a new user.

        Args:
            email: User email address
            username: Unique username
            password: Plain text password
            full_name: Optional full name

        Returns:
            Created user instance

        Raises:
            ValidationError: If email exists or password is weak
        """
        # Validate email uniqueness
        if await self.repository.email_exists(email):
            raise ValidationError(
                "Email already registered",
                details={"email": email},
            )

        # Validate password strength
        is_strong, message = validate_password_strength(password)
        if not is_strong:
            raise ValidationError(
                f"Password validation failed: {message}",
                details={"password_requirements": message},
            )

        # Hash password
        hashed_password = get_password_hash(password)

        # Create user
        user = await self.repository.create_user(
            email=email,
            username=username,
            hashed_password=hashed_password,
            full_name=full_name,
        )

        return user

    async def authenticate_user(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> User:
        """
        Authenticate user with email and password.

        Includes account lockout protection against brute force attacks.

        Args:
            email: User email
            password: Plain text password
            ip_address: Client IP address (for audit logging)
            user_agent: Client User-Agent (for audit logging)

        Returns:
            Authenticated user instance

        Raises:
            AuthenticationError: If credentials are invalid, user is inactive, or account is locked
        """
        # Get user by email
        user = await self.repository.get_by_email(email)

        if not user:
            # Log failed login - user not found
            await AuditLogger.log_authentication(
                event_type=AuditEventType.LOGIN_FAILED,
                email=email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="user_not_found",
            )

            raise AuthenticationError(
                "Invalid email or password",
                details={"email": email},
            )

        # Check if account is locked
        if user.is_locked():
            # Calculate remaining lockout time
            from datetime import datetime
            remaining_time = (user.locked_until - datetime.utcnow()).total_seconds() / 60
            remaining_minutes = int(remaining_time) + 1  # Round up

            # Log failed login - account locked
            await AuditLogger.log_authentication(
                event_type=AuditEventType.LOGIN_FAILED,
                email=email,
                user_id=str(user.id),
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="account_locked",
                lockout_info={
                    "locked_until": user.locked_until.isoformat() if user.locked_until else None,
                    "failed_attempts": user.failed_login_attempts,
                    "remaining_minutes": remaining_minutes,
                },
            )

            raise AuthenticationError(
                f"Account is locked due to multiple failed login attempts. "
                f"Please try again in {remaining_minutes} minute(s).",
                details={
                    "email": email,
                    "user_id": str(user.id),
                    "locked_until": user.locked_until.isoformat() if user.locked_until else None,
                    "failed_attempts": user.failed_login_attempts,
                },
            )

        # Verify password
        if not verify_password(password, user.hashed_password):
            # Record failed login attempt
            is_locked = user.record_failed_login_attempt(
                max_attempts=settings.MAX_LOGIN_ATTEMPTS,
                lockout_minutes=settings.LOGIN_LOCKOUT_MINUTES,
            )

            # Save updated user with failed attempt record
            await self.repository.update(
                str(user.id),
                {
                    "failed_login_attempts": user.failed_login_attempts,
                    "last_failed_login": user.last_failed_login,
                    "locked_until": user.locked_until,
                    "updated_at": user.updated_at,
                },
            )

            # Raise error with lockout information if applicable
            if is_locked:
                # Log account lockout event
                await AuditLogger.log_authentication(
                    event_type=AuditEventType.ACCOUNT_LOCKED,
                    email=email,
                    user_id=str(user.id),
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    failure_reason="max_failed_attempts",
                    lockout_info={
                        "locked_until": user.locked_until.isoformat() if user.locked_until else None,
                        "failed_attempts": user.failed_login_attempts,
                        "lockout_minutes": settings.LOGIN_LOCKOUT_MINUTES,
                    },
                )

                raise AuthenticationError(
                    f"Invalid email or password. Account locked for {settings.LOGIN_LOCKOUT_MINUTES} minutes "
                    f"due to {settings.MAX_LOGIN_ATTEMPTS} failed login attempts.",
                    details={
                        "email": email,
                        "user_id": str(user.id),
                        "locked_until": user.locked_until.isoformat() if user.locked_until else None,
                        "failed_attempts": user.failed_login_attempts,
                    },
                )
            else:
                # Not locked yet, show remaining attempts
                remaining_attempts = settings.MAX_LOGIN_ATTEMPTS - user.failed_login_attempts

                # Log failed login - invalid password
                await AuditLogger.log_authentication(
                    event_type=AuditEventType.LOGIN_FAILED,
                    email=email,
                    user_id=str(user.id),
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=False,
                    failure_reason="invalid_password",
                    lockout_info={
                        "failed_attempts": user.failed_login_attempts,
                        "remaining_attempts": remaining_attempts,
                    },
                )

                raise AuthenticationError(
                    f"Invalid email or password. {remaining_attempts} attempt(s) remaining before account lockout.",
                    details={
                        "email": email,
                        "user_id": str(user.id),
                        "failed_attempts": user.failed_login_attempts,
                        "remaining_attempts": remaining_attempts,
                    },
                )

        # Check if user is active
        if not user.is_active:
            # Log failed login - inactive account
            await AuditLogger.log_authentication(
                event_type=AuditEventType.LOGIN_FAILED,
                email=email,
                user_id=str(user.id),
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason="account_inactive",
            )

            raise AuthenticationError(
                "User account is inactive",
                details={"email": email, "user_id": str(user.id)},
            )

        # Password correct - reset failed login attempts
        user.reset_failed_attempts()
        if user.failed_login_attempts == 0 and user.locked_until is None:
            # Only update if there were previous failures
            await self.repository.update(
                str(user.id),
                {
                    "failed_login_attempts": user.failed_login_attempts,
                    "locked_until": user.locked_until,
                    "last_failed_login": user.last_failed_login,
                    "updated_at": user.updated_at,
                },
            )

        # Log successful authentication
        await AuditLogger.log_authentication(
            event_type=AuditEventType.LOGIN_SUCCESS,
            email=email,
            user_id=str(user.id),
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )

        return user

    async def login(
        self,
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Login user and generate tokens.

        Args:
            email: User email
            password: Plain text password
            ip_address: Client IP address (for audit logging)
            user_agent: Client User-Agent (for audit logging)

        Returns:
            Dictionary containing access_token, refresh_token, token_type, user info

        Raises:
            AuthenticationError: If authentication fails
        """
        # Authenticate user
        user = await self.authenticate_user(email, password, ip_address, user_agent)

        # Generate tokens
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

        refresh_token = create_refresh_token(
            data={"sub": str(user.id), "email": user.email},
            expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "is_verified": user.is_verified,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
            },
        }

    async def refresh_access_token(
        self,
        refresh_token: str,
    ) -> Dict[str, str]:
        """
        Generate new access token from refresh token.

        Args:
            refresh_token: Valid refresh token

        Returns:
            Dictionary containing new access_token and token_type

        Raises:
            AuthenticationError: If refresh token is invalid or expired
        """
        try:
            # Verify refresh token
            payload = verify_token(refresh_token)

            # Security: Validate token type to prevent token confusion attacks
            # This ensures access tokens cannot be used as refresh tokens
            token_type = payload.get("type")
            if token_type != "refresh":
                raise AuthenticationError(
                    "Invalid token type",
                    details={"expected": "refresh", "received": token_type or "access"},
                )

            user_id = payload.get("sub")
            email = payload.get("email")

            if not user_id or not email:
                raise AuthenticationError("Invalid token payload")

            # Verify user still exists and is active
            user = await self.get_by_id(user_id)

            if not user.is_active:
                raise AuthenticationError("User account is inactive")

            # Generate new access token
            access_token = create_access_token(
                data={"sub": user_id, "email": email},
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            )

            return {
                "access_token": access_token,
                "token_type": "bearer",
            }

        except Exception as e:
            raise AuthenticationError(
                f"Failed to refresh token: {str(e)}",
                details={"error": str(e)},
            )

    async def verify_access_token(
        self,
        token: str,
    ) -> Dict[str, Any]:
        """
        Verify access token and return payload.

        Args:
            token: JWT access token

        Returns:
            Token payload dictionary

        Raises:
            AuthenticationError: If token is invalid or expired
        """
        try:
            payload = verify_token(token)
            return payload

        except Exception as e:
            raise AuthenticationError(
                f"Invalid or expired token: {str(e)}",
                details={"error": str(e)},
            )

    async def get_current_user(
        self,
        token: str,
    ) -> User:
        """
        Get current user from access token.

        Args:
            token: JWT access token

        Returns:
            User instance

        Raises:
            AuthenticationError: If token is invalid or user not found
        """
        # Verify token
        payload = await self.verify_access_token(token)

        user_id = payload.get("sub")
        if not user_id:
            raise AuthenticationError("Invalid token payload")

        # Get user
        user = await self.get_by_id(user_id)

        if not user.is_active:
            raise AuthenticationError("User account is inactive")

        return user

    async def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str,
    ) -> bool:
        """
        Change user password.

        Args:
            user_id: User ID
            current_password: Current password for verification
            new_password: New password to set

        Returns:
            True if password changed successfully

        Raises:
            AuthenticationError: If current password is incorrect
            ValidationError: If new password is weak
        """
        # Get user
        user = await self.get_by_id(user_id)

        # Verify current password
        if not verify_password(current_password, user.hashed_password):
            raise AuthenticationError("Current password is incorrect")

        # Validate new password strength
        is_strong, message = validate_password_strength(new_password)
        if not is_strong:
            raise ValidationError(
                f"New password validation failed: {message}",
                details={"password_requirements": message},
            )

        # Hash and update password
        hashed_password = get_password_hash(new_password)

        await self.repository.update(
            user_id,
            {"hashed_password": hashed_password, "updated_at": datetime.utcnow()},
        )

        # Log password change event
        await AuditLogger.log_event(
            event_type=AuditEventType.PASSWORD_CHANGED,
            user_id=user_id,
            resource_type="user",
            resource_id=user_id,
            success=True,
            details={"email": user.email},
        )

        return True

    async def request_password_reset(
        self,
        email: str,
    ) -> str:
        """
        Generate password reset token.

        Args:
            email: User email

        Returns:
            Password reset token

        Raises:
            NotFoundError: If user not found
        """
        # Get user
        user = await self.repository.get_by_email(email)

        if not user:
            raise NotFoundError(
                "User not found",
                details={"email": email},
            )

        # Generate reset token
        reset_token = create_access_token(
            data={"sub": str(user.id), "email": email, "type": "password_reset"},
            expires_delta=timedelta(hours=1),  # 1 hour expiration
        )

        # Log password reset request
        await AuditLogger.log_event(
            event_type=AuditEventType.PASSWORD_RESET_REQUESTED,
            user_id=str(user.id),
            resource_type="user",
            resource_id=str(user.id),
            success=True,
            details={"email": email},
        )

        return reset_token

    async def reset_password(
        self,
        reset_token: str,
        new_password: str,
    ) -> bool:
        """
        Reset password using reset token.

        Args:
            reset_token: Password reset token
            new_password: New password to set

        Returns:
            True if password reset successfully

        Raises:
            AuthenticationError: If token is invalid
            ValidationError: If new password is weak
        """
        try:
            # Verify reset token
            payload = verify_token(reset_token)

            token_type = payload.get("type")
            if token_type != "password_reset":
                raise AuthenticationError("Invalid token type")

            user_id = payload.get("sub")
            if not user_id:
                raise AuthenticationError("Invalid token payload")

            # Validate new password strength
            is_strong, message = validate_password_strength(new_password)
            if not is_strong:
                raise ValidationError(
                    f"Password validation failed: {message}",
                    details={"password_requirements": message},
                )

            # Hash and update password
            hashed_password = get_password_hash(new_password)

            await self.repository.update(
                user_id,
                {"hashed_password": hashed_password, "updated_at": datetime.utcnow()},
            )

            # Get email for audit logging
            email = payload.get("email")

            # Log password reset completion
            await AuditLogger.log_event(
                event_type=AuditEventType.PASSWORD_RESET_COMPLETED,
                user_id=user_id,
                resource_type="user",
                resource_id=user_id,
                success=True,
                details={"email": email} if email else {},
            )

            return True

        except Exception as e:
            if isinstance(e, (AuthenticationError, ValidationError)):
                raise
            raise AuthenticationError(
                f"Failed to reset password: {str(e)}",
                details={"error": str(e)},
            )

    async def verify_email(
        self,
        verification_token: str,
    ) -> User:
        """
        Verify user email address using verification token.

        Args:
            verification_token: Email verification token from email

        Returns:
            Verified user instance

        Raises:
            AuthenticationError: If token is invalid or expired
            NotFoundError: If user not found
        """
        try:
            # Decode and validate token
            payload = verify_token(verification_token)

            # Verify token type
            token_type = payload.get("type")
            if token_type != "email_verification":
                raise AuthenticationError(
                    "Invalid token type",
                    details={"expected": "email_verification", "actual": token_type},
                )

            # Extract user info from token
            user_id = payload.get("sub")
            email = payload.get("email")

            if not user_id or not email:
                raise AuthenticationError(
                    "Token missing required fields",
                    details={"has_user_id": bool(user_id), "has_email": bool(email)},
                )

            # Get user
            user = await self.repository.get_by_id(user_id)
            if not user:
                raise NotFoundError(
                    "User not found",
                    details={"user_id": user_id},
                )

            # Verify email matches
            if user.email != email:
                raise AuthenticationError(
                    "Email mismatch",
                    details={"token_email": email, "user_email": user.email},
                )

            # Check if already verified
            if user.is_verified:
                # Return early if already verified (idempotent operation)
                return user

            # Mark user as verified
            user = await self.repository.verify_user(user_id)

            if not user:
                raise NotFoundError(
                    "Failed to verify user",
                    details={"user_id": user_id},
                )

            # Log email verification success
            await AuditLogger.log_event(
                event_type=AuditEventType.EMAIL_VERIFIED,
                user_id=user_id,
                resource_type="user",
                resource_id=user_id,
                success=True,
                details={"email": email},
            )

            return user

        except JWTError as e:
            raise AuthenticationError(
                "Invalid or expired verification token",
                details={"error": str(e)},
            )

    async def deactivate_user(
        self,
        user_id: str,
    ) -> User:
        """
        Deactivate user account.

        Args:
            user_id: User ID

        Returns:
            Updated user instance

        Raises:
            NotFoundError: If user not found
        """
        user = await self.get_by_id(user_id)

        updated_user = await self.repository.update(
            user_id,
            {"is_active": False, "updated_at": datetime.utcnow()},
        )

        return updated_user

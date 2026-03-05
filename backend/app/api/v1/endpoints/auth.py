"""
Authentication API Endpoints

Handles user authentication, registration, password management, and API key operations.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Body, HTTPException, status, Query, Request

from app.api.v1.deps import (
    get_current_user,
    get_current_active_user,
    get_current_verified_user,
    get_auth_service,
    get_api_key_service,
    get_user_repository,
    get_token_from_auth,
)
from app.services.auth.authentication import AuthenticationService
from app.services.auth.api_key import ApiKeyService
from app.db.repositories.user import UserRepository
from app.db.models.user import User
from app.models.user import UpdateUserRequest
from app.models.common import (
    success_response,
    message_response,
    PaginationParams,
)
from app.core.exceptions import (
    ValidationError,
    AuthenticationError,
    NotFoundError,
)
from app.core.audit_log import AuditLogger, AuditEventType

router = APIRouter()


# =============================================================================
# User Authentication Endpoints
# =============================================================================


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    email: str = Body(..., description="User email"),
    password: str = Body(..., description="User password"),
    full_name: str = Body(..., description="User full name"),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Register a new user.

    - **email**: Valid email address
    - **password**: Strong password (min 8 characters)
    - **full_name**: User's full name

    Returns the created user information and authentication tokens.
    """
    try:
        # Auto-generate username from email (part before @)
        username = email.split("@")[0].lower()

        # Register the user
        user = await auth_service.register_user(
            email=email,
            username=username,
            password=password,
            full_name=full_name,
        )

        # Auto-login after registration - generate tokens
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        login_result = await auth_service.login(
            email=email,
            password=password,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return success_response(
            data=login_result,
            message="User registered successfully. Please verify your email.",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post("/login")
async def login(
    request: Request,
    email: str = Body(..., description="User email"),
    password: str = Body(..., description="User password"),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Login user and generate authentication tokens.

    - **email**: User email
    - **password**: User password

    Returns access token, refresh token, and user information.
    """
    try:
        # Extract request context for audit logging
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        result = await auth_service.login(
            email=email,
            password=password,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return success_response(
            data=result,
            message="Login successful",
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/refresh")
async def refresh_token(
    refresh_token: str = Body(..., description="Refresh token"),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Refresh access token using refresh token.

    - **refresh_token**: Valid refresh token

    Returns new access token and refresh token.
    """
    try:
        result = await auth_service.refresh_access_token(refresh_token)

        return success_response(
            data=result,
            message="Token refreshed successfully",
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout")
async def logout(
    request: Request,
    token: str = Depends(get_token_from_auth),
    current_user: User = Depends(get_current_active_user),
):
    """
    Logout user and revoke access token.

    Revokes the current access token by adding it to the blacklist.
    The token will no longer be valid for authentication.

    Note: Client should still discard tokens locally.
    """
    try:
        # Import here to avoid circular dependency
        from app.services.auth.token_blacklist import TokenBlacklistService

        # Extract request context for audit logging
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Revoke the token
        await TokenBlacklistService.revoke_token(token)

        # Log logout event
        await AuditLogger.log_event(
            event_type=AuditEventType.LOGOUT,
            user_id=str(current_user.id),
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )

        # Log token revocation
        await AuditLogger.log_event(
            event_type=AuditEventType.TOKEN_REVOKED,
            user_id=str(current_user.id),
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
        )

        return message_response(
            message="Logged out successfully. Your token has been revoked."
        )

    except Exception as e:
        # Log error but still return success to avoid leaking info
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Failed to revoke token on logout: {str(e)}")

        # Extract request context for audit logging
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Log failed logout attempt
        await AuditLogger.log_event(
            event_type=AuditEventType.LOGOUT,
            user_id=str(current_user.id),
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            severity="error",
            details={"error": str(e)},
        )

        return message_response(
            message="Logged out successfully. Please discard your tokens."
        )


# =============================================================================
# Password Management Endpoints
# =============================================================================


@router.post("/password/change")
async def change_password(
    current_password: str = Body(..., description="Current password"),
    new_password: str = Body(..., description="New password"),
    current_user: User = Depends(get_current_active_user),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Change user password.

    - **current_password**: Current password for verification
    - **new_password**: New password (min 8 characters)

    Requires authentication. Returns success message.
    """
    try:
        await auth_service.change_password(
            user_id=str(current_user.id),
            current_password=current_password,
            new_password=new_password,
        )

        return message_response(message="Password changed successfully")

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=e.message,
        )


@router.post("/password/reset/request")
async def request_password_reset(
    email: str = Body(..., description="User email"),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Request password reset (send reset token to email).

    - **email**: User email address

    Returns success message. Email sent if user exists.
    """
    try:
        result = await auth_service.request_password_reset(email=email)

        return success_response(
            data={"reset_token": result["reset_token"]},
            message="Password reset email sent (in production, send via email service)",
        )

    except NotFoundError:
        # Don't reveal if email exists for security
        return message_response(
            message="If email exists, password reset instructions have been sent"
        )


@router.post("/password/reset/confirm")
async def confirm_password_reset(
    reset_token: str = Body(..., description="Password reset token"),
    new_password: str = Body(..., description="New password"),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Confirm password reset with token.

    - **reset_token**: Token from password reset email
    - **new_password**: New password (min 8 characters)

    Returns success message if reset successful.
    """
    try:
        await auth_service.reset_password(
            reset_token=reset_token,
            new_password=new_password,
        )

        return message_response(message="Password reset successfully")

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


# =============================================================================
# Email Verification Endpoints
# =============================================================================


@router.post("/verify-email")
async def verify_email(
    verification_token: str = Body(..., description="Email verification token"),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    """
    Verify user email address.

    - **verification_token**: Token from verification email

    Returns success message if verification successful.
    """
    try:
        await auth_service.verify_email(verification_token=verification_token)

        return message_response(message="Email verified successfully")

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


# =============================================================================
# User Profile Endpoints
# =============================================================================


@router.get("/me")
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current authenticated user information.

    Returns user profile information.
    """
    return success_response(
        data={
            "user_id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "is_active": current_user.is_active,
            "is_verified": current_user.is_verified,
            "is_superuser": current_user.is_superuser,
            "created_at": current_user.created_at,
            "preferences": current_user.preferences,
        }
    )


@router.put("/me")
async def update_current_user_profile(
    update_request: UpdateUserRequest = Body(..., description="Profile update data"),
    current_user: User = Depends(get_current_active_user),
    user_repository: UserRepository = Depends(get_user_repository),
):
    """
    Update current user profile information.

    - **full_name**: Optional new full name
    - **preferences**: Optional user preferences (validated against whitelist)

    Returns updated user information.
    """
    try:
        # Prepare update data (Pydantic validation already applied)
        update_data = update_request.dict(exclude_none=True)

        if not update_data:
            raise ValidationError("No update data provided")

        # Update user
        updated_user = await user_repository.update(str(current_user.id), update_data)

        if not updated_user:
            raise NotFoundError("User not found")

        return success_response(
            data={
                "user_id": str(updated_user.id),
                "email": updated_user.email,
                "full_name": updated_user.full_name,
                "preferences": updated_user.preferences,
                "updated_at": updated_user.updated_at,
            },
            message="Profile updated successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


# =============================================================================
# API Key Management Endpoints
# =============================================================================


@router.post("/api-keys", status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: Request,
    name: str = Body(..., description="API key name/description"),
    expires_in_days: Optional[int] = Body(None, description="Expiration in days"),
    current_user: User = Depends(get_current_verified_user),
    api_key_service: ApiKeyService = Depends(get_api_key_service),
):
    """
    Create a new API key for programmatic access.

    - **name**: Descriptive name for the API key
    - **expires_in_days**: Optional expiration period (null = never expires)

    Returns the API key (shown only once) and metadata.
    IMPORTANT: Save the API key immediately, it won't be shown again.
    """
    try:
        # Extract request context for audit logging
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        result = await api_key_service.create_api_key(
            user_id=str(current_user.id),
            name=name,
            expires_in_days=expires_in_days,
        )

        # Log API key creation
        await AuditLogger.log_event(
            event_type=AuditEventType.API_KEY_CREATED,
            user_id=str(current_user.id),
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type="api_key",
            resource_id=result.get("api_key_id"),
            success=True,
            details={
                "name": name,
                "expires_in_days": expires_in_days,
                "expires_at": result.get("expires_at"),
            },
        )

        return success_response(
            data=result,
            message="API key created successfully. Save it now - it won't be shown again!",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )


@router.get("/api-keys")
async def list_api_keys(
    include_revoked: bool = Query(False, description="Include revoked keys"),
    current_user: User = Depends(get_current_verified_user),
    api_key_service: ApiKeyService = Depends(get_api_key_service),
):
    """
    List user's API keys.

    - **include_revoked**: Include revoked keys (default: False)

    Returns list of API keys (without the actual key values).
    """
    try:
        api_keys = await api_key_service.list_user_api_keys(
            user_id=str(current_user.id),
            include_revoked=include_revoked,
        )

        # Convert to response format
        api_key_list = [
            {
                "api_key_id": str(key.id),
                "name": key.name,
                "created_at": key.created_at,
                "expires_at": key.expires_at,
                "last_used_at": key.last_used_at,
                "is_revoked": key.is_revoked,
            }
            for key in api_keys
        ]

        return success_response(
            data={"api_keys": api_key_list, "total": len(api_key_list)}
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    request: Request,
    key_id: str,
    current_user: User = Depends(get_current_verified_user),
    api_key_service: ApiKeyService = Depends(get_api_key_service),
):
    """
    Revoke an API key.

    - **key_id**: ID of API key to revoke

    Revoked keys can no longer be used for authentication.
    """
    try:
        # Extract request context for audit logging
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        await api_key_service.revoke_api_key(
            api_key_id=key_id,
            user_id=str(current_user.id),
        )

        # Log API key revocation
        await AuditLogger.log_event(
            event_type=AuditEventType.API_KEY_REVOKED,
            user_id=str(current_user.id),
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type="api_key",
            resource_id=key_id,
            success=True,
        )

        return None

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message,
        )


@router.post("/api-keys/{key_id}/rotate")
async def rotate_api_key(
    request: Request,
    key_id: str,
    current_user: User = Depends(get_current_verified_user),
    api_key_service: ApiKeyService = Depends(get_api_key_service),
):
    """
    Rotate an API key (revoke old, create new).

    - **key_id**: ID of API key to rotate

    Returns new API key (shown only once) with same name and expiration.
    Old key is automatically revoked.
    """
    try:
        # Extract request context for audit logging
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        result = await api_key_service.rotate_api_key(
            api_key_id=key_id,
            user_id=str(current_user.id),
        )

        # Log API key rotation
        await AuditLogger.log_event(
            event_type=AuditEventType.API_KEY_ROTATED,
            user_id=str(current_user.id),
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type="api_key",
            resource_id=key_id,
            success=True,
            details={
                "old_key_id": key_id,
                "new_key_id": result.get("api_key_id"),
                "name": result.get("name"),
            },
        )

        return success_response(
            data=result,
            message="API key rotated successfully. Save the new key - it won't be shown again!",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=e.message,
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )


# =============================================================================
# Account Management Endpoints (Admin)
# =============================================================================


@router.post("/users/{user_id}/unlock")
async def unlock_user_account(
    request: Request,
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    user_repository: UserRepository = Depends(get_user_repository),
):
    """
    Manually unlock a user account (admin only).

    - **user_id**: ID of user to unlock

    Resets failed login attempts and removes account lockout.
    Requires superuser privileges.
    """
    # Check if current user is superuser
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can unlock user accounts",
        )

    try:
        # Extract request context for audit logging
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

        # Get target user
        target_user = await user_repository.get_by_id(user_id)

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Check if user is actually locked
        if not target_user.is_locked() and target_user.failed_login_attempts == 0:
            return message_response(
                message="User account is not locked and has no failed attempts"
            )

        # Store previous state for audit logging
        was_locked = target_user.is_locked()
        previous_failed_attempts = target_user.failed_login_attempts

        # Unlock the account
        target_user.unlock()

        # Save changes
        await user_repository.update(
            user_id,
            {
                "failed_login_attempts": target_user.failed_login_attempts,
                "locked_until": target_user.locked_until,
                "last_failed_login": target_user.last_failed_login,
                "updated_at": target_user.updated_at,
            },
        )

        # Log account unlock event
        await AuditLogger.log_event(
            event_type=AuditEventType.ACCOUNT_UNLOCKED,
            user_id=str(current_user.id),  # Admin who performed the unlock
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type="user",
            resource_id=user_id,
            success=True,
            details={
                "target_user_email": target_user.email,
                "was_locked": was_locked,
                "previous_failed_attempts": previous_failed_attempts,
                "unlocked_by": str(current_user.id),
                "unlocked_by_email": current_user.email,
            },
        )

        return success_response(
            data={
                "user_id": user_id,
                "email": target_user.email,
                "unlocked": True,
            },
            message="User account unlocked successfully",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )

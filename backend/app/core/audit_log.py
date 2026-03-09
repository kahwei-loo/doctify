"""
Audit Log System

Comprehensive security event logging for compliance and forensic analysis.
"""

from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any
import logging
import json

logger = logging.getLogger("security.audit")


class AuditEventType(str, Enum):
    """Audit event types for security tracking."""

    # Authentication Events
    LOGIN_SUCCESS = "auth.login.success"
    LOGIN_FAILED = "auth.login.failed"
    LOGOUT = "auth.logout"
    PASSWORD_CHANGED = "auth.password_changed"
    PASSWORD_RESET_REQUESTED = "auth.password_reset_requested"
    PASSWORD_RESET_COMPLETED = "auth.password_reset_completed"
    EMAIL_VERIFIED = "auth.email_verified"
    ACCOUNT_LOCKED = "auth.account_locked"
    ACCOUNT_UNLOCKED = "auth.account_unlocked"

    # API Key Events
    API_KEY_CREATED = "api_key.created"
    API_KEY_REVOKED = "api_key.revoked"
    API_KEY_ROTATED = "api_key.rotated"
    API_KEY_USED = "api_key.used"

    # Authorization Events
    PERMISSION_GRANTED = "permission.granted"
    PERMISSION_REVOKED = "permission.revoked"
    UNAUTHORIZED_ACCESS = "permission.unauthorized"
    FORBIDDEN_ACCESS = "permission.forbidden"

    # Token Events
    TOKEN_CREATED = "token.created"
    TOKEN_REVOKED = "token.revoked"
    TOKEN_BLACKLISTED = "token.blacklisted"

    # Data Events
    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_DOWNLOADED = "document.downloaded"
    DOCUMENT_DELETED = "document.deleted"
    DOCUMENT_SHARED = "document.shared"
    DOCUMENT_PROCESSED = "document.processed"

    # Security Events
    RATE_LIMIT_EXCEEDED = "security.rate_limit_exceeded"
    SUSPICIOUS_ACTIVITY = "security.suspicious_activity"
    INJECTION_ATTEMPT = "security.injection_attempt"
    INVALID_INPUT = "security.invalid_input"
    CSRF_DETECTED = "security.csrf_detected"

    # User Profile Events
    PROFILE_UPDATED = "user.profile_updated"
    PREFERENCES_CHANGED = "user.preferences_changed"


class AuditLogger:
    """
    Security audit logging service.

    Provides structured logging for security events with comprehensive
    context capture for compliance and forensic analysis.
    """

    @staticmethod
    async def log_event(
        event_type: AuditEventType,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        success: bool = True,
        severity: str = "info",
    ) -> None:
        """
        Log a security audit event.

        Args:
            event_type: Type of security event
            user_id: User ID (if applicable)
            ip_address: Client IP address
            user_agent: Client User-Agent string
            resource_type: Type of resource affected (document, user, etc.)
            resource_id: ID of affected resource
            details: Additional event-specific details
            success: Whether the operation succeeded
            severity: Log severity (debug, info, warning, error, critical)

        Example:
            await AuditLogger.log_event(
                event_type=AuditEventType.LOGIN_SUCCESS,
                user_id="user_123",
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0...",
                success=True,
                severity="info"
            )
        """
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type.value,
            "user_id": user_id,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "success": success,
            "severity": severity,
            "details": details or {},
        }

        # Create structured log message
        log_message = f"Audit: {event_type.value}"

        # Log at appropriate level with structured data
        log_level = getattr(logging, severity.upper(), logging.INFO)

        if success:
            logger.log(
                log_level,
                log_message,
                extra={
                    "audit_event": log_entry,
                    "event_json": json.dumps(log_entry, default=str),
                },
            )
        else:
            logger.log(
                max(log_level, logging.WARNING),  # Failed events are at least warnings
                f"{log_message} FAILED",
                extra={
                    "audit_event": log_entry,
                    "event_json": json.dumps(log_entry, default=str),
                },
            )

    @staticmethod
    async def log_authentication(
        event_type: AuditEventType,
        email: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        failure_reason: Optional[str] = None,
        lockout_info: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Log authentication-related events (convenience method).

        Args:
            event_type: Authentication event type
            email: User email
            user_id: User ID (if known)
            ip_address: Client IP address
            user_agent: Client User-Agent
            success: Whether authentication succeeded
            failure_reason: Reason for failure (if applicable)
            lockout_info: Account lockout information (if applicable)
        """
        details = {
            "email": email,
        }

        if failure_reason:
            details["failure_reason"] = failure_reason

        if lockout_info:
            details["lockout_info"] = lockout_info

        severity = "info" if success else "warning"

        await AuditLogger.log_event(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type="user",
            resource_id=user_id,
            details=details,
            success=success,
            severity=severity,
        )

    @staticmethod
    async def log_security_event(
        event_type: AuditEventType,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        threat_details: Optional[Dict[str, Any]] = None,
        severity: str = "warning",
    ) -> None:
        """
        Log security threats and suspicious activities (convenience method).

        Args:
            event_type: Security event type
            user_id: User ID (if authenticated)
            ip_address: Client IP address
            user_agent: Client User-Agent
            threat_details: Details about the security threat
            severity: Severity level (warning, error, critical)
        """
        await AuditLogger.log_event(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=threat_details or {},
            success=False,  # Security events are always failures
            severity=severity,
        )

    @staticmethod
    async def log_data_access(
        event_type: AuditEventType,
        user_id: str,
        resource_type: str,
        resource_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        operation_details: Optional[Dict[str, Any]] = None,
        success: bool = True,
    ) -> None:
        """
        Log data access events (convenience method).

        Args:
            event_type: Data event type
            user_id: User accessing the data
            resource_type: Type of resource (document, project, etc.)
            resource_id: ID of the resource
            ip_address: Client IP address
            user_agent: Client User-Agent
            operation_details: Operation-specific details
            success: Whether the operation succeeded
        """
        await AuditLogger.log_event(
            event_type=event_type,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource_type=resource_type,
            resource_id=resource_id,
            details=operation_details or {},
            success=success,
            severity="info",
        )

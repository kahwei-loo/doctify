"""
Storage Service Factory

Factory for creating storage service instances based on configuration.
"""

from typing import Optional

from app.services.storage.base import BaseStorageService
from app.services.storage.local import LocalStorageService
from app.services.storage.s3 import S3StorageService
from app.core.config import get_settings
from app.core.exceptions import ValidationError

settings = get_settings()


def get_storage_service(
    storage_type: Optional[str] = None,
) -> BaseStorageService:
    """
    Get storage service instance based on configuration.

    Args:
        storage_type: Optional override for storage type ('local' or 's3')

    Returns:
        Storage service instance

    Raises:
        ValidationError: If storage type is invalid or configuration is missing
    """
    # Use override or default from settings
    storage_type = storage_type or getattr(settings, "STORAGE_TYPE", "local")

    if storage_type == "local":
        return _create_local_storage()
    elif storage_type == "s3":
        return _create_s3_storage()
    else:
        raise ValidationError(
            f"Invalid storage type: {storage_type}",
            details={"valid_types": ["local", "s3"]},
        )


def _create_local_storage() -> LocalStorageService:
    """
    Create local filesystem storage service.

    Returns:
        LocalStorageService instance

    Raises:
        ValidationError: If configuration is missing
    """
    # Try UPLOAD_DIR first (from config), then UPLOAD_DIRECTORY for backwards compatibility
    upload_directory = getattr(settings, "UPLOAD_DIR", None) or getattr(
        settings, "UPLOAD_DIRECTORY", None
    )

    if not upload_directory:
        raise ValidationError(
            "UPLOAD_DIR is required for local storage",
            details={"storage_type": "local"},
        )

    return LocalStorageService(base_directory=upload_directory)


def _create_s3_storage() -> S3StorageService:
    """
    Create S3 storage service.

    Returns:
        S3StorageService instance

    Raises:
        ValidationError: If configuration is missing
        ImportError: If boto3 is not installed
    """
    bucket_name = getattr(settings, "S3_BUCKET_NAME", None)
    region_name = getattr(settings, "S3_REGION_NAME", "us-east-1")
    endpoint_url = getattr(settings, "S3_ENDPOINT_URL", None)
    access_key_id = getattr(settings, "S3_ACCESS_KEY_ID", None)
    secret_access_key = getattr(settings, "S3_SECRET_ACCESS_KEY", None)

    if not bucket_name:
        raise ValidationError(
            "S3_BUCKET_NAME is required for S3 storage",
            details={"storage_type": "s3"},
        )

    return S3StorageService(
        bucket_name=bucket_name,
        region_name=region_name,
        endpoint_url=endpoint_url,
        access_key_id=access_key_id,
        secret_access_key=secret_access_key,
    )

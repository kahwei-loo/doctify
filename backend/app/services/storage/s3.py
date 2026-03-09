"""
S3 Storage Service

Implementation for AWS S3 or S3-compatible storage operations.
"""

from typing import Optional, List
from pathlib import Path
import mimetypes

from app.services.storage.base import BaseStorageService
from app.core.exceptions import FileProcessingError

# Optional dependencies for S3 storage
try:
    import boto3
    from botocore.exceptions import ClientError

    S3_AVAILABLE = True
except ImportError:
    S3_AVAILABLE = False


class S3StorageService(BaseStorageService):
    """
    S3 storage implementation for cloud file storage.

    Supports AWS S3 and S3-compatible services (MinIO, DigitalOcean Spaces, etc.).
    """

    def __init__(
        self,
        bucket_name: str,
        region_name: str = "us-east-1",
        endpoint_url: Optional[str] = None,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
    ):
        """
        Initialize S3 storage service.

        Args:
            bucket_name: S3 bucket name
            region_name: AWS region name
            endpoint_url: Optional custom endpoint (for S3-compatible services)
            access_key_id: Optional AWS access key ID
            secret_access_key: Optional AWS secret access key

        Raises:
            ImportError: If boto3 is not installed
        """
        if not S3_AVAILABLE:
            raise ImportError(
                "boto3 is required for S3 storage. Install with: pip install boto3"
            )

        self.bucket_name = bucket_name
        self.region_name = region_name

        # Initialize S3 client
        self.s3_client = boto3.client(
            "s3",
            region_name=region_name,
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
        )

        # Verify bucket exists
        try:
            self.s3_client.head_bucket(Bucket=bucket_name)
        except ClientError as e:
            raise FileProcessingError(
                f"S3 bucket not accessible: {str(e)}",
                details={"bucket_name": bucket_name, "error": str(e)},
            )

    def _get_content_type(self, file_path: str) -> str:
        """
        Guess content type from file extension.

        Args:
            file_path: File path

        Returns:
            MIME type
        """
        content_type, _ = mimetypes.guess_type(file_path)
        return content_type or "application/octet-stream"

    async def save_file(
        self,
        file_content: bytes,
        file_path: str,
    ) -> str:
        """
        Upload file to S3.

        Args:
            file_content: File content as bytes
            file_path: S3 object key (path)

        Returns:
            S3 object key

        Raises:
            FileProcessingError: If upload fails
        """
        try:
            content_type = self._get_content_type(file_path)

            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_path,
                Body=file_content,
                ContentType=content_type,
            )

            return file_path

        except ClientError as e:
            raise FileProcessingError(
                f"Failed to upload file to S3: {str(e)}",
                details={
                    "file_path": file_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def read_file(
        self,
        file_path: str,
    ) -> bytes:
        """
        Download file from S3.

        Args:
            file_path: S3 object key

        Returns:
            File content as bytes

        Raises:
            FileProcessingError: If download fails
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=file_path,
            )

            return response["Body"].read()

        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                raise FileProcessingError(
                    "File not found in S3",
                    details={"file_path": file_path, "bucket": self.bucket_name},
                )
            raise FileProcessingError(
                f"Failed to download file from S3: {str(e)}",
                details={
                    "file_path": file_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def delete_file(
        self,
        file_path: str,
    ) -> bool:
        """
        Delete file from S3.

        Args:
            file_path: S3 object key

        Returns:
            True if deleted successfully

        Raises:
            FileProcessingError: If delete fails
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_path,
            )
            return True

        except ClientError as e:
            raise FileProcessingError(
                f"Failed to delete file from S3: {str(e)}",
                details={
                    "file_path": file_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def file_exists(
        self,
        file_path: str,
    ) -> bool:
        """
        Check if file exists in S3.

        Args:
            file_path: S3 object key

        Returns:
            True if file exists
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=file_path,
            )
            return True

        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                return False
            # Other errors should raise
            raise FileProcessingError(
                f"Failed to check file existence in S3: {str(e)}",
                details={
                    "file_path": file_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def get_file_size(
        self,
        file_path: str,
    ) -> int:
        """
        Get file size from S3.

        Args:
            file_path: S3 object key

        Returns:
            File size in bytes

        Raises:
            FileProcessingError: If file not found
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=file_path,
            )
            return response["ContentLength"]

        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                raise FileProcessingError(
                    "File not found in S3",
                    details={"file_path": file_path, "bucket": self.bucket_name},
                )
            raise FileProcessingError(
                f"Failed to get file size from S3: {str(e)}",
                details={
                    "file_path": file_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def list_files(
        self,
        directory: str,
        pattern: Optional[str] = None,
    ) -> List[str]:
        """
        List files in S3 prefix (directory).

        Args:
            directory: S3 prefix
            pattern: Not supported for S3 (ignored)

        Returns:
            List of S3 object keys
        """
        try:
            # Ensure directory ends with /
            prefix = directory.rstrip("/") + "/" if directory else ""

            files = []
            paginator = self.s3_client.get_paginator("list_objects_v2")

            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
                if "Contents" in page:
                    for obj in page["Contents"]:
                        # Only include files, not "directories"
                        if not obj["Key"].endswith("/"):
                            files.append(obj["Key"])

            return files

        except ClientError as e:
            raise FileProcessingError(
                f"Failed to list files in S3: {str(e)}",
                details={
                    "directory": directory,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def move_file(
        self,
        source_path: str,
        destination_path: str,
    ) -> str:
        """
        Move file in S3 (copy then delete).

        Args:
            source_path: Source S3 key
            destination_path: Destination S3 key

        Returns:
            Destination S3 key

        Raises:
            FileProcessingError: If move fails
        """
        try:
            # Copy object
            copy_source = {"Bucket": self.bucket_name, "Key": source_path}
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=destination_path,
            )

            # Delete original
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=source_path,
            )

            return destination_path

        except ClientError as e:
            raise FileProcessingError(
                f"Failed to move file in S3: {str(e)}",
                details={
                    "source": source_path,
                    "destination": destination_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def copy_file(
        self,
        source_path: str,
        destination_path: str,
    ) -> str:
        """
        Copy file in S3.

        Args:
            source_path: Source S3 key
            destination_path: Destination S3 key

        Returns:
            Destination S3 key

        Raises:
            FileProcessingError: If copy fails
        """
        try:
            copy_source = {"Bucket": self.bucket_name, "Key": source_path}
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=destination_path,
            )

            return destination_path

        except ClientError as e:
            raise FileProcessingError(
                f"Failed to copy file in S3: {str(e)}",
                details={
                    "source": source_path,
                    "destination": destination_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def get_file_url(
        self,
        file_path: str,
        expires_in: Optional[int] = 3600,
    ) -> str:
        """
        Generate presigned URL for file access.

        Args:
            file_path: S3 object key
            expires_in: URL expiration in seconds (default: 1 hour)

        Returns:
            Presigned URL
        """
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": file_path},
                ExpiresIn=expires_in,
            )
            return url

        except ClientError as e:
            raise FileProcessingError(
                f"Failed to generate presigned URL: {str(e)}",
                details={
                    "file_path": file_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

    async def create_directory(
        self,
        directory_path: str,
    ) -> bool:
        """
        Create directory placeholder in S3.

        Note: S3 doesn't have true directories, but we can create a placeholder object.

        Args:
            directory_path: Directory path

        Returns:
            True (S3 directories don't need explicit creation)
        """
        # S3 doesn't require explicit directory creation
        # Directories are implied by object keys with / separators
        return True

    async def delete_directory(
        self,
        directory_path: str,
        recursive: bool = False,
    ) -> bool:
        """
        Delete all objects with prefix (directory).

        Args:
            directory_path: Directory prefix
            recursive: If True, delete all objects with prefix

        Returns:
            True if deleted successfully

        Raises:
            FileProcessingError: If delete fails
        """
        if not recursive:
            raise FileProcessingError(
                "S3 directory deletion requires recursive=True",
                details={"directory_path": directory_path},
            )

        try:
            # Ensure directory ends with /
            prefix = directory_path.rstrip("/") + "/" if directory_path else ""

            # List and delete all objects with prefix
            paginator = self.s3_client.get_paginator("list_objects_v2")

            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
                if "Contents" in page:
                    objects_to_delete = [
                        {"Key": obj["Key"]} for obj in page["Contents"]
                    ]

                    if objects_to_delete:
                        self.s3_client.delete_objects(
                            Bucket=self.bucket_name,
                            Delete={"Objects": objects_to_delete},
                        )

            return True

        except ClientError as e:
            raise FileProcessingError(
                f"Failed to delete directory in S3: {str(e)}",
                details={
                    "directory_path": directory_path,
                    "bucket": self.bucket_name,
                    "error": str(e),
                },
            )

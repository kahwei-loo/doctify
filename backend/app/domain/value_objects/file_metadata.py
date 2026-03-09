"""
File Metadata Value Object

Represents file metadata as an immutable value object.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional


@dataclass(frozen=True)
class FileMetadata:
    """
    Immutable file metadata.

    Encapsulates file information including size, type, and hash.
    """

    filename: str
    file_size: int
    mime_type: str
    file_hash: str
    encoding: Optional[str] = None

    def __post_init__(self):
        """Validate file metadata values."""
        if not self.filename:
            raise ValueError("Filename cannot be empty")

        if self.file_size < 0:
            raise ValueError("File size cannot be negative")

        if not self.mime_type:
            raise ValueError("MIME type cannot be empty")

        if not self.file_hash:
            raise ValueError("File hash cannot be empty")

    @classmethod
    def create(
        cls,
        filename: str,
        file_size: int,
        mime_type: str,
        file_hash: str,
        encoding: Optional[str] = None,
    ) -> "FileMetadata":
        """
        Factory method to create FileMetadata.

        Args:
            filename: Original filename
            file_size: File size in bytes
            mime_type: MIME type
            file_hash: SHA-256 hash
            encoding: Optional encoding

        Returns:
            FileMetadata instance
        """
        return cls(
            filename=filename,
            file_size=file_size,
            mime_type=mime_type,
            file_hash=file_hash,
            encoding=encoding,
        )

    def get_file_extension(self) -> str:
        """
        Extract file extension from filename.

        Returns:
            File extension (lowercase, without dot)
        """
        if "." in self.filename:
            return self.filename.rsplit(".", 1)[-1].lower()
        return ""

    def is_image(self) -> bool:
        """Check if file is an image."""
        return self.mime_type.startswith("image/")

    def is_pdf(self) -> bool:
        """Check if file is a PDF."""
        return self.mime_type == "application/pdf"

    def is_document(self) -> bool:
        """Check if file is a document (PDF, Word, Excel, etc.)."""
        document_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ]
        return self.mime_type in document_types

    def get_size_mb(self) -> float:
        """
        Get file size in megabytes.

        Returns:
            File size in MB (rounded to 2 decimals)
        """
        return round(self.file_size / (1024 * 1024), 2)

    def get_size_kb(self) -> float:
        """
        Get file size in kilobytes.

        Returns:
            File size in KB (rounded to 2 decimals)
        """
        return round(self.file_size / 1024, 2)

    def get_human_readable_size(self) -> str:
        """
        Get human-readable file size.

        Returns:
            File size with appropriate unit (B, KB, MB, GB)
        """
        size = self.file_size

        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{self.get_size_kb()} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{self.get_size_mb()} MB"
        else:
            gb_size = round(size / (1024 * 1024 * 1024), 2)
            return f"{gb_size} GB"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "filename": self.filename,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "file_hash": self.file_hash,
            "encoding": self.encoding,
            "extension": self.get_file_extension(),
            "human_readable_size": self.get_human_readable_size(),
        }

    def __str__(self) -> str:
        return f"FileMetadata(filename={self.filename}, size={self.get_human_readable_size()}, type={self.mime_type})"


@dataclass(frozen=True)
class DocumentDimensions:
    """
    Immutable document dimensions.

    Represents page dimensions for document files.
    """

    width: int
    height: int
    unit: str = "px"

    def __post_init__(self):
        """Validate dimensions."""
        if self.width <= 0:
            raise ValueError("Width must be positive")

        if self.height <= 0:
            raise ValueError("Height must be positive")

        valid_units = ["px", "pt", "in", "cm", "mm"]
        if self.unit not in valid_units:
            raise ValueError(f"Unit must be one of: {', '.join(valid_units)}")

    def get_aspect_ratio(self) -> float:
        """
        Calculate aspect ratio.

        Returns:
            Width divided by height (rounded to 2 decimals)
        """
        return round(self.width / self.height, 2)

    def is_portrait(self) -> bool:
        """Check if dimensions represent portrait orientation."""
        return self.height > self.width

    def is_landscape(self) -> bool:
        """Check if dimensions represent landscape orientation."""
        return self.width > self.height

    def is_square(self) -> bool:
        """Check if dimensions are square."""
        return self.width == self.height

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "width": self.width,
            "height": self.height,
            "unit": self.unit,
            "aspect_ratio": self.get_aspect_ratio(),
            "orientation": (
                "portrait"
                if self.is_portrait()
                else "landscape" if self.is_landscape() else "square"
            ),
        }

    def __str__(self) -> str:
        return f"DocumentDimensions({self.width}x{self.height} {self.unit})"

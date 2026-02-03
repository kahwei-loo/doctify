"""
File Test Fixtures

Provides functions to create test files (PDF, images, etc.) for upload/processing tests.
"""

import io
import struct
import zlib
from typing import Optional


# =============================================================================
# File Creation Functions
# =============================================================================

def create_test_pdf(
    content: str = "Test PDF Document",
    page_count: int = 1,
) -> io.BytesIO:
    """
    Create a minimal test PDF file.

    Args:
        content: Text content for the PDF
        page_count: Number of pages (simplified - all have same content)

    Returns:
        BytesIO buffer containing a valid PDF
    """
    try:
        # Try to use reportlab for a proper PDF
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)

        for i in range(page_count):
            p.drawString(100, 750, f"{content} - Page {i + 1}")
            if i < page_count - 1:
                p.showPage()

        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer

    except ImportError:
        # Create a minimal valid PDF without reportlab
        buffer = io.BytesIO()

        # PDF Header
        buffer.write(b"%PDF-1.4\n")

        # Catalog object
        buffer.write(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")

        # Pages object
        buffer.write(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

        # Page object
        buffer.write(b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n")

        # Cross-reference table
        buffer.write(b"xref\n0 4\n")
        buffer.write(b"0000000000 65535 f \n")
        buffer.write(b"0000000009 00000 n \n")
        buffer.write(b"0000000058 00000 n \n")
        buffer.write(b"0000000115 00000 n \n")

        # Trailer
        buffer.write(b"trailer\n<< /Size 4 /Root 1 0 R >>\n")
        buffer.write(b"startxref\n193\n%%EOF")

        buffer.seek(0)
        return buffer


def create_test_image(
    width: int = 100,
    height: int = 100,
    color: str = "red",
    format: str = "PNG",
) -> io.BytesIO:
    """
    Create a test image file.

    Args:
        width: Image width in pixels
        height: Image height in pixels
        color: Fill color name
        format: Image format (PNG, JPEG, etc.)

    Returns:
        BytesIO buffer containing the image
    """
    try:
        from PIL import Image

        image = Image.new("RGB", (width, height), color=color)
        buffer = io.BytesIO()
        image.save(buffer, format=format)
        buffer.seek(0)
        return buffer

    except ImportError:
        # Create a minimal PNG without PIL
        buffer = io.BytesIO()

        def png_chunk(chunk_type: bytes, data: bytes) -> bytes:
            chunk_len = struct.pack(">I", len(data))
            chunk_crc = struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
            return chunk_len + chunk_type + data + chunk_crc

        # PNG signature
        buffer.write(b"\x89PNG\r\n\x1a\n")

        # IHDR chunk (image header)
        ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
        buffer.write(png_chunk(b"IHDR", ihdr_data))

        # Create image data (simple red pixels)
        raw_lines = []
        for _ in range(height):
            line = b"\x00"  # filter byte (none)
            line += b"\xff\x00\x00" * width  # RGB red pixels
            raw_lines.append(line)

        raw_data = b"".join(raw_lines)
        compressed = zlib.compress(raw_data)
        buffer.write(png_chunk(b"IDAT", compressed))

        # IEND chunk
        buffer.write(png_chunk(b"IEND", b""))

        buffer.seek(0)
        return buffer


def create_test_text_file(
    content: str = "This is test content.",
    encoding: str = "utf-8",
) -> io.BytesIO:
    """
    Create a test text file.

    Args:
        content: Text content
        encoding: Text encoding

    Returns:
        BytesIO buffer containing the text file
    """
    buffer = io.BytesIO()
    buffer.write(content.encode(encoding))
    buffer.seek(0)
    return buffer


def create_test_docx() -> io.BytesIO:
    """
    Create a minimal test DOCX file.

    Returns:
        BytesIO buffer containing a valid DOCX
    """
    import zipfile
    from xml.etree import ElementTree as ET

    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # [Content_Types].xml
        content_types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""
        zf.writestr("[Content_Types].xml", content_types)

        # _rels/.rels
        rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
        zf.writestr("_rels/.rels", rels)

        # word/document.xml
        document = """<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        <w:p>
            <w:r>
                <w:t>Test Document Content</w:t>
            </w:r>
        </w:p>
    </w:body>
</w:document>"""
        zf.writestr("word/document.xml", document)

    buffer.seek(0)
    return buffer


# =============================================================================
# File Factory Class
# =============================================================================

class FileFactory:
    """
    Factory class for creating test files with various configurations.
    """

    @classmethod
    def create_pdf(cls, **kwargs) -> io.BytesIO:
        """Create a test PDF file."""
        return create_test_pdf(**kwargs)

    @classmethod
    def create_image(cls, format: str = "PNG", **kwargs) -> io.BytesIO:
        """Create a test image file."""
        return create_test_image(format=format, **kwargs)

    @classmethod
    def create_png(cls, **kwargs) -> io.BytesIO:
        """Create a test PNG image."""
        return create_test_image(format="PNG", **kwargs)

    @classmethod
    def create_jpeg(cls, **kwargs) -> io.BytesIO:
        """Create a test JPEG image."""
        return create_test_image(format="JPEG", **kwargs)

    @classmethod
    def create_text(cls, **kwargs) -> io.BytesIO:
        """Create a test text file."""
        return create_test_text_file(**kwargs)

    @classmethod
    def create_docx(cls) -> io.BytesIO:
        """Create a test DOCX file."""
        return create_test_docx()

    @classmethod
    def create_large_file(cls, size_mb: int = 10) -> io.BytesIO:
        """
        Create a large test file for testing file size limits.

        Args:
            size_mb: File size in megabytes

        Returns:
            BytesIO buffer with random data
        """
        import os

        buffer = io.BytesIO()
        buffer.write(os.urandom(size_mb * 1024 * 1024))
        buffer.seek(0)
        return buffer

    @classmethod
    def create_empty_file(cls) -> io.BytesIO:
        """Create an empty file."""
        return io.BytesIO()

    @classmethod
    def create_corrupted_pdf(cls) -> io.BytesIO:
        """Create a corrupted PDF file for error handling tests."""
        buffer = io.BytesIO()
        buffer.write(b"%PDF-1.4\nInvalid PDF content here\n%%EOF")
        buffer.seek(0)
        return buffer


# =============================================================================
# File Content Fixtures
# =============================================================================

SAMPLE_TEXT_CONTENT = """
This is a sample document for testing OCR extraction.

Section 1: Introduction
Lorem ipsum dolor sit amet, consectetur adipiscing elit.

Section 2: Content
The quick brown fox jumps over the lazy dog.

Section 3: Conclusion
Testing document processing capabilities.
"""

SAMPLE_MULTI_LANGUAGE_CONTENT = {
    "en": "Hello, this is English text.",
    "es": "Hola, este es texto en espanol.",
    "fr": "Bonjour, ceci est un texte en francais.",
    "de": "Hallo, dies ist deutscher Text.",
    "zh": "Hello, this is Chinese text placeholder.",
    "ja": "Hello, this is Japanese text placeholder.",
}

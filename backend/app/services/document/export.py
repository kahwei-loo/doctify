"""
Document Export Service

Handles exporting extracted document data to various formats.
"""

import json
import csv
import io
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.services.base import BaseService
from app.db.repositories.document import DocumentRepository
from app.db.models.document import Document
from app.core.exceptions import ValidationError, FileProcessingError


class DocumentExportService(BaseService[Document, DocumentRepository]):
    """
    Service for exporting document data to various formats.

    Supports JSON, CSV, and XML export formats.
    """

    def __init__(
        self,
        document_repository: DocumentRepository,
    ):
        """
        Initialize export service.

        Args:
            document_repository: Document repository
        """
        super().__init__(document_repository)

    async def export_document(
        self,
        document_id: str,
        export_format: str = "json",
        include_metadata: bool = True,
    ) -> bytes:
        """
        Export document data in specified format.

        Args:
            document_id: Document ID
            export_format: Export format (json, csv, xml)
            include_metadata: Whether to include document metadata

        Returns:
            Exported data as bytes

        Raises:
            ValidationError: If format is invalid or document has no results
        """
        # Validate format
        valid_formats = ["json", "csv", "xml"]
        if export_format.lower() not in valid_formats:
            raise ValidationError(
                f"Invalid export format: {export_format}",
                details={"valid_formats": valid_formats},
            )

        # Get document (extraction results stored in document)
        document = await self.get_by_id(document_id)

        if not document.extracted_data:
            raise ValidationError(
                "No extraction results available for export",
                details={"document_id": document_id},
            )

        # Prepare export data
        export_data = self._prepare_export_data(document, include_metadata)

        # Export in specified format
        if export_format.lower() == "json":
            return await self._export_json(export_data)
        elif export_format.lower() == "csv":
            return await self._export_csv(export_data)
        elif export_format.lower() == "xml":
            return await self._export_xml(export_data)

    async def export_project(
        self,
        project_id: str,
        export_format: str = "json",
        include_metadata: bool = True,
        status_filter: Optional[str] = None,
    ) -> bytes:
        """
        Export all documents in a project.

        Args:
            project_id: Project ID
            export_format: Export format (json, csv, xml)
            include_metadata: Whether to include document metadata
            status_filter: Optional status filter (e.g., 'completed')

        Returns:
            Exported data as bytes

        Raises:
            ValidationError: If format is invalid
        """
        # Validate format
        valid_formats = ["json", "csv", "xml"]
        if export_format.lower() not in valid_formats:
            raise ValidationError(
                f"Invalid export format: {export_format}",
                details={"valid_formats": valid_formats},
            )

        # Get documents in project
        documents = await self.repository.get_by_project(
            project_id=project_id,
            skip=0,
            limit=1000,
            status=status_filter,
        )

        if not documents:
            raise ValidationError(
                "No documents found for export",
                details={"project_id": project_id, "status_filter": status_filter},
            )

        # Prepare export data for all documents
        export_data_list = []
        for document in documents:
            if document.extracted_data:
                export_data = self._prepare_export_data(document, include_metadata)
                export_data_list.append(export_data)

        if not export_data_list:
            raise ValidationError(
                "No extraction results available for export",
                details={"project_id": project_id},
            )

        # Export in specified format
        if export_format.lower() == "json":
            return await self._export_json_batch(export_data_list)
        elif export_format.lower() == "csv":
            return await self._export_csv_batch(export_data_list)
        elif export_format.lower() == "xml":
            return await self._export_xml_batch(export_data_list)

    def _prepare_export_data(
        self,
        document: Document,
        include_metadata: bool,
    ) -> Dict[str, Any]:
        """
        Prepare document data for export.

        Args:
            document: Document model
            include_metadata: Whether to include metadata

        Returns:
            Export data dictionary
        """
        export_data = {
            "extracted_data": document.extracted_data,
        }

        if include_metadata:
            # Get confidence scores from extraction metadata
            confidence_scores = {}
            if document.extraction_metadata:
                confidence_scores = document.extraction_metadata.get(
                    "confidence_scores", {}
                )

            export_data["metadata"] = {
                "document_id": str(document.id),
                "filename": document.original_filename,
                "file_size": document.file_size,
                "file_type": document.file_type,
                "processed_at": (
                    document.processing_completed_at.isoformat()
                    if document.processing_completed_at
                    else None
                ),
                "confidence_scores": confidence_scores,
            }

        return export_data

    async def _export_json(self, data: Dict[str, Any]) -> bytes:
        """Export single document as JSON."""
        json_str = json.dumps(data, indent=2, ensure_ascii=False, default=str)
        return json_str.encode("utf-8")

    async def _export_json_batch(self, data_list: List[Dict[str, Any]]) -> bytes:
        """Export multiple documents as JSON."""
        json_str = json.dumps(data_list, indent=2, ensure_ascii=False, default=str)
        return json_str.encode("utf-8")

    async def _export_csv(self, data: Dict[str, Any]) -> bytes:
        """Export single document as CSV."""
        output = io.StringIO()
        extracted_data = data.get("extracted_data", {})

        if not extracted_data:
            raise ValidationError("No data to export")

        # Flatten nested data
        flat_data = self._flatten_dict(extracted_data)

        # Add metadata if present
        if "metadata" in data:
            metadata = data["metadata"]
            flat_data.update(
                {
                    f"meta_{key}": value
                    for key, value in metadata.items()
                    if key != "confidence_scores"
                }
            )

        # Write CSV
        writer = csv.DictWriter(output, fieldnames=flat_data.keys())
        writer.writeheader()
        writer.writerow(flat_data)

        return output.getvalue().encode("utf-8")

    async def _export_csv_batch(self, data_list: List[Dict[str, Any]]) -> bytes:
        """Export multiple documents as CSV."""
        if not data_list:
            raise ValidationError("No data to export")

        output = io.StringIO()

        # Collect all unique field names
        all_fields = set()
        flat_data_list = []

        for data in data_list:
            extracted_data = data.get("extracted_data", {})
            flat_data = self._flatten_dict(extracted_data)

            # Add metadata if present
            if "metadata" in data:
                metadata = data["metadata"]
                flat_data.update(
                    {
                        f"meta_{key}": value
                        for key, value in metadata.items()
                        if key != "confidence_scores"
                    }
                )

            all_fields.update(flat_data.keys())
            flat_data_list.append(flat_data)

        # Write CSV
        writer = csv.DictWriter(output, fieldnames=sorted(all_fields))
        writer.writeheader()
        writer.writerows(flat_data_list)

        return output.getvalue().encode("utf-8")

    async def _export_xml(self, data: Dict[str, Any]) -> bytes:
        """Export single document as XML."""
        xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<document>"]

        # Add extracted data
        extracted_data = data.get("extracted_data", {})
        xml_lines.append("  <extracted_data>")
        xml_lines.extend(self._dict_to_xml(extracted_data, indent=4))
        xml_lines.append("  </extracted_data>")

        # Add metadata if present
        if "metadata" in data:
            xml_lines.append("  <metadata>")
            xml_lines.extend(self._dict_to_xml(data["metadata"], indent=4))
            xml_lines.append("  </metadata>")

        xml_lines.append("</document>")

        return "\n".join(xml_lines).encode("utf-8")

    async def _export_xml_batch(self, data_list: List[Dict[str, Any]]) -> bytes:
        """Export multiple documents as XML."""
        xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>', "<documents>"]

        for data in data_list:
            xml_lines.append("  <document>")

            # Add extracted data
            extracted_data = data.get("extracted_data", {})
            xml_lines.append("    <extracted_data>")
            xml_lines.extend(self._dict_to_xml(extracted_data, indent=6))
            xml_lines.append("    </extracted_data>")

            # Add metadata if present
            if "metadata" in data:
                xml_lines.append("    <metadata>")
                xml_lines.extend(self._dict_to_xml(data["metadata"], indent=6))
                xml_lines.append("    </metadata>")

            xml_lines.append("  </document>")

        xml_lines.append("</documents>")

        return "\n".join(xml_lines).encode("utf-8")

    def _flatten_dict(
        self,
        data: Dict[str, Any],
        parent_key: str = "",
        separator: str = "_",
    ) -> Dict[str, Any]:
        """
        Flatten nested dictionary.

        Args:
            data: Dictionary to flatten
            parent_key: Parent key for nested items
            separator: Separator for nested keys

        Returns:
            Flattened dictionary
        """
        items = []

        for key, value in data.items():
            new_key = f"{parent_key}{separator}{key}" if parent_key else key

            if isinstance(value, dict):
                items.extend(self._flatten_dict(value, new_key, separator).items())
            elif isinstance(value, list):
                # Convert list to comma-separated string
                items.append((new_key, ", ".join(str(v) for v in value)))
            else:
                items.append((new_key, value))

        return dict(items)

    def _dict_to_xml(
        self,
        data: Dict[str, Any],
        indent: int = 0,
    ) -> List[str]:
        """
        Convert dictionary to XML lines.

        Args:
            data: Dictionary to convert
            indent: Indentation level

        Returns:
            List of XML lines
        """
        lines = []
        indent_str = " " * indent

        for key, value in data.items():
            # Sanitize key name
            safe_key = key.replace(" ", "_").replace("-", "_")

            if isinstance(value, dict):
                lines.append(f"{indent_str}<{safe_key}>")
                lines.extend(self._dict_to_xml(value, indent + 2))
                lines.append(f"{indent_str}</{safe_key}>")
            elif isinstance(value, list):
                lines.append(f"{indent_str}<{safe_key}>")
                for item in value:
                    if isinstance(item, dict):
                        lines.append(f"{indent_str}  <item>")
                        lines.extend(self._dict_to_xml(item, indent + 4))
                        lines.append(f"{indent_str}  </item>")
                    else:
                        lines.append(
                            f"{indent_str}  <item>{self._escape_xml(str(item))}</item>"
                        )
                lines.append(f"{indent_str}</{safe_key}>")
            else:
                escaped_value = self._escape_xml(str(value))
                lines.append(f"{indent_str}<{safe_key}>{escaped_value}</{safe_key}>")

        return lines

    def _escape_xml(self, text: str) -> str:
        """Escape special XML characters."""
        return (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&apos;")
        )

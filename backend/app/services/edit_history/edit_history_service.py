"""
Edit History Service

Business logic for tracking and managing document extraction result modifications.
Provides audit trail and rollback capability.
"""

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.edit_history import EditHistory
from app.db.models.document import Document


class FieldChange:
    """Represents a single field change."""

    def __init__(
        self,
        field_path: str,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
    ):
        self.field_path = field_path
        self.old_value = old_value
        self.new_value = new_value


class EditHistoryService:
    """Service for managing document edit history."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def track_modification(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        changes: List[FieldChange],
        edit_type: str = "manual",
        source: str = "web",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> List[EditHistory]:
        """
        Record multiple field modifications.

        Args:
            document_id: ID of the document being modified
            user_id: ID of the user making the modification
            changes: List of field changes to record
            edit_type: Type of edit (manual, bulk, rollback, ai_correction)
            source: Source of the edit (web, api, mobile)
            ip_address: IP address of the client
            user_agent: User agent string

        Returns:
            List of created EditHistory records
        """
        records = []
        for change in changes:
            record = EditHistory(
                document_id=document_id,
                user_id=user_id,
                field_path=change.field_path,
                old_value=change.old_value,
                new_value=change.new_value,
                edit_type=edit_type,
                source=source,
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self.session.add(record)
            records.append(record)

        await self.session.commit()
        for record in records:
            await self.session.refresh(record)
        return records

    async def track_single_modification(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        field_path: str,
        old_value: Optional[dict],
        new_value: Optional[dict],
        edit_type: str = "manual",
        source: str = "web",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> EditHistory:
        """
        Record a single field modification.

        Args:
            document_id: ID of the document being modified
            user_id: ID of the user making the modification
            field_path: JSON path to the modified field
            old_value: Previous value
            new_value: New value
            edit_type: Type of edit
            source: Source of the edit
            ip_address: IP address of the client
            user_agent: User agent string

        Returns:
            Created EditHistory record
        """
        record = EditHistory(
            document_id=document_id,
            user_id=user_id,
            field_path=field_path,
            old_value=old_value,
            new_value=new_value,
            edit_type=edit_type,
            source=source,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(record)
        await self.session.commit()
        await self.session.refresh(record)
        return record

    async def get_document_history(
        self,
        document_id: uuid.UUID,
        limit: int = 50,
        offset: int = 0,
        field_path: Optional[str] = None,
        edit_type: Optional[str] = None,
    ) -> List[EditHistory]:
        """
        Get edit history for a document.

        Args:
            document_id: ID of the document
            limit: Maximum number of records to return
            offset: Number of records to skip
            field_path: Filter by field path (optional)
            edit_type: Filter by edit type (optional)

        Returns:
            List of EditHistory records, ordered by created_at descending
        """
        query = (
            select(EditHistory)
            .where(EditHistory.document_id == document_id)
            .order_by(desc(EditHistory.created_at))
        )

        if field_path:
            query = query.where(EditHistory.field_path == field_path)
        if edit_type:
            query = query.where(EditHistory.edit_type == edit_type)

        query = query.offset(offset).limit(limit)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_history_count(
        self,
        document_id: uuid.UUID,
        field_path: Optional[str] = None,
        edit_type: Optional[str] = None,
    ) -> int:
        """
        Get count of edit history records for a document.

        Args:
            document_id: ID of the document
            field_path: Filter by field path (optional)
            edit_type: Filter by edit type (optional)

        Returns:
            Count of matching records
        """
        from sqlalchemy import func

        query = select(func.count(EditHistory.id)).where(
            EditHistory.document_id == document_id
        )

        if field_path:
            query = query.where(EditHistory.field_path == field_path)
        if edit_type:
            query = query.where(EditHistory.edit_type == edit_type)

        result = await self.session.execute(query)
        return result.scalar() or 0

    async def get_entry_by_id(
        self,
        entry_id: uuid.UUID,
    ) -> Optional[EditHistory]:
        """
        Get a single edit history entry by ID.

        Args:
            entry_id: ID of the edit history entry

        Returns:
            EditHistory record or None
        """
        result = await self.session.execute(
            select(EditHistory).where(EditHistory.id == entry_id)
        )
        return result.scalar_one_or_none()

    async def rollback_to_entry(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        entry_id: uuid.UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[EditHistory]:
        """
        Rollback a document field to a previous value.

        Creates a new edit history entry with the rollback change.

        Args:
            document_id: ID of the document
            user_id: ID of the user performing the rollback
            entry_id: ID of the edit history entry to rollback to
            ip_address: IP address of the client
            user_agent: User agent string

        Returns:
            New EditHistory record for the rollback, or None if entry not found
        """
        # Get the entry to rollback to
        entry = await self.get_entry_by_id(entry_id)
        if not entry or entry.document_id != document_id:
            return None

        # Get the document
        result = await self.session.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        if not document:
            return None

        # Get current value at the field path
        current_data = document.extracted_data or {}
        current_value = self._get_value_at_path(current_data, entry.field_path)

        # Set the old value from the entry
        self._set_value_at_path(current_data, entry.field_path, entry.old_value)
        document.extracted_data = current_data

        # Create rollback history entry
        rollback_entry = EditHistory(
            document_id=document_id,
            user_id=user_id,
            field_path=entry.field_path,
            old_value={"value": current_value},
            new_value=entry.old_value,
            edit_type="rollback",
            source="web",
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.session.add(rollback_entry)

        await self.session.commit()
        await self.session.refresh(rollback_entry)
        return rollback_entry

    async def rollback_to_timestamp(
        self,
        document_id: uuid.UUID,
        user_id: uuid.UUID,
        timestamp: datetime,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> List[EditHistory]:
        """
        Rollback all changes to a document after a given timestamp.

        Args:
            document_id: ID of the document
            user_id: ID of the user performing the rollback
            timestamp: Rollback to this point in time
            ip_address: IP address of the client
            user_agent: User agent string

        Returns:
            List of new EditHistory records for the rollbacks
        """
        # Get all edits after the timestamp, ordered newest first
        query = (
            select(EditHistory)
            .where(
                EditHistory.document_id == document_id,
                EditHistory.created_at > timestamp,
            )
            .order_by(desc(EditHistory.created_at))
        )

        result = await self.session.execute(query)
        edits_to_rollback = list(result.scalars().all())

        if not edits_to_rollback:
            return []

        # Get the document
        result = await self.session.execute(
            select(Document).where(Document.id == document_id)
        )
        document = result.scalar_one_or_none()
        if not document:
            return []

        # Apply rollbacks in reverse chronological order
        current_data = document.extracted_data or {}
        rollback_entries = []

        for edit in edits_to_rollback:
            # Get current value
            current_value = self._get_value_at_path(current_data, edit.field_path)

            # Restore old value
            self._set_value_at_path(current_data, edit.field_path, edit.old_value)

            # Record rollback
            rollback_entry = EditHistory(
                document_id=document_id,
                user_id=user_id,
                field_path=edit.field_path,
                old_value={"value": current_value},
                new_value=edit.old_value,
                edit_type="rollback",
                source="web",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            self.session.add(rollback_entry)
            rollback_entries.append(rollback_entry)

        document.extracted_data = current_data
        await self.session.commit()

        for entry in rollback_entries:
            await self.session.refresh(entry)

        return rollback_entries

    def _get_value_at_path(self, data: dict, path: str) -> Optional[dict]:
        """Get a value from nested dict using dot notation path."""
        keys = path.split(".")
        current = data
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return {"value": current}

    def _set_value_at_path(self, data: dict, path: str, value: Optional[dict]) -> None:
        """Set a value in nested dict using dot notation path."""
        keys = path.split(".")
        current = data

        # Navigate to the parent
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]

        # Set the value
        if value is not None and "value" in value:
            current[keys[-1]] = value["value"]
        elif value is not None:
            current[keys[-1]] = value
        else:
            current.pop(keys[-1], None)

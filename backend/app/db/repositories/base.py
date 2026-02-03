"""
Base Repository Pattern Implementation

Provides generic CRUD operations for PostgreSQL with SQLAlchemy 2.0,
type safety, pagination, filtering, and unified error handling.
"""

import uuid
from typing import Generic, TypeVar, Optional, List, Dict, Any, Type, Sequence
from datetime import datetime

from sqlalchemy import select, update, delete, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.base import BaseModel
from app.core.exceptions import (
    NotFoundError,
    ValidationError,
    DatabaseError,
)

# Type variable for model classes
ModelType = TypeVar("ModelType", bound=BaseModel)


class BaseRepository(Generic[ModelType]):
    """
    Generic base repository for PostgreSQL with SQLAlchemy.

    Provides common CRUD operations with async support, type safety,
    pagination, filtering, and error handling.
    """

    def __init__(self, session: AsyncSession, model_class: Type[ModelType]):
        """
        Initialize repository with database session and model class.

        Args:
            session: SQLAlchemy async session
            model_class: SQLAlchemy model class
        """
        self.session = session
        self.model_class = model_class

    async def create(self, data: Dict[str, Any]) -> ModelType:
        """
        Create a new record in the database.

        Args:
            data: Record data as dictionary

        Returns:
            Created model instance

        Raises:
            ValidationError: If data validation fails
            DatabaseError: If database operation fails
        """
        try:
            # Create model instance
            instance = self.model_class(**data)

            # Add to session and flush to get ID
            self.session.add(instance)
            await self.session.flush()
            await self.session.refresh(instance)

            return instance

        except Exception as e:
            await self.session.rollback()
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to create record: {str(e)}")

    async def get_by_id(self, record_id: uuid.UUID | str) -> Optional[ModelType]:
        """
        Retrieve a record by ID.

        Args:
            record_id: Record UUID (string or UUID object)

        Returns:
            Model instance if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            if isinstance(record_id, str):
                record_id = uuid.UUID(record_id)

            stmt = select(self.model_class).where(self.model_class.id == record_id)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()

        except ValueError as e:
            raise ValidationError(f"Invalid UUID format: {str(e)}")
        except Exception as e:
            raise DatabaseError(f"Failed to retrieve record: {str(e)}")

    async def get_by_field(self, field: str, value: Any) -> Optional[ModelType]:
        """
        Retrieve a record by a specific field value.

        Args:
            field: Field name
            value: Field value to search for

        Returns:
            Model instance if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
            ValidationError: If field name is invalid
        """
        try:
            # Validate field exists on model
            if not hasattr(self.model_class, field):
                raise ValidationError(f"Invalid field name: {field}")

            column = getattr(self.model_class, field)
            stmt = select(self.model_class).where(column == value)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to retrieve record by {field}: {str(e)}")

    async def list(
        self,
        filters: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
        load_relationships: Optional[List[str]] = None,
    ) -> List[ModelType]:
        """
        List records with filtering, pagination, and sorting.

        Args:
            filters: Dictionary of field-value filters
            skip: Number of records to skip (for pagination)
            limit: Maximum number of records to return
            sort_by: Field name to sort by
            sort_order: Sort order ('asc' or 'desc')
            load_relationships: List of relationship names to eagerly load

        Returns:
            List of model instances

        Raises:
            DatabaseError: If database operation fails
            ValidationError: If filters or sort field are invalid
        """
        try:
            stmt = select(self.model_class)

            # Apply filters
            if filters:
                conditions = []
                for field, value in filters.items():
                    if not hasattr(self.model_class, field):
                        raise ValidationError(f"Invalid filter field: {field}")
                    column = getattr(self.model_class, field)
                    conditions.append(column == value)
                if conditions:
                    stmt = stmt.where(and_(*conditions))

            # Apply eager loading for relationships
            if load_relationships:
                for rel_name in load_relationships:
                    if hasattr(self.model_class, rel_name):
                        stmt = stmt.options(selectinload(getattr(self.model_class, rel_name)))

            # Apply sorting
            if sort_by:
                if not hasattr(self.model_class, sort_by):
                    raise ValidationError(f"Invalid sort field: {sort_by}")
                column = getattr(self.model_class, sort_by)
                if sort_order.lower() == "asc":
                    stmt = stmt.order_by(column.asc())
                else:
                    stmt = stmt.order_by(column.desc())

            # Apply pagination
            stmt = stmt.offset(skip).limit(limit)

            result = await self.session.execute(stmt)
            return list(result.scalars().all())

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to list records: {str(e)}")

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records matching the filters.

        Args:
            filters: Dictionary of field-value filters

        Returns:
            Number of matching records

        Raises:
            DatabaseError: If database operation fails
            ValidationError: If filters are invalid
        """
        try:
            stmt = select(func.count()).select_from(self.model_class)

            # Apply filters
            if filters:
                conditions = []
                for field, value in filters.items():
                    if not hasattr(self.model_class, field):
                        raise ValidationError(f"Invalid filter field: {field}")
                    column = getattr(self.model_class, field)
                    conditions.append(column == value)
                if conditions:
                    stmt = stmt.where(and_(*conditions))

            result = await self.session.execute(stmt)
            return result.scalar() or 0

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to count records: {str(e)}")

    async def update(
        self,
        record_id: uuid.UUID | str,
        update_data: Dict[str, Any],
    ) -> Optional[ModelType]:
        """
        Update a record by ID.

        Args:
            record_id: Record UUID (string or UUID object)
            update_data: Fields to update

        Returns:
            Updated model instance if found, None otherwise

        Raises:
            ValidationError: If update data is invalid
            DatabaseError: If database operation fails
        """
        try:
            if isinstance(record_id, str):
                record_id = uuid.UUID(record_id)

            # Get the record first
            instance = await self.get_by_id(record_id)
            if not instance:
                return None

            # Update fields
            for field, value in update_data.items():
                if hasattr(instance, field):
                    setattr(instance, field, value)

            await self.session.flush()
            await self.session.refresh(instance)

            return instance

        except ValueError as e:
            raise ValidationError(f"Invalid UUID format: {str(e)}")
        except Exception as e:
            await self.session.rollback()
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to update record: {str(e)}")

    async def update_many(
        self,
        filters: Dict[str, Any],
        update_data: Dict[str, Any],
    ) -> int:
        """
        Update multiple records matching the filters.

        Args:
            filters: Dictionary of field-value filters
            update_data: Fields to update

        Returns:
            Number of records updated

        Raises:
            DatabaseError: If database operation fails
            ValidationError: If filters or update data are invalid
        """
        try:
            stmt = update(self.model_class)

            # Apply filters
            conditions = []
            for field, value in filters.items():
                if not hasattr(self.model_class, field):
                    raise ValidationError(f"Invalid filter field: {field}")
                column = getattr(self.model_class, field)
                conditions.append(column == value)
            if conditions:
                stmt = stmt.where(and_(*conditions))

            # Set update values
            stmt = stmt.values(**update_data)

            result = await self.session.execute(stmt)
            await self.session.flush()

            return result.rowcount

        except Exception as e:
            await self.session.rollback()
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to update records: {str(e)}")

    async def delete(self, record_id: uuid.UUID | str) -> bool:
        """
        Delete a record by ID.

        Args:
            record_id: Record UUID (string or UUID object)

        Returns:
            True if record was deleted, False otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            if isinstance(record_id, str):
                record_id = uuid.UUID(record_id)

            stmt = delete(self.model_class).where(self.model_class.id == record_id)
            result = await self.session.execute(stmt)
            await self.session.flush()

            return result.rowcount > 0

        except ValueError as e:
            raise ValidationError(f"Invalid UUID format: {str(e)}")
        except Exception as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to delete record: {str(e)}")

    async def delete_many(self, filters: Dict[str, Any]) -> int:
        """
        Delete multiple records matching the filters.

        Args:
            filters: Dictionary of field-value filters

        Returns:
            Number of records deleted

        Raises:
            DatabaseError: If database operation fails
            ValidationError: If filters are invalid
        """
        try:
            stmt = delete(self.model_class)

            # Apply filters
            conditions = []
            for field, value in filters.items():
                if not hasattr(self.model_class, field):
                    raise ValidationError(f"Invalid filter field: {field}")
                column = getattr(self.model_class, field)
                conditions.append(column == value)
            if conditions:
                stmt = stmt.where(and_(*conditions))

            result = await self.session.execute(stmt)
            await self.session.flush()

            return result.rowcount

        except Exception as e:
            await self.session.rollback()
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to delete records: {str(e)}")

    async def exists(self, filters: Dict[str, Any]) -> bool:
        """
        Check if any record matches the filters.

        Args:
            filters: Dictionary of field-value filters

        Returns:
            True if at least one record matches, False otherwise

        Raises:
            DatabaseError: If database operation fails
            ValidationError: If filters are invalid
        """
        try:
            count = await self.count(filters)
            return count > 0

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to check record existence: {str(e)}")

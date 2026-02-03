"""
Base Service Class

Provides common service layer functionality and patterns.
"""

from typing import Generic, TypeVar, Optional
from abc import ABC

from app.db.repositories.base import BaseRepository
from app.core.exceptions import NotFoundError

ModelType = TypeVar("ModelType")
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)


class BaseService(ABC, Generic[ModelType, RepositoryType]):
    """
    Base service class for business logic operations.

    Coordinates between repositories and implements business rules.
    """

    def __init__(self, repository: RepositoryType):
        """
        Initialize service with repository.

        Args:
            repository: Repository instance for data access
        """
        self.repository = repository

    async def get_by_id(self, entity_id: str) -> ModelType:
        """
        Get entity by ID with validation.

        Args:
            entity_id: Entity ID

        Returns:
            Entity instance

        Raises:
            NotFoundError: If entity not found
        """
        entity = await self.repository.get_by_id(entity_id)

        if not entity:
            raise NotFoundError(f"{self.__class__.__name__}: Entity not found")

        return entity

    async def exists(self, entity_id: str) -> bool:
        """
        Check if entity exists.

        Args:
            entity_id: Entity ID

        Returns:
            True if entity exists, False otherwise
        """
        entity = await self.repository.get_by_id(entity_id)
        return entity is not None

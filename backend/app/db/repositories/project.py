"""
Project Repository

Handles database operations for project entities using SQLAlchemy.
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.db.models.project import Project
from app.core.exceptions import NotFoundError, ConflictError, DatabaseError


class ProjectRepository(BaseRepository[Project]):
    """Repository for project operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, Project)

    async def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
    ) -> List[Project]:
        """
        Get projects by user ID.

        Args:
            user_id: User ID
            skip: Number of projects to skip
            limit: Maximum number of projects to return
            is_active: Optional active status filter

        Returns:
            List of projects

        Raises:
            DatabaseError: If database operation fails
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        filters: Dict[str, Any] = {"user_id": user_uuid}

        if is_active is not None:
            filters["is_active"] = is_active

        return await self.list(
            filters=filters,
            skip=skip,
            limit=limit,
            sort_by="updated_at",
            sort_order="desc",
        )

    async def get_by_name(self, user_id: str, name: str) -> Optional[Project]:
        """
        Get project by name for a specific user.

        Args:
            user_id: User ID
            name: Project name

        Returns:
            Project if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

            stmt = select(Project).where(
                and_(
                    Project.user_id == user_uuid,
                    Project.name == name,
                )
            )

            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()

        except Exception as e:
            raise DatabaseError(f"Failed to retrieve project by name: {str(e)}")

    async def name_exists(
        self,
        user_id: str,
        name: str,
        exclude_project_id: Optional[str] = None,
    ) -> bool:
        """
        Check if project name exists for a user.

        Args:
            user_id: User ID
            name: Project name
            exclude_project_id: Optional project ID to exclude

        Returns:
            True if name exists, False otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

            stmt = select(Project).where(
                and_(
                    Project.user_id == user_uuid,
                    Project.name == name,
                )
            )

            if exclude_project_id:
                project_uuid = uuid.UUID(exclude_project_id) if isinstance(exclude_project_id, str) else exclude_project_id
                stmt = stmt.where(Project.id != project_uuid)

            result = await self.session.execute(stmt)
            return result.scalar_one_or_none() is not None

        except Exception as e:
            raise DatabaseError(f"Failed to check project name existence: {str(e)}")

    async def create_project(
        self,
        user_id: str,
        name: str,
        description: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> Project:
        """
        Create a new project with validation.

        Args:
            user_id: User ID
            name: Project name
            description: Optional description
            config: Optional project configuration

        Returns:
            Created project

        Raises:
            ConflictError: If project name already exists
            DatabaseError: If database operation fails
        """
        # Check for existing name
        if await self.name_exists(user_id, name):
            raise ConflictError(f"Project with name '{name}' already exists")

        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        # Default configuration if not provided
        default_config = {
            "document_types": ["pdf", "image", "docx"],
            "extraction_settings": {
                "ocr_enabled": True,
                "language": "eng",
                "layout_detection": True,
            },
            "output_format": "json",
        }

        project_data = {
            "user_id": user_uuid,
            "name": name,
            "description": description,
            "config": config or default_config,
            "is_active": True,
        }

        return await self.create(project_data)

    async def update_project(
        self,
        project_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> Optional[Project]:
        """
        Update project details.

        Args:
            project_id: Project ID
            name: Optional new name
            description: Optional new description
            config: Optional new configuration

        Returns:
            Updated project if found, None otherwise

        Raises:
            ConflictError: If new name already exists
            DatabaseError: If database operation fails
        """
        # Get existing project to check ownership
        project = await self.get_by_id(project_id)
        if not project:
            return None

        # Check name uniqueness if changing name
        if name and name != project.name:
            if await self.name_exists(str(project.user_id), name, project_id):
                raise ConflictError(f"Project with name '{name}' already exists")

        update_data: Dict[str, Any] = {}

        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if config is not None:
            update_data["config"] = config

        if not update_data:
            return project

        return await self.update(project_id, update_data)

    async def update_config(
        self,
        project_id: str,
        config: Dict[str, Any],
    ) -> Optional[Project]:
        """
        Update project configuration.

        Args:
            project_id: Project ID
            config: New configuration dictionary

        Returns:
            Updated project if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(project_id, {"config": config})

    async def archive_project(self, project_id: str) -> Optional[Project]:
        """
        Archive a project (soft delete).

        Args:
            project_id: Project ID

        Returns:
            Updated project if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(
            project_id,
            {
                "is_active": False,
                "archived_at": datetime.utcnow(),
            },
        )

    async def restore_project(self, project_id: str) -> Optional[Project]:
        """
        Restore an archived project.

        Args:
            project_id: Project ID

        Returns:
            Updated project if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(
            project_id,
            {
                "is_active": True,
                "archived_at": None,
            },
        )

    async def count_by_user(self, user_id: str, is_active: Optional[bool] = None) -> int:
        """
        Count projects for a user.

        Args:
            user_id: User ID
            is_active: Optional active status filter

        Returns:
            Number of projects

        Raises:
            DatabaseError: If database operation fails
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        filters: Dict[str, Any] = {"user_id": user_uuid}

        if is_active is not None:
            filters["is_active"] = is_active

        return await self.count(filters)

    async def get_recent_projects(
        self,
        user_id: str,
        limit: int = 5,
    ) -> List[Project]:
        """
        Get recently updated projects for a user.

        Args:
            user_id: User ID
            limit: Maximum number of projects to return

        Returns:
            List of recent projects

        Raises:
            DatabaseError: If database operation fails
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        return await self.list(
            filters={"user_id": user_uuid, "is_active": True},
            skip=0,
            limit=limit,
            sort_by="updated_at",
            sort_order="desc",
        )

    async def search_projects(
        self,
        user_id: str,
        query: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        """
        Search projects by name or description.

        Args:
            user_id: User ID
            query: Search query
            skip: Number of projects to skip
            limit: Maximum number of projects to return

        Returns:
            List of matching projects

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

            # Build search conditions with ILIKE for case-insensitive search
            search_pattern = f"%{query}%"
            search_conditions = or_(
                Project.name.ilike(search_pattern),
                Project.description.ilike(search_pattern),
            )

            stmt = (
                select(Project)
                .where(
                    and_(
                        Project.user_id == user_uuid,
                        search_conditions,
                    )
                )
                .order_by(Project.updated_at.desc())
                .offset(skip)
                .limit(limit)
            )

            result = await self.session.execute(stmt)
            return list(result.scalars().all())

        except Exception as e:
            raise DatabaseError(f"Failed to search projects: {str(e)}")

    async def get_active_projects(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        """
        Get active (non-archived) projects for a user.

        Args:
            user_id: User ID
            skip: Number of projects to skip
            limit: Maximum number of projects to return

        Returns:
            List of active projects

        Raises:
            DatabaseError: If database operation fails
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        return await self.list(
            filters={"user_id": user_uuid, "is_active": True},
            skip=skip,
            limit=limit,
            sort_by="updated_at",
            sort_order="desc",
        )

    async def get_archived_projects(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Project]:
        """
        Get archived projects for a user.

        Args:
            user_id: User ID
            skip: Number of projects to skip
            limit: Maximum number of projects to return

        Returns:
            List of archived projects

        Raises:
            DatabaseError: If database operation fails
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        return await self.list(
            filters={"user_id": user_uuid, "is_active": False},
            skip=skip,
            limit=limit,
            sort_by="archived_at",
            sort_order="desc",
        )

    async def get_with_document_count(
        self,
        project_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get project with its document count.

        Args:
            project_id: Project ID

        Returns:
            Project data with document count if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            from app.db.models.document import Document
            from sqlalchemy import func

            project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id

            # Get project
            project = await self.get_by_id(project_id)
            if not project:
                return None

            # Get document count
            stmt = (
                select(func.count(Document.id))
                .where(
                    and_(
                        Document.project_id == project_uuid,
                        Document.is_archived == False,
                    )
                )
            )

            result = await self.session.execute(stmt)
            document_count = result.scalar() or 0

            return {
                "project": project,
                "document_count": document_count,
            }

        except Exception as e:
            raise DatabaseError(f"Failed to get project with document count: {str(e)}")

    async def transfer_ownership(
        self,
        project_id: str,
        new_user_id: str,
    ) -> Optional[Project]:
        """
        Transfer project ownership to another user.

        Args:
            project_id: Project ID
            new_user_id: New owner's user ID

        Returns:
            Updated project if found, None otherwise

        Raises:
            ConflictError: If new owner already has a project with the same name
            DatabaseError: If database operation fails
        """
        # Get project to check name
        project = await self.get_by_id(project_id)
        if not project:
            return None

        # Check if new owner has a project with the same name
        if await self.name_exists(new_user_id, project.name):
            raise ConflictError(
                f"User already has a project named '{project.name}'"
            )

        new_user_uuid = uuid.UUID(new_user_id) if isinstance(new_user_id, str) else new_user_id

        return await self.update(project_id, {"user_id": new_user_uuid})

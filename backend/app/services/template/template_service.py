"""
Template Service

Business logic for template management operations.
"""

import math
from typing import Optional, List, Tuple
from uuid import UUID

from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.template import Template
from app.db.models.project import Project
from app.models.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateListItem,
)


class TemplateService:
    """Service for template operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_template(
        self,
        user_id: str,
        template_data: TemplateCreate,
    ) -> TemplateResponse:
        """
        Create a new template.

        Args:
            user_id: ID of the user creating the template
            template_data: Template creation data

        Returns:
            Created template response
        """
        template = Template(
            user_id=UUID(user_id),
            name=template_data.name,
            description=template_data.description,
            document_type=template_data.document_type,
            visibility=template_data.visibility,
            extraction_config=template_data.extraction_config.model_dump(),
            category=template_data.category,
            tags=template_data.tags or [],
        )

        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)

        return self._to_response(template)

    async def get_template(
        self,
        template_id: str,
        user_id: str,
    ) -> Optional[TemplateResponse]:
        """
        Get a template by ID.

        Args:
            template_id: ID of the template
            user_id: ID of the requesting user (for access control)

        Returns:
            Template response if found and accessible, None otherwise
        """
        template = await self._get_accessible_template(template_id, user_id)

        if not template:
            return None

        return self._to_response(template)

    async def list_templates(
        self,
        user_id: str,
        visibility: str = "all",
        category: Optional[str] = None,
        document_type: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[TemplateListItem], int]:
        """
        List templates with filtering and pagination.

        Args:
            user_id: ID of the requesting user
            visibility: Filter by visibility ('all', 'mine', 'public')
            category: Filter by category
            document_type: Filter by document type
            search: Search in name and description
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (list of templates, total count)
        """
        # Build base query
        conditions = [Template.is_deleted == False]

        # Visibility filter
        if visibility == "mine":
            conditions.append(Template.user_id == UUID(user_id))
        elif visibility == "public":
            conditions.append(Template.visibility == "public")
        else:  # "all" - show user's own + public templates
            conditions.append(
                or_(
                    Template.user_id == UUID(user_id),
                    Template.visibility == "public",
                )
            )

        # Category filter
        if category:
            conditions.append(Template.category == category)

        # Document type filter
        if document_type:
            conditions.append(Template.document_type == document_type)

        # Search filter
        if search:
            search_pattern = f"%{search}%"
            conditions.append(
                or_(
                    Template.name.ilike(search_pattern),
                    Template.description.ilike(search_pattern),
                )
            )

        # Count query
        count_query = select(func.count(Template.id)).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Data query with pagination
        offset = (page - 1) * page_size
        data_query = (
            select(Template)
            .where(and_(*conditions))
            .order_by(Template.usage_count.desc(), Template.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )

        result = await self.db.execute(data_query)
        templates = result.scalars().all()

        return [self._to_list_item(t) for t in templates], total

    async def update_template(
        self,
        template_id: str,
        user_id: str,
        updates: TemplateUpdate,
    ) -> Optional[TemplateResponse]:
        """
        Update a template (partial update).

        Args:
            template_id: ID of the template to update
            user_id: ID of the requesting user (must be owner)
            updates: Update data

        Returns:
            Updated template response if successful, None if not found/unauthorized
        """
        # Get template and verify ownership
        query = select(Template).where(
            and_(
                Template.id == UUID(template_id),
                Template.user_id == UUID(user_id),
                Template.is_deleted == False,
            )
        )
        result = await self.db.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            return None

        # Apply updates
        update_data = updates.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if field == "extraction_config" and value is not None:
                setattr(
                    template,
                    field,
                    value.model_dump() if hasattr(value, "model_dump") else value,
                )
            else:
                setattr(template, field, value)

        # Increment version on content changes
        if "extraction_config" in update_data:
            template.version += 1

        await self.db.commit()
        await self.db.refresh(template)

        return self._to_response(template)

    async def delete_template(
        self,
        template_id: str,
        user_id: str,
    ) -> bool:
        """
        Soft delete a template.

        Args:
            template_id: ID of the template to delete
            user_id: ID of the requesting user (must be owner)

        Returns:
            True if deleted, False if not found/unauthorized
        """
        query = select(Template).where(
            and_(
                Template.id == UUID(template_id),
                Template.user_id == UUID(user_id),
                Template.is_deleted == False,
            )
        )
        result = await self.db.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            return False

        template.is_deleted = True
        await self.db.commit()

        return True

    async def apply_to_project(
        self,
        template_id: str,
        project_id: str,
        user_id: str,
    ) -> bool:
        """
        Apply a template's extraction config to a project.

        Args:
            template_id: ID of the template to apply
            project_id: ID of the target project
            user_id: ID of the requesting user

        Returns:
            True if applied successfully, False otherwise
        """
        # Verify template access
        template = await self._get_accessible_template(template_id, user_id)
        if not template:
            return False

        # Verify project ownership
        project_query = select(Project).where(
            and_(
                Project.id == UUID(project_id),
                Project.user_id == UUID(user_id),
            )
        )
        project_result = await self.db.execute(project_query)
        project = project_result.scalar_one_or_none()

        if not project:
            return False

        # Apply template config to project
        project.extraction_config = template.extraction_config
        project.document_type = template.document_type

        # Increment template usage count
        template.usage_count += 1

        await self.db.commit()

        return True

    async def _get_accessible_template(
        self,
        template_id: str,
        user_id: str,
    ) -> Optional[Template]:
        """
        Get a template if the user has access to it.

        A user can access:
        - Their own templates (any visibility)
        - Public templates from other users
        """
        query = select(Template).where(
            and_(
                Template.id == UUID(template_id),
                Template.is_deleted == False,
                or_(
                    Template.user_id == UUID(user_id),
                    Template.visibility == "public",
                ),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    def _to_response(self, template: Template) -> TemplateResponse:
        """Convert Template model to response."""
        return TemplateResponse(
            id=str(template.id),
            name=template.name,
            description=template.description,
            user_id=str(template.user_id),
            visibility=template.visibility,
            document_type=template.document_type,
            extraction_config=template.extraction_config,
            category=template.category,
            tags=template.tags,
            version=template.version,
            usage_count=template.usage_count,
            average_rating=template.average_rating,
            created_at=template.created_at,
            updated_at=template.updated_at,
        )

    def _to_list_item(self, template: Template) -> TemplateListItem:
        """Convert Template model to list item."""
        return TemplateListItem(
            id=str(template.id),
            name=template.name,
            description=template.description,
            document_type=template.document_type,
            visibility=template.visibility,
            category=template.category,
            tags=template.tags,
            usage_count=template.usage_count,
            average_rating=template.average_rating,
            created_at=template.created_at,
        )

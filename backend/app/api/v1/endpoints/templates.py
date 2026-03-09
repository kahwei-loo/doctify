"""
Template API Endpoints

Provides endpoints for template management.
"""

import math
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.v1.deps import get_current_verified_user
from app.db.models.user import User
from app.db.database import get_db
from app.services.template import TemplateService
from app.models.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateApiResponse,
    TemplateListResponse,
    ApplyTemplateRequest,
    ApplyTemplateResponse,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# =============================================================================
# Dependencies
# =============================================================================


async def get_template_service(
    db: AsyncSession = Depends(get_db),
) -> TemplateService:
    """Get template service instance."""
    return TemplateService(db)


# =============================================================================
# Template Endpoints
# =============================================================================


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    visibility: str = Query("all", description="Filter: 'all', 'mine', or 'public'"),
    category: Optional[str] = Query(None, description="Filter by category"),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_verified_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    List templates with filtering and pagination.

    Returns templates that the user has access to:
    - User's own templates (any visibility)
    - Public templates from other users

    **Filters:**
    - `visibility`: 'all' (default), 'mine' (only user's), 'public' (only public)
    - `category`: Filter by category name
    - `document_type`: Filter by document type (invoice, receipt, etc.)
    - `search`: Search in name and description

    **Pagination:**
    - `page`: Page number (default: 1)
    - `page_size`: Items per page (default: 20, max: 100)
    """
    if visibility not in {"all", "mine", "public"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="visibility must be 'all', 'mine', or 'public'",
        )

    templates, total = await template_service.list_templates(
        user_id=str(current_user.id),
        visibility=visibility,
        category=category,
        document_type=document_type,
        search=search,
        page=page,
        page_size=page_size,
    )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return TemplateListResponse(
        success=True,
        data=templates,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post(
    "", response_model=TemplateApiResponse, status_code=status.HTTP_201_CREATED
)
async def create_template(
    template_data: TemplateCreate,
    current_user: User = Depends(get_current_verified_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Create a new template.

    Templates allow users to save and reuse extraction configurations.

    **Example Request:**
    ```json
    {
        "name": "Invoice Template",
        "description": "Template for standard invoices",
        "document_type": "invoice",
        "visibility": "private",
        "extraction_config": {
            "fields": [
                {"name": "invoice_number", "type": "string", "required": true},
                {"name": "total_amount", "type": "number", "required": true}
            ],
            "tables": [
                {
                    "name": "line_items",
                    "columns": [
                        {"name": "description", "type": "string"},
                        {"name": "quantity", "type": "number"},
                        {"name": "price", "type": "number"}
                    ]
                }
            ]
        }
    }
    ```
    """
    template = await template_service.create_template(
        user_id=str(current_user.id),
        template_data=template_data,
    )

    return TemplateApiResponse(
        success=True,
        data=template,
    )


@router.get("/{template_id}", response_model=TemplateApiResponse)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_verified_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Get a template by ID.

    Users can access:
    - Their own templates (any visibility)
    - Public templates from other users
    """
    template = await template_service.get_template(
        template_id=template_id,
        user_id=str(current_user.id),
    )

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or access denied",
        )

    return TemplateApiResponse(
        success=True,
        data=template,
    )


@router.put("/{template_id}", response_model=TemplateApiResponse)
async def update_template(
    template_id: str,
    updates: TemplateUpdate,
    current_user: User = Depends(get_current_verified_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Update a template (full update).

    Only the template owner can update a template.
    Updating the extraction_config increments the version number.
    """
    template = await template_service.update_template(
        template_id=template_id,
        user_id=str(current_user.id),
        updates=updates,
    )

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or access denied",
        )

    return TemplateApiResponse(
        success=True,
        data=template,
    )


@router.patch("/{template_id}", response_model=TemplateApiResponse)
async def patch_template(
    template_id: str,
    updates: TemplateUpdate,
    current_user: User = Depends(get_current_verified_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Update a template (partial update).

    Only the template owner can update a template.
    Only provided fields will be updated.
    """
    template = await template_service.update_template(
        template_id=template_id,
        user_id=str(current_user.id),
        updates=updates,
    )

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or access denied",
        )

    return TemplateApiResponse(
        success=True,
        data=template,
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: str,
    current_user: User = Depends(get_current_verified_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Delete a template.

    Only the template owner can delete a template.
    This performs a soft delete (template can be recovered).
    """
    deleted = await template_service.delete_template(
        template_id=template_id,
        user_id=str(current_user.id),
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found or access denied",
        )

    return None


@router.post("/{template_id}/apply", response_model=ApplyTemplateResponse)
async def apply_template_to_project(
    template_id: str,
    request: ApplyTemplateRequest,
    current_user: User = Depends(get_current_verified_user),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Apply a template to a project.

    Copies the template's extraction configuration to the specified project.
    The user must have access to both the template and the project.

    **Example Request:**
    ```json
    {
        "project_id": "123e4567-e89b-12d3-a456-426614174000"
    }
    ```
    """
    success = await template_service.apply_to_project(
        template_id=template_id,
        project_id=request.project_id,
        user_id=str(current_user.id),
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template or project not found, or access denied",
        )

    return ApplyTemplateResponse(
        success=True,
        message="Template applied successfully",
        project_id=request.project_id,
        template_id=template_id,
    )

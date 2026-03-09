"""
Project API Endpoints

Handles project creation, management, and configuration operations.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException, status, Body

from app.api.v1.deps import (
    get_current_verified_user,
    get_project_repository,
    get_document_repository,
    verify_project_ownership,
)
from app.db.repositories.project import ProjectRepository
from app.db.repositories.document import DocumentRepository
from app.db.models.user import User
from app.models.common import (
    success_response,
    paginated_response,
    message_response,
    PaginationParams,
)
from app.models.project import (
    ProjectConfig,
    ProjectConfigUpdate,
    FieldDefinition,
    TableDefinition,
    get_default_config_dict,
    validate_config,
)
from app.core.exceptions import (
    ValidationError,
    NotFoundError,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(
    name: str = Body(..., description="Project name"),
    description: Optional[str] = Body(None, description="Project description"),
    extraction_config: Optional[dict] = Body(
        None, description="Default extraction configuration"
    ),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    """
    Create a new project.

    - **name**: Project name (required)
    - **description**: Optional project description
    - **extraction_config**: Optional default extraction configuration

    Returns the created project information.
    """
    try:
        # Create project using dedicated method
        project = await project_repository.create_project(
            user_id=str(current_user.id),
            name=name.strip(),
            description=description.strip() if description else None,
            config=extraction_config or {},
        )

        return success_response(
            data={
                "project_id": str(project.id),
                "name": project.name,
                "description": project.description,
                "extraction_config": project.config,
                "created_at": project.created_at,
                "updated_at": project.updated_at,
            },
            message="Project created successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )


@router.get("/stats")
async def get_aggregate_stats(
    current_user: User = Depends(get_current_verified_user),
    document_repository: DocumentRepository = Depends(get_document_repository),
):
    """
    Get aggregate statistics across all user's projects.

    Returns overall document statistics, success rates, token usage,
    and breakdown by project.
    """
    try:
        # Get aggregate stats from document repository
        stats = await document_repository.get_aggregate_stats_by_user(
            user_id=str(current_user.id)
        )

        # Calculate estimated cost (assuming $0.00004 per token for GPT-4)
        # This is a rough estimate and should be configurable
        cost_per_token = 0.00004
        estimated_cost = round(stats["total_tokens"] * cost_per_token, 2)

        return success_response(
            data={
                "total_documents": stats["total_documents"],
                "success_rate": stats["success_rate"],
                "total_tokens": stats["total_tokens"],
                "estimated_cost": estimated_cost,
                "status_breakdown": stats["status_breakdown"],
                "token_by_project": stats["token_by_project"],
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve aggregate statistics: {str(e)}",
        )


@router.get("/{project_id}")
async def get_project(
    project_id: str = Path(..., description="Project ID"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Get project information.

    - **project_id**: ID of project to retrieve

    Returns project metadata and configuration.
    """
    try:
        project = await project_repository.get_by_id(project_id)

        if not project:
            raise NotFoundError("Project not found")

        return success_response(
            data={
                "project_id": str(project.id),
                "name": project.name,
                "description": project.description,
                "extraction_config": project.config,
                "created_at": project.created_at,
                "updated_at": project.updated_at,
                "is_archived": project.is_archived(),
            }
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.get("/")
async def list_projects(
    include_archived: bool = Query(False, description="Include archived projects"),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    """
    List user's projects with optional filtering.

    - **include_archived**: Include archived projects (default: False)
    - **page**: Page number (default: 1)
    - **per_page**: Items per page (default: 20)

    Returns paginated list of projects.
    """
    try:
        # Get user's projects
        projects = await project_repository.get_by_user(
            user_id=str(current_user.id),
            skip=pagination.get_skip(),
            limit=pagination.get_limit(),
        )

        # Filter archived if not included
        if not include_archived:
            projects = [p for p in projects if not p.is_archived()]

        # Convert to response format
        project_list = [
            {
                "project_id": str(project.id),
                "name": project.name,
                "description": project.description,
                "created_at": project.created_at,
                "updated_at": project.updated_at,
                "is_archived": project.is_archived(),
            }
            for project in projects
        ]

        # Get actual total count from repository
        total = await project_repository.count_by_user(
            str(current_user.id), is_active=None if include_archived else True
        )

        return paginated_response(
            items=project_list,
            total=total,
            page=pagination.page,
            per_page=pagination.per_page,
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )


@router.put("/{project_id}")
async def update_project(
    project_id: str = Path(..., description="Project ID"),
    name: Optional[str] = Body(None, description="Updated project name"),
    description: Optional[str] = Body(None, description="Updated project description"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Update project information.

    - **project_id**: ID of project to update
    - **name**: Optional new project name
    - **description**: Optional new project description

    Returns updated project information.
    """
    try:
        # Prepare update data
        update_data = {}
        if name is not None:
            update_data["name"] = name.strip()
        if description is not None:
            update_data["description"] = description.strip()

        if not update_data:
            raise ValidationError("No update data provided")

        # Update project
        project = await project_repository.update(project_id, update_data)

        if not project:
            raise NotFoundError("Project not found")

        return success_response(
            data={
                "project_id": str(project.id),
                "name": project.name,
                "description": project.description,
                "updated_at": project.updated_at,
            },
            message="Project updated successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str = Path(..., description="Project ID"),
    permanent: bool = Query(
        False, description="Permanently delete instead of archiving"
    ),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    document_repository: DocumentRepository = Depends(get_document_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Delete or archive a project.

    - **project_id**: ID of project to delete
    - **permanent**: If True, permanently delete; otherwise archive (default: False)

    Soft delete by default (archive). Permanent deletion requires explicit flag.
    """
    try:
        if permanent:
            # Check if project has documents
            documents = await document_repository.find_by_project(project_id, limit=1)
            if documents:
                raise ValidationError(
                    "Cannot permanently delete project with documents. Archive it instead or delete documents first."
                )

            # Permanently delete
            await project_repository.delete(project_id)
        else:
            # Archive (soft delete)
            await project_repository.update(project_id, {"is_archived": True})

        return None

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.get("/{project_id}/statistics")
async def get_project_statistics(
    project_id: str = Path(..., description="Project ID"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    document_repository: DocumentRepository = Depends(get_document_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Get project statistics.

    - **project_id**: ID of project

    Returns document counts, processing status, and other statistics.
    """
    try:
        # Verify project exists
        project = await project_repository.get_by_id(project_id)
        if not project:
            raise NotFoundError("Project not found")

        # Get all documents for project
        documents = await document_repository.find_by_project(project_id)

        # Calculate statistics
        total_documents = len(documents)
        status_counts = {}
        total_size = 0

        for doc in documents:
            # Count by status
            status = doc.status
            status_counts[status] = status_counts.get(status, 0) + 1

            # Sum file sizes
            total_size += doc.file_size

        return success_response(
            data={
                "project_id": project_id,
                "total_documents": total_documents,
                "status_counts": status_counts,
                "total_size_bytes": total_size,
                "created_at": project.created_at,
            }
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.put("/{project_id}/config")
async def update_extraction_config(
    project_id: str = Path(..., description="Project ID"),
    config_update: ProjectConfigUpdate = Body(
        ..., description="Updated extraction configuration"
    ),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Update project extraction configuration.

    - **project_id**: ID of project
    - **config**: Complete project configuration with fields, tables, and settings

    The configuration supports:
    - **fields**: List of field definitions for extraction
    - **tables**: List of table definitions for line item extraction
    - **message_content**: Custom extraction prompt (Layer 3 - highest priority)
    - **sample_output**: Expected JSON output for AI reference

    Returns updated project with new configuration.
    """
    try:
        # Convert validated Pydantic model to dict for storage
        config_dict = config_update.config.model_dump()

        # Update project configuration
        project = await project_repository.update(project_id, {"config": config_dict})

        if not project:
            raise NotFoundError("Project not found")

        return success_response(
            data={
                "project_id": str(project.id),
                "config": project.config,
                "updated_at": project.updated_at,
            },
            message="Configuration updated successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message,
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.get("/{project_id}/config")
async def get_extraction_config(
    project_id: str = Path(..., description="Project ID"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Get project extraction configuration.

    - **project_id**: ID of project

    Returns the complete project configuration including fields, tables, and settings.
    """
    try:
        project = await project_repository.get_by_id(project_id)

        if not project:
            raise NotFoundError("Project not found")

        # Ensure config has all required fields with defaults
        config = project.config or get_default_config_dict()

        return success_response(
            data={
                "project_id": str(project.id),
                "config": config,
            }
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.post("/{project_id}/config/fields")
async def add_extraction_field(
    project_id: str = Path(..., description="Project ID"),
    field: FieldDefinition = Body(..., description="Field definition to add"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Add a new extraction field to project configuration.

    - **project_id**: ID of project
    - **field**: Field definition with name, type, required, etc.

    Returns updated configuration.
    """
    try:
        project = await project_repository.get_by_id(project_id)

        if not project:
            raise NotFoundError("Project not found")

        # Get current config or default
        config = project.config or get_default_config_dict()
        fields = config.get("fields", [])

        # Check for duplicate field name
        if any(f.get("name") == field.name for f in fields):
            raise ValidationError(f"Field '{field.name}' already exists")

        # Add new field
        fields.append(field.model_dump())
        config["fields"] = fields

        # Update project
        updated_project = await project_repository.update(
            project_id, {"config": config}
        )

        return success_response(
            data={
                "project_id": str(updated_project.id),
                "fields": config["fields"],
            },
            message=f"Field '{field.name}' added successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message if hasattr(e, "message") else str(e),
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.delete("/{project_id}/config/fields/{field_name}")
async def remove_extraction_field(
    project_id: str = Path(..., description="Project ID"),
    field_name: str = Path(..., description="Field name to remove"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Remove an extraction field from project configuration.

    - **project_id**: ID of project
    - **field_name**: Name of field to remove

    Returns updated configuration.
    """
    try:
        project = await project_repository.get_by_id(project_id)

        if not project:
            raise NotFoundError("Project not found")

        # Get current config
        config = project.config or get_default_config_dict()
        fields = config.get("fields", [])

        # Find and remove field
        original_count = len(fields)
        fields = [f for f in fields if f.get("name") != field_name]

        if len(fields) == original_count:
            raise NotFoundError(f"Field '{field_name}' not found")

        config["fields"] = fields

        # Update project
        updated_project = await project_repository.update(
            project_id, {"config": config}
        )

        return success_response(
            data={
                "project_id": str(updated_project.id),
                "fields": config["fields"],
            },
            message=f"Field '{field_name}' removed successfully",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.post("/{project_id}/config/tables")
async def add_extraction_table(
    project_id: str = Path(..., description="Project ID"),
    table: TableDefinition = Body(..., description="Table definition to add"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Add a new extraction table to project configuration.

    - **project_id**: ID of project
    - **table**: Table definition with name, columns, etc.

    Returns updated configuration.
    """
    try:
        project = await project_repository.get_by_id(project_id)

        if not project:
            raise NotFoundError("Project not found")

        # Get current config or default
        config = project.config or get_default_config_dict()
        tables = config.get("tables", [])

        # Check for duplicate table name
        if any(t.get("name") == table.name for t in tables):
            raise ValidationError(f"Table '{table.name}' already exists")

        # Add new table
        tables.append(table.model_dump())
        config["tables"] = tables

        # Update project
        updated_project = await project_repository.update(
            project_id, {"config": config}
        )

        return success_response(
            data={
                "project_id": str(updated_project.id),
                "tables": config["tables"],
            },
            message=f"Table '{table.name}' added successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.message if hasattr(e, "message") else str(e),
        )
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.delete("/{project_id}/config/tables/{table_name}")
async def remove_extraction_table(
    project_id: str = Path(..., description="Project ID"),
    table_name: str = Path(..., description="Table name to remove"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Remove an extraction table from project configuration.

    - **project_id**: ID of project
    - **table_name**: Name of table to remove

    Returns updated configuration.
    """
    try:
        project = await project_repository.get_by_id(project_id)

        if not project:
            raise NotFoundError("Project not found")

        # Get current config
        config = project.config or get_default_config_dict()
        tables = config.get("tables", [])

        # Find and remove table
        original_count = len(tables)
        tables = [t for t in tables if t.get("name") != table_name]

        if len(tables) == original_count:
            raise NotFoundError(f"Table '{table_name}' not found")

        config["tables"] = tables

        # Update project
        updated_project = await project_repository.update(
            project_id, {"config": config}
        )

        return success_response(
            data={
                "project_id": str(updated_project.id),
                "tables": config["tables"],
            },
            message=f"Table '{table_name}' removed successfully",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.put("/{project_id}/config/sample-output")
async def update_sample_output(
    project_id: str = Path(..., description="Project ID"),
    sample_output: dict = Body(..., embed=True, description="Sample output JSON"),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Update project sample output for AI few-shot learning.

    - **project_id**: ID of project
    - **sample_output**: Expected JSON output structure

    The sample output is used as a reference for AI extraction.
    Returns updated configuration.
    """
    try:
        project = await project_repository.get_by_id(project_id)

        if not project:
            raise NotFoundError("Project not found")

        # Get current config or default
        config = project.config or get_default_config_dict()
        config["sample_output"] = sample_output

        # Update project
        updated_project = await project_repository.update(
            project_id, {"config": config}
        )

        return success_response(
            data={
                "project_id": str(updated_project.id),
                "sample_output": config["sample_output"],
            },
            message="Sample output updated successfully",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )


@router.put("/{project_id}/config/message-content")
async def update_message_content(
    project_id: str = Path(..., description="Project ID"),
    message_content: Optional[str] = Body(
        None, embed=True, description="Custom extraction prompt"
    ),
    current_user: User = Depends(get_current_verified_user),
    project_repository: ProjectRepository = Depends(get_project_repository),
    _: bool = Depends(verify_project_ownership),
):
    """
    Update project custom extraction prompt (Layer 3).

    - **project_id**: ID of project
    - **message_content**: Custom prompt for extraction (overrides field/table config)

    Layer 3 prompt has the highest priority in extraction.
    Returns updated configuration.
    """
    try:
        project = await project_repository.get_by_id(project_id)

        if not project:
            raise NotFoundError("Project not found")

        # Get current config or default
        config = project.config or get_default_config_dict()
        config["message_content"] = message_content

        # Update project
        updated_project = await project_repository.update(
            project_id, {"config": config}
        )

        return success_response(
            data={
                "project_id": str(updated_project.id),
                "message_content": config["message_content"],
            },
            message="Message content updated successfully",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=e.message,
        )

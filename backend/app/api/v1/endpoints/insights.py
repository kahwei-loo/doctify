"""
NL-to-Insights API Endpoints

REST API for natural language data analysis.
Supports dataset upload, schema management, conversational queries,
and intelligent data insights.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    Path,
    status,
)

from app.api.v1.deps import (
    get_current_active_user,
    get_insights_dataset_service,
    get_insights_query_service,
)
from app.db.models.user import User
from app.models.insights import (
    DatasetResponse,
    DatasetListResponse,
    DatasetPreviewResponse,
    SchemaUpdateRequest,
    SchemaDefinition,
    SchemaInferenceResponse,
    ConversationCreate,
    ConversationResponse,
    ConversationListResponse,
    QueryRequest,
    QueryResponse,
    QueryHistoryResponse,
)
from app.services.insights import DatasetService, QueryService

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Dataset Endpoints
# ============================================


@router.post(
    "/datasets",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new dataset",
    description="Upload a CSV or XLSX file to create a new dataset for analysis",
)
async def upload_dataset(
    file: UploadFile = File(..., description="CSV or XLSX file to upload"),
    name: str = Form(..., min_length=1, max_length=100, description="Dataset name"),
    description: Optional[str] = Form(
        None, max_length=500, description="Dataset description"
    ),
    current_user: User = Depends(get_current_active_user),
    dataset_service: DatasetService = Depends(get_insights_dataset_service),
):
    """
    Upload a new dataset (CSV or XLSX).

    Returns dataset ID and inferred schema for user confirmation.

    Supported formats:
    - CSV (.csv)
    - Excel (.xlsx, .xls)

    Maximum file size: 50MB
    """
    user_id = current_user.id

    # Validate file type
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided",
        )

    allowed_extensions = [".csv", ".xlsx", ".xls"]
    file_ext = (
        "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    )
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}",
        )

    # Check file size (max 50MB for MVP)
    max_size = 50 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB",
        )

    try:
        dataset_id, schema = await dataset_service.upload_dataset(
            user_id=user_id,
            file_content=content,
            filename=file.filename,
            name=name,
            description=description,
        )

        return {
            "dataset_id": str(dataset_id),
            "status": "ready",
            "schema_preview": schema.model_dump(),
            "message": "Dataset uploaded successfully. Please review and confirm the schema.",
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Dataset upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process dataset",
        )


@router.get(
    "/datasets",
    response_model=DatasetListResponse,
    summary="List all datasets",
    description="Get a paginated list of datasets for the current user",
)
async def list_datasets(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of records to return"
    ),
    current_user: User = Depends(get_current_active_user),
    dataset_service: DatasetService = Depends(get_insights_dataset_service),
):
    """List all datasets for current user."""
    user_id = current_user.id
    return await dataset_service.list_datasets(user_id, skip, limit)


@router.get(
    "/datasets/{dataset_id}",
    response_model=DatasetResponse,
    summary="Get dataset details",
    description="Get detailed information about a specific dataset",
)
async def get_dataset(
    dataset_id: str = Path(..., description="Dataset UUID"),
    current_user: User = Depends(get_current_active_user),
    dataset_service: DatasetService = Depends(get_insights_dataset_service),
):
    """Get dataset details."""
    user_id = current_user.id

    # Validate UUID format
    try:
        dataset_uuid = UUID(dataset_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format",
        )

    dataset = await dataset_service.get_dataset(dataset_uuid, user_id)
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )

    return dataset


@router.put(
    "/datasets/{dataset_id}/schema",
    response_model=SchemaDefinition,
    summary="Update dataset schema",
    description="Update the schema definition with user-defined semantics",
)
async def update_dataset_schema(
    dataset_id: str = Path(..., description="Dataset UUID"),
    request: SchemaUpdateRequest = ...,
    current_user: User = Depends(get_current_active_user),
    dataset_service: DatasetService = Depends(get_insights_dataset_service),
):
    """Update dataset schema with user-defined semantics."""
    user_id = current_user.id

    # Validate UUID format
    try:
        dataset_uuid = UUID(dataset_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format",
        )

    try:
        schema = await dataset_service.update_schema(
            dataset_uuid, user_id, request.columns
        )
        return schema
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.delete(
    "/datasets/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a dataset",
    description="Delete a dataset and all associated data",
)
async def delete_dataset(
    dataset_id: str = Path(..., description="Dataset UUID"),
    current_user: User = Depends(get_current_active_user),
    dataset_service: DatasetService = Depends(get_insights_dataset_service),
):
    """Delete a dataset."""
    user_id = current_user.id

    # Validate UUID format
    try:
        dataset_uuid = UUID(dataset_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format",
        )

    success = await dataset_service.delete_dataset(dataset_uuid, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found",
        )

    return None


@router.get(
    "/datasets/{dataset_id}/preview",
    response_model=DatasetPreviewResponse,
    summary="Preview dataset contents",
    description="Get a preview of the dataset rows",
)
async def preview_dataset(
    dataset_id: str = Path(..., description="Dataset UUID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum rows to return"),
    offset: int = Query(0, ge=0, description="Number of rows to skip"),
    current_user: User = Depends(get_current_active_user),
    dataset_service: DatasetService = Depends(get_insights_dataset_service),
):
    """Preview dataset contents."""
    user_id = current_user.id

    # Validate UUID format
    try:
        dataset_uuid = UUID(dataset_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format",
        )

    try:
        return await dataset_service.get_preview(dataset_uuid, user_id, limit, offset)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/datasets/{dataset_id}/infer-schema",
    response_model=SchemaInferenceResponse,
    summary="AI-powered schema inference",
    description="Use AI to infer semantic meaning of columns",
)
async def infer_schema_semantics(
    dataset_id: str = Path(..., description="Dataset UUID"),
    current_user: User = Depends(get_current_active_user),
    dataset_service: DatasetService = Depends(get_insights_dataset_service),
):
    """AI-powered schema semantic inference."""
    user_id = current_user.id

    # Validate UUID format
    try:
        dataset_uuid = UUID(dataset_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format",
        )

    try:
        return await dataset_service.infer_schema_semantics(dataset_uuid, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ============================================
# Conversation Endpoints
# ============================================


@router.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a conversation",
    description="Create a new conversation for querying a dataset",
)
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    query_service: QueryService = Depends(get_insights_query_service),
):
    """Create a new conversation for a dataset."""
    user_id = current_user.id

    # Validate UUID format
    try:
        dataset_uuid = UUID(request.dataset_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid dataset ID format",
        )

    try:
        return await query_service.create_conversation(
            user_id, dataset_uuid, request.title
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.get(
    "/conversations",
    response_model=ConversationListResponse,
    summary="List conversations",
    description="Get a paginated list of conversations",
)
async def list_conversations(
    dataset_id: Optional[str] = Query(None, description="Filter by dataset UUID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of records to return"
    ),
    current_user: User = Depends(get_current_active_user),
    query_service: QueryService = Depends(get_insights_query_service),
):
    """List conversations."""
    user_id = current_user.id

    # Validate dataset_id if provided
    dataset_uuid = None
    if dataset_id:
        try:
            dataset_uuid = UUID(dataset_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid dataset ID format",
            )

    return await query_service.list_conversations(user_id, dataset_uuid, skip, limit)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
    summary="Get conversation details",
    description="Get detailed information about a specific conversation",
)
async def get_conversation(
    conversation_id: str = Path(..., description="Conversation UUID"),
    current_user: User = Depends(get_current_active_user),
    query_service: QueryService = Depends(get_insights_query_service),
):
    """Get conversation details."""
    user_id = current_user.id

    # Validate UUID format
    try:
        conversation_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    conversation = await query_service.get_conversation(conversation_uuid, user_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return conversation


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation",
    description="Delete a conversation and all associated queries",
)
async def delete_conversation(
    conversation_id: str = Path(..., description="Conversation UUID"),
    current_user: User = Depends(get_current_active_user),
    query_service: QueryService = Depends(get_insights_query_service),
):
    """Delete a conversation."""
    user_id = current_user.id

    # Validate UUID format
    try:
        conversation_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    success = await query_service.delete_conversation(conversation_uuid, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return None


# ============================================
# Query Endpoints
# ============================================


@router.post(
    "/conversations/{conversation_id}/query",
    response_model=QueryResponse,
    summary="Send a natural language query",
    description="Process a natural language query against the dataset",
)
async def send_query(
    conversation_id: str = Path(..., description="Conversation UUID"),
    request: QueryRequest = ...,
    current_user: User = Depends(get_current_active_user),
    query_service: QueryService = Depends(get_insights_query_service),
):
    """
    Send a natural language query to analyze data.

    Example queries (supports English and Chinese):
    - "What's the total sales this month?"
    - "Show sales breakdown by product category"
    - "Which customer contributed the most?"
    - "What about last month?" (follow-up)

    The system supports:
    - Multi-turn conversations with context awareness
    - Automatic chart type suggestion
    - Time range detection (relative dates)
    - Aggregations, grouping, filtering
    """
    user_id = current_user.id

    # Validate UUID format
    try:
        conversation_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    try:
        return await query_service.process_query(
            conversation_uuid,
            user_id,
            request.message,
            request.language,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Query processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process query",
        )


@router.get(
    "/conversations/{conversation_id}/history",
    response_model=QueryHistoryResponse,
    summary="Get query history",
    description="Get the history of queries in a conversation",
)
async def get_query_history(
    conversation_id: str = Path(..., description="Conversation UUID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(
        50, ge=1, le=200, description="Maximum number of records to return"
    ),
    current_user: User = Depends(get_current_active_user),
    query_service: QueryService = Depends(get_insights_query_service),
):
    """Get query history for a conversation."""
    user_id = current_user.id

    # Validate UUID format
    try:
        conversation_uuid = UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID format",
        )

    try:
        return await query_service.get_query_history(
            conversation_uuid, user_id, skip, limit
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

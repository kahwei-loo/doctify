"""
Edit History API Endpoints

Handles document extraction result modification tracking and rollback operations.
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Path, Request, HTTPException, status

from app.api.v1.deps import (
    get_current_verified_user,
    get_edit_history_service,
    verify_document_ownership,
)
from app.services.edit_history.edit_history_service import (
    EditHistoryService,
    FieldChange,
)
from app.db.models.user import User
from app.models.edit_history import (
    EditHistoryResponse,
    EditHistoryListResponse,
    TrackModificationRequest,
    BulkTrackModificationRequest,
    RollbackRequest,
    RollbackResponse,
    EditHistoryApiResponse,
)
import uuid
import math

router = APIRouter()


def _to_edit_history_response(
    entry, user_email: Optional[str] = None, user_name: Optional[str] = None
) -> EditHistoryResponse:
    """Convert EditHistory model to response model."""
    return EditHistoryResponse(
        id=str(entry.id),
        document_id=str(entry.document_id),
        user_id=str(entry.user_id) if entry.user_id else None,
        field_path=entry.field_path,
        old_value=entry.old_value,
        new_value=entry.new_value,
        edit_type=entry.edit_type,
        source=entry.source,
        ip_address=entry.ip_address,
        user_agent=entry.user_agent,
        created_at=entry.created_at,
        user_email=user_email,
        user_name=user_name,
    )


@router.get("/{document_id}", response_model=EditHistoryListResponse)
async def get_document_history(
    document_id: str = Path(..., description="Document ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    field_path: Optional[str] = Query(None, description="Filter by field path"),
    edit_type: Optional[str] = Query(None, description="Filter by edit type"),
    current_user: User = Depends(get_current_verified_user),
    _: bool = Depends(verify_document_ownership),
    history_service: EditHistoryService = Depends(get_edit_history_service),
):
    """
    Get edit history for a document.

    - **document_id**: Document ID to get history for
    - **page**: Page number (default: 1)
    - **page_size**: Number of entries per page (default: 20, max: 100)
    - **field_path**: Filter by field path (optional)
    - **edit_type**: Filter by edit type: manual, bulk, rollback, ai_correction (optional)
    """
    doc_uuid = uuid.UUID(document_id)
    offset = (page - 1) * page_size

    # Get total count
    total = await history_service.get_history_count(
        document_id=doc_uuid,
        field_path=field_path,
        edit_type=edit_type,
    )

    # Get paginated history
    entries = await history_service.get_document_history(
        document_id=doc_uuid,
        limit=page_size,
        offset=offset,
        field_path=field_path,
        edit_type=edit_type,
    )

    # Convert to response format with user info
    response_entries = []
    for entry in entries:
        user_email = entry.user.email if entry.user else None
        user_name = entry.user.full_name if entry.user else None
        response_entries.append(_to_edit_history_response(entry, user_email, user_name))

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return EditHistoryListResponse(
        success=True,
        data=response_entries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post(
    "/{document_id}",
    response_model=EditHistoryApiResponse,
    status_code=status.HTTP_201_CREATED,
)
async def track_modification(
    document_id: str = Path(..., description="Document ID"),
    modification: TrackModificationRequest = ...,
    request: Request = None,
    current_user: User = Depends(get_current_verified_user),
    _: bool = Depends(verify_document_ownership),
    history_service: EditHistoryService = Depends(get_edit_history_service),
):
    """
    Track a single field modification on a document.

    - **document_id**: Document ID
    - **field_path**: JSON path to the modified field
    - **old_value**: Previous value
    - **new_value**: New value
    - **edit_type**: Type of edit (manual, bulk, rollback, ai_correction)
    """
    doc_uuid = uuid.UUID(document_id)

    # Get client info from request
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent") if request else None

    # Wrap values in dict format for JSONB storage
    old_value = (
        {"value": modification.old_value}
        if modification.old_value is not None
        else None
    )
    new_value = (
        {"value": modification.new_value}
        if modification.new_value is not None
        else None
    )

    entry = await history_service.track_single_modification(
        document_id=doc_uuid,
        user_id=current_user.id,
        field_path=modification.field_path,
        old_value=old_value,
        new_value=new_value,
        edit_type=modification.edit_type,
        source="web",
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return EditHistoryApiResponse(
        success=True,
        data=_to_edit_history_response(
            entry, current_user.email, current_user.full_name
        ),
    )


@router.post(
    "/{document_id}/bulk",
    response_model=EditHistoryListResponse,
    status_code=status.HTTP_201_CREATED,
)
async def track_bulk_modifications(
    document_id: str = Path(..., description="Document ID"),
    bulk_request: BulkTrackModificationRequest = ...,
    request: Request = None,
    current_user: User = Depends(get_current_verified_user),
    _: bool = Depends(verify_document_ownership),
    history_service: EditHistoryService = Depends(get_edit_history_service),
):
    """
    Track multiple field modifications on a document at once.

    - **document_id**: Document ID
    - **modifications**: List of field modifications to track
    """
    doc_uuid = uuid.UUID(document_id)

    # Get client info from request
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent") if request else None

    # Convert modifications to FieldChange objects
    changes = []
    for mod in bulk_request.modifications:
        old_value = {"value": mod.old_value} if mod.old_value is not None else None
        new_value = {"value": mod.new_value} if mod.new_value is not None else None
        changes.append(
            FieldChange(
                field_path=mod.field_path,
                old_value=old_value,
                new_value=new_value,
            )
        )

    entries = await history_service.track_modification(
        document_id=doc_uuid,
        user_id=current_user.id,
        changes=changes,
        edit_type="bulk",
        source="web",
        ip_address=ip_address,
        user_agent=user_agent,
    )

    response_entries = [
        _to_edit_history_response(entry, current_user.email, current_user.full_name)
        for entry in entries
    ]

    return EditHistoryListResponse(
        success=True,
        data=response_entries,
        total=len(response_entries),
        page=1,
        page_size=len(response_entries),
        total_pages=1,
    )


@router.post("/{document_id}/rollback", response_model=RollbackResponse)
async def rollback_document(
    document_id: str = Path(..., description="Document ID"),
    rollback_request: RollbackRequest = ...,
    request: Request = None,
    current_user: User = Depends(get_current_verified_user),
    _: bool = Depends(verify_document_ownership),
    history_service: EditHistoryService = Depends(get_edit_history_service),
):
    """
    Rollback document changes.

    Either provide entry_id to rollback a specific field change,
    or provide timestamp to rollback all changes after that time.

    - **document_id**: Document ID
    - **entry_id**: Specific edit history entry ID to rollback (optional)
    - **timestamp**: Rollback all changes after this timestamp (optional)
    """
    doc_uuid = uuid.UUID(document_id)

    # Validate request - at least one must be provided
    if not rollback_request.entry_id and not rollback_request.timestamp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either entry_id or timestamp must be provided",
        )

    # Get client info from request
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent") if request else None

    if rollback_request.entry_id:
        # Rollback single entry
        entry_uuid = uuid.UUID(rollback_request.entry_id)
        result = await history_service.rollback_to_entry(
            document_id=doc_uuid,
            user_id=current_user.id,
            entry_id=entry_uuid,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Edit history entry not found or doesn't belong to this document",
            )

        return RollbackResponse(
            success=True,
            message="Successfully rolled back field to previous value",
            entries_count=1,
            entries=[
                _to_edit_history_response(
                    result, current_user.email, current_user.full_name
                )
            ],
        )

    else:
        # Rollback to timestamp
        results = await history_service.rollback_to_timestamp(
            document_id=doc_uuid,
            user_id=current_user.id,
            timestamp=rollback_request.timestamp,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        if not results:
            return RollbackResponse(
                success=True,
                message="No changes found after the specified timestamp",
                entries_count=0,
                entries=[],
            )

        response_entries = [
            _to_edit_history_response(entry, current_user.email, current_user.full_name)
            for entry in results
        ]

        return RollbackResponse(
            success=True,
            message=f"Successfully rolled back {len(results)} changes",
            entries_count=len(results),
            entries=response_entries,
        )


@router.get("/{document_id}/{entry_id}", response_model=EditHistoryApiResponse)
async def get_history_entry(
    document_id: str = Path(..., description="Document ID"),
    entry_id: str = Path(..., description="Edit history entry ID"),
    current_user: User = Depends(get_current_verified_user),
    _: bool = Depends(verify_document_ownership),
    history_service: EditHistoryService = Depends(get_edit_history_service),
):
    """
    Get a single edit history entry.

    - **document_id**: Document ID
    - **entry_id**: Edit history entry ID
    """
    entry_uuid = uuid.UUID(entry_id)

    entry = await history_service.get_entry_by_id(entry_uuid)

    if not entry or str(entry.document_id) != document_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edit history entry not found",
        )

    user_email = entry.user.email if entry.user else None
    user_name = entry.user.full_name if entry.user else None

    return EditHistoryApiResponse(
        success=True,
        data=_to_edit_history_response(entry, user_email, user_name),
    )

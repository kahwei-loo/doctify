"""
AI Assistants API Endpoints

Handles assistant CRUD, conversation management, and analytics.
Week 5 - Backend API Development (Day 13-14)
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Path, HTTPException, status

from app.api.v1.deps import (
    get_current_verified_user,
    get_db_session,
)
from app.db.models.user import User
from app.services.assistant.assistant_service import AssistantService
from app.models.common import (
    success_response,
    paginated_response,
)
from app.models.assistant import (
    AssistantCreate,
    AssistantUpdate,
    AssistantListResponse,
    AssistantStatsResponse,
    AssistantAnalyticsResponse,
    ConversationListResponse,
    ConversationStatusUpdate,
    MessageListResponse,
    SendMessageRequest,
)
from app.core.exceptions import (
    ValidationError,
    NotFoundError,
    AuthorizationError,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# =============================================================================
# Service Dependency
# =============================================================================


async def get_assistant_service(
    session: AsyncSession = Depends(get_db_session),
) -> AssistantService:
    """Get assistant service instance."""
    return AssistantService(session)


# =============================================================================
# Assistant Stats Endpoints (MUST be before /{assistant_id} to avoid conflict)
# =============================================================================


@router.get("/stats")
async def get_assistant_stats(
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Get aggregate statistics for user's assistants.

    Returns:
        - total_assistants: Total number of assistants
        - active_assistants: Number of active assistants
        - total_conversations: Total conversations across all assistants
        - unresolved_conversations: Unresolved conversation count
    """
    try:
        stats = await service.get_stats(user_id=current_user.id)

        return success_response(
            data={
                "total_assistants": stats.total_assistants,
                "active_assistants": stats.active_assistants,
                "total_conversations": stats.total_conversations,
                "unresolved_conversations": stats.unresolved_conversations,
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve assistant statistics: {str(e)}",
        )


# =============================================================================
# Assistant CRUD Endpoints
# =============================================================================


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_assistant(
    data: AssistantCreate,
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Create a new AI assistant.

    - **name**: Assistant name (required)
    - **description**: Optional description
    - **model_config**: AI model configuration (provider, model, temperature, max_tokens)
    - **widget_config**: Chat widget appearance configuration
    - **knowledge_base_id**: Optional connected knowledge base
    """
    try:
        assistant = await service.create_assistant(
            user_id=current_user.id,
            data=data,
        )

        return success_response(
            data=assistant.model_dump(by_alias=True),
            message="Assistant created successfully",
        )

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.get("/")
async def list_assistants(
    include_inactive: bool = Query(False, description="Include inactive assistants"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    List user's assistants with statistics.

    - **include_inactive**: Include inactive assistants (default: False)

    Returns paginated list of assistants with conversation counts.
    """
    try:
        result = await service.list_assistants(
            user_id=current_user.id,
            include_inactive=include_inactive,
        )

        return success_response(
            data={
                "assistants": [a.model_dump(by_alias=True) for a in result.assistants],
                "total": result.total,
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list assistants: {str(e)}",
        )


@router.get("/{assistant_id}")
async def get_assistant(
    assistant_id: str = Path(..., description="Assistant ID"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Get assistant by ID.

    - **assistant_id**: Assistant UUID
    """
    try:
        assistant = await service.get_assistant(
            assistant_id=UUID(assistant_id),
            user_id=current_user.id,
        )

        return success_response(
            data=assistant.model_dump(by_alias=True),
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.put("/{assistant_id}")
async def update_assistant(
    data: AssistantUpdate,
    assistant_id: str = Path(..., description="Assistant ID"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Update an assistant.

    - **assistant_id**: Assistant UUID
    - **name**: Optional new name
    - **description**: Optional new description
    - **model_config**: Optional updated AI model configuration
    - **widget_config**: Optional updated widget configuration
    - **is_active**: Optional activate/deactivate
    """
    try:
        assistant = await service.update_assistant(
            assistant_id=UUID(assistant_id),
            user_id=current_user.id,
            data=data,
        )

        return success_response(
            data=assistant.model_dump(by_alias=True),
            message="Assistant updated successfully",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.delete("/{assistant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assistant(
    assistant_id: str = Path(..., description="Assistant ID"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Delete an assistant.

    This will also delete all associated conversations and messages.

    - **assistant_id**: Assistant UUID
    """
    try:
        await service.delete_assistant(
            assistant_id=UUID(assistant_id),
            user_id=current_user.id,
        )
        return None

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


# =============================================================================
# Assistant Analytics Endpoints
# =============================================================================


@router.get("/{assistant_id}/analytics")
async def get_assistant_analytics(
    assistant_id: str = Path(..., description="Assistant ID"),
    period: int = Query(30, ge=1, le=365, description="Analytics period in days"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Get analytics for a specific assistant.

    - **assistant_id**: Assistant UUID
    - **period**: Analytics period in days (default: 30, max: 365)

    Returns:
        - total_conversations: Conversations in period
        - resolved_conversations: Resolved count
        - resolution_rate: Resolution percentage
        - avg_messages_per_conversation: Average message count
        - total_messages: Total messages in period
    """
    try:
        analytics = await service.get_analytics(
            assistant_id=UUID(assistant_id),
            user_id=current_user.id,
            period_days=period,
        )

        return success_response(
            data=analytics.model_dump(),
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


# =============================================================================
# Conversation Endpoints
# =============================================================================


@router.get("/{assistant_id}/conversations")
async def list_conversations(
    assistant_id: str = Path(..., description="Assistant ID"),
    status: Optional[str] = Query(
        None, description="Filter by status (unresolved, in_progress, resolved)"
    ),
    search: Optional[str] = Query(None, description="Search in message preview"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    List conversations for an assistant.

    - **assistant_id**: Assistant UUID
    - **status**: Optional filter by status
    - **search**: Optional search in last message preview
    - **skip**: Pagination offset
    - **limit**: Pagination limit (max 100)
    """
    try:
        result = await service.list_conversations(
            assistant_id=UUID(assistant_id),
            user_id=current_user.id,
            status=status,
            search=search,
            skip=skip,
            limit=limit,
        )

        return success_response(
            data={
                "conversations": [c.model_dump() for c in result.conversations],
                "total": result.total,
            }
        )

    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str = Path(..., description="Conversation ID"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Get a specific conversation.

    - **conversation_id**: Conversation UUID
    """
    try:
        conversation = await service.get_conversation(
            conversation_id=UUID(conversation_id),
            user_id=current_user.id,
        )

        return success_response(
            data=conversation.model_dump(),
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.patch("/conversations/{conversation_id}/status")
async def update_conversation_status(
    data: ConversationStatusUpdate,
    conversation_id: str = Path(..., description="Conversation ID"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Update conversation status.

    - **conversation_id**: Conversation UUID
    - **status**: New status (unresolved, in_progress, resolved)
    """
    try:
        conversation = await service.update_conversation_status(
            conversation_id=UUID(conversation_id),
            user_id=current_user.id,
            status=data.status.value,
        )

        return success_response(
            data=conversation.model_dump(),
            message=f"Conversation status updated to {data.status.value}",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )


@router.delete(
    "/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_conversation(
    conversation_id: str = Path(..., description="Conversation ID"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Delete a conversation and all its messages.

    - **conversation_id**: Conversation UUID
    """
    try:
        await service.delete_conversation(
            conversation_id=UUID(conversation_id),
            user_id=current_user.id,
        )
        return None

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


# =============================================================================
# Message Endpoints
# =============================================================================


@router.get("/conversations/{conversation_id}/messages")
async def list_messages(
    conversation_id: str = Path(..., description="Conversation ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum records to return"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    List messages for a conversation.

    - **conversation_id**: Conversation UUID
    - **skip**: Pagination offset
    - **limit**: Pagination limit (max 500)
    """
    try:
        result = await service.list_messages(
            conversation_id=UUID(conversation_id),
            user_id=current_user.id,
            skip=skip,
            limit=limit,
        )

        return success_response(
            data={
                "messages": [m.model_dump() for m in result.messages],
                "total": result.total,
            }
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.post(
    "/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED
)
async def send_message(
    data: SendMessageRequest,
    conversation_id: str = Path(..., description="Conversation ID"),
    current_user: User = Depends(get_current_verified_user),
    service: AssistantService = Depends(get_assistant_service),
):
    """
    Send a message as staff to the conversation.

    This is for manual staff replies, not AI-generated responses.

    - **conversation_id**: Conversation UUID
    - **content**: Message content
    """
    try:
        message = await service.send_staff_message(
            conversation_id=UUID(conversation_id),
            user_id=current_user.id,
            content=data.content,
        )

        return success_response(
            data=message.model_dump(),
            message="Message sent successfully",
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except AuthorizationError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )

"""
Public Chat API Endpoints

Anonymous chat endpoints for public chat widget with rate limiting.
Week 5 - Backend API Development (Day 17)
"""

import hashlib
import json
from typing import Optional

from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_db_session
from app.services.assistant.public_chat_service import PublicChatService
from app.models.assistant import PublicChatRequest, PublicChatResponse
from app.core.exceptions import NotFoundError, ValidationError

router = APIRouter()

# Rate limiter: 20 messages per minute per IP
limiter = Limiter(key_func=get_remote_address)


def get_user_fingerprint(request: Request, session_id: str) -> str:
    """
    Generate a fingerprint for anonymous user tracking.

    Combines IP address and session_id into a hash.

    Args:
        request: FastAPI request object
        session_id: Client session ID from localStorage

    Returns:
        SHA256 hash of IP + session_id
    """
    client_ip = get_remote_address(request)
    raw = f"{client_ip}:{session_id}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def get_public_chat_service(
    session: AsyncSession = Depends(get_db_session),
) -> PublicChatService:
    """Get public chat service instance."""
    return PublicChatService(session)


@router.post(
    "/public/chat/{assistant_id}/message",
    response_model=PublicChatResponse,
    summary="Send public chat message",
    description="Send a message to an AI assistant from the public chat widget. Rate limited to 20 messages per minute per IP.",
)
@limiter.limit("20/minute")
async def send_public_message(
    request: Request,
    assistant_id: str,
    data: PublicChatRequest,
    service: PublicChatService = Depends(get_public_chat_service),
):
    """
    Send a public (anonymous) chat message.

    This endpoint is used by the public chat widget embedded on external websites.
    Rate limited to 20 messages per minute per IP address.

    Args:
        assistant_id: Assistant UUID
        data: Message request with session_id, content, and optional context

    Returns:
        PublicChatResponse with conversation_id, message_id, response content
    """
    try:
        # Generate user fingerprint for tracking
        user_fingerprint = get_user_fingerprint(request, data.session_id)

        # Process the message
        result = await service.process_message(
            assistant_id=assistant_id,
            session_id=data.session_id,
            user_fingerprint=user_fingerprint,
            content=data.content,
            context=data.context,
        )

        return PublicChatResponse(
            conversation_id=result["conversation_id"],
            message_id=result["message_id"],
            content=result["content"],
            model_used=result.get("model_used"),
        )

    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}",
        )


@router.post(
    "/public/chat/{assistant_id}/stream",
    summary="Send public chat message with streaming response",
    description="Send a message and receive streaming response via Server-Sent Events. Rate limited to 20 messages per minute per IP.",
)
@limiter.limit("20/minute")
async def send_public_message_streaming(
    request: Request,
    assistant_id: str,
    data: PublicChatRequest,
    service: PublicChatService = Depends(get_public_chat_service),
):
    """
    Send a public chat message with streaming response.

    Uses Server-Sent Events (SSE) to stream the response.
    Each chunk is sent as a JSON object with type and data fields.

    Event types:
    - message_saved: User message was saved
    - chunk: Response text chunk
    - complete: Response complete with message_id
    - error: An error occurred

    Args:
        assistant_id: Assistant UUID
        data: Message request with session_id, content, and optional context

    Returns:
        StreamingResponse with SSE format
    """
    try:
        # Generate user fingerprint for tracking
        user_fingerprint = get_user_fingerprint(request, data.session_id)

        async def event_generator():
            """Generate SSE events from the streaming response."""
            try:
                async for chunk in service.process_message_streaming(
                    assistant_id=assistant_id,
                    session_id=data.session_id,
                    user_fingerprint=user_fingerprint,
                    content=data.content,
                    context=data.context,
                ):
                    # Format as SSE
                    yield f"data: {json.dumps(chunk)}\n\n"

            except NotFoundError as e:
                yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
            except ValidationError as e:
                yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'data': 'Internal server error'})}\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            },
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start streaming: {str(e)}",
        )


@router.get(
    "/public/chat/{assistant_id}/config",
    summary="Get assistant public configuration",
    description="Get the public-facing configuration for an assistant's chat widget.",
)
async def get_assistant_public_config(
    assistant_id: str,
    service: PublicChatService = Depends(get_public_chat_service),
):
    """
    Get assistant's public configuration for the chat widget.

    Returns widget config (colors, position, welcome message) without sensitive data.

    Args:
        assistant_id: Assistant UUID

    Returns:
        Widget configuration for the public chat interface
    """
    try:
        from uuid import UUID

        assistant = await service.assistant_repo.get_by_id(UUID(assistant_id))

        if not assistant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant not found",
            )

        if not assistant.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assistant is not available",
            )

        # Return only public-safe configuration
        widget_config = assistant.widget_config or {}
        return {
            "assistant_id": str(assistant.id),
            "name": assistant.name,
            "widget_config": {
                "primary_color": widget_config.get("primary_color", "#3b82f6"),
                "position": widget_config.get("position", "bottom-right"),
                "welcome_message": widget_config.get("welcome_message"),
                "placeholder_text": widget_config.get("placeholder_text"),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get configuration: {str(e)}",
        )

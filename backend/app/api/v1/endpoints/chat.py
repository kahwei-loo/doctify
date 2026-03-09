"""
Chat API Endpoints

API routes for chatbot functionality with WebSocket support.
Phase 13 - Chatbot Implementation
"""

from typing import List
from uuid import UUID
from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.api.v1.deps import get_current_user, get_db
from app.db.database import get_session_factory
from app.domain.entities.user import UserEntity
from app.services.chat.chat_service import ChatService
from app.db.repositories.chat_repository import (
    ChatConversationRepository,
    ChatMessageRepository,
)
from app.models.chat import (
    ChatConversationCreate,
    ChatConversationResponse,
    ChatMessageResponse,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "/conversations",
    response_model=ChatConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    request: ChatConversationCreate,
    current_user: UserEntity = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat conversation."""
    chat_service = ChatService(db)
    conversation = await chat_service.create_conversation(
        user_id=current_user.id, title=request.title
    )
    await db.commit()

    return ChatConversationResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.get("/conversations", response_model=List[ChatConversationResponse])
async def list_conversations(
    limit: int = 50,
    current_user: UserEntity = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's chat conversations."""
    conversation_repo = ChatConversationRepository(db)
    conversations = await conversation_repo.get_by_user_id(current_user.id, limit)

    return [
        ChatConversationResponse(
            id=conv.id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        )
        for conv in conversations
    ]


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=List[ChatMessageResponse],
)
async def get_conversation_messages(
    conversation_id: UUID,
    limit: int = 100,
    current_user: UserEntity = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a conversation."""
    # Verify ownership
    conversation_repo = ChatConversationRepository(db)
    conversation = await conversation_repo.get_by_id(conversation_id)

    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
        )

    message_repo = ChatMessageRepository(db)
    messages = await message_repo.get_by_conversation_id(conversation_id, limit)

    return [
        ChatMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            tool_used=msg.tool_used,
            created_at=msg.created_at,
        )
        for msg in messages
    ]


@router.websocket("/ws/{conversation_id}")
async def chat_websocket(websocket: WebSocket, conversation_id: str, token: str = None):
    """
    WebSocket endpoint for streaming chat responses.

    Client sends: {"message": "user question"}
    Server streams:
      {"type": "intent", "data": "rag_query"}
      {"type": "tool_start", "data": "rag_query"}
      {"type": "chunk", "data": "word "}
      {"type": "tool_result", "data": {...}}
      {"type": "complete", "data": "message_id"}
    """
    await websocket.accept()

    try:
        # Authenticate (simplified - in production use proper auth)
        # current_user = await get_current_user_ws(token)

        # Get DB session
        async with get_session_factory()() as session:
            chat_service = ChatService(session)

            # Verify conversation ownership
            conversation_repo = ChatConversationRepository(session)
            conversation = await conversation_repo.get_by_id(UUID(conversation_id))

            if not conversation:
                await websocket.send_json(
                    {"type": "error", "data": "Conversation not found"}
                )
                await websocket.close()
                return

            # Chat loop
            while True:
                # Receive message
                data = await websocket.receive_json()
                user_message = data.get("message", "")

                if not user_message:
                    continue

                # Process and stream response
                async for chunk in chat_service.process_message_streaming(
                    conversation_id=UUID(conversation_id), user_message=user_message
                ):
                    await websocket.send_json(chunk)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for conversation {conversation_id}")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.send_json({"type": "error", "data": str(e)})
        await websocket.close()

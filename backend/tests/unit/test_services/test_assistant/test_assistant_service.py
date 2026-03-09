"""
Unit tests for AssistantService.

Tests CRUD operations, ownership checks, and conversation management.
"""

import uuid
from datetime import datetime

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.assistant.assistant_service import AssistantService
from app.core.exceptions import ValidationError, NotFoundError, AuthorizationError


MODULE = "app.services.assistant.assistant_service"
USER_ID = uuid.uuid4()
OTHER_USER = uuid.uuid4()
ASSISTANT_ID = uuid.uuid4()
CONVERSATION_ID = uuid.uuid4()


def _make_assistant(
    assistant_id=None,
    user_id=None,
    name="Test Bot",
    description="A test assistant",
    is_active=True,
    knowledge_base_id=None,
    model_config=None,
    widget_config=None,
):
    """Create a mock Assistant object."""
    a = MagicMock()
    a.id = assistant_id or ASSISTANT_ID
    a.user_id = user_id or USER_ID
    a.name = name
    a.description = description
    a.is_active = is_active
    a.knowledge_base_id = knowledge_base_id
    a.model_config = model_config or {"provider": "openai", "model": "gpt-4"}
    a.widget_config = widget_config or {"primary_color": "#3b82f6"}
    a.created_at = datetime(2026, 1, 1)
    a.updated_at = datetime(2026, 1, 1)
    return a


def _make_conversation(
    conversation_id=None,
    assistant_id=None,
    user_id=None,
    status="unresolved",
):
    """Create a mock AssistantConversation object."""
    c = MagicMock()
    c.id = conversation_id or CONVERSATION_ID
    c.assistant_id = assistant_id or ASSISTANT_ID
    c.user_id = user_id
    c.session_id = "sess_abc123"
    c.status = status
    c.last_message_preview = "Hello"
    c.last_message_at = datetime(2026, 1, 1)
    c.message_count = 3
    c.context = {}
    c.resolved_at = None
    c.created_at = datetime(2026, 1, 1)
    c.updated_at = datetime(2026, 1, 1)
    return c


def _make_message(role="user", content="Hello"):
    """Create a mock AssistantMessage object."""
    m = MagicMock()
    m.id = uuid.uuid4()
    m.conversation_id = CONVERSATION_ID
    m.role = role
    m.content = content
    m.model_used = "gpt-4" if role == "assistant" else None
    m.tokens_used = 50 if role == "assistant" else None
    m.created_at = datetime(2026, 1, 1)
    return m


def _build_service():
    """Instantiate AssistantService with mocked repositories."""
    session = AsyncMock()

    with (
        patch(f"{MODULE}.AssistantRepository") as mock_repo,
        patch(f"{MODULE}.AssistantConversationRepository") as mock_conv_repo,
        patch(f"{MODULE}.AssistantMessageRepository") as mock_msg_repo,
    ):
        service = AssistantService(session)

    return service


@pytest.mark.unit
class TestGetAssistant:
    """Tests for get_assistant with ownership verification."""

    @pytest.mark.asyncio
    async def test_returns_assistant_for_owner(self):
        service = _build_service()
        assistant = _make_assistant(user_id=USER_ID)
        service.assistant_repo.get_by_id = AsyncMock(return_value=assistant)

        result = await service.get_assistant(ASSISTANT_ID, USER_ID)

        assert result.name == "Test Bot"
        assert result.id == str(ASSISTANT_ID)

    @pytest.mark.asyncio
    async def test_not_found_raises_error(self):
        service = _build_service()
        service.assistant_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(NotFoundError, match="Assistant not found"):
            await service.get_assistant(ASSISTANT_ID, USER_ID)

    @pytest.mark.asyncio
    async def test_wrong_user_raises_authorization_error(self):
        service = _build_service()
        assistant = _make_assistant(user_id=OTHER_USER)
        service.assistant_repo.get_by_id = AsyncMock(return_value=assistant)

        with pytest.raises(AuthorizationError, match="Not authorized"):
            await service.get_assistant(ASSISTANT_ID, USER_ID)


@pytest.mark.unit
class TestDeleteAssistant:
    """Tests for delete_assistant with ownership verification."""

    @pytest.mark.asyncio
    async def test_owner_can_delete(self):
        service = _build_service()
        assistant = _make_assistant(user_id=USER_ID)
        service.assistant_repo.get_by_id = AsyncMock(return_value=assistant)
        service.assistant_repo.delete = AsyncMock()

        result = await service.delete_assistant(ASSISTANT_ID, USER_ID)

        assert result is True
        service.assistant_repo.delete.assert_awaited_once_with(ASSISTANT_ID)

    @pytest.mark.asyncio
    async def test_non_owner_cannot_delete(self):
        service = _build_service()
        assistant = _make_assistant(user_id=OTHER_USER)
        service.assistant_repo.get_by_id = AsyncMock(return_value=assistant)

        with pytest.raises(AuthorizationError):
            await service.delete_assistant(ASSISTANT_ID, USER_ID)

    @pytest.mark.asyncio
    async def test_missing_assistant_raises_not_found(self):
        service = _build_service()
        service.assistant_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(NotFoundError):
            await service.delete_assistant(ASSISTANT_ID, USER_ID)


@pytest.mark.unit
class TestUpdateAssistant:
    """Tests for update_assistant."""

    @pytest.mark.asyncio
    async def test_empty_update_raises_validation_error(self):
        service = _build_service()
        assistant = _make_assistant(user_id=USER_ID)
        service.assistant_repo.get_by_id = AsyncMock(return_value=assistant)

        # Create update data with all None fields
        update_data = MagicMock()
        update_data.name = None
        update_data.description = None
        update_data.ai_model_config = None
        update_data.widget_config = None
        update_data.knowledge_base_id = None
        update_data.is_active = None

        with pytest.raises(ValidationError, match="No update data"):
            await service.update_assistant(ASSISTANT_ID, USER_ID, update_data)


@pytest.mark.unit
class TestGetConversation:
    """Tests for get_conversation with ownership verification."""

    @pytest.mark.asyncio
    async def test_not_found_raises_error(self):
        service = _build_service()
        service.conversation_repo.get_with_messages = AsyncMock(return_value=None)

        with pytest.raises(NotFoundError, match="Conversation not found"):
            await service.get_conversation(CONVERSATION_ID, USER_ID)

    @pytest.mark.asyncio
    async def test_non_owner_cannot_access_conversation(self):
        service = _build_service()
        conversation = _make_conversation()
        service.conversation_repo.get_with_messages = AsyncMock(
            return_value=conversation
        )
        service.assistant_repo.check_ownership = AsyncMock(return_value=False)

        with pytest.raises(AuthorizationError):
            await service.get_conversation(CONVERSATION_ID, USER_ID)


@pytest.mark.unit
class TestDeleteConversation:
    """Tests for delete_conversation with ownership verification."""

    @pytest.mark.asyncio
    async def test_owner_can_delete_conversation(self):
        service = _build_service()
        conversation = _make_conversation()
        service.conversation_repo.get_by_id = AsyncMock(return_value=conversation)
        service.assistant_repo.check_ownership = AsyncMock(return_value=True)
        service.conversation_repo.delete = AsyncMock()

        result = await service.delete_conversation(CONVERSATION_ID, USER_ID)

        assert result is True
        service.conversation_repo.delete.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_missing_conversation_raises_not_found(self):
        service = _build_service()
        service.conversation_repo.get_by_id = AsyncMock(return_value=None)

        with pytest.raises(NotFoundError):
            await service.delete_conversation(CONVERSATION_ID, USER_ID)


@pytest.mark.unit
class TestSendStaffMessage:
    """Tests for send_staff_message."""

    @pytest.mark.asyncio
    async def test_sets_unresolved_to_in_progress(self):
        service = _build_service()
        conversation = _make_conversation(status="unresolved")
        service.conversation_repo.get_by_id = AsyncMock(return_value=conversation)
        service.assistant_repo.check_ownership = AsyncMock(return_value=True)
        service.message_repo.create_message = AsyncMock(
            return_value=_make_message(role="assistant", content="Staff reply")
        )
        service.conversation_repo.update_last_message = AsyncMock()
        service.conversation_repo.update_status = AsyncMock()

        await service.send_staff_message(CONVERSATION_ID, USER_ID, "Staff reply")

        service.conversation_repo.update_status.assert_awaited_once_with(
            CONVERSATION_ID, "in_progress"
        )

    @pytest.mark.asyncio
    async def test_in_progress_stays_in_progress(self):
        service = _build_service()
        conversation = _make_conversation(status="in_progress")
        service.conversation_repo.get_by_id = AsyncMock(return_value=conversation)
        service.assistant_repo.check_ownership = AsyncMock(return_value=True)
        service.message_repo.create_message = AsyncMock(
            return_value=_make_message(role="assistant", content="Reply")
        )
        service.conversation_repo.update_last_message = AsyncMock()
        service.conversation_repo.update_status = AsyncMock()

        await service.send_staff_message(CONVERSATION_ID, USER_ID, "Reply")

        # Should NOT update status since it's already in_progress
        service.conversation_repo.update_status.assert_not_awaited()

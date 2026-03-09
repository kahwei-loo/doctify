"""Unit tests for the AI Gateway module."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.services.ai.gateway as gateway_module
from app.services.ai.gateway import (
    AIGateway,
    ModelPurpose,
    get_ai_gateway,
    reset_gateway,
    update_model_cache,
)


def _make_mock_settings(**overrides) -> MagicMock:
    """Create a MagicMock that mimics the settings object with AI gateway attrs."""
    defaults = {
        "AI_GATEWAY_CHAT_MODEL": "openai/gpt-4o",
        "AI_GATEWAY_CHAT_FAST_MODEL": "openai/gpt-4o-mini",
        "AI_GATEWAY_EMBEDDING_MODEL": "openai/text-embedding-3-small",
        "AI_GATEWAY_VISION_MODEL": "openai/gpt-4o",
        "AI_GATEWAY_CLASSIFIER_MODEL": "openai/gpt-4o-mini",
        "AI_GATEWAY_RERANKER_MODEL": "cohere/rerank-v3.5",
        "AI_GATEWAY_VISION_ESCALATION": "gpt-4o,claude-3-opus",
        "OPENAI_API_KEY": "sk-test-key",
        "OPENAI_BASE_URL": "",
        "COHERE_API_KEY": "cohere-test-key",
    }
    defaults.update(overrides)
    mock = MagicMock()
    for key, value in defaults.items():
        setattr(mock, key, value)
    return mock


@pytest.fixture(autouse=True)
def _reset_module_state():
    """Reset module-level singleton and DB cache before and after each test."""
    gateway_module._gateway_instance = None
    gateway_module._db_model_cache.clear()
    yield
    gateway_module._gateway_instance = None
    gateway_module._db_model_cache.clear()


@pytest.mark.unit
class TestAIGateway:
    """Tests for the AIGateway class and module-level helper functions."""

    @patch("app.services.ai.gateway.get_settings")
    def test_get_model_returns_configured_model(self, mock_get_settings):
        """get_model returns the model name from settings for a given purpose."""
        mock_get_settings.return_value = _make_mock_settings()

        gw = AIGateway()

        assert gw.get_model(ModelPurpose.CHAT) == "openai/gpt-4o"
        assert gw.get_model(ModelPurpose.CHAT_FAST) == "openai/gpt-4o-mini"
        assert gw.get_model(ModelPurpose.EMBEDDING) == "openai/text-embedding-3-small"
        assert gw.get_model(ModelPurpose.RERANKER) == "cohere/rerank-v3.5"

    @patch("app.services.ai.gateway.get_settings")
    def test_get_model_prefers_db_cache(self, mock_get_settings):
        """When _db_model_cache has an entry for a purpose, it takes priority."""
        mock_get_settings.return_value = _make_mock_settings()
        gateway_module._db_model_cache["chat"] = "anthropic/claude-3-sonnet"

        gw = AIGateway()

        assert gw.get_model(ModelPurpose.CHAT) == "anthropic/claude-3-sonnet"
        # Other purposes still use settings defaults
        assert gw.get_model(ModelPurpose.CHAT_FAST) == "openai/gpt-4o-mini"

    @patch("app.services.ai.gateway.get_settings")
    def test_get_vision_escalation_chain(self, mock_get_settings):
        """get_vision_escalation_chain splits the comma-separated setting."""
        mock_get_settings.return_value = _make_mock_settings(
            AI_GATEWAY_VISION_ESCALATION="gpt-4o, claude-3-opus , gemini-pro"
        )

        gw = AIGateway()
        chain = gw.get_vision_escalation_chain()

        assert chain == ["gpt-4o", "claude-3-opus", "gemini-pro"]

    @patch("app.services.ai.gateway.litellm")
    @patch("app.services.ai.gateway.get_settings")
    async def test_acompletion_calls_litellm(self, mock_get_settings, mock_litellm):
        """acompletion delegates to litellm.acompletion with correct arguments."""
        mock_get_settings.return_value = _make_mock_settings(OPENAI_BASE_URL="")
        mock_litellm.acompletion = AsyncMock(return_value={"choices": []})

        gw = AIGateway()
        messages = [{"role": "user", "content": "Hello"}]
        result = await gw.acompletion(messages, purpose=ModelPurpose.CHAT)

        mock_litellm.acompletion.assert_awaited_once_with(
            model="openai/gpt-4o",
            messages=messages,
            stream=False,
            api_key="sk-test-key",
        )
        assert result == {"choices": []}

    @patch("app.services.ai.gateway.litellm")
    @patch("app.services.ai.gateway.get_settings")
    async def test_acompletion_with_custom_model(self, mock_get_settings, mock_litellm):
        """When model param is provided, it overrides the purpose-based model."""
        mock_get_settings.return_value = _make_mock_settings(OPENAI_BASE_URL="")
        mock_litellm.acompletion = AsyncMock(return_value={"choices": []})

        gw = AIGateway()
        messages = [{"role": "user", "content": "Hello"}]
        await gw.acompletion(messages, model="custom/my-model")

        call_kwargs = mock_litellm.acompletion.call_args[1]
        assert call_kwargs["model"] == "custom/my-model"

    @patch("app.services.ai.gateway.litellm")
    @patch("app.services.ai.gateway.get_settings")
    async def test_acompletion_with_base_url(self, mock_get_settings, mock_litellm):
        """When OPENAI_BASE_URL is set, api_base is included in the call."""
        mock_get_settings.return_value = _make_mock_settings(
            OPENAI_BASE_URL="https://my-proxy.example.com/v1"
        )
        mock_litellm.acompletion = AsyncMock(return_value={"choices": []})

        gw = AIGateway()
        messages = [{"role": "user", "content": "Hello"}]
        await gw.acompletion(messages)

        call_kwargs = mock_litellm.acompletion.call_args[1]
        assert call_kwargs["api_base"] == "https://my-proxy.example.com/v1"

    @patch("app.services.ai.gateway.litellm")
    @patch("app.services.ai.gateway.get_settings")
    async def test_aembedding_calls_litellm(self, mock_get_settings, mock_litellm):
        """aembedding delegates to litellm.aembedding with correct arguments."""
        mock_get_settings.return_value = _make_mock_settings(OPENAI_BASE_URL="")
        mock_litellm.aembedding = AsyncMock(return_value={"data": []})

        gw = AIGateway()
        result = await gw.aembedding("test input")

        mock_litellm.aembedding.assert_awaited_once_with(
            model="openai/text-embedding-3-small",
            input="test input",
            encoding_format="float",
            api_key="sk-test-key",
        )
        assert result == {"data": []}

    @patch("app.services.ai.gateway.litellm")
    @patch("app.services.ai.gateway.get_settings")
    async def test_arerank_calls_litellm(self, mock_get_settings, mock_litellm):
        """arerank delegates to litellm.arerank with correct arguments."""
        mock_get_settings.return_value = _make_mock_settings()
        mock_litellm.arerank = AsyncMock(return_value={"results": []})

        gw = AIGateway()
        docs = ["doc1", "doc2"]
        result = await gw.arerank("search query", docs, top_n=3)

        mock_litellm.arerank.assert_awaited_once_with(
            model="cohere/rerank-v3.5",
            query="search query",
            documents=docs,
            top_n=3,
        )
        assert result == {"results": []}

    @patch("app.services.ai.gateway.get_settings")
    def test_singleton_get_ai_gateway(self, mock_get_settings):
        """get_ai_gateway returns the same instance on repeated calls."""
        mock_get_settings.return_value = _make_mock_settings()

        first = get_ai_gateway()
        second = get_ai_gateway()

        assert first is second

    @patch("app.services.ai.gateway.get_settings")
    def test_reset_gateway_clears_instance(self, mock_get_settings):
        """After reset_gateway, get_ai_gateway creates a new instance."""
        mock_get_settings.return_value = _make_mock_settings()

        first = get_ai_gateway()
        reset_gateway()
        second = get_ai_gateway()

        assert first is not second

    @patch("app.services.ai.gateway.get_settings")
    def test_update_model_cache(self, mock_get_settings):
        """update_model_cache sets the purpose key in _db_model_cache."""
        mock_get_settings.return_value = _make_mock_settings()

        update_model_cache("chat", "anthropic/claude-3-haiku")
        update_model_cache("embedding", "cohere/embed-v4")

        assert gateway_module._db_model_cache["chat"] == "anthropic/claude-3-haiku"
        assert gateway_module._db_model_cache["embedding"] == "cohere/embed-v4"

        # Verify a new gateway instance picks up the cached values
        gw = AIGateway()
        assert gw.get_model(ModelPurpose.CHAT) == "anthropic/claude-3-haiku"
        assert gw.get_model(ModelPurpose.EMBEDDING) == "cohere/embed-v4"

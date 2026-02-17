"""
AI Gateway — Centralized AI provider access via LiteLLM.

Wraps litellm in library mode to provide:
- Per-purpose model routing (chat, embedding, vision, reranking, etc.)
- Centralized API key and base_url management
- OpenAI-compatible response objects (drop-in replacement)
"""

import logging
import os
import threading
from enum import Enum
from typing import Any, List, Optional, Union

import litellm

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level DB model cache (sync-safe dict for gateway __init__)
# Populated on startup and after admin updates.
# ---------------------------------------------------------------------------
_db_model_cache: dict[str, str] = {}


class ModelPurpose(str, Enum):
    """Logical purpose for model selection."""
    CHAT = "chat"
    CHAT_FAST = "chat_fast"
    EMBEDDING = "embedding"
    VISION = "vision"
    CLASSIFIER = "classifier"
    RERANKER = "reranker"


class AIGateway:
    """
    Centralized AI gateway using LiteLLM in library mode.

    All methods return OpenAI-compatible response objects so existing
    response-parsing code works unchanged.
    """

    def __init__(self):
        settings = get_settings()

        # Model mapping from purpose → configured model name
        # DB cache takes priority over env-var defaults
        self._models = {
            ModelPurpose.CHAT: _db_model_cache.get("chat", settings.AI_GATEWAY_CHAT_MODEL),
            ModelPurpose.CHAT_FAST: _db_model_cache.get("chat_fast", settings.AI_GATEWAY_CHAT_FAST_MODEL),
            ModelPurpose.EMBEDDING: _db_model_cache.get("embedding", settings.AI_GATEWAY_EMBEDDING_MODEL),
            ModelPurpose.VISION: _db_model_cache.get("vision", settings.AI_GATEWAY_VISION_MODEL),
            ModelPurpose.CLASSIFIER: _db_model_cache.get("classifier", settings.AI_GATEWAY_CLASSIFIER_MODEL),
            ModelPurpose.RERANKER: _db_model_cache.get("reranker", settings.AI_GATEWAY_RERANKER_MODEL),
        }

        # Store API credentials for passing to litellm calls
        self._openai_api_key = settings.OPENAI_API_KEY
        self._openai_base_url = settings.OPENAI_BASE_URL
        self._cohere_api_key = settings.COHERE_API_KEY

        # Set env var for litellm's Cohere integration
        if self._cohere_api_key:
            os.environ["COHERE_API_KEY"] = self._cohere_api_key

        # Suppress litellm's verbose logging
        litellm.suppress_debug_info = True

    def get_model(self, purpose: ModelPurpose) -> str:
        """Get the configured model name for a given purpose."""
        return self._models[purpose]

    def get_vision_escalation_chain(self) -> List[str]:
        """Get the vision model escalation chain as a list."""
        settings = get_settings()
        return [m.strip() for m in settings.AI_GATEWAY_VISION_ESCALATION.split(",") if m.strip()]

    async def acompletion(
        self,
        messages: List[dict],
        *,
        purpose: ModelPurpose = ModelPurpose.CHAT,
        model: Optional[str] = None,
        stream: bool = False,
        tools: Optional[List[dict]] = None,
        tool_choice: Optional[Any] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[Union[int, float]] = None,
        **kwargs,
    ):
        """
        Async chat completion via litellm.

        Returns an OpenAI-compatible response object.
        """
        model_name = model or self._models[purpose]

        call_kwargs = {
            "model": model_name,
            "messages": messages,
            "stream": stream,
            "api_key": self._openai_api_key,
        }

        if self._openai_base_url:
            call_kwargs["api_base"] = self._openai_base_url

        if tools is not None:
            call_kwargs["tools"] = tools
        if tool_choice is not None:
            call_kwargs["tool_choice"] = tool_choice
        if temperature is not None:
            call_kwargs["temperature"] = temperature
        if max_tokens is not None:
            call_kwargs["max_tokens"] = max_tokens
        if timeout is not None:
            call_kwargs["timeout"] = timeout

        call_kwargs.update(kwargs)

        return await litellm.acompletion(**call_kwargs)

    async def aembedding(
        self,
        input_text: Union[str, List[str]],
        *,
        model: Optional[str] = None,
        encoding_format: str = "float",
        **kwargs,
    ):
        """
        Async embedding generation via litellm.

        Returns an OpenAI-compatible embedding response.
        """
        model_name = model or self._models[ModelPurpose.EMBEDDING]

        call_kwargs = {
            "model": model_name,
            "input": input_text,
            "encoding_format": encoding_format,
            "api_key": self._openai_api_key,
        }

        if self._openai_base_url:
            call_kwargs["api_base"] = self._openai_base_url

        call_kwargs.update(kwargs)

        return await litellm.aembedding(**call_kwargs)

    async def arerank(
        self,
        query: str,
        documents: List[str],
        *,
        model: Optional[str] = None,
        top_n: Optional[int] = None,
        **kwargs,
    ):
        """
        Async reranking via litellm.

        Returns a response with .results[i].index and .results[i].relevance_score.
        """
        model_name = model or self._models[ModelPurpose.RERANKER]

        call_kwargs = {
            "model": model_name,
            "query": query,
            "documents": documents,
        }

        if top_n is not None:
            call_kwargs["top_n"] = top_n

        call_kwargs.update(kwargs)

        return await litellm.arerank(**call_kwargs)


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_gateway_instance: Optional[AIGateway] = None
_gateway_lock = threading.Lock()


def get_ai_gateway() -> AIGateway:
    """Get or create the singleton AIGateway instance (thread-safe)."""
    global _gateway_instance
    if _gateway_instance is None:
        with _gateway_lock:
            if _gateway_instance is None:
                _gateway_instance = AIGateway()
    return _gateway_instance


def update_model_cache(purpose: str, model_name: str) -> None:
    """Update the sync cache for a single purpose (called after admin save)."""
    _db_model_cache[purpose] = model_name


def reset_gateway() -> None:
    """Discard the current singleton so the next call rebuilds with fresh cache."""
    global _gateway_instance
    with _gateway_lock:
        _gateway_instance = None


async def load_settings_into_cache(session_factory) -> None:
    """Pre-load DB model settings into module cache (called at startup)."""
    try:
        async with session_factory() as session:
            from app.db.repositories.ai_model_settings_repository import AIModelSettingsRepository
            repo = AIModelSettingsRepository(session)
            rows = await repo.get_all_active()
            for row in rows:
                _db_model_cache[row.purpose] = row.model_name
            if rows:
                logger.info(f"Loaded {len(rows)} AI model settings from DB into cache")
    except Exception as e:
        logger.warning(f"Could not load AI model settings from DB (non-critical): {e}")

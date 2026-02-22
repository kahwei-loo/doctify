"""
AI Model Settings Service — DB-first with env-var fallback.

Manages the mapping of ModelPurpose → model_name, merging DB overrides
with environment-variable defaults.
"""

import logging
from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.repositories.ai_model_settings_repository import AIModelSettingsRepository
from app.models.ai_model_settings import (
    AIModelSettingResponse,
    AIModelSettingsListResponse,
    ModelCatalogEntry,
)
from app.services.ai.gateway import ModelPurpose

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Curated model catalog (served via API, no DB table needed)
# ---------------------------------------------------------------------------

MODEL_CATALOG: List[Dict] = [
    # ── Chat & Classifier ──────────────────────────────────────────────
    {"model_id": "openrouter/openai/gpt-4o", "display_name": "GPT-4o", "provider": "OpenAI", "purposes": ["chat", "classifier"]},
    {"model_id": "openrouter/openai/gpt-4o-mini", "display_name": "GPT-4o Mini", "provider": "OpenAI", "purposes": ["chat", "chat_fast", "classifier"]},
    {"model_id": "openrouter/anthropic/claude-sonnet-4.5", "display_name": "Claude Sonnet 4.5", "provider": "Anthropic", "purposes": ["chat"]},
    {"model_id": "openrouter/deepseek/deepseek-chat", "display_name": "DeepSeek V3.2", "provider": "DeepSeek", "purposes": ["chat", "chat_fast", "classifier"]},
    {"model_id": "openrouter/google/gemini-2.5-flash-lite", "display_name": "Gemini 2.5 Flash Lite", "provider": "Google", "purposes": ["chat", "chat_fast", "classifier"]},
    {"model_id": "openrouter/google/gemini-3-flash-preview", "display_name": "Gemini 3 Flash Preview", "provider": "Google", "purposes": ["chat", "vision"]},
    # ── Embedding ───────────────────────────────────────────────────────
    {"model_id": "openrouter/openai/text-embedding-3-small", "display_name": "text-embedding-3-small", "provider": "OpenAI", "purposes": ["embedding"]},
    {"model_id": "openrouter/openai/text-embedding-3-large", "display_name": "text-embedding-3-large", "provider": "OpenAI", "purposes": ["embedding"]},
    # ── Vision / OCR ────────────────────────────────────────────────────
    {"model_id": "openrouter/qwen/qwen3-vl-30b-a3b-instruct", "display_name": "Qwen3 VL 30B A3B", "provider": "Qwen", "purposes": ["vision"]},
    {"model_id": "openrouter/qwen/qwen3-vl-32b-instruct", "display_name": "Qwen3 VL 32B", "provider": "Qwen", "purposes": ["vision"]},
    {"model_id": "openrouter/qwen/qwen3.5-397b-a17b", "display_name": "Qwen3.5 397B MoE", "provider": "Qwen", "purposes": ["vision"]},
    # ── Reranker ────────────────────────────────────────────────────────
    {"model_id": "cohere/rerank-v3.5", "display_name": "Cohere Rerank v3.5", "provider": "Cohere", "purposes": ["reranker"]},
]

# Purpose → Settings field name
_PURPOSE_ENV_MAP: Dict[str, str] = {
    "chat": "AI_GATEWAY_CHAT_MODEL",
    "chat_fast": "AI_GATEWAY_CHAT_FAST_MODEL",
    "embedding": "AI_GATEWAY_EMBEDDING_MODEL",
    "vision": "AI_GATEWAY_VISION_MODEL",
    "classifier": "AI_GATEWAY_CLASSIFIER_MODEL",
    "reranker": "AI_GATEWAY_RERANKER_MODEL",
}


def _get_env_defaults() -> Dict[str, str]:
    """Return a dict of purpose → env-var model name."""
    settings = get_settings()
    return {
        purpose: getattr(settings, field)
        for purpose, field in _PURPOSE_ENV_MAP.items()
    }


class AIModelSettingsService:
    """Reads from DB with env-var fallback, writes back through gateway cache."""

    def __init__(self, session: AsyncSession):
        self._repo = AIModelSettingsRepository(session)

    async def get_all_settings(self) -> AIModelSettingsListResponse:
        """Merge DB rows + env defaults for all purposes."""
        db_rows = await self._repo.get_all_active()
        env_defaults = _get_env_defaults()

        db_by_purpose = {row.purpose: row for row in db_rows}

        settings_list: List[AIModelSettingResponse] = []
        for purpose in ModelPurpose:
            db_row = db_by_purpose.get(purpose.value)
            if db_row:
                settings_list.append(AIModelSettingResponse(
                    purpose=db_row.purpose,
                    model_name=db_row.model_name,
                    display_name=db_row.display_name,
                    description=db_row.description,
                    is_active=db_row.is_active,
                    source="database",
                ))
            else:
                settings_list.append(AIModelSettingResponse(
                    purpose=purpose.value,
                    model_name=env_defaults.get(purpose.value, ""),
                    source="env_default",
                ))

        return AIModelSettingsListResponse(
            settings=settings_list,
            env_defaults=env_defaults,
        )

    async def update_setting(
        self,
        purpose: str,
        model_name: str,
        display_name: Optional[str] = None,
    ) -> AIModelSettingResponse:
        """Upsert a purpose → model mapping and refresh the gateway cache."""
        from app.services.ai.gateway import update_model_cache, reset_gateway

        row = await self._repo.upsert(
            purpose=purpose,
            model_name=model_name,
            display_name=display_name,
        )

        # Push into the module-level sync cache so the gateway picks it up
        update_model_cache(purpose, model_name)
        reset_gateway()

        return AIModelSettingResponse(
            purpose=row.purpose,
            model_name=row.model_name,
            display_name=row.display_name,
            description=row.description,
            is_active=row.is_active,
            source="database",
        )

    @staticmethod
    def get_model_catalog() -> List[ModelCatalogEntry]:
        """Return the curated model catalog (no DB round-trip)."""
        return [ModelCatalogEntry(**entry) for entry in MODEL_CATALOG]

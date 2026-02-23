"""Add model_catalog table

Revision ID: 019_model_catalog
Revises: 018_ai_model_settings
Create Date: 2026-02-23

Moves the hardcoded MODEL_CATALOG list into a DB table so admins can
add/remove models through the UI without a code deploy.
Seeds the table with the 12 models from the original hardcoded list.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision = "019_model_catalog"
down_revision = "018_ai_model_settings"
branch_labels = None
depends_on = None

# The 12 models from the original hardcoded MODEL_CATALOG
SEED_DATA = [
    {"model_id": "openrouter/openai/gpt-4o", "display_name": "GPT-4o", "provider": "OpenAI", "purposes": ["chat", "classifier"]},
    {"model_id": "openrouter/openai/gpt-4o-mini", "display_name": "GPT-4o Mini", "provider": "OpenAI", "purposes": ["chat", "chat_fast", "classifier"]},
    {"model_id": "openrouter/anthropic/claude-sonnet-4.5", "display_name": "Claude Sonnet 4.5", "provider": "Anthropic", "purposes": ["chat"]},
    {"model_id": "openrouter/deepseek/deepseek-chat", "display_name": "DeepSeek V3.2", "provider": "DeepSeek", "purposes": ["chat", "chat_fast", "classifier"]},
    {"model_id": "openrouter/google/gemini-2.5-flash-lite", "display_name": "Gemini 2.5 Flash Lite", "provider": "Google", "purposes": ["chat", "chat_fast", "classifier"]},
    {"model_id": "openrouter/google/gemini-3-flash-preview", "display_name": "Gemini 3 Flash Preview", "provider": "Google", "purposes": ["chat", "vision"]},
    {"model_id": "openrouter/openai/text-embedding-3-small", "display_name": "text-embedding-3-small", "provider": "OpenAI", "purposes": ["embedding"]},
    {"model_id": "openrouter/openai/text-embedding-3-large", "display_name": "text-embedding-3-large", "provider": "OpenAI", "purposes": ["embedding"]},
    {"model_id": "openrouter/qwen/qwen3-vl-30b-a3b-instruct", "display_name": "Qwen3 VL 30B A3B", "provider": "Qwen", "purposes": ["vision"]},
    {"model_id": "openrouter/qwen/qwen3-vl-32b-instruct", "display_name": "Qwen3 VL 32B", "provider": "Qwen", "purposes": ["vision"]},
    {"model_id": "openrouter/qwen/qwen3.5-397b-a17b", "display_name": "Qwen3.5 397B MoE", "provider": "Qwen", "purposes": ["vision"]},
    {"model_id": "cohere/rerank-v3.5", "display_name": "Cohere Rerank v3.5", "provider": "Cohere", "purposes": ["reranker"]},
]


def upgrade() -> None:
    table = op.create_table(
        "model_catalog",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("model_id", sa.String(200), nullable=False, unique=True),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("purposes", JSONB, server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_model_catalog_model_id", "model_catalog", ["model_id"], unique=True)
    op.create_index("ix_model_catalog_provider", "model_catalog", ["provider"])

    # Seed with the 12 original models
    op.bulk_insert(table, SEED_DATA)


def downgrade() -> None:
    op.drop_index("ix_model_catalog_provider")
    op.drop_index("ix_model_catalog_model_id")
    op.drop_table("model_catalog")

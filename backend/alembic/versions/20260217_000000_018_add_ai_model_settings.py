"""Add ai_model_settings table

Revision ID: 018_ai_model_settings
Revises: 017_query_feedback
Create Date: 2026-02-17

System-wide AI model configuration table. Each row maps a ModelPurpose
(chat, embedding, vision, etc.) to a specific model name. Environment
variables serve as fallback when no DB row exists for a purpose.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = "018_ai_model_settings"
down_revision = "017_query_feedback"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_model_settings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("purpose", sa.String(50), nullable=False, unique=True),
        sa.Column("model_name", sa.String(200), nullable=False),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_ai_model_settings_purpose", "ai_model_settings", ["purpose"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_ai_model_settings_purpose")
    op.drop_table("ai_model_settings")

"""Add Insights tables

Revision ID: 015_insights_tables
Revises: 014_rag_evaluations
Create Date: 2026-02-10

Creates tables for NL-to-Insights feature (previously standalone, now unified with KB):
- insights_datasets: Uploaded CSV/XLSX datasets with schema info
- insights_conversations: Multi-turn conversation sessions per dataset
- insights_queries: Individual NL-to-SQL queries within conversations
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision = "015_insights_tables"
down_revision = "014_rag_evaluations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── insights_datasets ─────────────────────────────────────────────
    op.create_table(
        "insights_datasets",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_info", JSONB, nullable=False),
        sa.Column("schema_definition", JSONB, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index("ix_insights_datasets_user_id", "insights_datasets", ["user_id"])
    op.create_index(
        "ix_insights_datasets_status", "insights_datasets", ["status"]
    )
    op.create_index(
        "ix_insights_datasets_user_status",
        "insights_datasets",
        ["user_id", "status"],
    )
    op.create_index(
        "ix_insights_datasets_user_created",
        "insights_datasets",
        ["user_id", "created_at"],
    )

    # ── insights_conversations ────────────────────────────────────────
    op.create_table(
        "insights_conversations",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "dataset_id",
            UUID(as_uuid=True),
            sa.ForeignKey("insights_datasets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("context", JSONB, nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_insights_conversations_user_id",
        "insights_conversations",
        ["user_id"],
    )
    op.create_index(
        "ix_insights_conversations_dataset_id",
        "insights_conversations",
        ["dataset_id"],
    )
    op.create_index(
        "ix_insights_conversations_user_dataset",
        "insights_conversations",
        ["user_id", "dataset_id"],
    )
    op.create_index(
        "ix_insights_conversations_updated",
        "insights_conversations",
        ["updated_at"],
    )

    # ── insights_queries ──────────────────────────────────────────────
    op.create_table(
        "insights_queries",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "conversation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("insights_conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "dataset_id",
            UUID(as_uuid=True),
            sa.ForeignKey("insights_datasets.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_input", sa.Text(), nullable=False),
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("parsed_intent", JSONB, nullable=True),
        sa.Column("generated_sql", sa.Text(), nullable=True),
        sa.Column("result", JSONB, nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("response_text", sa.Text(), nullable=True),
        sa.Column("response_chart", JSONB, nullable=True),
        sa.Column("response_insights", JSONB, nullable=True),
        sa.Column("token_usage", JSONB, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index(
        "ix_insights_queries_conversation_id",
        "insights_queries",
        ["conversation_id"],
    )
    op.create_index(
        "ix_insights_queries_dataset_id",
        "insights_queries",
        ["dataset_id"],
    )
    op.create_index(
        "ix_insights_queries_user_id",
        "insights_queries",
        ["user_id"],
    )
    op.create_index(
        "ix_insights_queries_conversation_created",
        "insights_queries",
        ["conversation_id", "created_at"],
    )
    op.create_index(
        "ix_insights_queries_user_status",
        "insights_queries",
        ["user_id", "status"],
    )


def downgrade() -> None:
    op.drop_table("insights_queries")
    op.drop_table("insights_conversations")
    op.drop_table("insights_datasets")

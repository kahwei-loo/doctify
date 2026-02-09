"""Extend rag_queries table for unified analytics

Revision ID: 016_rag_queries_analytics
Revises: 015_insights_tables
Create Date: 2026-02-10

Adds nullable columns to rag_queries for intent classification and analytics routing.
Fat-table approach: NULLs for non-applicable columns depending on query type.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = "016_rag_queries_analytics"
down_revision = "015_insights_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Intent classification columns
    op.add_column(
        "rag_queries",
        sa.Column("intent_type", sa.String(20), nullable=True),
    )
    op.add_column(
        "rag_queries",
        sa.Column("intent_confidence", sa.Float(), nullable=True),
    )
    op.add_column(
        "rag_queries",
        sa.Column("classification_latency_ms", sa.Integer(), nullable=True),
    )

    # Analytics-specific columns (NULL when intent_type = 'rag')
    op.add_column(
        "rag_queries",
        sa.Column(
            "dataset_id",
            UUID(as_uuid=True),
            sa.ForeignKey("insights_datasets.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "rag_queries",
        sa.Column("generated_sql", sa.Text(), nullable=True),
    )
    op.add_column(
        "rag_queries",
        sa.Column("chart_type", sa.String(30), nullable=True),
    )

    # Index for intent-based queries
    op.create_index(
        "ix_rag_queries_intent_type",
        "rag_queries",
        ["intent_type"],
    )
    op.create_index(
        "ix_rag_queries_dataset_id",
        "rag_queries",
        ["dataset_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_rag_queries_dataset_id")
    op.drop_index("ix_rag_queries_intent_type")
    op.drop_column("rag_queries", "chart_type")
    op.drop_column("rag_queries", "generated_sql")
    op.drop_column("rag_queries", "dataset_id")
    op.drop_column("rag_queries", "classification_latency_ms")
    op.drop_column("rag_queries", "intent_confidence")
    op.drop_column("rag_queries", "intent_type")

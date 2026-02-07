"""Add RAG evaluations table

Revision ID: 014_rag_evaluations
Revises: 013_groundedness
Create Date: 2026-02-05

P3.2 - RAGAS Evaluation: Table for storing periodic RAG quality metrics.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision = "014_rag_evaluations"
down_revision = "013_groundedness"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rag_evaluations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("faithfulness", sa.Float(), nullable=False),
        sa.Column("answer_relevancy", sa.Float(), nullable=False),
        sa.Column("context_precision", sa.Float(), nullable=False),
        sa.Column("context_recall", sa.Float(), nullable=False),
        sa.Column("sample_size", sa.Integer(), nullable=False),
        sa.Column("queries_with_feedback", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_groundedness", sa.Float(), nullable=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("evaluation_metadata", JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_rag_evaluations_created_at", "rag_evaluations", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_rag_evaluations_created_at")
    op.drop_table("rag_evaluations")

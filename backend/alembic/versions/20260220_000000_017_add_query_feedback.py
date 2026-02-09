"""Add user feedback columns to rag_queries

Revision ID: 017_query_feedback
Revises: 016_rag_queries_analytics
Create Date: 2026-02-20

Adds columns for user feedback on intent classification accuracy and query quality.
Used by the QueryFeedback UI component and the /feedback endpoint.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "017_query_feedback"
down_revision = "016_rag_queries_analytics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rag_queries",
        sa.Column(
            "user_feedback_intent",
            sa.String(20),
            nullable=True,
            comment="User-corrected intent type (rag/analytics) if classification was wrong",
        ),
    )
    op.add_column(
        "rag_queries",
        sa.Column(
            "user_feedback_rating",
            sa.Integer(),
            nullable=True,
            comment="User rating 1-5 for response quality",
        ),
    )
    op.add_column(
        "rag_queries",
        sa.Column(
            "user_feedback_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Timestamp when user provided feedback",
        ),
    )

    # Index for feedback analysis queries
    op.create_index(
        "ix_rag_queries_user_feedback_intent",
        "rag_queries",
        ["user_feedback_intent"],
        postgresql_where=sa.text("user_feedback_intent IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_rag_queries_user_feedback_intent")
    op.drop_column("rag_queries", "user_feedback_at")
    op.drop_column("rag_queries", "user_feedback_rating")
    op.drop_column("rag_queries", "user_feedback_intent")

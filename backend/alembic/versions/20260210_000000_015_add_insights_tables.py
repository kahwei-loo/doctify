"""Add Insights tables

Revision ID: 015_insights_tables
Revises: 014_rag_evaluations
Create Date: 2026-02-10

NOTE: insights_datasets, insights_conversations, and insights_queries were already
created in migration 005_add_missing_tables. This migration is a no-op kept only
to preserve the revision chain integrity.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "015_insights_tables"
down_revision = "014_rag_evaluations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tables already created in migration 005 — no-op to avoid DuplicateTable error
    pass


def downgrade() -> None:
    # No-op — tables are managed by migration 005
    pass

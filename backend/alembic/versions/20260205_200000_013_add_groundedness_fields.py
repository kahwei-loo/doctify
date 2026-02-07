"""Add groundedness fields to rag_queries

Revision ID: 013_groundedness
Revises: 012_add_rag_conversations
Create Date: 2026-02-05 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "013_groundedness"
down_revision: Union[str, None] = "012_add_rag_conversations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add groundedness_score column
    op.add_column(
        "rag_queries",
        sa.Column("groundedness_score", sa.Float(), nullable=True),
    )
    # Add unsupported_claims JSONB column
    op.add_column(
        "rag_queries",
        sa.Column("unsupported_claims", JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("rag_queries", "unsupported_claims")
    op.drop_column("rag_queries", "groundedness_score")

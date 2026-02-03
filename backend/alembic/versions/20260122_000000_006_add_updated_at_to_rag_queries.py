"""Add updated_at column to rag_queries table

Revision ID: 006
Revises: 005
Create Date: 2026-01-22 00:00:00

Adds missing updated_at column to rag_queries table (should have been inherited from BaseModel).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add updated_at column to rag_queries table."""
    op.add_column(
        'rag_queries',
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
    )


def downgrade() -> None:
    """Remove updated_at column from rag_queries table."""
    op.drop_column('rag_queries', 'updated_at')

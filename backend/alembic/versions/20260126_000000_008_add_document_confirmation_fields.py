"""Add document confirmation fields

Revision ID: 008
Revises: 007
Create Date: 2026-01-26 00:00:00

Adds fields to support OCR confirmation workflow:
- user_corrected_data: JSONB to store user-edited OCR data
- confirmed_at: Timestamp when document was confirmed
- confirmed_by: User ID who confirmed the document
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

# revision identifiers, used by Alembic.
revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add confirmation fields to documents table."""

    # Add user_corrected_data column to store edited OCR results
    op.add_column(
        'documents',
        sa.Column(
            'user_corrected_data',
            JSON,
            nullable=True,
            comment='User-corrected OCR data after confirmation'
        )
    )

    # Add confirmed_at timestamp
    op.add_column(
        'documents',
        sa.Column(
            'confirmed_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='Timestamp when document was confirmed by user'
        )
    )

    # Add confirmed_by foreign key to users table
    op.add_column(
        'documents',
        sa.Column(
            'confirmed_by',
            UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
            comment='User who confirmed the document'
        )
    )

    # Add index for querying confirmed documents
    op.create_index(
        'ix_documents_confirmed',
        'documents',
        ['confirmed_at'],
        unique=False
    )

    print("✅ Added document confirmation fields")


def downgrade() -> None:
    """Remove confirmation fields from documents table."""

    # Drop index
    op.drop_index('ix_documents_confirmed', table_name='documents')

    # Drop columns in reverse order
    op.drop_column('documents', 'confirmed_by')
    op.drop_column('documents', 'confirmed_at')
    op.drop_column('documents', 'user_corrected_data')

    print("⚠️  Removed document confirmation fields")

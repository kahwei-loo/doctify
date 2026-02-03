"""Add user_settings table for user preferences

Revision ID: 004
Revises: 003
Create Date: 2026-01-22 00:00:00

Creates missing user_settings table to store user preferences:
- Theme (light/dark/system)
- Language preferences
- Notification settings
- Display preferences
- Date/time formatting
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create user_settings table."""

    # Create user_settings table
    op.create_table(
        'user_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Foreign key to user (one-to-one relationship)
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Theme settings
        sa.Column('theme', sa.String(20), nullable=False, server_default='system'),

        # Language settings
        sa.Column('language', sa.String(10), nullable=False, server_default='en'),

        # Notification preferences
        sa.Column('notifications_email', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('notifications_push', sa.Boolean(), nullable=False, server_default='true'),

        # Display preferences
        sa.Column('display_density', sa.String(20), nullable=False, server_default='comfortable'),

        # Date/time formatting
        sa.Column('date_format', sa.String(20), nullable=False, server_default='YYYY-MM-DD'),
        sa.Column('timezone', sa.String(50), nullable=False, server_default='Asia/Kuala_Lumpur'),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', name='uq_user_settings_user_id'),
    )

    # Create indexes
    op.create_index('ix_user_settings_user_id', 'user_settings', ['user_id'])


def downgrade() -> None:
    """Drop user_settings table."""
    op.drop_table('user_settings')

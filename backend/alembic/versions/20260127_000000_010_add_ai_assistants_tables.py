"""Add AI assistants tables

Revision ID: 010
Revises: 009
Create Date: 2026-01-27 00:00:00

Creates tables for AI Assistants feature (Week 5):
- assistants: AI assistant configurations
- assistant_conversations: Conversation threads with assistants
- assistant_messages: Individual messages in conversations
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '010'
down_revision: Union[str, None] = '009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create AI assistants tables."""

    # Create assistants table
    op.create_table(
        'assistants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('model_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False,
                  server_default=sa.text('\'{"provider": "openai", "model": "gpt-4", "temperature": 0.7, "max_tokens": 2048}\'::jsonb')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('knowledge_base_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('widget_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False,
                  server_default=sa.text('\'{"primary_color": "#3b82f6", "position": "bottom-right"}\'::jsonb')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['knowledge_base_id'], ['knowledge_bases.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for assistants
    op.create_index('ix_assistants_user_id', 'assistants', ['user_id'])
    op.create_index('ix_assistants_is_active', 'assistants', ['is_active'])
    op.create_index('ix_assistants_user_id_is_active', 'assistants', ['user_id', 'is_active'])

    # Create assistant_conversations table
    op.create_table(
        'assistant_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('assistant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_fingerprint', sa.String(256), nullable=True,
                  comment='Hash of IP + session_id for anonymous tracking'),
        sa.Column('session_id', sa.String(128), nullable=True,
                  comment='Session ID from localStorage for anonymous users'),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default=sa.text("'unresolved'")),
        sa.Column('last_message_preview', sa.String(500), nullable=False, server_default=sa.text("''")),
        sa.Column('last_message_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('message_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('context', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assistant_id'], ['assistants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.CheckConstraint("status IN ('unresolved', 'in_progress', 'resolved')", name='check_conversation_status'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for assistant_conversations
    op.create_index('ix_assistant_conversations_assistant_id', 'assistant_conversations', ['assistant_id'])
    op.create_index('ix_assistant_conversations_status', 'assistant_conversations', ['status'])
    op.create_index('ix_assistant_conversations_user_id', 'assistant_conversations', ['user_id'])
    op.create_index('ix_assistant_conversations_session_id', 'assistant_conversations', ['session_id'])
    op.create_index('ix_assistant_conversations_assistant_status', 'assistant_conversations', ['assistant_id', 'status'])
    op.create_index('ix_assistant_conversations_last_message', 'assistant_conversations', ['last_message_at'],
                    postgresql_ops={'last_message_at': 'DESC'})

    # Create assistant_messages table
    op.create_table(
        'assistant_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('model_used', sa.String(50), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['assistant_conversations.id'], ondelete='CASCADE'),
        sa.CheckConstraint("role IN ('user', 'assistant', 'system')", name='check_message_role_assistant'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for assistant_messages
    op.create_index('ix_assistant_messages_conversation_id', 'assistant_messages', ['conversation_id', 'created_at'])

    print("✅ Created assistants table")
    print("✅ Created assistant_conversations table")
    print("✅ Created assistant_messages table")


def downgrade() -> None:
    """Remove AI assistants tables."""

    # Drop assistant_messages table
    op.drop_index('ix_assistant_messages_conversation_id', table_name='assistant_messages')
    op.drop_table('assistant_messages')

    # Drop assistant_conversations table
    op.drop_index('ix_assistant_conversations_last_message', table_name='assistant_conversations')
    op.drop_index('ix_assistant_conversations_assistant_status', table_name='assistant_conversations')
    op.drop_index('ix_assistant_conversations_session_id', table_name='assistant_conversations')
    op.drop_index('ix_assistant_conversations_user_id', table_name='assistant_conversations')
    op.drop_index('ix_assistant_conversations_status', table_name='assistant_conversations')
    op.drop_index('ix_assistant_conversations_assistant_id', table_name='assistant_conversations')
    op.drop_table('assistant_conversations')

    # Drop assistants table
    op.drop_index('ix_assistants_user_id_is_active', table_name='assistants')
    op.drop_index('ix_assistants_is_active', table_name='assistants')
    op.drop_index('ix_assistants_user_id', table_name='assistants')
    op.drop_table('assistants')

    print("⚠️  Removed AI assistants tables")

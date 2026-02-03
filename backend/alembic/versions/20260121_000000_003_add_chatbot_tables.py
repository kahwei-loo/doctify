"""Add chatbot tables for multi-turn conversational interface

Revision ID: 003
Revises: 002
Create Date: 2026-01-21 00:00:00

Creates tables for Phase 13 - Chatbot:
- chat_conversations (conversation context management)
- chat_messages (message history with tool execution metadata)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create chatbot tables for conversational interface."""

    # Create chat_conversations table
    op.create_table(
        'chat_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(200), nullable=True),  # Auto-generated from first message
        sa.Column('context', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for chat_conversations
    op.create_index('ix_chat_conversations_user_id', 'chat_conversations', ['user_id'])
    op.create_index('ix_chat_conversations_updated_at', 'chat_conversations', ['updated_at'], postgresql_ops={'updated_at': 'DESC'})

    # Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),

        # Tool execution metadata
        sa.Column('tool_used', sa.String(50), nullable=True),
        sa.Column('tool_params', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('tool_result', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # AI metadata
        sa.Column('model_used', sa.String(50), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),

        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['chat_conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("role IN ('user', 'assistant', 'system')", name='check_message_role')
    )

    # Create indexes for chat_messages
    op.create_index('ix_chat_messages_conversation_id', 'chat_messages', ['conversation_id', 'created_at'])


def downgrade() -> None:
    """Drop chatbot tables."""
    op.drop_table('chat_messages')
    op.drop_table('chat_conversations')

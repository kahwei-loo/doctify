"""Add missing tables for templates, edit history, and insights features

Revision ID: 005
Revises: 004
Create Date: 2026-01-22 00:00:00

Creates missing tables:
- templates (extraction template management)
- edit_history (document edit audit trail)
- insights_datasets (NL-to-Insights data files)
- insights_conversations (NL-to-Insights conversation sessions)
- insights_queries (NL-to-Insights query history)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create missing tables."""

    # Create templates table
    op.create_table(
        'templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Basic info
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Ownership and visibility
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('visibility', sa.String(20), nullable=False, server_default='private'),

        # Template content
        sa.Column('document_type', sa.String(50), nullable=True),
        sa.Column('extraction_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),

        # Organization
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String(50)), nullable=True, server_default=sa.text("ARRAY[]::varchar[]")),

        # Versioning
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),

        # Statistics
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rating_sum', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rating_count', sa.Integer(), nullable=False, server_default='0'),

        # Soft delete support
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Create indexes for templates
    op.create_index('ix_templates_name', 'templates', ['name'])
    op.create_index('ix_templates_user_id', 'templates', ['user_id'])
    op.create_index('ix_templates_visibility', 'templates', ['visibility'])
    op.create_index('ix_templates_document_type', 'templates', ['document_type'])
    op.create_index('ix_templates_category', 'templates', ['category'])
    op.create_index('ix_templates_user_visibility', 'templates', ['user_id', 'visibility'])
    op.create_index('ix_templates_document_type_category', 'templates', ['document_type', 'category'])

    # Create edit_history table
    op.create_table(
        'edit_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Foreign keys
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),

        # Change details
        sa.Column('field_path', sa.String(255), nullable=False),
        sa.Column('old_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('new_value', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # Metadata
        sa.Column('edit_type', sa.String(50), nullable=False, server_default='manual'),
        sa.Column('source', sa.String(20), nullable=False, server_default='web'),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )

    # Create indexes for edit_history
    op.create_index('ix_edit_history_document_id', 'edit_history', ['document_id'])
    op.create_index('ix_edit_history_user_id', 'edit_history', ['user_id'])
    op.create_index('ix_edit_history_field_path', 'edit_history', ['field_path'])
    op.create_index('ix_edit_history_document_created', 'edit_history', ['document_id', 'created_at'])
    op.create_index('ix_edit_history_user_created', 'edit_history', ['user_id', 'created_at'])

    # Create insights_datasets table
    op.create_table(
        'insights_datasets',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Foreign keys
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Dataset metadata
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # File and schema information
        sa.Column('file_info', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('schema_definition', postgresql.JSONB(astext_type=sa.Text()), nullable=False),

        # Status and statistics
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('row_count', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Create indexes for insights_datasets
    op.create_index('ix_insights_datasets_user_id', 'insights_datasets', ['user_id'])
    op.create_index('ix_insights_datasets_status', 'insights_datasets', ['status'])
    op.create_index('ix_insights_datasets_user_status', 'insights_datasets', ['user_id', 'status'])
    op.create_index('ix_insights_datasets_user_created', 'insights_datasets', ['user_id', 'created_at'])

    # Create insights_conversations table
    op.create_table(
        'insights_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Foreign keys
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dataset_id', postgresql.UUID(as_uuid=True), nullable=False),

        # Conversation metadata
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('context', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['dataset_id'], ['insights_datasets.id'], ondelete='CASCADE'),
    )

    # Create indexes for insights_conversations
    op.create_index('ix_insights_conversations_user_id', 'insights_conversations', ['user_id'])
    op.create_index('ix_insights_conversations_dataset_id', 'insights_conversations', ['dataset_id'])
    op.create_index('ix_insights_conversations_user_dataset', 'insights_conversations', ['user_id', 'dataset_id'])
    op.create_index('ix_insights_conversations_updated', 'insights_conversations', ['updated_at'], postgresql_ops={'updated_at': 'DESC'})

    # Create insights_queries table
    op.create_table(
        'insights_queries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Foreign keys
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('dataset_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),

        # User input
        sa.Column('user_input', sa.Text(), nullable=False),
        sa.Column('language', sa.String(10), nullable=False, server_default='en'),

        # AI parsing results
        sa.Column('parsed_intent', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generated_sql', sa.Text(), nullable=True),

        # Query results
        sa.Column('result', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),

        # AI response
        sa.Column('response_text', sa.Text(), nullable=True),
        sa.Column('response_chart', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('response_insights', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # Token usage
        sa.Column('token_usage', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # Status
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),

        # Execution metrics
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),

        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['conversation_id'], ['insights_conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['dataset_id'], ['insights_datasets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Create indexes for insights_queries
    op.create_index('ix_insights_queries_conversation_id', 'insights_queries', ['conversation_id'])
    op.create_index('ix_insights_queries_dataset_id', 'insights_queries', ['dataset_id'])
    op.create_index('ix_insights_queries_user_id', 'insights_queries', ['user_id'])
    op.create_index('ix_insights_queries_status', 'insights_queries', ['status'])
    op.create_index('ix_insights_queries_conversation_created', 'insights_queries', ['conversation_id', 'created_at'])
    op.create_index('ix_insights_queries_user_status', 'insights_queries', ['user_id', 'status'])


def downgrade() -> None:
    """Drop all created tables."""
    op.drop_table('insights_queries')
    op.drop_table('insights_conversations')
    op.drop_table('insights_datasets')
    op.drop_table('edit_history')
    op.drop_table('templates')

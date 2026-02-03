"""Add knowledge base tables

Revision ID: 009
Revises: 008
Create Date: 2026-01-26 12:00:00

Creates tables for Phase 1 - Knowledge Base Feature:
- knowledge_bases: Container for organizing data sources
- data_sources: Different types of data sources (docs, websites, text, Q&A)
- Extends document_embeddings to support data_source_id
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create knowledge base tables and extend document_embeddings."""

    # Create knowledge_bases table
    op.create_table(
        'knowledge_bases',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for knowledge_bases
    op.create_index('ix_knowledge_bases_user_id', 'knowledge_bases', ['user_id'])
    op.create_index('ix_knowledge_bases_status', 'knowledge_bases', ['status'])

    # Create data_sources table
    op.create_table(
        'data_sources',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('knowledge_base_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('document_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('embedding_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('last_synced_at', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['knowledge_base_id'], ['knowledge_bases.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for data_sources
    op.create_index('ix_data_sources_knowledge_base_id', 'data_sources', ['knowledge_base_id'])
    op.create_index('ix_data_sources_type', 'data_sources', ['type'])
    op.create_index('ix_data_sources_status', 'data_sources', ['status'])

    # Extend document_embeddings table
    # 1. Make document_id nullable
    op.alter_column('document_embeddings', 'document_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=True)

    # 3. Add data_source_id column
    op.add_column('document_embeddings',
                  sa.Column('data_source_id', postgresql.UUID(as_uuid=True), nullable=True))

    # 4. Add foreign key constraint for data_source_id
    op.create_foreign_key(
        'fk_embeddings_data_source',
        'document_embeddings',
        'data_sources',
        ['data_source_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # 5. Create index for data_source_id
    op.create_index('ix_embeddings_data_source_id', 'document_embeddings', ['data_source_id'])

    # 6. Add new check constraints
    op.create_check_constraint(
        'check_embedding_source',
        'document_embeddings',
        "(document_id IS NOT NULL AND data_source_id IS NULL) OR "
        "(document_id IS NULL AND data_source_id IS NOT NULL)"
    )

    op.create_check_constraint(
        'check_chunk_index_valid',
        'document_embeddings',
        "chunk_index >= 0"
    )

    print("✅ Created knowledge_bases and data_sources tables")
    print("✅ Extended document_embeddings to support data_source_id")


def downgrade() -> None:
    """Remove knowledge base tables and revert document_embeddings changes."""

    # Revert document_embeddings changes
    op.drop_constraint('check_chunk_index_valid', 'document_embeddings', type_='check')
    op.drop_constraint('check_embedding_source', 'document_embeddings', type_='check')
    op.drop_index('ix_embeddings_data_source_id', table_name='document_embeddings')
    op.drop_constraint('fk_embeddings_data_source', 'document_embeddings', type_='foreignkey')
    op.drop_column('document_embeddings', 'data_source_id')

    # Make document_id non-nullable again
    op.alter_column('document_embeddings', 'document_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=False)

    # Drop data_sources table
    op.drop_index('ix_data_sources_status', table_name='data_sources')
    op.drop_index('ix_data_sources_type', table_name='data_sources')
    op.drop_index('ix_data_sources_knowledge_base_id', table_name='data_sources')
    op.drop_table('data_sources')

    # Drop knowledge_bases table
    op.drop_index('ix_knowledge_bases_status', table_name='knowledge_bases')
    op.drop_index('ix_knowledge_bases_user_id', table_name='knowledge_bases')
    op.drop_table('knowledge_bases')

    print("⚠️  Removed knowledge base tables and reverted document_embeddings")

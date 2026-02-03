"""Add RAG tables for document embeddings and query history

Revision ID: 002
Revises: 001
Create Date: 2026-01-21 00:00:00

Creates tables for Phase 11 - RAG:
- document_embeddings (with pgvector support)
- rag_queries (query history and feedback)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create RAG tables with pgvector support."""

    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Create document_embeddings table
    op.create_table(
        'document_embeddings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=True),  # text-embedding-3-small dimension
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('document_id', 'chunk_index', name='uq_document_chunk')
    )

    # Create indexes for document_embeddings
    op.create_index('ix_embeddings_document_id', 'document_embeddings', ['document_id'])

    # Create vector index for similarity search (IVFFlat with 100 lists)
    op.execute("""
        CREATE INDEX ix_embeddings_vector
        ON document_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)

    # Create rag_queries table
    op.create_table(
        'rag_queries',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('answer', sa.Text(), nullable=True),
        sa.Column('sources', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # AI metadata
        sa.Column('model_used', sa.String(50), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('confidence_score', sa.Float(), nullable=True),

        # User feedback
        sa.Column('feedback_rating', sa.Integer(), nullable=True),
        sa.Column('feedback_text', sa.Text(), nullable=True),

        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('feedback_rating BETWEEN 1 AND 5', name='check_feedback_rating')
    )

    # Create indexes for rag_queries
    op.create_index('ix_rag_queries_user_id', 'rag_queries', ['user_id'])
    op.create_index('ix_rag_queries_created_at', 'rag_queries', ['created_at'], postgresql_ops={'created_at': 'DESC'})


def downgrade() -> None:
    """Drop RAG tables."""
    op.drop_table('rag_queries')
    op.drop_table('document_embeddings')
    op.execute('DROP EXTENSION IF EXISTS vector')

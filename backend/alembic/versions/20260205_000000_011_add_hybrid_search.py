"""Add hybrid search support (tsvector + GIN index)

Revision ID: 011
Revises: 010
Create Date: 2026-02-05 00:00:00

Adds full-text search capabilities to document_embeddings:
- search_vector tsvector column
- GIN index for fast text search
- Trigger for automatic tsvector maintenance
- Backfills existing data
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '011'
down_revision: Union[str, None] = '010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add tsvector column, GIN index, and trigger for hybrid search."""

    # Add tsvector column (use raw SQL for PostgreSQL-specific tsvector type)
    op.execute("""
        ALTER TABLE document_embeddings
        ADD COLUMN IF NOT EXISTS search_vector tsvector;
    """)

    # Create trigger function for automatic tsvector maintenance
    op.execute("""
        CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
        BEGIN
            NEW.search_vector := to_tsvector('english', COALESCE(NEW.chunk_text, ''));
            RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    # Create trigger
    op.execute("""
        DROP TRIGGER IF EXISTS trig_update_search_vector ON document_embeddings;
        CREATE TRIGGER trig_update_search_vector
            BEFORE INSERT OR UPDATE OF chunk_text ON document_embeddings
            FOR EACH ROW EXECUTE FUNCTION update_search_vector();
    """)

    # Create GIN index for fast full-text search
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_embeddings_search_vector
        ON document_embeddings USING GIN(search_vector);
    """)

    # Backfill existing data
    op.execute("""
        UPDATE document_embeddings
        SET search_vector = to_tsvector('english', COALESCE(chunk_text, ''))
        WHERE search_vector IS NULL;
    """)


def downgrade() -> None:
    """Remove tsvector column, GIN index, and trigger."""

    # Drop trigger
    op.execute("DROP TRIGGER IF EXISTS trig_update_search_vector ON document_embeddings;")

    # Drop trigger function
    op.execute("DROP FUNCTION IF EXISTS update_search_vector();")

    # Drop GIN index
    op.execute("DROP INDEX IF EXISTS idx_embeddings_search_vector;")

    # Drop column
    op.drop_column('document_embeddings', 'search_vector')

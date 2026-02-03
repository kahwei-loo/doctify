"""Fix vector index for small datasets

Revision ID: 007
Revises: 006
Create Date: 2026-01-23 00:00:00

This migration fixes the IVFFlat index issue that prevents RAG from working
with small datasets (< 1000 embeddings). It implements conditional index
creation based on dataset size:
- < 100 embeddings: No index (sequential scan is faster)
- 100-1000 embeddings: HNSW index (better quality for small-medium datasets)
- 1000+ embeddings: IVFFlat with dynamically calculated lists parameter
"""
from typing import Sequence, Union
import math

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = '007'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Replace IVFFlat index with conditional index based on dataset size."""

    # 1. Drop existing IVFFlat index (created in migration 002)
    # Safe to drop - will recreate if needed based on current dataset size
    op.execute("DROP INDEX IF EXISTS ix_embeddings_vector")

    # 2. Get current embedding count to determine appropriate index type
    conn = op.get_bind()
    result = conn.execute(text("SELECT COUNT(*) FROM document_embeddings"))
    row_count = result.scalar()

    # 3. Create appropriate index based on dataset size
    if row_count < 100:
        # No index - sequential scan is faster for very small datasets
        print(f"ℹ️  Skipping index creation: {row_count} embeddings (< 100)")
        print("    Sequential scan will be used for vector similarity search")

    elif row_count < 1000:
        # HNSW index - better quality than IVFFlat for small-medium datasets
        print(f"✅ Creating HNSW index: {row_count} embeddings")
        op.execute("""
            CREATE INDEX ix_embeddings_vector
            ON document_embeddings
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
        """)
        print("    HNSW index created with m=16, ef_construction=64")

    else:
        # IVFFlat index - efficient for large datasets
        # Calculate lists parameter: sqrt(row_count), bounded between 10 and 1000
        lists = min(max(int(math.sqrt(row_count)), 10), 1000)
        print(f"✅ Creating IVFFlat index: {row_count} embeddings, lists={lists}")
        op.execute(f"""
            CREATE INDEX ix_embeddings_vector
            ON document_embeddings
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = {lists})
        """)
        print(f"    IVFFlat index created with lists={lists}")


def downgrade() -> None:
    """Rollback to original IVFFlat index with fixed lists=100."""

    # Drop conditional index (if exists)
    op.execute("DROP INDEX IF EXISTS ix_embeddings_vector")

    # Recreate original IVFFlat index from migration 002
    print("⚠️  Rolling back to original IVFFlat index (lists=100)")
    op.execute("""
        CREATE INDEX ix_embeddings_vector
        ON document_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)
    print("    Original IVFFlat index restored")

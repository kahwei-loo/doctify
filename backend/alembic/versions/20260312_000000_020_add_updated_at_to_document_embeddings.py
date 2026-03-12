"""Add updated_at to document_embeddings

Revision ID: 020_document_embeddings_updated_at
Revises: 019_add_model_catalog
Create Date: 2026-03-12

The document_embeddings table was created in migration 002 with only created_at.
The DocumentEmbedding model inherits from BaseModel (TimestampMixin) which
declares both created_at and updated_at. This mismatch causes a
UndefinedColumnError on any query that touches the table.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "020_document_embeddings_updated_at"
down_revision = "019_model_catalog"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "document_embeddings",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("document_embeddings", "updated_at")

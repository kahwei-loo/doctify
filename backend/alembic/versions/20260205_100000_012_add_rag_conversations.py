"""Add RAG conversations table and conversation_id to rag_queries

P1.3 - Conversational RAG

Revision ID: 012_add_rag_conversations
Revises: 011
Create Date: 2026-02-05
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers
revision = "012_add_rag_conversations"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create rag_conversations table
    op.create_table(
        "rag_conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_rag_conversations_user_id", "rag_conversations", ["user_id"])

    # Add conversation_id FK to rag_queries
    op.add_column(
        "rag_queries",
        sa.Column("conversation_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_rag_queries_conversation_id",
        "rag_queries",
        "rag_conversations",
        ["conversation_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_rag_queries_conversation_id", "rag_queries", ["conversation_id"])


def downgrade() -> None:
    op.drop_index("ix_rag_queries_conversation_id", table_name="rag_queries")
    op.drop_constraint("fk_rag_queries_conversation_id", "rag_queries", type_="foreignkey")
    op.drop_column("rag_queries", "conversation_id")
    op.drop_index("ix_rag_conversations_user_id", table_name="rag_conversations")
    op.drop_table("rag_conversations")

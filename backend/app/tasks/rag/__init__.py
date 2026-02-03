"""
RAG Tasks Package

Background tasks for RAG operations.
Phase 11 - RAG Implementation
"""

from app.tasks.rag.embedding_task import generate_document_embeddings_task

__all__ = [
    "generate_document_embeddings_task",
]

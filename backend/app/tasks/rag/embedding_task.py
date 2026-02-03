"""
Embedding Generation Task

Background task to generate embeddings for documents after OCR completion.
Phase 11 - RAG Implementation
"""

import uuid
import asyncio
from typing import Dict, Any
from celery import shared_task
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session_factory
from app.services.rag.embedding_service import EmbeddingService
from app.core.exceptions import ValidationError, DatabaseError


@shared_task(bind=True, name="generate_document_embeddings")
def generate_document_embeddings_task(self, document_id: str) -> Dict[str, Any]:
    """
    Background task to generate embeddings for a document.

    Triggered automatically after OCR completion.

    Workflow:
    1. Create async session
    2. Initialize EmbeddingService
    3. Generate embeddings for all document chunks
    4. Commit to database
    5. Return success status with metadata

    Args:
        document_id: UUID string of document to process

    Returns:
        Dict with status, document_id, and chunk_count

    Raises:
        Exception: If embedding generation fails (task will retry)
    """

    async def _generate() -> Dict[str, Any]:
        async with get_session_factory()() as session:
            embedding_service = EmbeddingService(session)

            try:
                # Generate embeddings
                embeddings = await embedding_service.generate_embeddings_for_document(
                    document_id=uuid.UUID(document_id)
                )

                # Commit to database
                await session.commit()

                return {
                    "status": "success",
                    "document_id": document_id,
                    "chunk_count": len(embeddings),
                }

            except ValidationError as e:
                await session.rollback()
                return {
                    "status": "validation_error",
                    "document_id": document_id,
                    "error": str(e),
                }

            except DatabaseError as e:
                await session.rollback()
                return {
                    "status": "database_error",
                    "document_id": document_id,
                    "error": str(e),
                }

            except Exception as e:
                await session.rollback()
                # Raise exception to trigger Celery retry
                raise Exception(f"Failed to generate embeddings: {str(e)}")

    # Run async function in event loop
    return asyncio.run(_generate())

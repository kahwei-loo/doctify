"""
RAG Evaluation Task

Background task to run periodic RAG quality evaluation.
Phase P3.2 - RAGAS Evaluation
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from celery import shared_task

from app.db.database import get_session_factory
from app.services.rag.evaluation_service import EvaluationService

logger = logging.getLogger(__name__)


@shared_task(bind=True, name="run_rag_evaluation")
def run_rag_evaluation_task(
    self,
    user_id: Optional[str] = None,
    sample_size: int = 20,
) -> Dict[str, Any]:
    """
    Background task to evaluate RAG quality.

    Can run for a specific user or system-wide.

    Args:
        user_id: Optional user ID string to scope evaluation
        sample_size: Number of queries to evaluate

    Returns:
        Dict with evaluation metrics
    """

    async def _evaluate() -> Dict[str, Any]:
        import uuid as uuid_mod

        async with get_session_factory()() as session:
            evaluation_service = EvaluationService()

            uid = uuid_mod.UUID(user_id) if user_id else None

            result = await evaluation_service.run_evaluation(
                session=session,
                user_id=uid,
                sample_size=sample_size,
            )

            return {
                "status": "success",
                "faithfulness": result.faithfulness,
                "answer_relevancy": result.answer_relevancy,
                "context_precision": result.context_precision,
                "context_recall": result.context_recall,
                "sample_size": result.sample_size,
                "queries_with_feedback": result.queries_with_feedback,
                "average_groundedness": result.average_groundedness,
            }

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(_evaluate())

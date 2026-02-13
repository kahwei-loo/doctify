"""
RAG Evaluation Service

Evaluates RAG quality using LLM-as-judge methodology inspired by RAGAS.
Computes faithfulness, answer relevancy, context precision, and context recall.
Phase P3.2 - RAGAS Evaluation
"""

import json
import logging
import uuid
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.db.models.rag import RAGQuery, RAGEvaluation
from app.services.ai import get_ai_gateway, ModelPurpose

logger = logging.getLogger(__name__)


@dataclass
class EvaluationMetrics:
    """Evaluation metrics for a single query."""
    faithfulness: float
    answer_relevancy: float
    context_precision: float
    context_recall: float


@dataclass
class AggregatedEvaluation:
    """Aggregated evaluation results across multiple queries."""
    faithfulness: float
    answer_relevancy: float
    context_precision: float
    context_recall: float
    sample_size: int
    queries_with_feedback: int
    average_groundedness: Optional[float]


class EvaluationService:
    """
    Service for evaluating RAG quality using LLM-as-judge.

    Evaluates sampled queries across 4 dimensions:
    - Faithfulness: Is the answer grounded in the retrieved context?
    - Answer Relevancy: Is the answer relevant to the question?
    - Context Precision: Are the retrieved chunks relevant to the question?
    - Context Recall: Did the retrieval find all necessary information?
    """

    MAX_SAMPLE_SIZE = 50

    FAITHFULNESS_PROMPT = """Evaluate how faithful the answer is to the given context.
A faithful answer only makes claims supported by the context.

Context:
{context}

Answer:
{answer}

Score from 0.0 to 1.0 where:
- 1.0: Every claim in the answer is directly supported by context
- 0.5: Some claims are supported, others are inferred or unsupported
- 0.0: The answer contradicts or has no basis in context

Return ONLY a JSON object: {{"score": <float>}}"""

    RELEVANCY_PROMPT = """Evaluate how relevant the answer is to the question.

Question:
{question}

Answer:
{answer}

Score from 0.0 to 1.0 where:
- 1.0: The answer directly and completely addresses the question
- 0.5: The answer partially addresses the question
- 0.0: The answer is irrelevant to the question

Return ONLY a JSON object: {{"score": <float>}}"""

    CONTEXT_PRECISION_PROMPT = """Evaluate how relevant each retrieved context chunk is to the question.

Question:
{question}

Retrieved chunks:
{chunks}

Score from 0.0 to 1.0 where:
- 1.0: All chunks are highly relevant to the question
- 0.5: About half the chunks are relevant
- 0.0: None of the chunks are relevant

Return ONLY a JSON object: {{"score": <float>}}"""

    CONTEXT_RECALL_PROMPT = """Evaluate whether the retrieved context contains all the information needed to answer the question.

Question:
{question}

Answer:
{answer}

Retrieved context:
{context}

Score from 0.0 to 1.0 where:
- 1.0: The context contains all information referenced in the answer
- 0.5: The context contains some but not all needed information
- 0.0: The context lacks most information needed for the answer

Return ONLY a JSON object: {{"score": <float>}}"""

    def __init__(self):
        self.gateway = get_ai_gateway()

    async def _judge(self, prompt: str) -> float:
        """Call LLM judge and extract score."""
        try:
            response = await self.gateway.acompletion(
                purpose=ModelPurpose.CHAT_FAST,
                messages=[
                    {"role": "system", "content": "You are an evaluation judge. Return only valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.0,
                max_tokens=50,
            )
            content = response.choices[0].message.content or ""
            parsed = json.loads(content)
            score = float(parsed.get("score", 0.5))
            return max(0.0, min(1.0, score))
        except Exception as e:
            logger.warning(f"Judge call failed: {e}")
            return 0.5  # Neutral fallback

    async def evaluate_single_query(
        self,
        question: str,
        answer: str,
        sources: List[Dict[str, Any]],
    ) -> EvaluationMetrics:
        """Evaluate a single RAG query across all 4 dimensions."""
        context_text = "\n\n".join(
            f"[Chunk {i+1}]: {s.get('chunk_text', '')}"
            for i, s in enumerate(sources)
        )
        chunks_text = "\n".join(
            f"- Chunk {i+1} (similarity: {s.get('similarity_score', 0):.2f}): "
            f"{s.get('chunk_text', '')[:200]}..."
            for i, s in enumerate(sources)
        )

        faithfulness = await self._judge(
            self.FAITHFULNESS_PROMPT.format(context=context_text, answer=answer)
        )
        relevancy = await self._judge(
            self.RELEVANCY_PROMPT.format(question=question, answer=answer)
        )
        precision = await self._judge(
            self.CONTEXT_PRECISION_PROMPT.format(question=question, chunks=chunks_text)
        )
        recall = await self._judge(
            self.CONTEXT_RECALL_PROMPT.format(
                question=question, answer=answer, context=context_text
            )
        )

        return EvaluationMetrics(
            faithfulness=faithfulness,
            answer_relevancy=relevancy,
            context_precision=precision,
            context_recall=recall,
        )

    async def run_evaluation(
        self,
        session: AsyncSession,
        user_id: Optional[uuid.UUID] = None,
        sample_size: int = 20,
    ) -> AggregatedEvaluation:
        """
        Run evaluation on a sample of recent RAG queries.

        Prioritizes queries with user feedback for more meaningful evaluation.

        Args:
            session: Database session
            user_id: Optional user scope (None = all users)
            sample_size: Number of queries to evaluate

        Returns:
            Aggregated evaluation metrics
        """
        sample_size = min(sample_size, self.MAX_SAMPLE_SIZE)

        # Build query: prioritize queries with feedback, then recent
        base_filter = []
        if user_id:
            base_filter.append(RAGQuery.user_id == user_id)
        base_filter.append(RAGQuery.answer.isnot(None))
        base_filter.append(RAGQuery.sources.isnot(None))

        # Get queries with feedback first
        feedback_stmt = (
            select(RAGQuery)
            .where(*base_filter, RAGQuery.feedback_rating.isnot(None))
            .order_by(RAGQuery.created_at.desc())
            .limit(sample_size)
        )
        result = await session.execute(feedback_stmt)
        feedback_queries = list(result.scalars().all())
        queries_with_feedback = len(feedback_queries)

        # Fill remaining with recent queries without feedback
        remaining = sample_size - len(feedback_queries)
        if remaining > 0:
            existing_ids = [q.id for q in feedback_queries]
            recent_stmt = (
                select(RAGQuery)
                .where(
                    *base_filter,
                    RAGQuery.id.notin_(existing_ids) if existing_ids else True,
                )
                .order_by(RAGQuery.created_at.desc())
                .limit(remaining)
            )
            result = await session.execute(recent_stmt)
            recent_queries = list(result.scalars().all())
            all_queries = feedback_queries + recent_queries
        else:
            all_queries = feedback_queries

        if not all_queries:
            return AggregatedEvaluation(
                faithfulness=0.0,
                answer_relevancy=0.0,
                context_precision=0.0,
                context_recall=0.0,
                sample_size=0,
                queries_with_feedback=0,
                average_groundedness=None,
            )

        # Evaluate each query
        metrics_list: List[EvaluationMetrics] = []
        groundedness_scores: List[float] = []

        for query in all_queries:
            try:
                metrics = await self.evaluate_single_query(
                    question=query.question,
                    answer=query.answer,
                    sources=query.sources or [],
                )
                metrics_list.append(metrics)
                if query.groundedness_score is not None:
                    groundedness_scores.append(query.groundedness_score)
            except Exception as e:
                logger.warning(f"Evaluation failed for query {query.id}: {e}")

        if not metrics_list:
            return AggregatedEvaluation(
                faithfulness=0.0,
                answer_relevancy=0.0,
                context_precision=0.0,
                context_recall=0.0,
                sample_size=0,
                queries_with_feedback=queries_with_feedback,
                average_groundedness=None,
            )

        # Aggregate metrics
        n = len(metrics_list)
        avg_groundedness = (
            sum(groundedness_scores) / len(groundedness_scores)
            if groundedness_scores
            else None
        )

        aggregated = AggregatedEvaluation(
            faithfulness=round(sum(m.faithfulness for m in metrics_list) / n, 3),
            answer_relevancy=round(sum(m.answer_relevancy for m in metrics_list) / n, 3),
            context_precision=round(sum(m.context_precision for m in metrics_list) / n, 3),
            context_recall=round(sum(m.context_recall for m in metrics_list) / n, 3),
            sample_size=n,
            queries_with_feedback=queries_with_feedback,
            average_groundedness=round(avg_groundedness, 3) if avg_groundedness else None,
        )

        # Persist evaluation
        evaluation = RAGEvaluation(
            faithfulness=aggregated.faithfulness,
            answer_relevancy=aggregated.answer_relevancy,
            context_precision=aggregated.context_precision,
            context_recall=aggregated.context_recall,
            sample_size=aggregated.sample_size,
            queries_with_feedback=aggregated.queries_with_feedback,
            average_groundedness=aggregated.average_groundedness,
            user_id=user_id,
            evaluation_metadata={
                "judge_model": self.gateway.get_model(ModelPurpose.CHAT_FAST),
                "query_ids": [str(q.id) for q in all_queries[:n]],
            },
        )
        session.add(evaluation)
        await session.commit()

        return aggregated

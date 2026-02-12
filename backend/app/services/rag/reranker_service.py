"""
Reranker Service for RAG

Uses Cohere Rerank API to re-score retrieved chunks for improved relevance.
Phase P1.1 - Reranking
"""

import logging
from typing import List, Dict, Any

from app.services.ai import get_ai_gateway, ModelPurpose

logger = logging.getLogger(__name__)


class RerankerService:
    """
    Cross-encoder reranker using Cohere Rerank API.

    Takes initial retrieval results (top-N) and re-ranks them
    using a cross-encoder model for higher precision.
    """

    def __init__(self):
        self.gateway = get_ai_gateway()

    async def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_n: int = 5,
        model: str | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents using Cohere cross-encoder.

        Args:
            query: The user query.
            documents: List of context dicts (must contain 'chunk_text').
            top_n: Number of top results to return after reranking.
            model: Optional model override.

        Returns:
            Reranked list of context dicts (top_n), with added 'rerank_score'.
        """
        if not documents:
            return []

        # Extract text for reranking
        texts = [doc["chunk_text"] for doc in documents]

        try:
            response = await self.gateway.arerank(
                query=query,
                documents=texts,
                model=model,
                top_n=min(top_n, len(documents)),
            )

            reranked: List[Dict[str, Any]] = []
            for result in response.results:
                doc = documents[result.index].copy()
                doc["rerank_score"] = result.relevance_score
                reranked.append(doc)

            logger.info(
                "Reranking completed",
                extra={
                    "input_count": len(documents),
                    "output_count": len(reranked),
                    "top_score": reranked[0]["rerank_score"] if reranked else 0.0,
                },
            )

            return reranked

        except Exception as e:
            logger.warning(f"Reranking failed, returning original order: {e}")
            return documents[:top_n]

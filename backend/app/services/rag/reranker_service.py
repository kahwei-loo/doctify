"""
Reranker Service for RAG

Uses Cohere Rerank API to re-score retrieved chunks for improved relevance.
Phase P1.1 - Reranking
"""

import logging
from typing import List, Dict, Any

try:
    import cohere
except ImportError:
    cohere = None  # type: ignore[assignment]

from app.core.config import settings

logger = logging.getLogger(__name__)


class RerankerService:
    """
    Cross-encoder reranker using Cohere Rerank API.

    Takes initial retrieval results (top-N) and re-ranks them
    using a cross-encoder model for higher precision.
    """

    DEFAULT_MODEL = "rerank-v3.5"

    def __init__(self):
        if cohere is None:
            raise ImportError("cohere package not installed. Install with: pip install cohere>=5.0")
        if not settings.COHERE_API_KEY:
            raise ValueError("COHERE_API_KEY not configured")
        self.client = cohere.AsyncClientV2(api_key=settings.COHERE_API_KEY)

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

        model_to_use = model or self.DEFAULT_MODEL

        # Extract text for reranking
        texts = [doc["chunk_text"] for doc in documents]

        try:
            response = await self.client.rerank(
                model=model_to_use,
                query=query,
                documents=texts,
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

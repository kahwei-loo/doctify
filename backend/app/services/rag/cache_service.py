"""
Semantic Cache Service for RAG

Caches RAG query responses and retrieves them when a semantically
similar question is asked, reducing API costs by 30-50%.
Phase P3.1 - Semantic Cache
"""

import json
import hashlib
import logging
import math
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from app.db.redis import get_redis, RedisClient

logger = logging.getLogger(__name__)


@dataclass
class CachedRAGResponse:
    """Cached RAG response data."""

    answer: str
    sources: List[Dict[str, Any]]
    model_used: str
    tokens_used: int
    confidence_score: float
    context_used: int
    groundedness_score: Optional[float] = None
    unsupported_claims: Optional[List[str]] = None


def _cosine_similarity(a: List[float], b: List[float]) -> float:
    """Compute cosine similarity between two vectors without numpy."""
    if len(a) != len(b) or len(a) == 0:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class SemanticCacheService:
    """
    Semantic cache for RAG responses.

    Uses embedding similarity to find cached answers for semantically
    equivalent questions. User-isolated (different users don't share cache).

    Cache structure in Redis:
      rag_cache:{user_id}:index → JSON list of {hash, embedding_truncated}
      rag_cache:{user_id}:{hash} → JSON CachedRAGResponse
    """

    CACHE_SIMILARITY_THRESHOLD = 0.95  # Very high to ensure semantic equivalence
    CACHE_TTL = 3600  # 1 hour
    MAX_CACHED_ENTRIES = 100  # Per user
    # Store truncated embeddings (first 128 dims) for fast comparison
    EMBEDDING_DIMS_FOR_CACHE = 128

    def __init__(self):
        self._redis: Optional[RedisClient] = None

    async def _get_redis(self) -> RedisClient:
        if self._redis is None:
            self._redis = await get_redis()
        return self._redis

    def _cache_key(self, user_id: str, suffix: str) -> str:
        return f"rag_cache:{user_id}:{suffix}"

    def _hash_embedding(self, embedding: List[float]) -> str:
        """Create a stable hash from an embedding for cache key."""
        # Use first 32 dims as fingerprint for hashing
        fingerprint = ",".join(f"{v:.4f}" for v in embedding[:32])
        return hashlib.md5(fingerprint.encode()).hexdigest()

    async def get_cached(
        self,
        question: str,
        embedding: List[float],
        user_id: str,
    ) -> Optional[CachedRAGResponse]:
        """
        Look up a cached response for a semantically similar question.

        Args:
            question: The user's question
            embedding: Embedding vector for the question
            user_id: User ID for cache isolation

        Returns:
            CachedRAGResponse if a sufficiently similar cached entry exists
        """
        try:
            redis = await self._get_redis()
            index_key = self._cache_key(user_id, "index")

            # Get the index of cached entries
            index_data = await redis.get(index_key)
            if not index_data:
                return None

            entries = json.loads(index_data)
            truncated_query = embedding[: self.EMBEDDING_DIMS_FOR_CACHE]

            # Find best match
            best_similarity = 0.0
            best_hash = None

            for entry in entries:
                cached_emb = entry.get("embedding", [])
                similarity = _cosine_similarity(truncated_query, cached_emb)
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_hash = entry.get("hash")

            if best_similarity >= self.CACHE_SIMILARITY_THRESHOLD and best_hash:
                # Retrieve the cached response
                response_key = self._cache_key(user_id, best_hash)
                response_data = await redis.get(response_key)
                if response_data:
                    parsed = json.loads(response_data)
                    return CachedRAGResponse(**parsed)

            return None

        except Exception as e:
            logger.warning(f"Semantic cache lookup failed: {e}")
            return None

    async def cache_response(
        self,
        question: str,
        embedding: List[float],
        response: CachedRAGResponse,
        user_id: str,
    ) -> bool:
        """
        Cache a RAG response for future similar queries.

        Args:
            question: The user's question
            embedding: Embedding vector for the question
            response: The RAG response to cache
            user_id: User ID for cache isolation

        Returns:
            True if successfully cached
        """
        try:
            redis = await self._get_redis()
            emb_hash = self._hash_embedding(embedding)
            index_key = self._cache_key(user_id, "index")
            response_key = self._cache_key(user_id, emb_hash)

            # Store the response
            response_json = json.dumps(asdict(response), default=str)
            await redis.set(response_key, response_json, ttl=self.CACHE_TTL)

            # Update the index
            index_data = await redis.get(index_key)
            entries = json.loads(index_data) if index_data else []

            # Add new entry with truncated embedding
            truncated = embedding[: self.EMBEDDING_DIMS_FOR_CACHE]
            new_entry = {
                "hash": emb_hash,
                "embedding": truncated,
            }

            # Remove duplicate if exists
            entries = [e for e in entries if e.get("hash") != emb_hash]
            entries.append(new_entry)

            # Trim to max entries (FIFO)
            if len(entries) > self.MAX_CACHED_ENTRIES:
                # Remove oldest entries and their response keys
                removed = entries[: len(entries) - self.MAX_CACHED_ENTRIES]
                for r in removed:
                    old_key = self._cache_key(user_id, r.get("hash", ""))
                    await redis.delete(old_key)
                entries = entries[-self.MAX_CACHED_ENTRIES :]

            await redis.set(index_key, json.dumps(entries), ttl=self.CACHE_TTL)
            return True

        except Exception as e:
            logger.warning(f"Semantic cache store failed: {e}")
            return False

    async def invalidate_user_cache(self, user_id: str) -> int:
        """
        Invalidate all cached entries for a user.
        Called when user's documents are updated.

        Returns:
            Number of keys deleted
        """
        try:
            redis = await self._get_redis()
            return await redis.delete_pattern(f"rag_cache:{user_id}:*")
        except Exception as e:
            logger.warning(f"Cache invalidation failed: {e}")
            return 0

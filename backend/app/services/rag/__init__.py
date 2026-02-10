"""
RAG Services Package

Phase 11 - RAG Implementation
Enhanced: P0.1 Semantic Chunking, P0.2 Hybrid Search, P1.1 Reranking,
          P1.2 Streaming, P2.2 Groundedness, P3.1 Semantic Cache, P3.2 Evaluation
Unified Knowledge: Intent Classifier, Pipeline Router
"""

from app.services.rag.embedding_service import EmbeddingService, ChunkStrategy
from app.services.rag.retrieval_service import RetrievalService
from app.services.rag.generation_service import GenerationService, RAGResponse
from app.services.rag.reranker_service import RerankerService
from app.services.rag.groundedness_service import GroundednessService, GroundednessResult
from app.services.rag.cache_service import SemanticCacheService, CachedRAGResponse
from app.services.rag.evaluation_service import EvaluationService, AggregatedEvaluation
from app.services.rag.intent_classifier import IntentClassifier, IntentType, ClassificationResult
from app.services.rag.pipeline_router import PipelineRouter, UnifiedResponse

__all__ = [
    "ChunkStrategy",
    "EmbeddingService",
    "RetrievalService",
    "GenerationService",
    "RAGResponse",
    "RerankerService",
    "GroundednessService",
    "GroundednessResult",
    "SemanticCacheService",
    "CachedRAGResponse",
    "EvaluationService",
    "AggregatedEvaluation",
    "IntentClassifier",
    "IntentType",
    "ClassificationResult",
    "PipelineRouter",
    "UnifiedResponse",
]

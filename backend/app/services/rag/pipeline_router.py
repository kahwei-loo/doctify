"""
Pipeline Router for Unified Knowledge Base Queries

Routes user queries to the appropriate pipeline (RAG or Analytics) based on
intent classification. Manages conversation stickiness and query logging.

Part of Unified Knowledge & Insights integration.
"""

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import AsyncGenerator, Optional, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.rag.intent_classifier import (
    IntentClassifier,
    IntentType,
    ClassificationResult,
    DataSourceInfo,
)
from app.services.rag.generation_service import GenerationService, RAGResponse
from app.db.repositories.rag import RAGQueryRepository
from app.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


@dataclass
class UnifiedResponse:
    """Unified response from either RAG or Analytics pipeline."""

    query_id: uuid.UUID
    intent_type: str
    confidence: float
    rag_response: Optional[RAGResponse] = None
    analytics_response: Optional[dict] = None
    created_at: Optional[datetime] = None


class PipelineRouter:
    """
    Routes KB queries to the appropriate pipeline based on intent classification.

    Flow:
    1. Gather data source info from KB
    2. Classify intent (RAG vs Analytics)
    3. Dispatch to appropriate pipeline
    4. Log classification decision
    5. Return unified response
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.classifier = IntentClassifier(session)
        self.generation_service = GenerationService(session)
        self.query_repo = RAGQueryRepository(session)

    async def route_query(
        self,
        kb_id: uuid.UUID,
        query: str,
        user_id: uuid.UUID,
        data_sources: list[DataSourceInfo],
        conversation_id: Optional[str] = None,
        search_mode: str = "hybrid",
        conversation_context: Optional[dict] = None,
    ) -> UnifiedResponse:
        """
        Route a query to the appropriate pipeline.

        Args:
            kb_id: Knowledge base ID
            query: User's natural language query
            user_id: Authenticated user ID
            data_sources: Data sources in the KB (for intent classification)
            conversation_id: Optional conversation ID for multi-turn context
            search_mode: Search mode for RAG queries
            conversation_context: Prior conversation context for stickiness

        Returns:
            UnifiedResponse with results from the appropriate pipeline
        """
        # Step 1: Classify intent
        classification = await self.classifier.classify(
            query=query,
            data_sources=data_sources,
            conversation_context=conversation_context,
        )

        logger.info(
            "Query routed",
            extra={
                "event": "query_routed",
                "kb_id": str(kb_id),
                "intent": classification.intent.value,
                "confidence": classification.confidence,
                "dataset_id": classification.dataset_id,
                "latency_ms": classification.latency_ms,
            },
        )

        # Step 2: Dispatch to appropriate pipeline
        if classification.intent == IntentType.ANALYTICS and classification.dataset_id:
            response = await self._handle_analytics(
                query=query,
                user_id=user_id,
                classification=classification,
                conversation_id=conversation_id,
            )
        else:
            response = await self._handle_rag(
                query=query,
                user_id=user_id,
                kb_id=kb_id,
                classification=classification,
                search_mode=search_mode,
                conversation_id=conversation_id,
            )

        # Step 3: Log to rag_queries with classification metadata
        query_record = await self._log_query(
            user_id=user_id,
            query=query,
            classification=classification,
            response=response,
            conversation_id=conversation_id,
        )

        response.query_id = query_record.id
        response.created_at = query_record.created_at

        await self.session.commit()

        return response

    async def route_query_stream(
        self,
        kb_id: uuid.UUID,
        query: str,
        user_id: uuid.UUID,
        data_sources: list[DataSourceInfo],
        conversation_id: Optional[str] = None,
        search_mode: str = "hybrid",
        conversation_context: Optional[dict] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream a unified query response as Server-Sent Events.

        SSE event format: data: {"event": "<type>", ...}

        Event types:
        - intent: Classification result
        - chunk: RAG answer text chunk (RAG path)
        - sources: RAG source documents (RAG path)
        - analytics_result: Full analytics response (Analytics path)
        - done: Query completed with metadata
        - error: Error information
        """
        response = UnifiedResponse(
            query_id=uuid.uuid4(),
            intent_type="rag",
            confidence=0.0,
        )

        try:
            # Step 1: Classify intent
            classification = await self.classifier.classify(
                query=query,
                data_sources=data_sources,
                conversation_context=conversation_context,
            )

            response.confidence = classification.confidence

            # Emit intent event
            yield f"data: {json.dumps({'event': 'intent', 'intent_type': classification.intent.value, 'confidence': classification.confidence})}\n\n"

            if classification.intent == IntentType.ANALYTICS and classification.dataset_id:
                # Analytics path: run synchronously and yield single result
                try:
                    response = await self._handle_analytics(
                        query=query,
                        user_id=user_id,
                        classification=classification,
                        conversation_id=conversation_id,
                    )
                    yield f"data: {json.dumps({'event': 'analytics_result', 'data': response.analytics_response or {}})}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
                    return

            else:
                # RAG path: stream answer chunks
                response.intent_type = "rag"
                try:
                    async for sse_event in self.generation_service.generate_answer_stream(
                        question=query,
                        data_source_ids=None,
                        user_id=user_id,
                        search_mode=search_mode,
                        use_reranking=True,
                    ):
                        # Re-emit generation_service SSE events in unified format
                        if sse_event.startswith("data: "):
                            raw = sse_event[len("data: "):].strip()
                            try:
                                parsed = json.loads(raw)
                                event_type = parsed.get("type", "")
                                if event_type == "token":
                                    yield f"data: {json.dumps({'event': 'chunk', 'text': parsed.get('data', '')})}\n\n"
                                elif event_type == "sources":
                                    yield f"data: {json.dumps({'event': 'sources', 'sources': parsed.get('data', [])})}\n\n"
                                elif event_type == "done":
                                    pass  # We emit our own done after logging
                                elif event_type == "error":
                                    yield f"data: {json.dumps({'event': 'error', 'message': parsed.get('data', '')})}\n\n"
                                    return
                            except json.JSONDecodeError:
                                continue
                except Exception as e:
                    yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"
                    return

            # Log the query
            query_record = await self._log_query(
                user_id=user_id,
                query=query,
                classification=classification,
                response=response,
                conversation_id=conversation_id,
            )
            await self.session.commit()

            # Emit done event
            yield f"data: {json.dumps({'event': 'done', 'query_id': str(query_record.id), 'created_at': query_record.created_at.isoformat() if query_record.created_at else None})}\n\n"

        except Exception as e:
            logger.error(f"Streaming query error: {e}")
            yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"

    async def _handle_rag(
        self,
        query: str,
        user_id: uuid.UUID,
        kb_id: uuid.UUID,
        classification: ClassificationResult,
        search_mode: str,
        conversation_id: Optional[str],
    ) -> UnifiedResponse:
        """Handle RAG pipeline execution."""
        try:
            rag_response = await self.generation_service.generate_answer(
                question=query,
                user_id=user_id,
                data_source_ids=None,  # Search all doc sources in KB
                search_mode=search_mode,
                use_reranking=True,
            )

            return UnifiedResponse(
                query_id=uuid.uuid4(),  # Placeholder, replaced after DB insert
                intent_type="rag",
                confidence=classification.confidence,
                rag_response=rag_response,
            )

        except Exception as e:
            logger.error(f"RAG pipeline error: {e}")
            raise ValidationError(f"RAG query failed: {str(e)}")

    async def _handle_analytics(
        self,
        query: str,
        user_id: uuid.UUID,
        classification: ClassificationResult,
        conversation_id: Optional[str],
    ) -> UnifiedResponse:
        """Handle Analytics pipeline execution via QueryService."""
        try:
            # Lazy import to avoid circular dependency
            from app.services.insights.query_service import QueryService

            query_service = QueryService(self.session)

            # The QueryService expects a conversation_id. If none provided,
            # we need to find/create one for the dataset.
            if not conversation_id:
                # For now, return a structured response indicating that
                # a conversation needs to be established first
                return UnifiedResponse(
                    query_id=uuid.uuid4(),
                    intent_type="analytics",
                    confidence=classification.confidence,
                    analytics_response={
                        "sql": "",
                        "data": [],
                        "chart_type": None,
                        "chart_config": None,
                        "insights_text": (
                            "Analytics query detected. Please start a conversation "
                            "with the dataset to execute data queries."
                        ),
                        "dataset_id": classification.dataset_id,
                        "needs_conversation": True,
                    },
                )

            # Execute analytics query through existing QueryService
            result = await query_service.process_query(
                conversation_id=uuid.UUID(conversation_id),
                user_id=user_id,
                message=query,
            )

            analytics_data = {
                "sql": result.generated_sql or "",
                "data": result.data if hasattr(result, "data") else [],
                "chart_type": result.chart.type if result.chart else None,
                "chart_config": result.chart.config if result.chart else None,
                "insights_text": result.text or "",
            }

            return UnifiedResponse(
                query_id=uuid.uuid4(),
                intent_type="analytics",
                confidence=classification.confidence,
                analytics_response=analytics_data,
            )

        except Exception as e:
            logger.error(f"Analytics pipeline error: {e}")
            raise ValidationError(f"Analytics query failed: {str(e)}")

    async def _log_query(
        self,
        user_id: uuid.UUID,
        query: str,
        classification: ClassificationResult,
        response: UnifiedResponse,
        conversation_id: Optional[str],
    ) -> Any:
        """Log query with classification metadata to rag_queries table."""
        query_data: dict[str, Any] = {
            "user_id": user_id,
            "question": query,
            "intent_type": classification.intent.value,
            "intent_confidence": classification.confidence,
            "classification_latency_ms": classification.latency_ms,
        }

        if conversation_id:
            query_data["conversation_id"] = conversation_id

        if classification.dataset_id:
            query_data["dataset_id"] = classification.dataset_id

        if response.rag_response:
            query_data["answer"] = response.rag_response.answer
            query_data["sources"] = response.rag_response.sources
            query_data["model_used"] = response.rag_response.model_used
            query_data["tokens_used"] = response.rag_response.tokens_used
            query_data["confidence_score"] = response.rag_response.confidence_score

        if response.analytics_response:
            query_data["generated_sql"] = response.analytics_response.get("sql", "")
            query_data["chart_type"] = response.analytics_response.get("chart_type")
            query_data["answer"] = response.analytics_response.get("insights_text", "")

        record = await self.query_repo.create(query_data)
        return record

"""
Generation Service for RAG

Handles AI-powered answer generation using retrieved context.
Phase 11 - RAG Implementation
"""

import json
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ai import get_ai_gateway, ModelPurpose
from app.services.rag.retrieval_service import RetrievalService
from app.services.rag.embedding_service import EmbeddingService
from app.services.rag.security import RAGSecurityValidator
from app.services.rag.groundedness_service import GroundednessService, GroundednessResult
from app.services.rag.cache_service import SemanticCacheService, CachedRAGResponse
from app.core.exceptions import ValidationError, DatabaseError


@dataclass
class RAGResponse:
    """RAG generation response with metadata."""
    answer: str
    sources: List[Dict[str, Any]]
    model_used: str
    tokens_used: int
    confidence_score: float
    context_used: int  # Number of chunks used
    groundedness_score: Optional[float] = None
    unsupported_claims: Optional[List[str]] = None
    cached: bool = False


class GenerationService:
    """
    Service for generating answers using RAG pattern.

    Combines retrieval with LLM generation for accurate, source-cited responses.
    """

    MAX_CONTEXT_LENGTH = 8000  # tokens

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session
        self.retrieval_service = RetrievalService(session)
        self.embedding_service = EmbeddingService(session)
        self.security_validator = RAGSecurityValidator()
        self.groundedness_service = GroundednessService()
        self.cache_service = SemanticCacheService()

        # Initialize AI gateway
        self.gateway = get_ai_gateway()

    def _build_rag_prompt(
        self,
        question: str,
        context_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Build RAG prompt with retrieved context.

        Prompt structure:
        - System role: Document assistant
        - Context: Relevant document chunks with sources
        - Question: User question
        - Instructions: Answer based on context, cite sources

        Args:
            question: User question
            context_chunks: Retrieved context chunks

        Returns:
            Formatted prompt string
        """
        # Build context text with source citations
        context_parts = []
        for i, chunk in enumerate(context_chunks, 1):
            context_parts.append(
                f"[Source {i}: {chunk['document_name']}, Chunk {chunk['chunk_index']}]\n"
                f"{chunk['chunk_text']}\n"
            )

        context_text = "\n".join(context_parts)

        # Build full prompt
        prompt = f"""You are an intelligent document assistant. Answer the user's question based ONLY on the provided context from documents.

CONTEXT:
{context_text}

QUESTION:
{question}

INSTRUCTIONS:
1. Answer the question using information from the context
2. If the context doesn't contain relevant information, say "I don't have enough information to answer this question based on the provided documents."
3. Cite specific sources when making claims (e.g., "According to [Source 1]...")
4. Be concise but comprehensive
5. If multiple sources provide different information, acknowledge the differences

ANSWER:"""

        return prompt

    async def generate_answer(
        self,
        question: str,
        top_k: int = 5,
        similarity_threshold: float = 0.3,
        document_ids: Optional[List[uuid.UUID]] = None,
        data_source_ids: Optional[List[uuid.UUID]] = None,
        user_id: Optional[uuid.UUID] = None,
        model: Optional[str] = None,
        search_mode: str = "hybrid",
        use_reranking: bool = False,
    ) -> RAGResponse:
        """
        Generate answer using RAG workflow.

        Workflow:
        1. Retrieve relevant context chunks
        2. Build prompt with context
        3. Call LLM for generation
        4. Extract answer and metadata

        Args:
            question: User question
            top_k: Number of chunks to retrieve
            similarity_threshold: Minimum similarity score
            document_ids: Optional document ID filter
            user_id: Optional user ID for access control
            model: Optional model override (defaults to gpt-4)

        Returns:
            RAGResponse with answer, sources, and metadata

        Raises:
            ValidationError: If question is invalid
            DatabaseError: If generation fails
        """
        if not question or not question.strip():
            raise ValidationError("Question cannot be empty")

        # Security validation: check for prompt injection
        self.security_validator.validate_query_safety(question)

        model_to_use = model or self.gateway.get_model(ModelPurpose.CHAT)

        try:
            # Step 0: Check semantic cache (P3.1)
            question_embedding: Optional[List[float]] = None
            if user_id:
                try:
                    question_embedding = await self.embedding_service.generate_embedding(question)
                    cached = await self.cache_service.get_cached(
                        question=question,
                        embedding=question_embedding,
                        user_id=str(user_id),
                    )
                    if cached:
                        return RAGResponse(
                            answer=cached.answer,
                            sources=cached.sources,
                            model_used=cached.model_used,
                            tokens_used=cached.tokens_used,
                            confidence_score=cached.confidence_score,
                            context_used=cached.context_used,
                            groundedness_score=cached.groundedness_score,
                            unsupported_claims=cached.unsupported_claims,
                            cached=True,
                        )
                except Exception:
                    pass  # Cache miss or error - proceed with normal generation

            # Step 1: Retrieve context
            context_chunks = await self.retrieval_service.retrieve_context(
                question=question,
                top_k=top_k,
                similarity_threshold=similarity_threshold,
                document_ids=document_ids,
                data_source_ids=data_source_ids,
                user_id=user_id,
                search_mode=search_mode,
                use_reranking=use_reranking,
            )

            # Handle case with no relevant documents
            if not context_chunks:
                return RAGResponse(
                    answer="I don't have any relevant documents to answer this question. Please upload documents first or try rephrasing your question.",
                    sources=[],
                    model_used="none",
                    tokens_used=0,
                    confidence_score=0.0,
                    context_used=0
                )

            # Step 2: Build prompt
            prompt = self._build_rag_prompt(question, context_chunks)

            # Step 3: Generate answer via AI Gateway
            try:
                response = await self.gateway.acompletion(
                    model=model_to_use,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a helpful document assistant that provides accurate answers based on document context."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.3,  # Lower temperature for more factual responses
                    max_tokens=1000,
                )

                answer_text = response.choices[0].message.content or ""
                tokens_used = response.usage.total_tokens if response.usage else 0

                # Sanitize LLM output for XSS prevention
                answer_text = self.security_validator.sanitize_llm_output(answer_text)

            except Exception as llm_error:
                # Fallback to simpler model if primary fails
                fallback_model = self.gateway.get_model(ModelPurpose.CHAT_FAST)
                if model_to_use != fallback_model:
                    try:
                        response = await self.gateway.acompletion(
                            model=fallback_model,
                            messages=[
                                {"role": "system", "content": "You are a helpful document assistant."},
                                {"role": "user", "content": prompt}
                            ],
                            temperature=0.3,
                            max_tokens=1000,
                        )
                        answer_text = response.choices[0].message.content or ""
                        tokens_used = response.usage.total_tokens if response.usage else 0
                        model_to_use = fallback_model
                    except Exception:
                        raise DatabaseError(f"LLM generation failed: {str(llm_error)}")
                else:
                    raise DatabaseError(f"LLM generation failed: {str(llm_error)}")

            # Step 4: Calculate confidence score based on source relevance
            avg_similarity = sum(c["similarity_score"] for c in context_chunks) / len(context_chunks)
            confidence_score = min(avg_similarity * 1.1, 1.0)  # Slight boost, capped at 1.0

            # Step 5: Groundedness check (P2.2)
            groundedness_result: Optional[GroundednessResult] = None
            try:
                chunk_texts = [c["chunk_text"] for c in context_chunks]
                groundedness_result = await self.groundedness_service.check(
                    answer=answer_text,
                    context_chunks=chunk_texts,
                )
            except Exception:
                pass  # Groundedness check is non-blocking

            # Step 6: Cache the response for future similar queries (P3.1)
            if user_id and question_embedding:
                try:
                    await self.cache_service.cache_response(
                        question=question,
                        embedding=question_embedding,
                        response=CachedRAGResponse(
                            answer=answer_text,
                            sources=context_chunks,
                            model_used=model_to_use,
                            tokens_used=tokens_used,
                            confidence_score=round(confidence_score, 3),
                            context_used=len(context_chunks),
                            groundedness_score=groundedness_result.score if groundedness_result else None,
                            unsupported_claims=groundedness_result.unsupported_claims if groundedness_result else None,
                        ),
                        user_id=str(user_id),
                    )
                except Exception:
                    pass  # Cache store failure is non-blocking

            # Step 7: Build response
            return RAGResponse(
                answer=answer_text,
                sources=context_chunks,
                model_used=model_to_use,
                tokens_used=tokens_used,
                confidence_score=round(confidence_score, 3),
                context_used=len(context_chunks),
                groundedness_score=groundedness_result.score if groundedness_result else None,
                unsupported_claims=groundedness_result.unsupported_claims if groundedness_result else None,
            )

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to generate answer: {str(e)}")

    async def generate_answer_stream(
        self,
        question: str,
        top_k: int = 5,
        similarity_threshold: float = 0.3,
        document_ids: Optional[List[uuid.UUID]] = None,
        data_source_ids: Optional[List[uuid.UUID]] = None,
        user_id: Optional[uuid.UUID] = None,
        model: Optional[str] = None,
        search_mode: str = "hybrid",
        use_reranking: bool = False,
    ) -> AsyncGenerator[str, None]:
        """
        Stream RAG answer as Server-Sent Events.

        Yields SSE-formatted strings:
        - type=sources: Retrieved context chunks
        - type=token: Individual answer tokens
        - type=done: Final metadata (model, tokens, confidence)
        - type=error: Error information

        Args:
            question: User question
            top_k: Number of chunks to retrieve
            similarity_threshold: Minimum similarity score
            document_ids: Optional document ID filter
            data_source_ids: Optional data source ID filter
            user_id: Optional user ID for access control
            model: Optional model override
            search_mode: Search mode (semantic/keyword/hybrid)
            use_reranking: Whether to apply reranking
        """
        if not question or not question.strip():
            yield f"data: {json.dumps({'type': 'error', 'data': 'Question cannot be empty'})}\n\n"
            return

        self.security_validator.validate_query_safety(question)
        model_to_use = model or self.gateway.get_model(ModelPurpose.CHAT)

        try:
            # Step 1: Retrieve context (non-streaming)
            context_chunks = await self.retrieval_service.retrieve_context(
                question=question,
                top_k=top_k,
                similarity_threshold=similarity_threshold,
                document_ids=document_ids,
                data_source_ids=data_source_ids,
                user_id=user_id,
                search_mode=search_mode,
                use_reranking=use_reranking,
            )

            # Emit sources
            yield f"data: {json.dumps({'type': 'sources', 'data': context_chunks})}\n\n"

            if not context_chunks:
                no_docs_msg = "I don't have any relevant documents to answer this question."
                yield f"data: {json.dumps({'type': 'token', 'data': no_docs_msg})}\n\n"
                done_data = {'model_used': 'none', 'tokens_used': 0, 'confidence_score': 0.0, 'context_used': 0}
                yield f"data: {json.dumps({'type': 'done', 'data': done_data})}\n\n"
                return

            # Step 2: Build prompt
            prompt = self._build_rag_prompt(question, context_chunks)

            # Step 3: Stream answer via AI Gateway
            full_answer = ""
            stream = await self.gateway.acompletion(
                model=model_to_use,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful document assistant that provides accurate answers based on document context.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=1000,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    token = chunk.choices[0].delta.content
                    full_answer += token
                    yield f"data: {json.dumps({'type': 'token', 'data': token})}\n\n"

            # Sanitize final answer
            full_answer = self.security_validator.sanitize_llm_output(full_answer)

            # Step 4: Calculate confidence
            avg_similarity = sum(c["similarity_score"] for c in context_chunks) / len(context_chunks)
            confidence_score = min(avg_similarity * 1.1, 1.0)

            # Step 5: Emit done signal with metadata
            yield f"data: {json.dumps({'type': 'done', 'data': {'model_used': model_to_use, 'tokens_used': 0, 'confidence_score': round(confidence_score, 3), 'context_used': len(context_chunks), 'answer': full_answer}})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    async def _rewrite_query(
        self,
        question: str,
        conversation_history: List[Dict[str, str]],
    ) -> str:
        """
        Rewrite a follow-up question into a standalone question using conversation history.

        Example:
            History: "What is the revenue?" -> "Revenue is $2.5M"
            Question: "What about last year?"
            Rewritten: "What was the revenue last year?"
        """
        if not conversation_history:
            return question

        # Build condensed history (last 6 turns max)
        recent = conversation_history[-6:]
        history_text = "\n".join(
            f"{msg['role'].upper()}: {msg['content']}" for msg in recent
        )

        rewrite_prompt = f"""Given the conversation history and a follow-up question, rewrite the follow-up into a standalone question.

CONVERSATION HISTORY:
{history_text}

FOLLOW-UP QUESTION: {question}

Rewrite the follow-up as a standalone question (output ONLY the rewritten question, nothing else):"""

        try:
            response = await self.gateway.acompletion(
                purpose=ModelPurpose.CHAT_FAST,
                messages=[
                    {"role": "system", "content": "You rewrite follow-up questions into standalone questions."},
                    {"role": "user", "content": rewrite_prompt},
                ],
                temperature=0.0,
                max_tokens=200,
            )
            rewritten = (response.choices[0].message.content or "").strip()
            return rewritten if rewritten else question
        except Exception:
            return question

    async def generate_answer_with_conversation_history(
        self,
        question: str,
        conversation_history: List[Dict[str, str]],
        top_k: int = 5,
        similarity_threshold: float = 0.7,
        document_ids: Optional[List[uuid.UUID]] = None,
        data_source_ids: Optional[List[uuid.UUID]] = None,
        user_id: Optional[uuid.UUID] = None,
        search_mode: str = "hybrid",
        use_reranking: bool = False,
    ) -> RAGResponse:
        """
        Generate answer considering conversation history (P1.3).

        Rewrites the follow-up question into a standalone query,
        then runs normal RAG retrieval + generation.

        Args:
            question: Current user question
            conversation_history: List of {"role": "user"|"assistant", "content": str}
            top_k: Number of chunks to retrieve
            similarity_threshold: Minimum similarity score
            document_ids: Optional document ID filter
            data_source_ids: Optional data source ID filter
            user_id: Optional user ID for access control
            search_mode: Search mode
            use_reranking: Whether to apply reranking
        """
        # Rewrite the follow-up question
        rewritten_question = await self._rewrite_query(question, conversation_history)

        return await self.generate_answer(
            question=rewritten_question,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            document_ids=document_ids,
            data_source_ids=data_source_ids,
            user_id=user_id,
            search_mode=search_mode,
            use_reranking=use_reranking,
        )

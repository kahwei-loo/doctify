"""
Generation Service for RAG

Handles AI-powered answer generation using retrieved context.
Phase 11 - RAG Implementation
"""

import uuid
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession

from openai import AsyncOpenAI

from app.core.config import settings
from app.services.rag.retrieval_service import RetrievalService
from app.services.rag.security import RAGSecurityValidator
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


class GenerationService:
    """
    Service for generating answers using RAG pattern.

    Combines retrieval with LLM generation for accurate, source-cited responses.
    """

    DEFAULT_MODEL = "gpt-4"
    FALLBACK_MODEL = "gpt-3.5-turbo"
    MAX_CONTEXT_LENGTH = 8000  # tokens

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session
        self.retrieval_service = RetrievalService(session)
        self.security_validator = RAGSecurityValidator()

        # Initialize OpenAI client
        if not settings.OPENAI_API_KEY:
            raise ValidationError("OPENAI_API_KEY not configured")

        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

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
        similarity_threshold: float = 0.7,
        document_ids: Optional[List[uuid.UUID]] = None,
        user_id: Optional[uuid.UUID] = None,
        model: Optional[str] = None
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

        model_to_use = model or self.DEFAULT_MODEL

        try:
            # Step 1: Retrieve context
            context_chunks = await self.retrieval_service.retrieve_context(
                question=question,
                top_k=top_k,
                similarity_threshold=similarity_threshold,
                document_ids=document_ids,
                user_id=user_id
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

            # Step 3: Generate answer via OpenAI
            try:
                response = await self.openai_client.chat.completions.create(
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
                if model_to_use == self.DEFAULT_MODEL:
                    try:
                        response = await self.openai_client.chat.completions.create(
                            model=self.FALLBACK_MODEL,
                            messages=[
                                {"role": "system", "content": "You are a helpful document assistant."},
                                {"role": "user", "content": prompt}
                            ],
                            temperature=0.3,
                            max_tokens=1000,
                        )
                        answer_text = response.choices[0].message.content or ""
                        tokens_used = response.usage.total_tokens if response.usage else 0
                        model_to_use = self.FALLBACK_MODEL
                    except Exception:
                        raise DatabaseError(f"LLM generation failed: {str(llm_error)}")
                else:
                    raise DatabaseError(f"LLM generation failed: {str(llm_error)}")

            # Step 4: Calculate confidence score based on source relevance
            avg_similarity = sum(c["similarity_score"] for c in context_chunks) / len(context_chunks)
            confidence_score = min(avg_similarity * 1.1, 1.0)  # Slight boost, capped at 1.0

            # Step 5: Build response
            return RAGResponse(
                answer=answer_text,
                sources=context_chunks,
                model_used=model_to_use,
                tokens_used=tokens_used,
                confidence_score=round(confidence_score, 3),
                context_used=len(context_chunks)
            )

        except Exception as e:
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to generate answer: {str(e)}")

    async def generate_answer_with_conversation_history(
        self,
        question: str,
        conversation_history: List[Dict[str, str]],
        top_k: int = 5,
        similarity_threshold: float = 0.7,
        user_id: Optional[uuid.UUID] = None,
    ) -> RAGResponse:
        """
        Generate answer considering conversation history.

        Useful for follow-up questions and maintaining context.

        Args:
            question: Current user question
            conversation_history: List of {"role": "user"|"assistant", "content": str}
            top_k: Number of chunks to retrieve
            similarity_threshold: Minimum similarity score
            user_id: Optional user ID for access control

        Returns:
            RAGResponse with answer and metadata
        """
        # For now, we'll retrieve based on current question only
        # Phase 13 (Chatbot) will implement more sophisticated conversation handling
        return await self.generate_answer(
            question=question,
            top_k=top_k,
            similarity_threshold=similarity_threshold,
            user_id=user_id
        )

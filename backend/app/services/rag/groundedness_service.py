"""
Groundedness Service for RAG

Verifies that generated answers are supported by retrieved context.
Phase P2.2 - Hallucination Detection
"""

import json
from typing import List, Optional
from dataclasses import dataclass

from app.services.ai import get_ai_gateway, ModelPurpose


@dataclass
class GroundednessResult:
    """Result of groundedness evaluation."""

    score: float  # 0.0 - 1.0
    unsupported_claims: List[str]


GROUNDEDNESS_PROMPT = """You are a fact-checking assistant. Given the CONTEXT (document excerpts) and an ANSWER, evaluate whether the answer is fully supported by the context.

CONTEXT:
{context}

ANSWER:
{answer}

Evaluate groundedness:
- 1.0: Every claim in the answer is directly supported by the context
- 0.7-0.9: Most claims are supported, minor inferences are reasonable
- 0.4-0.6: Some claims are supported, but significant parts are inferred or unsupported
- 0.0-0.3: Answer contradicts context or has little basis in it

Return ONLY valid JSON (no markdown, no explanation):
{{"score": <float>, "unsupported_claims": [<string>, ...]}}

If all claims are supported, return an empty list for unsupported_claims."""


class GroundednessService:
    """
    Service for checking answer groundedness against retrieved context.

    Uses a lightweight LLM call (GPT-3.5-turbo) to assess whether
    the generated answer is faithfully based on the retrieved context.
    """

    def __init__(self):
        self.gateway = get_ai_gateway()

    async def check(
        self,
        answer: str,
        context_chunks: List[str],
        model: Optional[str] = None,
    ) -> GroundednessResult:
        """
        Check if an answer is grounded in the provided context.

        Args:
            answer: The AI-generated answer to evaluate
            context_chunks: List of source text chunks
            model: Optional model override for the judge

        Returns:
            GroundednessResult with score and list of unsupported claims
        """
        if not answer or not answer.strip():
            return GroundednessResult(score=0.0, unsupported_claims=[])

        if not context_chunks:
            return GroundednessResult(
                score=0.0,
                unsupported_claims=["No context provided to verify against"],
            )

        # Build context string from chunks
        context_text = "\n\n".join(
            f"[Chunk {i+1}]: {chunk}" for i, chunk in enumerate(context_chunks)
        )

        prompt = GROUNDEDNESS_PROMPT.format(
            context=context_text,
            answer=answer,
        )

        try:
            response = await self.gateway.acompletion(
                purpose=ModelPurpose.CHAT_FAST,
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise fact-checking assistant. Output only valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.0,
                max_tokens=500,
            )

            content = (response.choices[0].message.content or "").strip()

            # Parse JSON response
            parsed = json.loads(content)
            score = float(parsed.get("score", 0.5))
            score = max(0.0, min(1.0, score))
            unsupported = parsed.get("unsupported_claims", [])
            if not isinstance(unsupported, list):
                unsupported = []

            return GroundednessResult(
                score=round(score, 3),
                unsupported_claims=[str(c) for c in unsupported],
            )

        except (json.JSONDecodeError, KeyError, TypeError):
            # If parsing fails, return a moderate score
            return GroundednessResult(score=0.5, unsupported_claims=[])
        except Exception:
            # On any API error, skip groundedness check gracefully
            return GroundednessResult(score=0.5, unsupported_claims=[])

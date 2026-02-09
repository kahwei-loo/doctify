"""
Intent Classifier for Unified Knowledge Base Queries

Classifies user queries as either RAG (document Q&A) or Analytics (NL-to-SQL)
using GPT function calling with structured output. Supports bilingual EN/ZH queries.

Part of Unified Knowledge & Insights integration.
"""

import logging
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)


class IntentType(str, Enum):
    """Possible query intent types."""
    RAG = "rag"
    ANALYTICS = "analytics"
    AMBIGUOUS = "ambiguous"


@dataclass
class ClassificationResult:
    """Result of intent classification."""
    intent: IntentType
    confidence: float
    dataset_id: Optional[str] = None
    reasoning: str = ""
    latency_ms: int = 0


@dataclass
class DataSourceInfo:
    """Minimal info about a KB data source for classification context."""
    id: str
    type: str  # 'uploaded_docs', 'website', 'text', 'qa_pairs', 'structured_data'
    name: str
    columns: list[str] = field(default_factory=list)


# OpenAI function schema for structured classification output
CLASSIFY_FUNCTION = {
    "name": "classify_query_intent",
    "description": "Classify a user query as either a RAG document question or an analytics/data query",
    "parameters": {
        "type": "object",
        "properties": {
            "intent": {
                "type": "string",
                "enum": ["rag", "analytics", "ambiguous"],
                "description": "The classified intent type: 'rag' for document Q&A, 'analytics' for data/SQL queries, 'ambiguous' if unclear",
            },
            "confidence": {
                "type": "number",
                "minimum": 0.0,
                "maximum": 1.0,
                "description": "Confidence score for the classification (0.0-1.0)",
            },
            "dataset_id": {
                "type": "string",
                "description": "If analytics intent, the ID of the most relevant dataset. Empty string if not applicable.",
            },
            "reasoning": {
                "type": "string",
                "description": "Brief reasoning for the classification decision",
            },
        },
        "required": ["intent", "confidence", "reasoning"],
    },
}


SYSTEM_PROMPT = """You are a query intent classifier for a knowledge base system that contains both document sources and structured data sources (CSV/Excel datasets).

Your task: classify user queries into one of three categories:

1. **rag** — The user is asking a question about document CONTENT. They want to search, understand, or extract information from uploaded documents (PDFs, text, web pages, Q&A pairs).
   Examples (EN): "What does the contract say about payment terms?", "Summarize the key findings", "What is mentioned about risk factors?"
   Examples (ZH): "合同中关于付款条件怎么写的?", "总结一下主要发现", "关于风险因素提到了什么?"
   More ZH examples: "什么是退货政策？", "如何申请退款？", "这份文件的主要内容是什么？", "关于保修条款有什么规定？", "公司的请假流程是怎样的？"

2. **analytics** — The user wants to query, analyze, aggregate, or visualize STRUCTURED DATA from CSV/Excel datasets. They're asking for statistics, trends, comparisons, counts, sums, averages, charts.
   Examples (EN): "What's the total revenue by month?", "Show me the top 10 customers by sales", "How many orders were placed in Q4?", "Plot monthly sales trend"
   Examples (ZH): "每月的总收入是多少?", "按销售额显示前10名客户", "第四季度有多少订单?", "画出月度销售趋势"
   More ZH examples: "显示上个月的销售数据", "按产品类别统计总收入", "哪个部门的员工人数最多？", "计算每个季度的平均订单金额", "对比去年和今年的利润"
   Mixed EN/ZH: "Show me the sales trend 从去年开始", "对比 revenue by region"

3. **ambiguous** — Cannot determine intent with high confidence. Could be either RAG or analytics.

CLASSIFICATION RULES:
- If the query mentions specific metrics (revenue, count, total, average, sum) and the KB has structured data → analytics
- Chinese metric keywords include: 总计, 平均, 统计, 数量, 趋势, 对比, 排名, 总收入, 销售额, 增长率
- If the query asks about document content, policies, procedures, or specific text → rag
- Chinese document keywords include: 政策, 规定, 流程, 条款, 内容, 说明, 解释, 文件, 合同
- If the query could apply to both, lean toward RAG (safer fallback)
- If confidence < 0.7, classify as ambiguous
- For multi-dataset KBs, identify the most relevant dataset_id based on column names matching query terms
- Queries mixing English and Chinese should be classified by their semantic intent, not language

CONTEXT about this knowledge base's data sources will be provided. Use it to inform your decision."""


CJK_PATTERN = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")


def _detect_query_lang(query: str) -> str:
    """Detect if query is Chinese or English based on CJK character presence."""
    cjk_count = len(CJK_PATTERN.findall(query))
    return "zh" if cjk_count > len(query) * 0.1 else "en"


class IntentClassifier:
    """
    Classifies KB queries as RAG or Analytics using LLM function calling.

    Features:
    - GPT-4o-mini for fast, cheap classification
    - Bilingual EN/ZH prompt with few-shot examples
    - Fast-path: skips LLM when KB has only one data source type
    - Multi-dataset disambiguation via schema-column keyword matching
    - Classification logging for observability
    """

    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session
        self.client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
        self.model = getattr(settings, "INTENT_CLASSIFIER_MODEL", "gpt-4o-mini")
        self.confidence_threshold = getattr(
            settings, "INTENT_CONFIDENCE_THRESHOLD", 0.7
        )
        self.dataset_confidence_threshold = getattr(
            settings, "DATASET_CONFIDENCE_THRESHOLD", 0.6
        )

    async def classify(
        self,
        query: str,
        data_sources: list[DataSourceInfo],
        conversation_context: Optional[dict] = None,
    ) -> ClassificationResult:
        """
        Classify a query's intent.

        Args:
            query: User's natural language query
            data_sources: List of data sources in the KB (for context)
            conversation_context: Optional prior conversation context for stickiness

        Returns:
            ClassificationResult with intent, confidence, and optional dataset_id
        """
        start = time.monotonic()

        query_lang = _detect_query_lang(query)

        # Fast-path: skip LLM if KB has only one type of data source
        fast_result = self._try_fast_path(query, data_sources, conversation_context)
        if fast_result is not None:
            fast_result.latency_ms = int((time.monotonic() - start) * 1000)
            logger.info(
                "Intent classified (fast-path)",
                extra={
                    "event": "intent_classified",
                    "intent": fast_result.intent.value,
                    "confidence": fast_result.confidence,
                    "latency_ms": fast_result.latency_ms,
                    "dataset_id": fast_result.dataset_id or "",
                    "query_lang": query_lang,
                    "method": "fast_path",
                    "num_data_sources": len(data_sources),
                },
            )
            return fast_result

        # Conversation stickiness: if previous query in same conversation was analytics
        # with a specific dataset, bias toward same dataset
        sticky_dataset_id = None
        if conversation_context and conversation_context.get("last_intent") == "analytics":
            sticky_dataset_id = conversation_context.get("last_dataset_id")

        # Build context about available data sources
        ds_context = self._build_data_source_context(data_sources)

        # LLM classification
        user_message = f"Knowledge Base Data Sources:\n{ds_context}\n\nUser Query: {query}"

        if sticky_dataset_id:
            user_message += f"\n\nNote: The previous query in this conversation used dataset '{sticky_dataset_id}'. Consider this for context continuity."

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                functions=[CLASSIFY_FUNCTION],
                function_call={"name": "classify_query_intent"},
                temperature=0.0,
                max_tokens=200,
            )

            result = self._parse_response(response, data_sources)

        except Exception as e:
            logger.error(
                "Intent classification LLM error",
                extra={
                    "event": "intent_classification_error",
                    "error": str(e)[:200],
                    "query_lang": query_lang,
                },
            )
            # Fallback: default to RAG on error
            result = ClassificationResult(
                intent=IntentType.RAG,
                confidence=0.5,
                reasoning=f"LLM error fallback: {str(e)[:100]}",
            )

        result.latency_ms = int((time.monotonic() - start) * 1000)

        logger.info(
            "Intent classified",
            extra={
                "event": "intent_classified",
                "intent": result.intent.value,
                "confidence": result.confidence,
                "latency_ms": result.latency_ms,
                "dataset_id": result.dataset_id or "",
                "query_lang": query_lang,
                "method": "llm",
                "num_data_sources": len(data_sources),
                "has_stickiness": bool(sticky_dataset_id),
            },
        )

        return result

    def _try_fast_path(
        self,
        query: str,
        data_sources: list[DataSourceInfo],
        conversation_context: Optional[dict],
    ) -> Optional[ClassificationResult]:
        """
        Skip LLM when the answer is obvious from KB composition.

        Returns None if fast-path doesn't apply (need LLM).
        """
        has_structured = any(ds.type == "structured_data" for ds in data_sources)
        has_documents = any(ds.type != "structured_data" for ds in data_sources)

        # Case 1: KB has ONLY document sources → always RAG
        if has_documents and not has_structured:
            return ClassificationResult(
                intent=IntentType.RAG,
                confidence=1.0,
                reasoning="KB contains only document sources",
            )

        # Case 2: KB has ONLY structured data sources → always Analytics
        if has_structured and not has_documents:
            structured_ds = [ds for ds in data_sources if ds.type == "structured_data"]
            dataset_id = structured_ds[0].id if len(structured_ds) == 1 else None
            return ClassificationResult(
                intent=IntentType.ANALYTICS,
                confidence=1.0,
                dataset_id=dataset_id,
                reasoning="KB contains only structured data sources",
            )

        # Case 3: Conversation stickiness — if previous was analytics, bias
        if conversation_context and conversation_context.get("last_intent") == "analytics":
            # Only use fast path for strong stickiness signals
            pass  # Let LLM decide for mixed KBs

        return None

    def _build_data_source_context(self, data_sources: list[DataSourceInfo]) -> str:
        """Build a text description of data sources for the LLM prompt."""
        lines = []
        for ds in data_sources:
            if ds.type == "structured_data" and ds.columns:
                cols = ", ".join(ds.columns[:20])  # Cap at 20 columns
                lines.append(
                    f"- [{ds.type}] '{ds.name}' (id: {ds.id}) — Columns: {cols}"
                )
            else:
                lines.append(f"- [{ds.type}] '{ds.name}' (id: {ds.id})")
        return "\n".join(lines) if lines else "No data sources configured."

    def _parse_response(
        self,
        response,
        data_sources: list[DataSourceInfo],
    ) -> ClassificationResult:
        """Parse the LLM function call response into a ClassificationResult."""
        import json

        choice = response.choices[0]
        if not choice.message.function_call:
            return ClassificationResult(
                intent=IntentType.RAG,
                confidence=0.5,
                reasoning="No function call in response, defaulting to RAG",
            )

        try:
            args = json.loads(choice.message.function_call.arguments)
        except json.JSONDecodeError:
            return ClassificationResult(
                intent=IntentType.RAG,
                confidence=0.5,
                reasoning="Failed to parse function call arguments",
            )

        raw_intent = args.get("intent", "rag")
        confidence = float(args.get("confidence", 0.5))
        dataset_id = args.get("dataset_id", "") or None
        reasoning = args.get("reasoning", "")

        # Map intent string to enum
        try:
            intent = IntentType(raw_intent)
        except ValueError:
            intent = IntentType.RAG

        # If ambiguous or low confidence, default to RAG
        if intent == IntentType.AMBIGUOUS or confidence < self.confidence_threshold:
            intent = IntentType.RAG
            if confidence >= self.confidence_threshold:
                confidence = self.confidence_threshold - 0.01

        # Validate dataset_id if analytics
        if intent == IntentType.ANALYTICS and dataset_id:
            valid_ids = {ds.id for ds in data_sources if ds.type == "structured_data"}
            if dataset_id not in valid_ids:
                dataset_id = None

        return ClassificationResult(
            intent=intent,
            confidence=confidence,
            dataset_id=dataset_id,
            reasoning=reasoning,
        )

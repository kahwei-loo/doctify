"""
Query Service for NL-to-Insights

Handles natural language query processing, SQL generation, and response formatting.
Converted from MongoDB to SQLAlchemy Repository pattern.
"""

import json
import logging
import os
import re
import time
from collections import defaultdict
from datetime import datetime, timedelta
from threading import Lock
from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID

import duckdb
import httpx
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.repositories.insights import (
    InsightsDatasetRepository,
    InsightsConversationRepository,
    InsightsQueryRepository,
)
from app.models.insights import (
    ChartType,
    QueryStatus,
    QueryIntent,
    TokenUsage,
    ChartConfig,
    QueryResponse,
    ConversationResponse,
    ConversationListResponse,
    QueryHistoryItem,
    QueryHistoryResponse,
    SchemaDefinition,
)

logger = logging.getLogger(__name__)

# Security: Whitelisted operators and aggregations
ALLOWED_OPERATORS = {"=", "!=", ">", "<", ">=", "<=", "IN", "LIKE"}
ALLOWED_AGGREGATIONS = {"SUM", "COUNT", "AVG", "MIN", "MAX", "COUNT_DISTINCT"}
ALLOWED_SORT_DIRECTIONS = {"ASC", "DESC"}

# Security: Column/table name validation pattern (alphanumeric + underscore + Chinese)
SAFE_IDENTIFIER_PATTERN = re.compile(r'^[\w\u4e00-\u9fff]+$')

# Insights upload directory for path validation
INSIGHTS_UPLOAD_DIR = os.path.join(settings.UPLOAD_DIR, "insights_datasets")

# Rate limiting constants
RATE_LIMIT_REQUESTS_PER_MINUTE = 10  # Max LLM requests per user per minute
RATE_LIMIT_REQUESTS_PER_HOUR = 100   # Max LLM requests per user per hour
RATE_LIMIT_WINDOW_MINUTE = 60        # Window size in seconds for minute limit
RATE_LIMIT_WINDOW_HOUR = 3600        # Window size in seconds for hour limit


class RateLimiter:
    """
    Simple in-memory rate limiter for LLM API calls.

    Security: Prevents abuse and excessive API costs by limiting requests per user.
    Note: For production, consider using Redis for distributed rate limiting.
    """

    def __init__(self):
        self._requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = Lock()

    def _cleanup_old_requests(self, user_id: str, window_seconds: int) -> None:
        """Remove requests older than the window."""
        current_time = time.time()
        cutoff = current_time - window_seconds
        self._requests[user_id] = [
            t for t in self._requests[user_id] if t > cutoff
        ]

    def check_rate_limit(self, user_id: str) -> Tuple[bool, Optional[str]]:
        """
        Check if user is within rate limits.

        Returns: (allowed, error_message)
        """
        with self._lock:
            current_time = time.time()

            # Cleanup requests older than 1 hour
            self._cleanup_old_requests(user_id, RATE_LIMIT_WINDOW_HOUR)

            requests = self._requests[user_id]

            # Check minute limit
            minute_cutoff = current_time - RATE_LIMIT_WINDOW_MINUTE
            minute_requests = sum(1 for t in requests if t > minute_cutoff)
            if minute_requests >= RATE_LIMIT_REQUESTS_PER_MINUTE:
                wait_time = int(RATE_LIMIT_WINDOW_MINUTE - (current_time - min(
                    t for t in requests if t > minute_cutoff
                )))
                return False, f"Rate limit exceeded. Please wait {wait_time} seconds."

            # Check hour limit
            if len(requests) >= RATE_LIMIT_REQUESTS_PER_HOUR:
                return False, "Hourly rate limit exceeded. Please try again later."

            return True, None

    def record_request(self, user_id: str) -> None:
        """Record a new request for rate limiting."""
        with self._lock:
            self._requests[user_id].append(time.time())


# Global rate limiter instance
_rate_limiter = RateLimiter()


# GPT Function definition for query analysis
QUERY_ANALYSIS_FUNCTION = {
    "name": "analyze_query",
    "description": "Analyze user's data query and extract structured intent",
    "parameters": {
        "type": "object",
        "properties": {
            "query_type": {
                "type": "string",
                "enum": ["aggregation", "breakdown", "trend", "comparison", "filter", "list"],
                "description": "Type of query"
            },
            "metrics": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "column": {"type": "string", "description": "Column name in data"},
                        "aggregation": {
                            "type": "string",
                            "enum": ["SUM", "COUNT", "AVG", "MIN", "MAX", "COUNT_DISTINCT"]
                        },
                        "alias": {"type": "string", "description": "Display name for this metric"}
                    },
                    "required": ["column", "aggregation"]
                },
                "description": "Metrics to calculate"
            },
            "dimensions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Columns to group by"
            },
            "time_column": {
                "type": "string",
                "description": "Column name for time filtering (if applicable)"
            },
            "time_range": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": ["relative", "absolute"]},
                    "value": {
                        "type": "string",
                        "description": "For relative: this_month, last_month, this_year, etc."
                    },
                    "start_date": {"type": "string", "description": "ISO date string"},
                    "end_date": {"type": "string", "description": "ISO date string"}
                }
            },
            "filters": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "column": {"type": "string"},
                        "operator": {
                            "type": "string",
                            "enum": ["=", "!=", ">", "<", ">=", "<=", "IN", "LIKE"]
                        },
                        "value": {}
                    }
                }
            },
            "sort": {
                "type": "object",
                "properties": {
                    "column": {"type": "string"},
                    "direction": {"type": "string", "enum": ["ASC", "DESC"]}
                }
            },
            "limit": {"type": "integer"},
            "chart_suggestion": {
                "type": "string",
                "enum": ["metric_card", "bar", "line", "pie", "table"],
                "description": "Suggested chart type for visualization"
            }
        },
        "required": ["query_type"]
    }
}


class QueryService:
    """Service for processing natural language queries"""

    def __init__(self, session: AsyncSession):
        """Initialize with database session."""
        self.session = session
        self.dataset_repo = InsightsDatasetRepository(session)
        self.conversation_repo = InsightsConversationRepository(session)
        self.query_repo = InsightsQueryRepository(session)

    @staticmethod
    def _resolve_time_range(time_range: Dict[str, Any]) -> Tuple[str, str, str]:
        """
        Resolve time range to actual dates
        Returns: (start_date, end_date, description)
        """
        today = datetime.utcnow().date()

        if time_range.get("type") == "absolute":
            return (
                time_range.get("start_date", ""),
                time_range.get("end_date", ""),
                f"{time_range.get('start_date')} to {time_range.get('end_date')}"
            )

        value = time_range.get("value", "").lower()

        if value in ["this_month", "current_month", "这个月", "本月"]:
            start = today.replace(day=1)
            # Get last day of month
            next_month = start.replace(day=28) + timedelta(days=4)
            end = next_month - timedelta(days=next_month.day)
            return str(start), str(end), f"{today.year}年{today.month}月"

        elif value in ["last_month", "上个月", "上月"]:
            first_of_month = today.replace(day=1)
            end = first_of_month - timedelta(days=1)
            start = end.replace(day=1)
            return str(start), str(end), f"{end.year}年{end.month}月"

        elif value in ["this_year", "current_year", "今年", "本年"]:
            start = today.replace(month=1, day=1)
            end = today.replace(month=12, day=31)
            return str(start), str(end), f"{today.year}年"

        elif value in ["last_year", "去年"]:
            last_year = today.year - 1
            start = today.replace(year=last_year, month=1, day=1)
            end = today.replace(year=last_year, month=12, day=31)
            return str(start), str(end), f"{last_year}年"

        elif value in ["this_week", "本周", "这周"]:
            start = today - timedelta(days=today.weekday())
            end = start + timedelta(days=6)
            return str(start), str(end), "本周"

        elif value in ["last_week", "上周"]:
            end = today - timedelta(days=today.weekday() + 1)
            start = end - timedelta(days=6)
            return str(start), str(end), "上周"

        elif value in ["today", "今天"]:
            return str(today), str(today), "今天"

        elif value in ["yesterday", "昨天"]:
            yesterday = today - timedelta(days=1)
            return str(yesterday), str(yesterday), "昨天"

        # Default: no time filter
        return "", "", ""

    @staticmethod
    def _build_prompt(
        user_message: str,
        schema: SchemaDefinition,
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Build GPT prompt with schema and context"""
        prompt_parts = []

        # System instruction
        prompt_parts.append(
            "You are a data analysis assistant. Analyze the user's question and "
            "extract structured query intent. The user may ask questions in Chinese or English. "
            "Map their terminology to the actual column names in the data."
        )

        # Schema information
        prompt_parts.append("\n## Available Data Columns:")
        for col in schema.columns:
            col_info = f"- **{col.name}** ({col.dtype.value})"
            if col.aliases:
                col_info += f" [Aliases: {', '.join(col.aliases)}]"
            if col.description:
                col_info += f" - {col.description}"
            if col.is_metric:
                col_info += f" [METRIC, default agg: {col.default_agg}]"
            if col.is_dimension:
                col_info += " [DIMENSION]"
            prompt_parts.append(col_info)

        # Context from previous queries
        if context and context.get("referenced_entities"):
            refs = context["referenced_entities"]
            prompt_parts.append("\n## Current Context:")
            if refs.get("time"):
                prompt_parts.append(f"- Current time range: {refs['time']}")
            if refs.get("metric"):
                prompt_parts.append(f"- Current metric: {refs['metric']}")
            if refs.get("dimension"):
                prompt_parts.append(f"- Current dimension: {refs['dimension']}")

        # Recent conversation history
        if history and len(history) > 0:
            prompt_parts.append("\n## Recent Conversation:")
            for turn in history[-3:]:
                prompt_parts.append(f"User: {turn.get('user', '')}")
                prompt_parts.append(f"Assistant: {turn.get('assistant', '')[:100]}...")

        # Current question
        prompt_parts.append(f"\n## Current Question:\n{user_message}")

        prompt_parts.append(
            "\n## Instructions:\n"
            "1. Map user's terms to actual column names\n"
            "2. For follow-up questions like '那上个月呢？', inherit context from previous query\n"
            "3. Choose appropriate aggregation based on the question\n"
            "4. Suggest the best chart type for visualization\n"
            "5. If the question is ambiguous, make reasonable assumptions"
        )

        return "\n".join(prompt_parts)

    async def _call_llm(self, prompt: str, user_id: str) -> Tuple[Dict[str, Any], TokenUsage]:
        """
        Call LLM to analyze query intent.

        Security: Rate limited to prevent abuse and excessive API costs.
        """
        # Check rate limit before making the call
        allowed, error_msg = _rate_limiter.check_rate_limit(user_id)
        if not allowed:
            logger.warning(f"Rate limit exceeded for user {user_id}")
            raise ValueError(error_msg)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{settings.OPENAI_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.AI_MODEL,
                        "messages": [
                            {"role": "system", "content": "You are a data analysis assistant."},
                            {"role": "user", "content": prompt}
                        ],
                        "functions": [QUERY_ANALYSIS_FUNCTION],
                        "function_call": {"name": "analyze_query"},
                        "temperature": 0.1
                    }
                )
                response.raise_for_status()
                result = response.json()

                # Record successful request for rate limiting
                _rate_limiter.record_request(user_id)

                # Extract function call result
                message = result["choices"][0]["message"]
                function_call = message.get("function_call", {})
                arguments = json.loads(function_call.get("arguments", "{}"))

                # Token usage
                usage = result.get("usage", {})
                token_usage = TokenUsage(
                    prompt_tokens=usage.get("prompt_tokens", 0),
                    completion_tokens=usage.get("completion_tokens", 0),
                    total_tokens=usage.get("total_tokens", 0)
                )

                return arguments, token_usage

        except ValueError:
            # Re-raise rate limit errors
            raise
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise ValueError(f"Failed to analyze query: {str(e)}")

    @staticmethod
    def _validate_identifier(name: str) -> bool:
        """Validate column/table name to prevent SQL injection"""
        if not name or len(name) > 128:
            return False
        return bool(SAFE_IDENTIFIER_PATTERN.match(name))

    @staticmethod
    def _validate_parquet_path(parquet_path: str) -> bool:
        """Validate parquet path is within allowed directory"""
        try:
            # Normalize and resolve the path
            abs_path = os.path.abspath(parquet_path)
            abs_upload_dir = os.path.abspath(INSIGHTS_UPLOAD_DIR)
            # Check path is within upload directory
            return abs_path.startswith(abs_upload_dir) and os.path.exists(abs_path)
        except Exception:
            return False

    @staticmethod
    def _escape_identifier(name: str) -> str:
        """Escape identifier for safe use in SQL (double quotes escape)"""
        # Replace any double quotes with escaped double quotes
        return name.replace('"', '""')

    def _build_select_clause(self, intent: QueryIntent) -> str:
        """Build SELECT clause with validated columns and aggregations."""
        select_parts = []

        # Add dimensions
        for dim in intent.dimensions:
            if not self._validate_identifier(dim):
                raise ValueError(f"Invalid column name: {dim}")
            select_parts.append(f'"{self._escape_identifier(dim)}"')

        # Add metrics
        for metric in intent.metrics:
            col = metric.get("column", "")
            agg = metric.get("aggregation", "SUM").upper()
            alias = metric.get("alias", col)

            if not self._validate_identifier(col):
                raise ValueError(f"Invalid column name: {col}")
            if agg not in ALLOWED_AGGREGATIONS:
                raise ValueError(f"Invalid aggregation: {agg}")
            if alias and not self._validate_identifier(alias):
                raise ValueError(f"Invalid alias: {alias}")

            escaped_col = self._escape_identifier(col)
            escaped_alias = self._escape_identifier(alias) if alias else escaped_col
            select_parts.append(f'{agg}("{escaped_col}") AS "{escaped_alias}"')

        return ", ".join(select_parts) if select_parts else "*"

    def _build_where_clause(
        self,
        intent: QueryIntent,
        params: List[Any],
        param_counter: List[int]
    ) -> str:
        """Build WHERE clause with parameterized values."""
        def next_param() -> str:
            param_counter[0] += 1
            return f"${param_counter[0]}"

        where_parts = []

        # Time filter
        if intent.time_range:
            time_range_dict = (
                intent.time_range.model_dump() if hasattr(intent.time_range, 'model_dump')
                else intent.time_range
            )
            start_date, end_date, _ = self._resolve_time_range(time_range_dict)
            if start_date and end_date:
                time_col = time_range_dict.get("time_column") if isinstance(time_range_dict, dict) else None
                if time_col:
                    if not self._validate_identifier(time_col):
                        raise ValueError(f"Invalid time column: {time_col}")
                    escaped_time_col = self._escape_identifier(time_col)
                    where_parts.append(
                        f'"{escaped_time_col}" >= {next_param()} AND "{escaped_time_col}" <= {next_param()}'
                    )
                    params.extend([start_date, end_date])

        # Other filters
        for f in intent.filters:
            col = f.get("column", "")
            op = f.get("operator", "=").upper()
            val = f.get("value")

            if not self._validate_identifier(col):
                raise ValueError(f"Invalid column name: {col}")
            if op not in ALLOWED_OPERATORS:
                raise ValueError(f"Invalid operator: {op}")

            escaped_col = self._escape_identifier(col)

            if op == "IN" and isinstance(val, list):
                placeholders = ", ".join([next_param() for _ in val])
                where_parts.append(f'"{escaped_col}" IN ({placeholders})')
                params.extend(val)
            elif op == "LIKE":
                where_parts.append(f'"{escaped_col}" LIKE {next_param()}')
                params.append(f"%{val}%")
            else:
                where_parts.append(f'"{escaped_col}" {op} {next_param()}')
                params.append(val)

        return " AND ".join(where_parts) if where_parts else ""

    def _build_group_order_limit(self, intent: QueryIntent) -> Tuple[str, str, str]:
        """Build GROUP BY, ORDER BY, and LIMIT clauses."""
        # GROUP BY
        group_by = ""
        if intent.dimensions and intent.metrics:
            dims = [f'"{self._escape_identifier(d)}"' for d in intent.dimensions]
            group_by = "GROUP BY " + ", ".join(dims)

        # ORDER BY
        order_by = ""
        if intent.sort:
            col = intent.sort.get("column", "")
            direction = intent.sort.get("direction", "DESC").upper()
            if col:
                if not self._validate_identifier(col):
                    raise ValueError(f"Invalid sort column: {col}")
                if direction not in ALLOWED_SORT_DIRECTIONS:
                    direction = "DESC"
                order_by = f'ORDER BY "{self._escape_identifier(col)}" {direction}'
        elif intent.metrics and intent.dimensions:
            first_metric = intent.metrics[0].get("alias", intent.metrics[0].get("column", ""))
            if first_metric and self._validate_identifier(first_metric):
                order_by = f'ORDER BY "{self._escape_identifier(first_metric)}" DESC'

        # LIMIT
        limit_value = 100
        if intent.limit:
            try:
                limit_value = min(int(intent.limit), 10000)
            except (TypeError, ValueError):
                limit_value = 100

        return group_by, order_by, f"LIMIT {limit_value}"

    def _generate_sql_with_params(
        self,
        intent: QueryIntent,
        parquet_path: str
    ) -> Tuple[str, List[Any]]:
        """
        Generate DuckDB SQL with parameterized queries to prevent SQL injection.
        Uses helper methods for cleaner, maintainable code.
        Returns: (sql_template, parameters)
        """
        params: List[Any] = []
        param_counter = [0]  # Mutable counter for parameter placeholders

        # Validate parquet path
        if not self._validate_parquet_path(parquet_path):
            raise ValueError("Invalid or inaccessible dataset file")

        # Build SELECT clause using helper
        select_clause = self._build_select_clause(intent)

        # FROM clause with parameterized path
        param_counter[0] += 1
        from_clause = f"read_parquet(${param_counter[0]})"
        params.append(parquet_path)

        # Build WHERE clause using helper
        where_clause = self._build_where_clause(intent, params, param_counter)

        # Build GROUP BY, ORDER BY, LIMIT using helper
        group_by, order_by, limit_clause = self._build_group_order_limit(intent)

        # Assemble final SQL
        sql = f"SELECT {select_clause}\nFROM {from_clause}"
        if where_clause:
            sql += f"\nWHERE {where_clause}"
        if group_by:
            sql += f"\n{group_by}"
        if order_by:
            sql += f"\n{order_by}"
        sql += f"\n{limit_clause}"

        return sql, params

    @staticmethod
    def _execute_sql_with_params(
        sql: str,
        params: List[Any]
    ) -> Tuple[List[Dict[str, Any]], int, float]:
        """Execute parameterized SQL using DuckDB"""
        start_time = time.time()

        try:
            conn = duckdb.connect(":memory:")
            # Use parameterized query execution
            result = conn.execute(sql, params).fetchdf()
            conn.close()

            execution_time = (time.time() - start_time) * 1000  # ms

            # Convert to list of dicts
            data = result.to_dict(orient="records")

            # Handle datetime serialization
            for row in data:
                for key, value in row.items():
                    if hasattr(value, 'isoformat'):
                        row[key] = value.isoformat()
                    elif pd.isna(value):
                        row[key] = None

            return data, len(data), execution_time

        except Exception as e:
            logger.error(f"SQL execution failed: {e}")
            raise ValueError(f"Query execution failed: {str(e)}")

    @staticmethod
    def _format_response(
        intent: QueryIntent,
        data: List[Dict[str, Any]],
        schema: SchemaDefinition
    ) -> Tuple[str, Optional[ChartConfig], List[str]]:
        """Format query result into natural language response"""

        if not data:
            return "No data found for your query.", None, []

        # Single value result (aggregation without dimensions)
        if len(data) == 1 and not intent.dimensions:
            row = data[0]
            parts = []
            for key, value in row.items():
                if isinstance(value, (int, float)):
                    # Format numbers
                    if value >= 1000000:
                        formatted = f"{value/1000000:.2f}M"
                    elif value >= 1000:
                        formatted = f"{value/1000:.1f}K"
                    else:
                        formatted = f"{value:,.2f}" if isinstance(value, float) else f"{value:,}"
                    parts.append(f"{key}: {formatted}")

            text = ", ".join(parts)

            # Chart config for metric card
            first_key = list(row.keys())[0]
            chart = ChartConfig(
                type=ChartType.METRIC_CARD,
                config={
                    "value": row[first_key],
                    "label": first_key,
                    "format": "number"
                }
            )

            return text, chart, []

        # Multiple rows with dimensions
        text_parts = []
        if intent.dimensions and intent.metrics:
            dim = intent.dimensions[0]
            metric_col = intent.metrics[0].get("alias", intent.metrics[0].get("column", ""))

            for i, row in enumerate(data[:5]):  # Top 5
                dim_val = row.get(dim, "Unknown")
                metric_val = row.get(metric_col, 0)
                if isinstance(metric_val, (int, float)):
                    metric_val = f"{metric_val:,.2f}" if isinstance(metric_val, float) else f"{metric_val:,}"
                text_parts.append(f"{i+1}. {dim_val}: {metric_val}")

            text = f"Top results by {dim}:\n" + "\n".join(text_parts)

            # Chart config
            chart_type = ChartType(intent.chart_suggestion) if intent.chart_suggestion else ChartType.BAR
            chart = ChartConfig(
                type=chart_type,
                config={
                    "xField": dim,
                    "yField": metric_col,
                    "data": data[:20]  # Limit chart data
                }
            )

            # Generate insights
            insights = []
            if len(data) > 1:
                top_item = data[0]
                total = sum(row.get(metric_col, 0) for row in data if isinstance(row.get(metric_col), (int, float)))
                if total > 0:
                    top_value = top_item.get(metric_col, 0)
                    if isinstance(top_value, (int, float)):
                        pct = (top_value / total) * 100
                        insights.append(f"{top_item.get(dim)} accounts for {pct:.1f}% of total")

            return text, chart, insights

        # Default table display
        text = f"Found {len(data)} rows"
        chart = ChartConfig(
            type=ChartType.TABLE,
            config={"data": data[:50]}
        )

        return text, chart, []

    async def create_conversation(
        self,
        user_id: UUID,
        dataset_id: UUID,
        title: Optional[str] = None
    ) -> ConversationResponse:
        """Create a new conversation"""
        # Verify dataset exists and belongs to user
        dataset = await self.dataset_repo.get_by_id_and_user(dataset_id, user_id)
        if not dataset:
            raise ValueError("Dataset not found")

        # Create conversation
        conversation = await self.conversation_repo.create({
            "user_id": user_id,
            "dataset_id": dataset_id,
            "title": title or f"Conversation on {dataset.name}",
            "context": {
                "last_query_intent": None,
                "referenced_entities": {}
            }
        })

        return ConversationResponse(
            id=str(conversation.id),
            user_id=str(conversation.user_id),
            dataset_id=str(conversation.dataset_id),
            title=conversation.title,
            context=conversation.context or {},
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        )

    async def list_conversations(
        self,
        user_id: UUID,
        dataset_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20
    ) -> ConversationListResponse:
        """List user's conversations"""
        if dataset_id:
            conversations = await self.conversation_repo.get_by_dataset(
                dataset_id=dataset_id,
                user_id=user_id
            )
        else:
            conversations = await self.conversation_repo.get_by_user(user_id)

        # Apply pagination manually (could be optimized with repo method)
        total = len(conversations)
        conversations = conversations[skip:skip + limit]

        conversation_responses = [
            ConversationResponse(
                id=str(conv.id),
                user_id=str(conv.user_id),
                dataset_id=str(conv.dataset_id),
                title=conv.title,
                context=conv.context or {},
                created_at=conv.created_at,
                updated_at=conv.updated_at
            )
            for conv in conversations
        ]

        return ConversationListResponse(conversations=conversation_responses, total=total)

    async def get_conversation(
        self,
        conversation_id: UUID,
        user_id: UUID
    ) -> Optional[ConversationResponse]:
        """Get a single conversation by ID"""
        conversation = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conversation:
            return None

        return ConversationResponse(
            id=str(conversation.id),
            user_id=str(conversation.user_id),
            dataset_id=str(conversation.dataset_id),
            title=conversation.title,
            context=conversation.context or {},
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        )

    async def process_query(
        self,
        conversation_id: UUID,
        user_id: UUID,
        message: str,
        language: str = "en"
    ) -> QueryResponse:
        """Process a natural language query"""
        # Get conversation and verify access
        conversation = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conversation:
            raise ValueError("Conversation not found")

        # Get dataset
        dataset = await self.dataset_repo.get_by_id(conversation.dataset_id)
        if not dataset:
            raise ValueError("Dataset not found")

        schema = SchemaDefinition(**dataset.schema_definition)
        parquet_path = dataset.file_info.get("storage_path", "")

        # Get conversation context
        context = conversation.context or {}

        # Get recent query history
        recent_queries = await self.query_repo.get_by_conversation(conversation_id, limit=3)

        history = []
        for q in reversed(recent_queries):  # Reverse to get chronological order
            history.append({
                "user": q.user_input or "",
                "assistant": q.response_text or ""
            })

        # Create query record
        query_record = await self.query_repo.create({
            "conversation_id": conversation_id,
            "user_input": message,
            "language": language,
            "status": QueryStatus.PROCESSING.value
        })
        query_id = query_record.id

        try:
            # Build prompt and call LLM (rate limited per user)
            prompt = self._build_prompt(message, schema, context, history)
            intent_dict, token_usage = await self._call_llm(prompt, str(user_id))

            # Resolve references from context (for follow-up questions)
            if not intent_dict.get("metrics") and context.get("last_query_intent"):
                last_intent = context["last_query_intent"]
                if last_intent.get("metrics"):
                    intent_dict["metrics"] = last_intent["metrics"]
                if not intent_dict.get("dimensions") and last_intent.get("dimensions"):
                    intent_dict["dimensions"] = last_intent["dimensions"]

            intent = QueryIntent(**intent_dict)

            # Generate and execute SQL with parameterized queries (SQL injection safe)
            sql, params = self._generate_sql_with_params(intent, parquet_path)
            logger.info(f"Generated SQL: {sql} with {len(params)} params")

            data, row_count, exec_time = self._execute_sql_with_params(sql, params)

            # Format response
            response_text, chart, insights = self._format_response(intent, data, schema)

            # Update query record
            await self.query_repo.update(query_id, {
                "parsed_intent": intent.model_dump(),
                "generated_sql": sql,
                "result": {
                    "data": data,
                    "row_count": row_count,
                    "execution_time_ms": exec_time
                },
                "response_text": response_text,
                "response_chart": chart.model_dump() if chart else None,
                "response_insights": insights,
                "token_usage": token_usage.model_dump(),
                "status": QueryStatus.COMPLETED.value,
                "execution_time_ms": int(exec_time)
            })

            # Update conversation context
            new_context = {
                "last_query_intent": intent.model_dump(),
                "referenced_entities": {}
            }
            if intent.time_range:
                time_range_dict = (
                    intent.time_range.model_dump() if hasattr(intent.time_range, 'model_dump')
                    else intent.time_range
                )
                _, _, desc = self._resolve_time_range(time_range_dict)
                new_context["referenced_entities"]["time"] = desc
            if intent.metrics:
                new_context["referenced_entities"]["metric"] = intent.metrics[0].get(
                    "alias", intent.metrics[0].get("column", "")
                )
            if intent.dimensions:
                new_context["referenced_entities"]["dimension"] = intent.dimensions[0]

            await self.conversation_repo.update(conversation_id, {
                "context": new_context
            })

            return QueryResponse(
                id=str(query_id),
                conversation_id=str(conversation_id),
                user_input=message,
                response_text=response_text,
                response_chart=chart,
                response_insights=insights if insights else None,
                result={"data": data[:100], "row_count": row_count},  # Limit response data
                generated_sql=sql,  # Include for debugging
                status=QueryStatus.COMPLETED,
                execution_time_ms=int(exec_time),
                created_at=query_record.created_at
            )

        except Exception as e:
            logger.error(f"Query processing failed: {e}")
            await self.query_repo.update(query_id, {
                "status": QueryStatus.ERROR.value,
                "error_message": str(e)
            })
            raise

    async def get_query_history(
        self,
        conversation_id: UUID,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> QueryHistoryResponse:
        """Get query history for a conversation"""
        # Verify access
        conversation = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conversation:
            raise ValueError("Conversation not found")

        queries = await self.query_repo.get_by_conversation(conversation_id, limit=limit + skip)

        # Apply pagination (skip) manually and reverse for chronological order
        queries = list(reversed(queries))[skip:skip + limit]

        query_items = []
        for q in queries:
            chart = None
            if q.response_chart:
                chart = ChartConfig(**q.response_chart)

            query_items.append(QueryHistoryItem(
                id=str(q.id),
                user_input=q.user_input,
                response_text=q.response_text,
                response_chart=chart,
                status=QueryStatus(q.status),
                created_at=q.created_at
            ))

        total = len(query_items)
        return QueryHistoryResponse(queries=query_items, total=total)

    async def delete_conversation(
        self,
        conversation_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete a conversation and all its queries"""
        # Verify access
        conversation = await self.conversation_repo.get_by_id_and_user(conversation_id, user_id)
        if not conversation:
            raise ValueError("Conversation not found")

        # Delete all queries in the conversation
        await self.query_repo.delete_by_conversation(conversation_id)

        # Delete the conversation
        await self.conversation_repo.delete(conversation_id)

        return True

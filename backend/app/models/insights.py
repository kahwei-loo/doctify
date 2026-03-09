"""
NL-to-Insights Pydantic Models

Request/Response models for the natural language to insights feature.
"""

from __future__ import annotations


from datetime import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

# ============================================
# Enums
# ============================================


class DataType(str, Enum):
    """Data type for columns."""

    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    DATETIME = "datetime"
    BOOLEAN = "boolean"


class AggregationType(str, Enum):
    """Aggregation types for metrics."""

    SUM = "SUM"
    COUNT = "COUNT"
    AVG = "AVG"
    MIN = "MIN"
    MAX = "MAX"
    COUNT_DISTINCT = "COUNT_DISTINCT"


class ChartType(str, Enum):
    """Chart types for visualization."""

    METRIC_CARD = "metric_card"
    BAR = "bar"
    LINE = "line"
    PIE = "pie"
    TABLE = "table"


class DatasetStatus(str, Enum):
    """Dataset processing status."""

    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class QueryStatus(str, Enum):
    """Query execution status."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


# ============================================
# Schema Definition Models
# ============================================


class ColumnDefinition(BaseModel):
    """Column definition with semantic information."""

    name: str
    dtype: DataType
    aliases: List[str] = []
    description: Optional[str] = None
    is_metric: bool = False
    is_dimension: bool = False
    default_agg: Optional[AggregationType] = None
    format: Optional[str] = None  # currency_myr, percentage, etc.
    sample_values: List[Any] = []
    unique_values: Optional[List[Any]] = None  # For categorical columns


class SchemaDefinition(BaseModel):
    """Complete schema definition for a dataset."""

    columns: List[ColumnDefinition]


# ============================================
# Dataset API Models
# ============================================


class DatasetFileInfo(BaseModel):
    """File information for uploaded dataset."""

    original_name: str
    storage_path: str
    size_bytes: int
    row_count: int
    uploaded_at: datetime


class DatasetCreate(BaseModel):
    """Request model for creating a dataset."""

    name: str = Field(..., min_length=1, max_length=100, description="Dataset name")
    description: Optional[str] = Field(
        None, max_length=500, description="Dataset description"
    )


class DatasetResponse(BaseModel):
    """Response model for dataset."""

    id: str = Field(..., description="Dataset UUID")
    user_id: str = Field(..., description="Owner user UUID")
    name: str = Field(..., description="Dataset name")
    description: Optional[str] = Field(None, description="Dataset description")
    file_info: DatasetFileInfo = Field(..., description="File information")
    schema_definition: SchemaDefinition = Field(..., description="Column schema")
    status: DatasetStatus = Field(..., description="Processing status")
    row_count: Optional[int] = Field(None, description="Number of rows")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class DatasetListResponse(BaseModel):
    """Response model for listing datasets."""

    datasets: List[DatasetResponse]
    total: int


class DatasetPreviewResponse(BaseModel):
    """Response model for data preview."""

    columns: List[str]
    rows: List[List[Any]]
    total_rows: int


# ============================================
# Schema Update Models
# ============================================


class ColumnUpdate(BaseModel):
    """Request model for updating column definition."""

    name: str
    aliases: List[str] = []
    description: Optional[str] = None
    is_metric: bool = False
    is_dimension: bool = False
    default_agg: Optional[AggregationType] = None


class SchemaUpdateRequest(BaseModel):
    """Request model for updating schema."""

    columns: List[ColumnUpdate]


# ============================================
# Conversation Models
# ============================================


class ConversationContext(BaseModel):
    """Context for multi-turn conversations."""

    last_query_intent: Optional[Dict[str, Any]] = None
    referenced_entities: Dict[str, Any] = {}


class ConversationCreate(BaseModel):
    """Request model for creating a conversation."""

    dataset_id: str = Field(..., description="Dataset UUID to query")
    title: Optional[str] = Field(None, max_length=255, description="Conversation title")


class ConversationResponse(BaseModel):
    """Response model for conversation."""

    id: str = Field(..., description="Conversation UUID")
    user_id: str = Field(..., description="Owner user UUID")
    dataset_id: str = Field(..., description="Dataset UUID")
    title: Optional[str] = Field(None, description="Conversation title")
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Conversation context"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class ConversationListResponse(BaseModel):
    """Response model for listing conversations."""

    conversations: List[ConversationResponse]
    total: int


# ============================================
# Query Models
# ============================================


class QueryRequest(BaseModel):
    """Request model for sending a query."""

    message: str = Field(
        ..., min_length=1, max_length=1000, description="Natural language query"
    )
    language: str = Field("en", description="Query language (en, zh)")


class ChartConfig(BaseModel):
    """Chart configuration for visualization."""

    type: ChartType
    config: Dict[str, Any] = {}
    data: Optional[List[Dict[str, Any]]] = None


class QueryIntent(BaseModel):
    """Parsed query intent."""

    query_type: str  # aggregation, breakdown, trend, comparison
    metrics: List[Dict[str, Any]] = []
    dimensions: List[str] = []
    time_range: Optional[Dict[str, Any]] = None
    filters: List[Dict[str, Any]] = []
    sort: Optional[Dict[str, str]] = None
    limit: Optional[int] = None
    chart_suggestion: Optional[ChartType] = None


class TokenUsage(BaseModel):
    """Token usage for LLM calls."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class QueryResponse(BaseModel):
    """Response model for a query."""

    id: str = Field(..., description="Query UUID")
    conversation_id: str = Field(..., description="Conversation UUID")
    user_input: str = Field(..., description="Original user query")
    response_text: Optional[str] = Field(None, description="Natural language response")
    response_chart: Optional[ChartConfig] = Field(
        None, description="Chart configuration"
    )
    response_insights: Optional[List[str]] = Field(
        None, description="Generated insights"
    )
    result: Optional[Dict[str, Any]] = Field(None, description="Query result data")
    generated_sql: Optional[str] = Field(None, description="Generated SQL (debug mode)")
    status: QueryStatus = Field(..., description="Query status")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    execution_time_ms: Optional[int] = Field(None, description="Query execution time")
    created_at: datetime = Field(..., description="Creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class QueryHistoryItem(BaseModel):
    """Single item in query history."""

    id: str
    user_input: str
    response_text: Optional[str]
    response_chart: Optional[ChartConfig] = None
    status: QueryStatus
    created_at: datetime


class QueryHistoryResponse(BaseModel):
    """Response model for query history."""

    queries: List[QueryHistoryItem]
    total: int


# ============================================
# Schema Inference Models
# ============================================


class ColumnSuggestion(BaseModel):
    """AI-suggested column definition."""

    name: str
    inferred_type: DataType
    suggested_aliases: List[str] = []
    suggested_description: str = ""
    is_likely_metric: bool = False
    is_likely_dimension: bool = False
    suggested_agg: Optional[AggregationType] = None
    confidence: float = 0.0


class SchemaInferenceResponse(BaseModel):
    """Response model for schema inference."""

    suggestions: List[ColumnSuggestion]

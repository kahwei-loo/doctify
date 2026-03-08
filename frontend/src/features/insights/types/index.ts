/**
 * TypeScript Types for NL-to-Insights Feature
 */

// ============================================
// Enums
// ============================================

export type DataType = "string" | "integer" | "float" | "datetime" | "boolean";

export type AggregationType = "SUM" | "COUNT" | "AVG" | "MIN" | "MAX" | "COUNT_DISTINCT";

export type ChartType = "metric_card" | "bar" | "line" | "pie" | "table";

export type DatasetStatus = "pending" | "processing" | "ready" | "error";

export type QueryStatus = "pending" | "processing" | "completed" | "error";

// ============================================
// Schema Definition Types
// ============================================

export interface ColumnDefinition {
  name: string;
  dtype: DataType;
  aliases: string[];
  description?: string;
  is_metric: boolean;
  is_dimension: boolean;
  default_agg?: AggregationType;
  format?: string;
  sample_values: any[];
  unique_values?: any[];
}

export interface SchemaDefinition {
  columns: ColumnDefinition[];
}

// ============================================
// Dataset Types
// ============================================

export interface DatasetFileInfo {
  original_name: string;
  storage_path: string;
  size_bytes: number;
  row_count: number;
  uploaded_at: string;
}

export interface Dataset {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  file_info: DatasetFileInfo;
  schema_definition: SchemaDefinition;
  status: DatasetStatus;
  row_count?: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DatasetListResponse {
  datasets: Dataset[];
  total: number;
}

export interface DatasetPreviewResponse {
  columns: string[];
  rows: any[][];
  total_rows: number;
}

export interface DatasetUploadResponse {
  dataset_id: string;
  status: DatasetStatus;
  schema_preview: SchemaDefinition;
  message: string;
}

// ============================================
// Schema Update Types
// ============================================

export interface ColumnUpdate {
  name: string;
  aliases?: string[];
  description?: string;
  is_metric?: boolean;
  is_dimension?: boolean;
  default_agg?: AggregationType;
}

export interface SchemaUpdateRequest {
  columns: ColumnUpdate[];
}

// ============================================
// Conversation Types
// ============================================

export interface ConversationContext {
  last_query_intent?: Record<string, any>;
  referenced_entities?: Record<string, any>;
}

export interface Conversation {
  id: string;
  user_id: string;
  dataset_id: string;
  title?: string;
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface ConversationCreateRequest {
  dataset_id: string;
  title?: string;
}

// ============================================
// Query Types
// ============================================

export interface QueryRequest {
  message: string;
  language?: string; // 'en' | 'zh'
}

export interface ChartConfig {
  type: ChartType;
  config: Record<string, any>;
  data?: Record<string, any>[];
}

export interface QueryIntent {
  query_type: string;
  metrics: Record<string, any>[];
  dimensions: string[];
  time_range?: Record<string, any>;
  filters: Record<string, any>[];
  sort?: Record<string, string>;
  limit?: number;
  chart_suggestion?: ChartType;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface QueryResponse {
  id: string;
  conversation_id: string;
  user_input: string;
  response_text?: string;
  response_chart?: ChartConfig;
  response_insights?: string[];
  result?: Record<string, any>;
  generated_sql?: string;
  status: QueryStatus;
  error_message?: string;
  execution_time_ms?: number;
  created_at: string;
}

export interface QueryHistoryItem {
  id: string;
  user_input: string;
  response_text?: string;
  response_chart?: ChartConfig;
  status: QueryStatus;
  created_at: string;
}

export interface QueryHistoryResponse {
  queries: QueryHistoryItem[];
  total: number;
}

// ============================================
// Schema Inference Types
// ============================================

export interface ColumnSuggestion {
  name: string;
  inferred_type: DataType;
  suggested_aliases: string[];
  suggested_description: string;
  is_likely_metric: boolean;
  is_likely_dimension: boolean;
  suggested_agg?: AggregationType;
  confidence: number;
}

export interface SchemaInferenceResponse {
  suggestions: ColumnSuggestion[];
}

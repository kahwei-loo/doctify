/**
 * Knowledge Base Types
 *
 * Type definitions for knowledge base management including data sources,
 * embeddings, and RAG operations.
 */

export type KnowledgeBaseStatus = "active" | "inactive" | "processing";
export type DataSourceType = "uploaded_docs" | "website" | "text" | "qa_pairs" | "structured_data";
export type DataSourceStatus = "active" | "syncing" | "error" | "paused";
export type EmbeddingStatus = "pending" | "processing" | "completed" | "failed";
export type ChunkStrategy = "fixed" | "semantic" | "recursive";
export type SearchMode = "semantic" | "keyword" | "hybrid";

export interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  status: KnowledgeBaseStatus;
  config: KnowledgeBaseConfig;
  created_at: string;
  updated_at: string;
  user_id: string;
  data_source_count?: number;
  document_count?: number;
  embedding_count?: number;
}

export interface KnowledgeBaseConfig {
  embedding_model: "text-embedding-3-small" | "text-embedding-3-large";
  chunk_size: 512 | 1024 | 2048;
  chunk_overlap: 0 | 128 | 256;
  chunk_strategy?: ChunkStrategy;
}

export interface DataSource {
  id: string;
  knowledge_base_id: string;
  type: DataSourceType;
  name: string;
  status: DataSourceStatus;
  config: DataSourceConfig;
  created_at: string;
  updated_at: string;
  last_synced_at?: string;
  error_message?: string;
  document_count?: number;
  embedding_count?: number;
}

export interface DocumentMeta {
  id: string;
  filename: string;
  size: number;
  type: string;
}

export interface DataSourceConfig {
  // For uploaded_docs
  document_ids?: string[];
  documents?: DocumentMeta[];

  // For website
  url?: string;
  max_depth?: number;
  include_patterns?: string[];
  exclude_patterns?: string[];
  pages_crawled?: number;
  total_pages?: number;

  // For text
  content?: string;

  // For qa_pairs
  qa_pairs?: QAPair[];

  // For structured_data
  dataset_id?: string;
  file_info?: {
    filename: string;
    size: number;
    row_count: number;
    column_count: number;
  };
  schema_definition?: SchemaDefinition;
  parquet_path?: string;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
}

// Structured Data (Analytics) types
export interface ColumnDefinition {
  name: string;
  dtype: string;
  aliases?: string[];
  description?: string;
  is_metric?: boolean;
  is_dimension?: boolean;
  default_agg?: string;
  sample_values?: string[];
  unique_values?: number;
}

export interface SchemaDefinition {
  columns: ColumnDefinition[];
}

export type UnifiedIntentType = "rag" | "analytics" | "ambiguous";

export interface UnifiedQueryRequest {
  query: string;
  kb_id: string;
  conversation_id?: string;
  search_mode?: SearchMode;
  stream?: boolean;
}

export interface AnalyticsResponse {
  sql: string;
  data: Record<string, unknown>[];
  chart_type?: string;
  chart_config?: Record<string, unknown>;
  insights_text?: string;
  dataset_id?: string;
  needs_conversation?: boolean;
}

export interface UnifiedQueryResponse {
  id: string;
  intent_type: UnifiedIntentType;
  confidence: number;
  rag_response?: {
    answer: string;
    sources: Array<{
      chunk_text: string;
      document_id: string;
      document_name: string;
      similarity_score: number;
    }>;
    groundedness_score?: number;
  };
  analytics_response?: AnalyticsResponse;
  created_at: string;
}

export interface Embedding {
  id: string;
  document_id?: string;
  data_source_id: string;
  chunk_index: number;
  text_content: string; // Backend returns text_content (mapped from chunk_text)
  metadata?: Record<string, any>;
  created_at: string;
}

export interface KnowledgeBaseStats {
  total_knowledge_bases: number;
  total_data_sources: number;
  total_documents: number;
  total_embeddings: number;
  total_structured_datasets?: number;
}

export interface SingleKBStats {
  data_source_count: number;
  document_count: number;
  embedding_count: number;
  structured_data_count?: number;
}

export interface TestQueryRequest {
  query: string;
  top_k?: number;
}

export interface TestQueryResult {
  text: string;
  similarity: number;
  source_name: string;
  source_type: DataSourceType;
  metadata?: Record<string, any>;
}

export interface TestQueryResponse {
  success: boolean;
  data: {
    results: TestQueryResult[];
    query_embedding_generated: boolean;
  };
  timestamp: string;
}

export interface KnowledgeBaseCreateRequest {
  name: string;
  description?: string;
  config?: Partial<KnowledgeBaseConfig>;
}

export interface KnowledgeBaseUpdateRequest {
  name?: string;
  description?: string;
  config?: Partial<KnowledgeBaseConfig>;
}

export interface DataSourceCreateRequest {
  knowledge_base_id: string;
  type: DataSourceType;
  name: string;
  config: DataSourceConfig;
}

export interface CrawlStatusResponse {
  success: boolean;
  data: {
    status: DataSourceStatus;
    pages_crawled: number;
    total_pages: number;
    error_message?: string;
  };
  timestamp: string;
}

export interface GenerateEmbeddingsRequest {
  data_source_id: string;
}

export interface GenerateEmbeddingsResponse {
  success: boolean;
  data: {
    task_id: string;
    status: "queued" | "processing";
  };
  message: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface KnowledgeBaseListResponse {
  success: boolean;
  data: KnowledgeBase[];
  timestamp: string;
}

export interface DataSourceListResponse {
  success: boolean;
  data: DataSource[];
  timestamp: string;
}

export interface EmbeddingListResponse {
  success: boolean;
  data: Embedding[];
  pagination: PaginationMeta;
  timestamp: string;
}

export interface WebSocketEmbeddingUpdate {
  type: "embedding.progress" | "embedding.completed" | "embedding.failed";
  data: {
    data_source_id: string;
    processed: number;
    total: number;
    status: EmbeddingStatus;
    error?: string;
  };
  timestamp: string;
}

export interface WebSocketCrawlUpdate {
  type: "crawl.progress" | "crawl.completed" | "crawl.failed";
  data: {
    data_source_id: string;
    pages_crawled: number;
    total_pages: number;
    status: DataSourceStatus;
    error?: string;
  };
  timestamp: string;
}

export interface KnowledgeBaseFilters {
  status?: KnowledgeBaseStatus;
  search?: string;
}

export interface KnowledgeBaseState {
  knowledgeBases: KnowledgeBase[];
  currentKnowledgeBase: KnowledgeBase | null;
  dataSources: DataSource[];
  embeddings: Embedding[];
  stats: KnowledgeBaseStats | null;
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  filters: KnowledgeBaseFilters;
}

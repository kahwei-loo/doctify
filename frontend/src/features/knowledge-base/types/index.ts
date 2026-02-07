/**
 * Knowledge Base Types
 *
 * Type definitions for knowledge base management including data sources,
 * embeddings, and RAG operations.
 */

export type KnowledgeBaseStatus = 'active' | 'inactive' | 'processing';
export type DataSourceType = 'uploaded_docs' | 'website' | 'text' | 'qa_pairs';
export type DataSourceStatus = 'active' | 'syncing' | 'error' | 'paused';
export type EmbeddingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ChunkStrategy = 'fixed' | 'semantic' | 'recursive';
export type SearchMode = 'semantic' | 'keyword' | 'hybrid';

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
  embedding_model: 'text-embedding-3-small' | 'text-embedding-3-large';
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

export interface DataSourceConfig {
  // For uploaded_docs
  document_ids?: string[];

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
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
}

export interface Embedding {
  id: string;
  data_source_id: string;
  text: string;
  embedding_vector?: number[]; // Usually not returned in list views
  status: EmbeddingStatus;
  metadata?: Record<string, any>;
  created_at: string;
  error_message?: string;
}

export interface KnowledgeBaseStats {
  total_knowledge_bases: number;
  total_data_sources: number;
  total_documents: number;
  total_embeddings: number;
}

export interface SingleKBStats {
  data_source_count: number;
  document_count: number;
  embedding_count: number;
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
    status: 'queued' | 'processing';
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
  type: 'embedding.progress' | 'embedding.completed' | 'embedding.failed';
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
  type: 'crawl.progress' | 'crawl.completed' | 'crawl.failed';
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

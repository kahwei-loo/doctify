/**
 * Mock Data Service for Knowledge Base
 *
 * Provides API-compatible mock data for frontend development.
 * Toggle with VITE_USE_MOCK_KB environment variable.
 */

import type {
  KnowledgeBase,
  KnowledgeBaseStats,
  KnowledgeBaseListResponse,
  KnowledgeBaseCreateRequest,
  KnowledgeBaseUpdateRequest,
  DataSource,
  DataSourceListResponse,
  DataSourceCreateRequest,
  Embedding,
  EmbeddingListResponse,
  TestQueryRequest,
  TestQueryResponse,
  GenerateEmbeddingsResponse,
  CrawlStatusResponse,
  PaginationParams,
} from '../types';

// Mock Knowledge Bases
const mockKnowledgeBases: KnowledgeBase[] = [
  {
    id: 'kb-1',
    name: 'Product Documentation',
    description: 'Technical documentation for our main product',
    status: 'active',
    config: {
      embedding_model: 'text-embedding-3-small',
      chunk_size: 1024,
      chunk_overlap: 128,
    },
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: 'user-1',
    data_source_count: 4,
    document_count: 24,
    embedding_count: 156,
  },
  {
    id: 'kb-2',
    name: 'Customer Support KB',
    description: 'FAQ and support articles',
    status: 'active',
    config: {
      embedding_model: 'text-embedding-3-small',
      chunk_size: 512,
      chunk_overlap: 0,
    },
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    user_id: 'user-1',
    data_source_count: 2,
    document_count: 48,
    embedding_count: 312,
  },
  {
    id: 'kb-3',
    name: 'Internal Wiki',
    description: 'Company internal knowledge base',
    status: 'processing',
    config: {
      embedding_model: 'text-embedding-3-large',
      chunk_size: 2048,
      chunk_overlap: 256,
    },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    user_id: 'user-1',
    data_source_count: 1,
    document_count: 12,
    embedding_count: 0,
  },
];

// Mock Data Sources
const mockDataSources: DataSource[] = [
  {
    id: 'ds-1',
    knowledge_base_id: 'kb-1',
    type: 'uploaded_docs',
    name: 'API Reference PDFs',
    status: 'active',
    config: {
      document_ids: ['doc-1', 'doc-2', 'doc-3'],
    },
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    last_synced_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    document_count: 3,
    embedding_count: 45,
  },
  {
    id: 'ds-2',
    knowledge_base_id: 'kb-1',
    type: 'website',
    name: 'Documentation Website',
    status: 'active',
    config: {
      url: 'https://docs.example.com',
      max_depth: 2,
      include_patterns: ['/api/*', '/guides/*'],
      exclude_patterns: ['/changelog'],
      pages_crawled: 50,
      total_pages: 50,
    },
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    last_synced_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    document_count: 50,
    embedding_count: 234,
  },
  {
    id: 'ds-3',
    knowledge_base_id: 'kb-2',
    type: 'qa_pairs',
    name: 'Common Questions',
    status: 'active',
    config: {
      qa_pairs: [
        {
          id: 'qa-1',
          question: 'How do I reset my password?',
          answer: 'Click on "Forgot Password" on the login page and follow the instructions sent to your email.',
        },
        {
          id: 'qa-2',
          question: 'What payment methods do you accept?',
          answer: 'We accept credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers.',
        },
      ],
    },
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    last_synced_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    document_count: 2,
    embedding_count: 4,
  },
  {
    id: 'ds-4',
    knowledge_base_id: 'kb-1',
    type: 'structured_data',
    name: 'Sales Data 2024',
    status: 'active',
    config: {
      file_info: {
        filename: 'sales_data_2024.csv',
        size: 2457600,
        row_count: 15230,
        column_count: 6,
      },
      schema_definition: {
        columns: [
          { name: 'date', dtype: 'datetime', is_dimension: true, description: 'Transaction date' },
          { name: 'product_name', dtype: 'string', is_dimension: true, description: 'Product name' },
          { name: 'revenue', dtype: 'float64', is_metric: true, default_agg: 'sum', description: 'Revenue in USD' },
          { name: 'quantity', dtype: 'int64', is_metric: true, default_agg: 'sum', description: 'Units sold' },
          { name: 'region', dtype: 'string', is_dimension: true, description: 'Sales region' },
          { name: 'category', dtype: 'string', is_dimension: true, description: 'Product category' },
        ],
      },
    },
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    last_synced_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    document_count: 0,
    embedding_count: 0,
  },
];

// Mock Embeddings
const mockEmbeddings: Embedding[] = Array.from({ length: 20 }, (_, i) => ({
  id: `emb-${i + 1}`,
  data_source_id: i < 10 ? 'ds-1' : 'ds-2',
  text: `This is sample embedded text chunk ${i + 1}. It contains information that would be searchable via vector similarity...`,
  status: 'completed',
  metadata: {
    page: Math.floor(i / 5) + 1,
    chunk_index: i % 5,
  },
  created_at: new Date(Date.now() - (20 - i) * 60 * 60 * 1000).toISOString(),
}));

// Mock Stats
const mockStats: KnowledgeBaseStats = {
  total_knowledge_bases: 3,
  total_data_sources: 7,
  total_documents: 84,
  total_embeddings: 468,
  total_structured_datasets: 1,
};

// API-compatible mock functions
export const mockKnowledgeBaseApi = {
  async getStats(): Promise<{ data: KnowledgeBaseStats }> {
    await delay(300);
    return { data: mockStats };
  },

  async listKnowledgeBases(): Promise<KnowledgeBaseListResponse> {
    await delay(400);
    return {
      success: true,
      data: mockKnowledgeBases,
      timestamp: new Date().toISOString(),
    };
  },

  async getKnowledgeBase(id: string): Promise<{ data: KnowledgeBase }> {
    await delay(300);
    const kb = mockKnowledgeBases.find((k) => k.id === id);
    if (!kb) throw new Error('Knowledge Base not found');
    return { data: kb };
  },

  async createKnowledgeBase(
    request: KnowledgeBaseCreateRequest
  ): Promise<{ data: KnowledgeBase }> {
    await delay(500);
    const newKb: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name: request.name,
      description: request.description,
      status: 'active',
      config: {
        embedding_model: request.config?.embedding_model || 'text-embedding-3-small',
        chunk_size: request.config?.chunk_size || 1024,
        chunk_overlap: request.config?.chunk_overlap || 128,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user-1',
      data_source_count: 0,
      document_count: 0,
      embedding_count: 0,
    };
    mockKnowledgeBases.push(newKb);
    return { data: newKb };
  },

  async updateKnowledgeBase(
    id: string,
    request: KnowledgeBaseUpdateRequest
  ): Promise<{ data: KnowledgeBase }> {
    await delay(400);
    const kb = mockKnowledgeBases.find((k) => k.id === id);
    if (!kb) throw new Error('Knowledge Base not found');

    if (request.name) kb.name = request.name;
    if (request.description !== undefined) kb.description = request.description;
    if (request.config) kb.config = { ...kb.config, ...request.config };
    kb.updated_at = new Date().toISOString();

    return { data: kb };
  },

  async deleteKnowledgeBase(id: string): Promise<{ success: boolean }> {
    await delay(400);
    const index = mockKnowledgeBases.findIndex((k) => k.id === id);
    if (index === -1) throw new Error('Knowledge Base not found');
    mockKnowledgeBases.splice(index, 1);
    return { success: true };
  },

  async listDataSources(kbId: string): Promise<DataSourceListResponse> {
    await delay(300);
    const sources = mockDataSources.filter((ds) => ds.knowledge_base_id === kbId);
    return {
      success: true,
      data: sources,
      timestamp: new Date().toISOString(),
    };
  },

  async createDataSource(request: DataSourceCreateRequest): Promise<{ data: DataSource }> {
    await delay(500);
    const newDs: DataSource = {
      id: `ds-${Date.now()}`,
      knowledge_base_id: request.knowledge_base_id,
      type: request.type,
      name: request.name,
      status: request.type === 'website' ? 'syncing' : 'active',
      config: request.config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_count: 0,
      embedding_count: 0,
    };
    mockDataSources.push(newDs);
    return { data: newDs };
  },

  async updateDataSource(
    id: string,
    updates: Partial<DataSource>
  ): Promise<{ data: DataSource }> {
    await delay(400);
    const ds = mockDataSources.find((d) => d.id === id);
    if (!ds) throw new Error('Data Source not found');

    if (updates.name) ds.name = updates.name;
    if (updates.config) ds.config = { ...ds.config, ...updates.config };
    ds.updated_at = new Date().toISOString();

    return { data: { ...ds } };
  },

  async deleteDataSource(id: string): Promise<{ success: boolean }> {
    await delay(400);
    const index = mockDataSources.findIndex((ds) => ds.id === id);
    if (index === -1) throw new Error('Data Source not found');
    mockDataSources.splice(index, 1);
    return { success: true };
  },

  async triggerCrawl(dsId: string): Promise<{ data: { task_id: string } }> {
    await delay(300);
    return { data: { task_id: `task-${Date.now()}` } };
  },

  async getCrawlStatus(dsId: string): Promise<CrawlStatusResponse> {
    await delay(200);
    const ds = mockDataSources.find((d) => d.id === dsId);
    if (!ds) throw new Error('Data Source not found');

    return {
      success: true,
      data: {
        status: ds.status,
        pages_crawled: ds.config.pages_crawled || 0,
        total_pages: ds.config.total_pages || 100,
      },
      timestamp: new Date().toISOString(),
    };
  },

  async listEmbeddings(
    kbId: string,
    params: PaginationParams
  ): Promise<EmbeddingListResponse> {
    await delay(400);
    const start = (params.page - 1) * params.per_page;
    const end = start + params.per_page;
    const pageData = mockEmbeddings.slice(start, end);

    return {
      success: true,
      data: pageData,
      pagination: {
        total: mockEmbeddings.length,
        page: params.page,
        per_page: params.per_page,
        total_pages: Math.ceil(mockEmbeddings.length / params.per_page),
        has_next: end < mockEmbeddings.length,
        has_prev: params.page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  },

  async generateEmbeddings(dsId: string): Promise<GenerateEmbeddingsResponse> {
    await delay(500);
    return {
      success: true,
      data: {
        task_id: `task-${Date.now()}`,
        status: 'queued',
      },
      message: 'Embedding generation started',
      timestamp: new Date().toISOString(),
    };
  },

  async testQuery(kbId: string, request: TestQueryRequest): Promise<TestQueryResponse> {
    await delay(800);
    const topK = request.top_k || 5;

    // Mock results
    const results = mockEmbeddings.slice(0, topK).map((emb, i) => ({
      text: emb.text,
      similarity: 0.95 - i * 0.1,
      source_name: mockDataSources[0].name,
      source_type: mockDataSources[0].type,
      metadata: emb.metadata,
    }));

    return {
      success: true,
      data: {
        results,
        query_embedding_generated: true,
      },
      timestamp: new Date().toISOString(),
    };
  },
};

// Helper function to simulate API delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Environment-based export
import { realKnowledgeBaseApi } from './api';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_KB === 'true' || localStorage.getItem('demo_mode') === 'true';

export const knowledgeBaseApi = USE_MOCK ? mockKnowledgeBaseApi : realKnowledgeBaseApi;
export const isMockMode = USE_MOCK;

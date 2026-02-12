/**
 * Knowledge Base API Service
 *
 * Real backend API integration for Knowledge Base features.
 * Calls FastAPI backend endpoints at /api/v1/knowledge-bases, /api/v1/data-sources, /api/v1/embeddings
 */

import { apiClient } from '@/services/api';
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

/**
 * Knowledge Base API endpoints
 */
export const realKnowledgeBaseApi = {
  /**
   * Get overall Knowledge Base statistics
   */
  async getStats(): Promise<{ data: KnowledgeBaseStats }> {
    const response = await apiClient.get('/knowledge-bases/stats');
    return { data: response.data };
  },

  /**
   * List all Knowledge Bases for current user
   */
  async listKnowledgeBases(params?: {
    skip?: number;
    limit?: number;
  }): Promise<KnowledgeBaseListResponse> {
    const response = await apiClient.get('/knowledge-bases', { params });
    return {
      success: true,
      data: response.data.items || [],
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Get a single Knowledge Base by ID
   */
  async getKnowledgeBase(id: string): Promise<{ data: KnowledgeBase }> {
    const response = await apiClient.get(`/knowledge-bases/${id}`);
    return { data: response.data };
  },

  /**
   * Create a new Knowledge Base
   */
  async createKnowledgeBase(
    request: KnowledgeBaseCreateRequest
  ): Promise<{ data: KnowledgeBase }> {
    const response = await apiClient.post('/knowledge-bases', request);
    return { data: response.data };
  },

  /**
   * Update an existing Knowledge Base
   */
  async updateKnowledgeBase(
    id: string,
    request: KnowledgeBaseUpdateRequest
  ): Promise<{ data: KnowledgeBase }> {
    const response = await apiClient.patch(`/knowledge-bases/${id}`, request);
    return { data: response.data };
  },

  /**
   * Delete a Knowledge Base
   */
  async deleteKnowledgeBase(id: string): Promise<{ success: boolean }> {
    await apiClient.delete(`/knowledge-bases/${id}`);
    return { success: true };
  },

  /**
   * List all Data Sources for a Knowledge Base
   */
  async listDataSources(
    kbId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<DataSourceListResponse> {
    const response = await apiClient.get(`/knowledge-bases/${kbId}/data-sources`, {
      params,
    });
    return {
      success: true,
      data: response.data.items || [],
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Create a new Data Source
   */
  async createDataSource(request: DataSourceCreateRequest): Promise<{ data: DataSource }> {
    const response = await apiClient.post('/data-sources', request);
    return { data: response.data };
  },

  /**
   * Upload documents to a Data Source
   */
  async uploadDocuments(
    knowledgeBaseId: string,
    dataSourceId: string,
    files: File[]
  ): Promise<{ data: { document_ids: string[] } }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const response = await apiClient.post(
      `/knowledge-bases/${knowledgeBaseId}/data-sources/${dataSourceId}/upload`,
      formData
    );

    return {
      data: {
        document_ids: response.data.document_ids || [],
      },
    };
  },

  /**
   * Upload structured data file (CSV/XLSX) as a new data source
   * This is a single-call endpoint that creates the data source + processes the file.
   */
  async uploadStructuredData(
    kbId: string,
    file: File,
    name?: string
  ): Promise<{ data: DataSource }> {
    const formData = new FormData();
    formData.append('file', file);

    const params: Record<string, string> = {};
    if (name) params.name = name;

    const response = await apiClient.post(
      `/knowledge-bases/${kbId}/data-sources/upload-structured`,
      formData,
      { params }
    );

    return { data: response.data };
  },

  /**
   * Update an existing Data Source
   */
  async updateDataSource(
    id: string,
    updates: Partial<DataSource>
  ): Promise<{ data: DataSource }> {
    const response = await apiClient.patch(`/data-sources/${id}`, updates);
    return { data: response.data };
  },

  /**
   * Delete a Data Source
   */
  async deleteDataSource(id: string): Promise<{ success: boolean }> {
    await apiClient.delete(`/data-sources/${id}`);
    return { success: true };
  },

  /**
   * Trigger website crawl for a Data Source
   */
  async triggerCrawl(dsId: string): Promise<{ data: { task_id: string } }> {
    const response = await apiClient.post(`/data-sources/${dsId}/crawl`);
    return {
      data: {
        task_id: response.data.task_id,
      },
    };
  },

  /**
   * Get crawl status for a Data Source
   */
  async getCrawlStatus(
    dsId: string,
    taskId?: string
  ): Promise<CrawlStatusResponse> {
    const response = await apiClient.get(`/data-sources/${dsId}/crawl-status`, {
      params: taskId ? { task_id: taskId } : undefined,
    });
    return {
      success: true,
      data: {
        status: response.data.status,
        pages_crawled: response.data.pages_crawled || 0,
        total_pages: response.data.total_pages || 0,
      },
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * List embeddings for a Knowledge Base
   */
  async listEmbeddings(
    kbId: string,
    params: PaginationParams
  ): Promise<EmbeddingListResponse> {
    const skip = (params.page - 1) * params.per_page;
    const response = await apiClient.get(`/knowledge-bases/${kbId}/embeddings`, {
      params: {
        skip,
        limit: params.per_page,
      },
    });

    const total = response.data.total || 0;
    const items = response.data.items || [];

    return {
      success: true,
      data: items,
      pagination: {
        total,
        page: params.page,
        per_page: params.per_page,
        total_pages: Math.ceil(total / params.per_page),
        has_next: skip + params.per_page < total,
        has_prev: params.page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Generate embeddings for a Data Source
   */
  async generateEmbeddings(
    dsId: string,
    force_regenerate: boolean = false
  ): Promise<GenerateEmbeddingsResponse> {
    const response = await apiClient.post(`/data-sources/${dsId}/embeddings`, {
      force_regenerate,
    });
    return {
      success: true,
      data: {
        task_id: response.data.task_id,
        status: response.data.status,
      },
      message: response.data.message,
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Test query on Knowledge Base
   */
  async testQuery(
    kbId: string,
    request: TestQueryRequest
  ): Promise<TestQueryResponse> {
    const response = await apiClient.post(`/knowledge-bases/${kbId}/test-query`, request);
    return {
      success: true,
      data: {
        results: response.data.results || [],
        query_embedding_generated: response.data.query_embedding_generated || false,
      },
      timestamp: new Date().toISOString(),
    };
  },

  /**
   * Delete a single embedding
   */
  async deleteEmbedding(embeddingId: string): Promise<{ success: boolean }> {
    await apiClient.delete(`/embeddings/${embeddingId}`);
    return { success: true };
  },

  /**
   * Fetch document text content for inline preview.
   * Uses the document preview API and reads response as text.
   */
  async getDocumentTextContent(documentId: string): Promise<string> {
    const response = await apiClient.get(`/documents/${documentId}/file/preview`, {
      responseType: 'text',
      // Override the default JSON transform so we get raw text
      transformResponse: [(data: string) => data],
    });
    return response.data;
  },

  /**
   * Fetch document file as a blob (for PDF/image rendering in dialog).
   * Returns an object URL that can be used as iframe/img src.
   */
  async getDocumentBlobUrl(documentId: string): Promise<string> {
    const response = await apiClient.get(`/documents/${documentId}/file/preview`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  /**
   * Download a document file via the browser.
   */
  async downloadDocument(documentId: string, filename: string): Promise<void> {
    const response = await apiClient.get(`/documents/${documentId}/file/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Get the preview URL for a document (for reference only — needs auth header).
   */
  getDocumentPreviewUrl(documentId: string): string {
    const baseUrl = apiClient.defaults.baseURL || '';
    return `${baseUrl}/documents/${documentId}/file/preview`;
  },

  /**
   * Get the download URL for a document (for reference only — needs auth header).
   */
  getDocumentDownloadUrl(documentId: string): string {
    const baseUrl = apiClient.defaults.baseURL || '';
    return `${baseUrl}/documents/${documentId}/file/download`;
  },

  /**
   * Get a preview of a structured dataset's rows.
   * Calls the Insights preview endpoint using the dataset_id from the data source config.
   */
  async getDatasetPreview(
    datasetId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ columns: string[]; rows: any[][]; total_rows: number }> {
    const response = await apiClient.get(`/insights/datasets/${datasetId}/preview`, {
      params: { limit, offset },
    });
    return response.data;
  },
};

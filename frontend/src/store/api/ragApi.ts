/**
 * RAG API - RTK Query Integration
 *
 * API slice for RAG (Retrieval Augmented Generation) features.
 * Phase 11 - RAG Implementation
 */

import { api } from './apiSlice';

// ===========================
// Types
// ===========================

export interface RAGQueryRequest {
  question: string;
  top_k?: number;
  similarity_threshold?: number;
  document_ids?: string[];
  model?: string;
}

export interface RAGSource {
  chunk_text: string;
  document_id: string;
  document_name: string;
  document_title?: string;
  chunk_index: number;
  similarity_score: number;
  metadata?: Record<string, unknown>;
}

export interface RAGQueryResponse {
  id: string;
  question: string;
  answer: string;
  sources: RAGSource[];
  model_used: string;
  tokens_used: number;
  confidence_score: number;
  context_used: number;
  created_at: string;
}

export interface RAGHistoryItem {
  id: string;
  question: string;
  answer?: string;
  sources?: RAGSource[];
  feedback_rating?: number;
  model_used?: string;
  tokens_used?: number;
  confidence_score?: number;
  created_at: string;
}

export interface RAGHistoryResponse {
  items: RAGHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface RAGFeedbackRequest {
  rating: number;
  feedback_text?: string;
}

export interface RAGStatsResponse {
  total_queries: number;
  total_documents_indexed: number;
  total_chunks: number;
  average_confidence: number;
  average_rating?: number;
  queries_with_feedback: number;
}

// ===========================
// API Endpoints
// ===========================

export const ragApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query documents using RAG
    queryDocuments: builder.mutation<RAGQueryResponse, RAGQueryRequest>({
      query: (body) => ({
        url: '/rag/query',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RAGHistory', 'RAGStats'],
    }),

    // Get query history with pagination
    getRAGHistory: builder.query<
      RAGHistoryResponse,
      { limit?: number; offset?: number }
    >({
      query: ({ limit = 50, offset = 0 }) => ({
        url: `/rag/history?limit=${limit}&offset=${offset}`,
      }),
      providesTags: ['RAGHistory'],
    }),

    // Submit feedback for a query
    submitRAGFeedback: builder.mutation<
      void,
      { queryId: string; feedback: RAGFeedbackRequest }
    >({
      query: ({ queryId, feedback }) => ({
        url: `/rag/feedback/${queryId}`,
        method: 'POST',
        body: feedback,
      }),
      invalidatesTags: ['RAGHistory', 'RAGStats'],
    }),

    // Get RAG usage statistics
    getRAGStats: builder.query<RAGStatsResponse, void>({
      query: () => '/rag/stats',
      providesTags: ['RAGStats'],
    }),

    // Delete query from history
    deleteQuery: builder.mutation<void, string>({
      query: (queryId) => ({
        url: `/rag/history/${queryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RAGHistory', 'RAGStats'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useQueryDocumentsMutation,
  useGetRAGHistoryQuery,
  useSubmitRAGFeedbackMutation,
  useGetRAGStatsQuery,
  useDeleteQueryMutation,
} = ragApi;

// ===========================
// Helper Functions
// ===========================

/**
 * Format confidence score as percentage
 */
export const formatConfidence = (score: number): string => {
  return `${(score * 100).toFixed(0)}%`;
};

/**
 * Format similarity score as percentage
 */
export const formatSimilarity = (score: number): string => {
  return `${(score * 100).toFixed(0)}%`;
};

/**
 * Get confidence level label
 */
export const getConfidenceLevel = (score: number): 'high' | 'medium' | 'low' => {
  if (score >= 0.8) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format date for display
 */
export const formatQueryDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

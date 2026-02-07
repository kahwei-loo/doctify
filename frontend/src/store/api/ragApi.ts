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

export type SearchMode = 'semantic' | 'keyword' | 'hybrid';

export interface RAGQueryRequest {
  question: string;
  top_k?: number;
  similarity_threshold?: number;
  document_ids?: string[];
  data_source_ids?: string[];
  model?: string;
  search_mode?: SearchMode;
  use_reranking?: boolean;
  conversation_id?: string;
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
  search_mode?: SearchMode;
  cached?: boolean;
  groundedness_score?: number;
  unsupported_claims?: string[];
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

// Conversational RAG (P1.3)
export interface RAGConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface RAGConversationDetail extends RAGConversation {
  queries: RAGHistoryItem[];
}

export interface RAGConversationListResponse {
  items: RAGConversation[];
  total: number;
}

export interface RAGStatsResponse {
  total_queries: number;
  total_documents_indexed: number;
  total_chunks: number;
  average_confidence: number;
  average_rating?: number;
  queries_with_feedback: number;
}

// Evaluation (P3.2)
export interface RAGEvaluation {
  id: string;
  faithfulness: number;
  answer_relevancy: number;
  context_precision: number;
  context_recall: number;
  sample_size: number;
  queries_with_feedback: number;
  average_groundedness?: number;
  created_at: string;
}

export interface RAGEvaluationListResponse {
  items: RAGEvaluation[];
  total: number;
}

export interface RAGEvaluationTriggerResponse {
  task_id?: string;
  faithfulness?: number;
  answer_relevancy?: number;
  context_precision?: number;
  context_recall?: number;
  sample_size?: number;
  message: string;
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

    // Conversations (P1.3)
    createConversation: builder.mutation<RAGConversation, { title?: string }>({
      query: (body) => ({
        url: '/rag/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RAGConversations'],
    }),

    getConversations: builder.query<
      RAGConversationListResponse,
      { limit?: number; offset?: number }
    >({
      query: ({ limit = 50, offset = 0 }) => `/rag/conversations?limit=${limit}&offset=${offset}`,
      providesTags: ['RAGConversations'],
    }),

    getConversation: builder.query<RAGConversationDetail, string>({
      query: (id) => `/rag/conversations/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'RAGConversations', id }],
    }),

    deleteConversation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/rag/conversations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RAGConversations'],
    }),

    // Evaluations (P3.2)
    getEvaluations: builder.query<
      RAGEvaluationListResponse,
      { limit?: number; offset?: number }
    >({
      query: ({ limit = 20, offset = 0 }) => `/rag/evaluations?limit=${limit}&offset=${offset}`,
      providesTags: ['RAGEvaluations'],
    }),

    triggerEvaluation: builder.mutation<RAGEvaluationTriggerResponse, { sample_size?: number }>({
      query: ({ sample_size = 20 }) => ({
        url: `/rag/evaluations/run?sample_size=${sample_size}`,
        method: 'POST',
      }),
      invalidatesTags: ['RAGEvaluations'],
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
  useCreateConversationMutation,
  useGetConversationsQuery,
  useGetConversationQuery,
  useDeleteConversationMutation,
  useGetEvaluationsQuery,
  useTriggerEvaluationMutation,
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

// ===========================
// Streaming RAG Query (P1.2)
// ===========================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface StreamEvent {
  type: 'sources' | 'token' | 'done' | 'error';
  data: unknown;
}

export interface StreamDoneData {
  model_used: string;
  tokens_used: number;
  confidence_score: number;
  context_used: number;
  answer: string;
}

/**
 * Stream a RAG query response via SSE.
 *
 * @param request - The RAG query request body
 * @param onEvent - Callback for each SSE event
 * @param signal - Optional AbortSignal for cancellation
 */
export async function streamRAGQuery(
  request: RAGQueryRequest,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_BASE_URL}/api/v1/rag/query/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || `HTTP ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6)) as StreamEvent;
          onEvent(parsed);
        } catch {
          // skip malformed events
        }
      }
    }
  }
}

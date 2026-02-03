/**
 * Insights API Endpoints
 *
 * RTK Query endpoints for NL-to-Insights feature with automatic caching.
 */

import { api } from './apiSlice';
import type {
  Dataset,
  DatasetListResponse,
  DatasetPreviewResponse,
  DatasetUploadResponse,
  SchemaDefinition,
  SchemaUpdateRequest,
  SchemaInferenceResponse,
  Conversation,
  ConversationListResponse,
  ConversationCreateRequest,
  QueryRequest,
  QueryResponse,
  QueryHistoryResponse,
} from '../../features/insights/types';

export const insightsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ============================================
    // Dataset Endpoints
    // ============================================

    // Query: Get datasets list
    getDatasets: builder.query<
      DatasetListResponse,
      { skip?: number; limit?: number }
    >({
      query: ({ skip = 0, limit = 20 } = {}) => ({
        url: '/insights/datasets',
        params: { skip, limit },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.datasets.map(({ id }) => ({
                type: 'Datasets' as const,
                id,
              })),
              { type: 'Datasets', id: 'LIST' },
            ]
          : [{ type: 'Datasets', id: 'LIST' }],
    }),

    // Query: Get single dataset
    getDataset: builder.query<Dataset, string>({
      query: (datasetId) => `/insights/datasets/${datasetId}`,
      providesTags: (result, error, datasetId) => [
        { type: 'Datasets', id: datasetId },
      ],
    }),

    // Mutation: Upload dataset
    uploadDataset: builder.mutation<
      DatasetUploadResponse,
      { file: File; name: string; description?: string }
    >({
      query: ({ file, name, description }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        if (description) {
          formData.append('description', description);
        }

        return {
          url: '/insights/datasets',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: [{ type: 'Datasets', id: 'LIST' }],
    }),

    // Mutation: Update dataset schema
    updateDatasetSchema: builder.mutation<
      SchemaDefinition,
      { datasetId: string; schema: SchemaUpdateRequest }
    >({
      query: ({ datasetId, schema }) => ({
        url: `/insights/datasets/${datasetId}/schema`,
        method: 'PUT',
        body: schema,
      }),
      invalidatesTags: (result, error, { datasetId }) => [
        { type: 'Datasets', id: datasetId },
      ],
    }),

    // Mutation: Delete dataset
    deleteDataset: builder.mutation<void, string>({
      query: (datasetId) => ({
        url: `/insights/datasets/${datasetId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, datasetId) => [
        { type: 'Datasets', id: datasetId },
        { type: 'Datasets', id: 'LIST' },
        { type: 'Conversations', id: 'LIST' }, // Deleting dataset affects conversations
      ],
    }),

    // Query: Get dataset preview
    getDatasetPreview: builder.query<
      DatasetPreviewResponse,
      { datasetId: string; limit?: number; offset?: number }
    >({
      query: ({ datasetId, limit = 100, offset = 0 }) => ({
        url: `/insights/datasets/${datasetId}/preview`,
        params: { limit, offset },
      }),
    }),

    // Query: Infer schema semantics using AI
    inferSchemaSemantics: builder.query<SchemaInferenceResponse, string>({
      query: (datasetId) => ({
        url: `/insights/datasets/${datasetId}/infer-schema`,
        method: 'POST',
      }),
    }),

    // ============================================
    // Conversation Endpoints
    // ============================================

    // Query: Get conversations list
    getConversations: builder.query<
      ConversationListResponse,
      { datasetId?: string; skip?: number; limit?: number }
    >({
      query: ({ datasetId, skip = 0, limit = 20 } = {}) => {
        const params: Record<string, any> = { skip, limit };
        if (datasetId) {
          params.dataset_id = datasetId;
        }
        return {
          url: '/insights/conversations',
          params,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.conversations.map(({ id }) => ({
                type: 'Conversations' as const,
                id,
              })),
              { type: 'Conversations', id: 'LIST' },
            ]
          : [{ type: 'Conversations', id: 'LIST' }],
    }),

    // Query: Get single conversation
    getConversation: builder.query<Conversation, string>({
      query: (conversationId) => `/insights/conversations/${conversationId}`,
      providesTags: (result, error, conversationId) => [
        { type: 'Conversations', id: conversationId },
      ],
    }),

    // Mutation: Create conversation
    createConversation: builder.mutation<Conversation, ConversationCreateRequest>({
      query: (request) => ({
        url: '/insights/conversations',
        method: 'POST',
        body: request,
      }),
      invalidatesTags: [{ type: 'Conversations', id: 'LIST' }],
    }),

    // Mutation: Delete conversation
    deleteConversation: builder.mutation<void, string>({
      query: (conversationId) => ({
        url: `/insights/conversations/${conversationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, conversationId) => [
        { type: 'Conversations', id: conversationId },
        { type: 'Conversations', id: 'LIST' },
        { type: 'Queries', id: `CONV_${conversationId}` }, // Queries for this conversation
      ],
    }),

    // ============================================
    // Query Endpoints
    // ============================================

    // Mutation: Send a natural language query
    sendQuery: builder.mutation<
      QueryResponse,
      { conversationId: string; request: QueryRequest }
    >({
      query: ({ conversationId, request }) => ({
        url: `/insights/conversations/${conversationId}/query`,
        method: 'POST',
        body: request,
      }),
      invalidatesTags: (result, error, { conversationId }) => [
        { type: 'Queries', id: `CONV_${conversationId}` },
        { type: 'Conversations', id: conversationId }, // Update conversation context
      ],
    }),

    // Query: Get query history for a conversation
    getQueryHistory: builder.query<
      QueryHistoryResponse,
      { conversationId: string; skip?: number; limit?: number }
    >({
      query: ({ conversationId, skip = 0, limit = 50 }) => ({
        url: `/insights/conversations/${conversationId}/history`,
        params: { skip, limit },
      }),
      providesTags: (result, error, { conversationId }) => [
        { type: 'Queries', id: `CONV_${conversationId}` },
      ],
    }),
  }),
});

export const {
  // Dataset hooks
  useGetDatasetsQuery,
  useGetDatasetQuery,
  useUploadDatasetMutation,
  useUpdateDatasetSchemaMutation,
  useDeleteDatasetMutation,
  useGetDatasetPreviewQuery,
  useLazyGetDatasetPreviewQuery,
  useLazyInferSchemaSemanticsQuery,
  // Conversation hooks
  useGetConversationsQuery,
  useGetConversationQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
  // Query hooks
  useSendQueryMutation,
  useGetQueryHistoryQuery,
} = insightsApi;

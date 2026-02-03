/**
 * Documents API Endpoints
 *
 * RTK Query endpoints for document operations with automatic caching.
 */

import { api } from './apiSlice';
import type {
  DocumentListResponse,
  DocumentDetail,
  DocumentFilters,
  PaginationParams,
  DocumentUploadResponse,
  QualityValidation,
  ConfirmDocumentRequest,
  ConfirmDocumentResponse,
} from '../../features/documents/types';

export const documentsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query: Get documents list
    getDocuments: builder.query<
      DocumentListResponse,
      { filters?: DocumentFilters; pagination?: PaginationParams }
    >({
      query: ({ filters = {}, pagination = { page: 1, per_page: 20 } }) => {
        const params: any = {
          page: pagination.page,
          per_page: pagination.per_page,
        };

        if (filters.project_id) {
          params.project_id = filters.project_id;
        }

        if (filters.status) {
          params.status_filter = filters.status;
        }

        return {
          url: '/documents',
          params,
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ document_id }) => ({
                type: 'Documents' as const,
                id: document_id,
              })),
              { type: 'Documents', id: 'LIST' },
            ]
          : [{ type: 'Documents', id: 'LIST' }],
    }),

    // Query: Get single document
    getDocument: builder.query<{ success: boolean; data: DocumentDetail }, string>({
      query: (documentId) => `/documents/${documentId}`,
      providesTags: (result, error, documentId) => [{ type: 'Documents', id: documentId }],
    }),

    // Mutation: Upload document
    uploadDocument: builder.mutation<
      DocumentUploadResponse,
      { file: File; projectId: string }
    >({
      query: ({ file, projectId }) => {
        const formData = new FormData();
        formData.append('file', file);

        return {
          url: '/documents/upload',
          method: 'POST',
          body: formData,
          params: { project_id: projectId },
        };
      },
      invalidatesTags: [{ type: 'Documents', id: 'LIST' }],
    }),

    // Mutation: Process document
    processDocument: builder.mutation<
      { success: boolean; data: any; message: string },
      { documentId: string; extractionConfig?: Record<string, any> }
    >({
      query: ({ documentId, extractionConfig }) => ({
        url: `/documents/${documentId}/process`,
        method: 'POST',
        body: { extraction_config: extractionConfig },
      }),
      invalidatesTags: (result, error, { documentId }) => [{ type: 'Documents', id: documentId }],
    }),

    // Mutation: Cancel processing
    cancelProcessing: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (documentId) => ({
        url: `/documents/${documentId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, documentId) => [{ type: 'Documents', id: documentId }],
    }),

    // Mutation: Retry processing
    retryProcessing: builder.mutation<
      { success: boolean; data: any; message: string },
      string
    >({
      query: (documentId) => ({
        url: `/documents/${documentId}/retry`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, documentId) => [{ type: 'Documents', id: documentId }],
    }),

    // Query: Validate quality
    validateQuality: builder.query<
      { success: boolean; data: QualityValidation },
      { documentId: string; minimumConfidence?: number }
    >({
      query: ({ documentId, minimumConfidence = 0.75 }) => ({
        url: `/documents/${documentId}/validate-quality`,
        params: { minimum_confidence: minimumConfidence },
      }),
    }),

    // Mutation: Delete document
    deleteDocument: builder.mutation<void, string>({
      query: (documentId) => ({
        url: `/documents/${documentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, documentId) => [
        { type: 'Documents', id: documentId },
        { type: 'Documents', id: 'LIST' },
      ],
    }),

    // Mutation: Confirm document OCR extraction
    confirmDocument: builder.mutation<ConfirmDocumentResponse, ConfirmDocumentRequest>({
      query: ({ documentId, data }) => ({
        url: `/documents/${documentId}/confirm`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { documentId }) => [
        { type: 'Documents', id: documentId },
        { type: 'Documents', id: 'LIST' },
      ],
    }),

    // Query: Export document
    exportDocument: builder.query<
      Blob,
      { documentId: string; format?: string; includeMetadata?: boolean }
    >({
      query: ({ documentId, format = 'json', includeMetadata = true }) => ({
        url: `/documents/${documentId}/export`,
        params: {
          export_format: format,
          include_metadata: includeMetadata,
        },
        responseHandler: (response: Response) => response.blob(),
      }),
    }),

    // Query: Search documents (for CommandPalette global search)
    searchDocuments: builder.query<
      {
        success: boolean;
        data: Array<{
          document_id: string;
          filename: string;
          project_id: string;
          project_name?: string;
          status: string;
          created_at: string;
        }>;
        total: number;
      },
      { query: string; limit?: number }
    >({
      query: ({ query, limit = 10 }) => ({
        url: '/documents/search',
        params: { q: query, limit },
      }),
      // Don't cache search results for too long
      keepUnusedDataFor: 60,
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useGetDocumentQuery,
  useUploadDocumentMutation,
  useProcessDocumentMutation,
  useCancelProcessingMutation,
  useRetryProcessingMutation,
  useLazyValidateQualityQuery,
  useDeleteDocumentMutation,
  useLazyExportDocumentQuery,
  useConfirmDocumentMutation,
  useSearchDocumentsQuery,
  useLazySearchDocumentsQuery,
} = documentsApi;

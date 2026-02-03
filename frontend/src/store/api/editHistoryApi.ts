/**
 * Edit History API Endpoints
 *
 * RTK Query endpoints for document edit history management.
 */

import { api } from './apiSlice';

// Edit history entry response
export interface EditHistoryEntry {
  id: string;
  document_id: string;
  user_id: string | null;
  field_path: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  edit_type: string;
  source: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

// List response
export interface EditHistoryListResponse {
  success: boolean;
  data: EditHistoryEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Single entry response
export interface EditHistoryApiResponse {
  success: boolean;
  data: EditHistoryEntry;
}

// List params
export interface ListEditHistoryParams {
  documentId: string;
  page?: number;
  page_size?: number;
  field_path?: string;
  edit_type?: string;
}

// Track modification request
export interface TrackModificationRequest {
  field_path: string;
  old_value?: unknown;
  new_value?: unknown;
  edit_type?: string;
}

// Bulk track request
export interface BulkTrackModificationRequest {
  modifications: TrackModificationRequest[];
}

// Rollback request
export interface RollbackRequest {
  entry_id?: string;
  timestamp?: string;
}

// Rollback response
export interface RollbackResponse {
  success: boolean;
  message: string;
  entries_count: number;
  entries: EditHistoryEntry[];
}

// Valid edit types
export const VALID_EDIT_TYPES = ['manual', 'bulk', 'rollback', 'ai_correction'] as const;
export type EditType = (typeof VALID_EDIT_TYPES)[number];

// Valid sources
export const VALID_SOURCES = ['web', 'api', 'mobile'] as const;
export type EditSource = (typeof VALID_SOURCES)[number];

export const editHistoryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query: Get document edit history
    getEditHistory: builder.query<EditHistoryListResponse, ListEditHistoryParams>({
      query: ({ documentId, ...params }) => ({
        url: `/edit-history/${documentId}`,
        params,
      }),
      providesTags: (result, error, { documentId }) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'EditHistory' as const, id })),
              { type: 'EditHistory', id: `LIST-${documentId}` },
            ]
          : [{ type: 'EditHistory', id: `LIST-${documentId}` }],
    }),

    // Query: Get single edit history entry
    getEditHistoryEntry: builder.query<EditHistoryApiResponse, { documentId: string; entryId: string }>({
      query: ({ documentId, entryId }) => `/edit-history/${documentId}/${entryId}`,
      providesTags: (result, error, { entryId }) => [{ type: 'EditHistory', id: entryId }],
    }),

    // Mutation: Track single modification
    trackModification: builder.mutation<EditHistoryApiResponse, { documentId: string; modification: TrackModificationRequest }>({
      query: ({ documentId, modification }) => ({
        url: `/edit-history/${documentId}`,
        method: 'POST',
        body: modification,
      }),
      invalidatesTags: (result, error, { documentId }) => [
        { type: 'EditHistory', id: `LIST-${documentId}` },
        { type: 'Documents', id: documentId },
      ],
    }),

    // Mutation: Track bulk modifications
    trackBulkModifications: builder.mutation<EditHistoryListResponse, { documentId: string; modifications: BulkTrackModificationRequest }>({
      query: ({ documentId, modifications }) => ({
        url: `/edit-history/${documentId}/bulk`,
        method: 'POST',
        body: modifications,
      }),
      invalidatesTags: (result, error, { documentId }) => [
        { type: 'EditHistory', id: `LIST-${documentId}` },
        { type: 'Documents', id: documentId },
      ],
    }),

    // Mutation: Rollback changes
    rollbackChanges: builder.mutation<RollbackResponse, { documentId: string; rollback: RollbackRequest }>({
      query: ({ documentId, rollback }) => ({
        url: `/edit-history/${documentId}/rollback`,
        method: 'POST',
        body: rollback,
      }),
      invalidatesTags: (result, error, { documentId }) => [
        { type: 'EditHistory', id: `LIST-${documentId}` },
        { type: 'Documents', id: documentId },
      ],
    }),
  }),
});

export const {
  useGetEditHistoryQuery,
  useGetEditHistoryEntryQuery,
  useTrackModificationMutation,
  useTrackBulkModificationsMutation,
  useRollbackChangesMutation,
} = editHistoryApi;

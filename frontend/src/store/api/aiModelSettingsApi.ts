/**
 * AI Model Settings API — RTK Query endpoints (admin-only)
 */

import { api } from './apiSlice';
import type {
  AIModelSettingsResponse,
  ModelCatalogEntry,
  UpdateAIModelSettingRequest,
  CreateModelCatalogEntryRequest,
  UpdateModelCatalogEntryRequest,
} from '@/features/settings/types';

export const aiModelSettingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAIModelSettings: builder.query<
      { success: boolean; data: AIModelSettingsResponse },
      void
    >({
      query: () => '/admin/ai-models',
      providesTags: ['AIModelSettings'],
    }),

    getModelCatalog: builder.query<
      { success: boolean; data: ModelCatalogEntry[] },
      void
    >({
      query: () => '/admin/ai-models/catalog',
      providesTags: ['AIModelSettings'],
    }),

    updateAIModelSetting: builder.mutation<
      { success: boolean; data: AIModelSettingsResponse },
      { purpose: string; body: UpdateAIModelSettingRequest }
    >({
      query: ({ purpose, body }) => ({
        url: `/admin/ai-models/${purpose}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AIModelSettings'],
    }),

    addCatalogEntry: builder.mutation<
      { success: boolean; data: ModelCatalogEntry },
      CreateModelCatalogEntryRequest
    >({
      query: (body) => ({
        url: '/admin/ai-models/catalog',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AIModelSettings'],
    }),

    updateCatalogEntry: builder.mutation<
      { success: boolean; data: ModelCatalogEntry },
      { entryId: string; body: UpdateModelCatalogEntryRequest }
    >({
      query: ({ entryId, body }) => ({
        url: `/admin/ai-models/catalog/${entryId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AIModelSettings'],
    }),

    deleteCatalogEntry: builder.mutation<
      { success: boolean; detail: string },
      string
    >({
      query: (entryId) => ({
        url: `/admin/ai-models/catalog/${entryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AIModelSettings'],
    }),
  }),
});

export const {
  useGetAIModelSettingsQuery,
  useGetModelCatalogQuery,
  useUpdateAIModelSettingMutation,
  useAddCatalogEntryMutation,
  useUpdateCatalogEntryMutation,
  useDeleteCatalogEntryMutation,
} = aiModelSettingsApi;

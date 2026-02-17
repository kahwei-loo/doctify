/**
 * AI Model Settings API — RTK Query endpoints (admin-only)
 */

import { api } from './apiSlice';
import type {
  AIModelSettingsResponse,
  ModelCatalogEntry,
  UpdateAIModelSettingRequest,
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
  }),
});

export const {
  useGetAIModelSettingsQuery,
  useGetModelCatalogQuery,
  useUpdateAIModelSettingMutation,
} = aiModelSettingsApi;

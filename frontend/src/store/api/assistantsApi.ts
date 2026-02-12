/**
 * Assistants API Endpoints
 *
 * RTK Query endpoints for AI assistant operations with automatic caching.
 * Connected to real backend API (Week 5 Phase 2).
 */

import { api } from './apiSlice';
import type {
  AssistantListResponse,
  AssistantStats,
  CreateAssistantRequest,
  UpdateAssistantRequest,
  Assistant,
  AssistantFilters,
  AssistantAnalytics,
  ModelConfig,
} from '../../features/assistants/types';

// ============================================================================
// Response Transformation Types (Backend → Frontend)
// ============================================================================

interface BackendAssistantResponse {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  model_configuration: Record<string, any>;
  widget_config: Record<string, any>;
  is_active: boolean;
  knowledge_base_id: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendAssistantWithStats extends BackendAssistantResponse {
  total_conversations: number;
  unresolved_count: number;
}

interface BackendAssistantListResponse {
  assistants: BackendAssistantWithStats[];
  total: number;
}

interface BackendStatsResponse {
  total_assistants: number;
  active_assistants: number;
  total_conversations: number;
  unresolved_conversations: number;
}

interface BackendAnalyticsResponse {
  assistant_id: string;
  period_days: number;
  total_conversations: number;
  resolved_conversations: number;
  resolution_rate: number;
  avg_messages_per_conversation: number;
  total_messages: number;
}

// Backend wraps all responses in success_response()
interface BackendSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

// ============================================================================
// Transformation Functions
// ============================================================================

/** Default model config for fallback */
const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'openai',
  model: 'gpt-4',
  temperature: 0.7,
  max_tokens: 2048,
};

/**
 * Transform backend model configuration to frontend ModelConfig type
 */
const transformModelConfig = (config: Record<string, any> | null | undefined): ModelConfig => {
  if (!config) return DEFAULT_MODEL_CONFIG;
  return {
    provider: config.provider || 'openai',
    model: config.model || 'gpt-4',
    temperature: config.temperature ?? 0.7,
    max_tokens: config.max_tokens ?? 2048,
    system_prompt: config.system_prompt || undefined,
  } as ModelConfig;
};

/**
 * Transform backend assistant response to frontend type
 */
const transformAssistant = (backend: BackendAssistantResponse): Assistant => ({
  assistant_id: backend.id,
  name: backend.name,
  description: backend.description || '',
  model_config: transformModelConfig(backend.model_configuration),
  is_active: backend.is_active,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
  total_conversations: 0,
  unresolved_count: 0,
  knowledge_base_id: backend.knowledge_base_id,
  widget_config: backend.widget_config as any,
});

/**
 * Transform backend assistant with stats to frontend type
 */
const transformAssistantWithStats = (backend: BackendAssistantWithStats): Assistant => ({
  assistant_id: backend.id,
  name: backend.name,
  description: backend.description || '',
  model_config: transformModelConfig(backend.model_configuration),
  is_active: backend.is_active,
  created_at: backend.created_at,
  updated_at: backend.updated_at,
  total_conversations: backend.total_conversations || 0,
  unresolved_count: backend.unresolved_count || 0,
  knowledge_base_id: backend.knowledge_base_id,
  widget_config: backend.widget_config as any,
});

/**
 * Transform backend stats to frontend type
 */
const transformStats = (backend: BackendStatsResponse): AssistantStats => ({
  total_assistants: backend.total_assistants,
  active_assistants: backend.active_assistants,
  total_conversations: backend.total_conversations,
  unresolved_conversations: backend.unresolved_conversations,
  // These fields are not provided by backend stats endpoint
  // Set default values for UI compatibility
  avg_response_time: 0,
  avg_resolution_rate: 0,
});

/**
 * Transform backend analytics to frontend type
 */
const transformAnalytics = (backend: BackendAnalyticsResponse): AssistantAnalytics => ({
  assistant_id: backend.assistant_id,
  period: `${backend.period_days}d`,
  conversation_count: backend.total_conversations,
  message_count: backend.total_messages,
  avg_response_time: 0, // Not provided by backend
  resolution_rate: backend.resolution_rate,
  user_satisfaction: undefined,
});

// ============================================================================
// RTK Query API Endpoints
// ============================================================================

export const assistantsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query: Get assistant stats dashboard
    getAssistantStats: builder.query<AssistantStats, void>({
      query: () => '/assistants/stats',
      transformResponse: (response: BackendSuccessResponse<BackendStatsResponse>) => transformStats(response.data),
      providesTags: [{ type: 'AssistantStats', id: 'STATS' }],
    }),

    // Query: Get all assistants
    getAssistants: builder.query<AssistantListResponse, AssistantFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        const filtersObj = filters || {};

        if (filtersObj.status) {
          params.append('include_inactive', filtersObj.status === 'inactive' ? 'true' : 'false');
        } else {
          // By default, include all
          params.append('include_inactive', 'true');
        }

        const queryString = params.toString();
        return `/assistants/${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response: BackendSuccessResponse<BackendAssistantListResponse>, meta, arg): AssistantListResponse => {
        let assistants = response.data.assistants.map(transformAssistantWithStats);

        // Apply client-side filters
        const filters = arg || {};

        if (filters.status) {
          const isActive = filters.status === 'active';
          assistants = assistants.filter((a) => a.is_active === isActive);
        }

        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          assistants = assistants.filter(
            (a) =>
              a.name.toLowerCase().includes(searchLower) ||
              a.description.toLowerCase().includes(searchLower)
          );
        }

        return {
          success: true,
          data: assistants,
          timestamp: new Date().toISOString(),
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ assistant_id }) => ({
                type: 'Assistants' as const,
                id: assistant_id,
              })),
              { type: 'Assistants', id: 'LIST' },
            ]
          : [{ type: 'Assistants', id: 'LIST' }],
    }),

    // Query: Get single assistant by ID
    getAssistantById: builder.query<Assistant, string>({
      query: (assistantId) => `/assistants/${assistantId}`,
      transformResponse: (response: BackendSuccessResponse<BackendAssistantResponse>) => transformAssistant(response.data),
      providesTags: (result, error, assistantId) => [
        { type: 'Assistants', id: assistantId },
      ],
    }),

    // Mutation: Create new assistant
    createAssistant: builder.mutation<Assistant, CreateAssistantRequest>({
      query: (request) => ({
        url: '/assistants/',
        method: 'POST',
        body: {
          name: request.name,
          description: request.description,
          model_config: request.model_config,
          knowledge_base_id: request.knowledge_base_id,
        },
      }),
      transformResponse: (response: BackendSuccessResponse<BackendAssistantResponse>) => transformAssistant(response.data),
      invalidatesTags: [
        { type: 'Assistants', id: 'LIST' },
        { type: 'AssistantStats', id: 'STATS' },
      ],
    }),

    // Mutation: Update existing assistant
    updateAssistant: builder.mutation<Assistant, UpdateAssistantRequest>({
      query: ({ assistant_id, ...updates }) => ({
        url: `/assistants/${assistant_id}`,
        method: 'PUT',
        body: {
          name: updates.name,
          description: updates.description,
          model_config: updates.model_config,
          is_active: updates.is_active,
          knowledge_base_id: updates.knowledge_base_id,
        },
      }),
      transformResponse: (response: BackendSuccessResponse<BackendAssistantResponse>) => transformAssistant(response.data),
      invalidatesTags: (result, error, { assistant_id }) => [
        { type: 'Assistants', id: assistant_id },
        { type: 'Assistants', id: 'LIST' },
        { type: 'AssistantStats', id: 'STATS' },
      ],
    }),

    // Mutation: Delete assistant
    deleteAssistant: builder.mutation<void, string>({
      query: (assistantId) => ({
        url: `/assistants/${assistantId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, assistantId) => [
        { type: 'Assistants', id: assistantId },
        { type: 'Assistants', id: 'LIST' },
        { type: 'AssistantStats', id: 'STATS' },
      ],
    }),

    // Query: Get assistant analytics
    getAssistantAnalytics: builder.query<
      AssistantAnalytics,
      { assistantId: string; period: string }
    >({
      query: ({ assistantId, period }) => {
        // Convert period string to days
        let periodDays = 30;
        if (period === 'day') periodDays = 1;
        else if (period === 'week') periodDays = 7;
        else if (period === 'month') periodDays = 30;

        return `/assistants/${assistantId}/analytics?period_days=${periodDays}`;
      },
      transformResponse: (response: BackendSuccessResponse<BackendAnalyticsResponse>) => transformAnalytics(response.data),
      providesTags: (result, error, { assistantId }) => [
        { type: 'Assistants', id: `${assistantId}-analytics` },
      ],
    }),
  }),
});

export const {
  useGetAssistantStatsQuery,
  useGetAssistantsQuery,
  useGetAssistantByIdQuery,
  useCreateAssistantMutation,
  useUpdateAssistantMutation,
  useDeleteAssistantMutation,
  useGetAssistantAnalyticsQuery,
} = assistantsApi;

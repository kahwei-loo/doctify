/**
 * Conversations API Endpoints
 *
 * RTK Query endpoints for conversation and message operations with automatic caching.
 * Connected to real backend API (Week 5 Phase 2).
 */

import { api } from './apiSlice';
import type {
  ConversationListResponse,
  ConversationFilters,
  Conversation,
  ConversationStatus,
  MessageListResponse,
  Message,
  SendMessageRequest,
  PaginationParams,
} from '../../features/assistants/types';

// ============================================================================
// Response Transformation Types (Backend → Frontend)
// ============================================================================

interface BackendConversationResponse {
  id: string;
  assistant_id: string;
  user_id: string | null;
  session_id: string | null;
  status: ConversationStatus;
  last_message_preview: string;
  last_message_at: string;
  message_count: number;
  context: Record<string, any>;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BackendConversationListResponse {
  conversations: BackendConversationResponse[];
  total: number;
}

interface BackendMessageResponse {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used: string | null;
  tokens_used: number | null;
  created_at: string;
}

interface BackendMessageListResponse {
  messages: BackendMessageResponse[];
  total: number;
}

// Backend wraps responses in success_response()
interface BackendSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Transform backend conversation response to frontend type
 */
const transformConversation = (backend: BackendConversationResponse): Conversation => ({
  conversation_id: backend.id,
  assistant_id: backend.assistant_id,
  status: backend.status,
  user_fingerprint: backend.session_id || undefined,
  last_message_preview: backend.last_message_preview || '',
  last_message_at: backend.last_message_at,
  created_at: backend.created_at,
  resolved_at: backend.resolved_at || undefined,
  message_count: backend.message_count || 0,
});

/**
 * Transform backend message response to frontend type
 */
const transformMessage = (backend: BackendMessageResponse): Message => ({
  message_id: backend.id,
  conversation_id: backend.conversation_id,
  role: backend.role,
  content: backend.content,
  created_at: backend.created_at,
  metadata: backend.model_used ? { model_used: backend.model_used, tokens_used: backend.tokens_used } : undefined,
});

// ============================================================================
// RTK Query API Endpoints
// ============================================================================

export const conversationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query: Get conversations with filters
    getConversations: builder.query<
      ConversationListResponse,
      { filters?: ConversationFilters; pagination?: PaginationParams }
    >({
      query: ({ filters = {}, pagination = { page: 1, per_page: 20 } }) => {
        if (!filters.assistant_id) {
          // Return empty response if no assistant selected
          return { url: '', method: 'GET' };
        }

        const params = new URLSearchParams();

        if (filters.status) {
          params.append('status', filters.status);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }

        // Convert page-based pagination to skip/limit
        const skip = (pagination.page - 1) * pagination.per_page;
        params.append('skip', skip.toString());
        params.append('limit', pagination.per_page.toString());

        const queryString = params.toString();
        return `/assistants/${filters.assistant_id}/conversations${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (
        response: BackendSuccessResponse<BackendConversationListResponse>,
        meta,
        arg
      ): ConversationListResponse => {
        const { filters = {}, pagination = { page: 1, per_page: 20 } } = arg;

        // Handle empty assistant_id case
        if (!filters.assistant_id || !response?.data) {
          return {
            success: true,
            data: [],
            pagination: {
              total: 0,
              page: 1,
              per_page: 20,
              total_pages: 0,
              has_next: false,
              has_prev: false,
            },
            timestamp: new Date().toISOString(),
          };
        }

        const conversations = response.data.conversations.map(transformConversation);
        const total = response.data.total;

        return {
          success: true,
          data: conversations,
          pagination: {
            total,
            page: pagination.page,
            per_page: pagination.per_page,
            total_pages: Math.ceil(total / pagination.per_page),
            has_next: pagination.page * pagination.per_page < total,
            has_prev: pagination.page > 1,
          },
          timestamp: new Date().toISOString(),
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ conversation_id }) => ({
                type: 'AssistantConversations' as const,
                id: conversation_id,
              })),
              { type: 'AssistantConversations', id: 'LIST' },
            ]
          : [{ type: 'AssistantConversations', id: 'LIST' }],
    }),

    // Query: Get conversation messages
    getConversationMessages: builder.query<MessageListResponse, string>({
      query: (conversationId) => `/assistants/conversations/${conversationId}/messages`,
      transformResponse: (response: BackendSuccessResponse<BackendMessageListResponse>): MessageListResponse => {
        const messages = response.data.messages.map(transformMessage);

        return {
          success: true,
          data: messages,
          timestamp: new Date().toISOString(),
        };
      },
      providesTags: (result, error, conversationId) => [
        { type: 'ConversationMessages', id: conversationId },
      ],
    }),

    // Mutation: Update conversation status
    updateConversationStatus: builder.mutation<
      Conversation,
      { conversationId: string; status: ConversationStatus }
    >({
      query: ({ conversationId, status }) => ({
        url: `/assistants/conversations/${conversationId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: (response: BackendSuccessResponse<BackendConversationResponse>): Conversation => {
        return transformConversation(response.data);
      },
      invalidatesTags: (result, error, { conversationId }) => [
        { type: 'AssistantConversations', id: conversationId },
        { type: 'AssistantConversations', id: 'LIST' },
        { type: 'AssistantStats', id: 'STATS' },
      ],
    }),

    // Mutation: Send message (manual message from staff)
    sendMessage: builder.mutation<Message, SendMessageRequest>({
      query: ({ conversation_id, content }) => ({
        url: `/assistants/conversations/${conversation_id}/messages`,
        method: 'POST',
        body: { content },
      }),
      transformResponse: (response: BackendSuccessResponse<BackendMessageResponse>): Message => {
        return transformMessage(response.data);
      },
      invalidatesTags: (result, error, { conversation_id }) => [
        { type: 'ConversationMessages', id: conversation_id },
        { type: 'AssistantConversations', id: conversation_id },
      ],
    }),

    // Mutation: Delete conversation
    deleteConversation: builder.mutation<void, string>({
      query: (conversationId) => ({
        url: `/assistants/conversations/${conversationId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, conversationId) => [
        { type: 'AssistantConversations', id: conversationId },
        { type: 'AssistantConversations', id: 'LIST' },
        { type: 'AssistantStats', id: 'STATS' },
      ],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetConversationMessagesQuery,
  useUpdateConversationStatusMutation,
  useSendMessageMutation,
  useDeleteConversationMutation,
} = conversationsApi;

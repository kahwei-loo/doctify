/**
 * Chat API Integration
 *
 * RTK Query API for chatbot functionality.
 * Phase 13 - Chatbot Implementation
 */

import { api } from './apiSlice';

export interface ChatConversation {
  id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_used?: string;
  created_at: string;
}

export interface CreateConversationRequest {
  title?: string;
}

export const chatApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createConversation: builder.mutation<ChatConversation, CreateConversationRequest>({
      query: (body) => ({
        url: '/chat/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ChatConversations'],
    }),

    getConversations: builder.query<ChatConversation[], { limit?: number }>({
      query: ({ limit = 50 }) => ({
        url: `/chat/conversations?limit=${limit}`,
      }),
      providesTags: ['ChatConversations'],
    }),

    getConversationMessages: builder.query<ChatMessage[], { conversationId: string; limit?: number }>({
      query: ({ conversationId, limit = 100 }) => ({
        url: `/chat/conversations/${conversationId}/messages?limit=${limit}`,
      }),
      providesTags: (result, error, { conversationId }) => [
        { type: 'ChatMessages', id: conversationId }
      ],
    }),
  }),
});

export const {
  useCreateConversationMutation,
  useGetConversationsQuery,
  useGetConversationMessagesQuery,
} = chatApi;

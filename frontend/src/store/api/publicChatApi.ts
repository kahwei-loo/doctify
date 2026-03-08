/**
 * Public Chat API
 *
 * RTK Query API for public (anonymous) chat functionality.
 * Connected to real backend API (Week 5 Phase 2).
 *
 * Note: These endpoints do NOT require authentication.
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Message, MessageListResponse } from "@/features/assistants/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:50080";

// ============================================================================
// Request/Response Types
// ============================================================================

interface PublicSendMessageRequest {
  assistant_id: string;
  session_id: string;
  content: string;
  context?: Record<string, any>;
}

interface BackendPublicChatResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  model_used?: string;
}

interface PublicSendMessageResponse {
  success: boolean;
  data: {
    conversation_id: string;
    user_message: Message;
    assistant_message: Message;
  };
}

interface GetPublicMessagesRequest {
  assistant_id: string;
  session_id: string;
}

interface PublicAssistantConfig {
  assistant_id: string;
  name: string;
  widget_config: {
    primary_color: string;
    position: string;
    welcome_message?: string;
    placeholder_text?: string;
  };
}

// SSE Event Types
interface SSEMessageSavedEvent {
  type: "message_saved";
  data: {
    conversation_id: string;
    user_message_id: string;
  };
}

interface SSEChunkEvent {
  type: "chunk";
  data: string;
}

interface SSECompleteEvent {
  type: "complete";
  data: {
    message_id: string;
    content: string;
    model_used?: string;
  };
}

interface SSEErrorEvent {
  type: "error";
  data: string;
}

type SSEEvent = SSEMessageSavedEvent | SSEChunkEvent | SSECompleteEvent | SSEErrorEvent;

// ============================================================================
// Public Chat API (No Auth Required)
// ============================================================================

// Create a separate API slice for public chat (no auth token injection)
export const publicChatApi = createApi({
  reducerPath: "publicChatApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api/v1`,
    // No auth token injection for public endpoints
  }),
  tagTypes: ["PublicMessages", "PublicConfig"],
  endpoints: (builder) => ({
    // Get assistant public config (widget settings)
    getPublicAssistantConfig: builder.query<PublicAssistantConfig, string>({
      query: (assistantId) => `/public/chat/${assistantId}/config`,
      providesTags: (_result, _error, assistantId) => [{ type: "PublicConfig", id: assistantId }],
    }),

    // Send public message (non-streaming)
    sendPublicMessage: builder.mutation<PublicSendMessageResponse, PublicSendMessageRequest>({
      query: (request) => ({
        url: `/public/chat/${request.assistant_id}/message`,
        method: "POST",
        body: {
          session_id: request.session_id,
          content: request.content,
          context: request.context,
        },
      }),
      transformResponse: (response: BackendPublicChatResponse): PublicSendMessageResponse => {
        const now = new Date().toISOString();

        return {
          success: true,
          data: {
            conversation_id: response.conversation_id,
            user_message: {
              message_id: `user-${Date.now()}`, // User message ID not returned by backend
              conversation_id: response.conversation_id,
              role: "user",
              content: "", // Will be filled by the caller
              created_at: now,
            },
            assistant_message: {
              message_id: response.message_id,
              conversation_id: response.conversation_id,
              role: "assistant",
              content: response.content,
              created_at: now,
              metadata: response.model_used ? { model_used: response.model_used } : undefined,
            },
          },
        };
      },
      // Note: Do NOT invalidate PublicMessages here — getPublicMessages is a client-side stub
      // that always returns []. Invalidating would wipe localMessages via the sync useEffect.
    }),

    // Get public chat messages (for session recovery - not implemented in backend yet)
    getPublicMessages: builder.query<MessageListResponse, GetPublicMessagesRequest>({
      // This endpoint doesn't exist in backend yet
      // For now, return empty array - messages are stored locally in the widget
      queryFn: async () => {
        return {
          data: {
            success: true,
            data: [],
            timestamp: new Date().toISOString(),
          },
        };
      },
      providesTags: ["PublicMessages"],
    }),
  }),
});

export const {
  useGetPublicAssistantConfigQuery,
  useSendPublicMessageMutation,
  useGetPublicMessagesQuery,
} = publicChatApi;

// ============================================================================
// SSE Streaming Helper
// ============================================================================

/**
 * Send a public chat message with SSE streaming response.
 *
 * This function is not a RTK Query hook because RTK Query doesn't support
 * streaming responses. Use this function directly in components.
 *
 * @param assistantId - Assistant UUID
 * @param sessionId - Client session ID from localStorage
 * @param content - Message content
 * @param onEvent - Callback for each SSE event
 * @param context - Optional context (page URL, etc.)
 * @returns AbortController to cancel the stream
 */
export const sendPublicMessageStreaming = async (
  assistantId: string,
  sessionId: string,
  content: string,
  onEvent: (event: SSEEvent) => void,
  context?: Record<string, any>
): Promise<AbortController> => {
  const controller = new AbortController();

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/public/chat/${assistantId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        content,
        context,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      onEvent({
        type: "error",
        data: `HTTP ${response.status}: ${errorText}`,
      });
      return controller;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onEvent({
        type: "error",
        data: "Failed to get response reader",
      });
      return controller;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE messages
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // Keep incomplete message in buffer

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data as SSEEvent);
          } catch (e) {
            console.error("Failed to parse SSE event:", line, e);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith("data: ")) {
      try {
        const data = JSON.parse(buffer.slice(6));
        onEvent(data as SSEEvent);
      } catch (e) {
        // Ignore incomplete final message
      }
    }
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      onEvent({
        type: "error",
        data: (error as Error).message || "Unknown error",
      });
    }
  }

  return controller;
};

// Export SSE event types for consumers
export type { SSEEvent, SSEMessageSavedEvent, SSEChunkEvent, SSECompleteEvent, SSEErrorEvent };

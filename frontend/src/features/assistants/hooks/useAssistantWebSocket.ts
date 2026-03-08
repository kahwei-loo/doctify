/**
 * useAssistantWebSocket Hook
 *
 * Custom React hook for WebSocket connection to receive real-time
 * assistant and conversation updates.
 *
 * Week 5 Phase 2 - WebSocket Real-time Updates
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

// WebSocket Event Types
export interface AssistantWebSocketEvent {
  type: "conversation.created" | "conversation.updated" | "message.created" | "heartbeat";
  data: Record<string, unknown>;
  timestamp: string;
}

export interface ConversationCreatedEvent extends AssistantWebSocketEvent {
  type: "conversation.created";
  data: {
    assistant_id: string;
    conversation_id: string;
    preview: string;
  };
}

export interface ConversationUpdatedEvent extends AssistantWebSocketEvent {
  type: "conversation.updated";
  data: {
    assistant_id: string;
    conversation_id: string;
    status: string;
    preview?: string;
  };
}

export interface MessageCreatedEvent extends AssistantWebSocketEvent {
  type: "message.created";
  data: {
    conversation_id: string;
    message_id: string;
    role: "user" | "assistant";
    content: string;
  };
}

export type WebSocketEventUnion =
  | ConversationCreatedEvent
  | ConversationUpdatedEvent
  | MessageCreatedEvent
  | AssistantWebSocketEvent;

interface UseAssistantWebSocketOptions {
  assistantId?: string;
  conversationId?: string;
  onEvent?: (event: WebSocketEventUnion) => void;
  enabled?: boolean;
}

interface UseAssistantWebSocketReturn {
  isConnected: boolean;
  lastEvent: WebSocketEventUnion | null;
  connect: () => void;
  disconnect: () => void;
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:50080";

/**
 * Hook for subscribing to real-time assistant/conversation updates via WebSocket.
 *
 * Usage:
 * - For assistant-level updates (all conversations): provide assistantId
 * - For conversation-level updates (specific chat): provide conversationId
 *
 * @param options Configuration options
 * @returns WebSocket connection state and controls
 */
export function useAssistantWebSocket({
  assistantId,
  conversationId,
  onEvent,
  enabled = true,
}: UseAssistantWebSocketOptions): UseAssistantWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEventUnion | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const shouldConnectRef = useRef(true);
  const onEventRef = useRef(onEvent);

  // Get auth token from Redux store
  const token = useSelector((state: RootState) => state.auth.tokens?.access_token);

  // Keep onEvent ref updated
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Determine WebSocket URL based on subscription type
  const getWsUrl = useCallback(() => {
    if (!token) return null;

    if (conversationId) {
      return `${WS_BASE_URL}/api/v1/ws/conversations/${conversationId}?token=${token}`;
    }

    if (assistantId) {
      return `${WS_BASE_URL}/api/v1/ws/assistants/${assistantId}?token=${token}`;
    }

    return null;
  }, [assistantId, conversationId, token]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    const url = getWsUrl();
    if (!url || !enabled) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[AssistantWS] Connected to ${assistantId || conversationId}`);
        setIsConnected(true);
        reconnectCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsed: WebSocketEventUnion = JSON.parse(event.data);
          setLastEvent(parsed);

          // Call event handler if provided
          if (onEventRef.current && parsed.type !== "heartbeat") {
            onEventRef.current(parsed);
          }
        } catch (error) {
          console.error("[AssistantWS] Failed to parse message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[AssistantWS] WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log(`[AssistantWS] Disconnected (code=${event.code})`);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection if enabled and not intentionally closed
        if (shouldConnectRef.current && reconnectCountRef.current < 5 && event.code !== 1000) {
          reconnectCountRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 30000);
          console.log(
            `[AssistantWS] Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;

      // Send periodic heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);

      // Clean up heartbeat on close
      ws.addEventListener("close", () => {
        clearInterval(heartbeatInterval);
      });
    } catch (error) {
      console.error("[AssistantWS] Failed to create WebSocket:", error);
    }
  }, [getWsUrl, enabled, assistantId, conversationId]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    shouldConnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Auto-connect when dependencies change
  useEffect(() => {
    if (!enabled || !token || (!assistantId && !conversationId)) {
      disconnect();
      return;
    }

    shouldConnectRef.current = true;
    connect();

    return () => {
      shouldConnectRef.current = false;
      disconnect();
    };
  }, [assistantId, conversationId, token, enabled]);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
  };
}

export default useAssistantWebSocket;

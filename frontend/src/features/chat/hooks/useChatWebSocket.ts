/**
 * useChatWebSocket Hook
 *
 * Custom React hook for WebSocket chat connection with streaming support.
 * Phase 13 - Chatbot Implementation
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface StreamChunk {
  type: "intent" | "tool_start" | "chunk" | "tool_result" | "complete" | "error";
  data: unknown;
}

interface UseChatWebSocketOptions {
  conversationId: string;
  onChunk: (chunk: StreamChunk) => void;
  token?: string;
  enabled?: boolean;
}

export function useChatWebSocket({ conversationId, onChunk, token, enabled = true }: UseChatWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Store onChunk in ref to avoid useEffect dependency issues
  const onChunkRef = useRef(onChunk);

  // Update ref when onChunk changes
  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

  useEffect(() => {
    if (!enabled) return;

    // Use environment variable for WebSocket URL
    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:50080";
    const wsUrl = `${wsBaseUrl}/api/v1/chat/ws/${conversationId}${token ? `?token=${token}` : ""}`;

    // Cancel flag for StrictMode cleanup
    let cancelled = false;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      if (cancelled) return; // Ignore if connection was cancelled
      console.log("Chat WebSocket connected");
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      if (cancelled) return; // Ignore if connection was cancelled
      try {
        const chunk: StreamChunk = JSON.parse(event.data);
        // Use ref to get latest onChunk without dependency issues
        onChunkRef.current(chunk);

        if (chunk.type === "complete" || chunk.type === "error") {
          setIsSending(false);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.current.onerror = (error) => {
      if (cancelled) return; // Ignore if connection was cancelled
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    ws.current.onclose = () => {
      if (cancelled) return; // Ignore if connection was cancelled
      console.log("Chat WebSocket disconnected");
      setIsConnected(false);
    };

    return () => {
      cancelled = true; // Mark as cancelled to ignore all pending callbacks
      ws.current?.close();
    };
  }, [conversationId, token, enabled]); // Removed onChunk from dependencies

  const sendMessage = useCallback((message: string) => {
    if (ws.current?.readyState === WebSocket.OPEN && message.trim()) {
      ws.current.send(JSON.stringify({ message }));
      setIsSending(true);
    }
  }, []);

  return { isConnected, isSending, sendMessage };
}

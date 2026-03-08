/**
 * useDocumentWebSocket Hook
 *
 * Custom hook for real-time document status updates via WebSocket.
 * Listens for document events and updates state accordingly.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { WebSocketDocumentUpdate, DocumentStatus } from "../types";

interface UseDocumentWebSocketOptions {
  projectId?: string;
  onStatusChange?: (documentId: string, status: DocumentStatus) => void;
  onDocumentCompleted?: (documentId: string, confidence: number) => void;
  onDocumentFailed?: (documentId: string, error: string) => void;
  autoConnect?: boolean;
}

interface UseDocumentWebSocketReturn {
  isConnected: boolean;
  lastUpdate: WebSocketDocumentUpdate | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:50080";

export const useDocumentWebSocket = (
  options: UseDocumentWebSocketOptions = {}
): UseDocumentWebSocketReturn => {
  const {
    projectId,
    onStatusChange,
    onDocumentCompleted,
    onDocumentFailed,
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<WebSocketDocumentUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const update: WebSocketDocumentUpdate = JSON.parse(event.data);
        setLastUpdate(update);

        // Call appropriate callback based on event type
        switch (update.type) {
          case "document.status_change":
            onStatusChange?.(update.data.document_id, update.data.status);
            break;

          case "document.completed":
            if (update.data.confidence !== undefined) {
              onDocumentCompleted?.(update.data.document_id, update.data.confidence);
            }
            break;

          case "document.failed":
            if (update.data.error) {
              onDocumentFailed?.(update.data.document_id, update.data.error);
            }
            break;
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    },
    [onStatusChange, onDocumentCompleted, onDocumentFailed]
  );

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Construct WebSocket URL with optional project filter
      const url = projectId
        ? `${WS_BASE_URL}/api/v1/ws/documents?project_id=${projectId}`
        : `${WS_BASE_URL}/api/v1/ws/documents`;

      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log("WebSocket connected");
      };

      ws.onmessage = handleMessage;

      ws.onerror = (event) => {
        console.error("WebSocket error:", event);
        setError("WebSocket connection error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        console.log("WebSocket disconnected");

        // Attempt reconnection if within retry limit
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current += 1;
          console.log(
            `Attempting to reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          setError("Failed to connect after multiple attempts");
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to create WebSocket connection:", err);
      setError("Failed to establish connection");
    }
  }, [projectId, handleMessage]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  /**
   * Reconnect when projectId changes
   */
  useEffect(() => {
    if (isConnected && wsRef.current) {
      disconnect();
      connect();
    }
  }, [projectId]);

  return {
    isConnected,
    lastUpdate,
    error,
    connect,
    disconnect,
  };
};

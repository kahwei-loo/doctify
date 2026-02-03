/**
 * useWebSocket Hook
 *
 * Generic WebSocket hook for real-time bidirectional communication.
 * Handles connection, reconnection, and message handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseWebSocketOptions {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: MessageEvent | null;
  send: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    reconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef(0);
  const shouldConnectRef = useRef(true);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = (event) => {
        setIsConnected(true);
        reconnectCountRef.current = 0;
        onOpen?.(event);
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;
        onClose?.(event);

        // Attempt reconnection if enabled
        if (shouldConnectRef.current && reconnect && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onmessage = (event) => {
        setLastMessage(event);
        onMessage?.(event);
      };

      ws.onerror = (event) => {
        onError?.(event);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [url, onOpen, onClose, onMessage, onError, reconnect, reconnectInterval, reconnectAttempts]);

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
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Send message through WebSocket
   */
  const send = useCallback((data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  /**
   * Auto-connect on mount
   * Only reconnect when URL changes, not when callbacks change
   */
  useEffect(() => {
    shouldConnectRef.current = true;
    connect();

    return () => {
      shouldConnectRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return {
    isConnected,
    lastMessage,
    send,
    connect,
    disconnect,
  };
}

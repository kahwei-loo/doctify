/**
 * Custom hook for WebSocket connection to document list updates
 * Subscribes to document.list_update and document.progress events
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { WebSocketFactory, WebSocketManager } from "@/shared/utils/websocket";
import type { DocumentListItem } from "../types";

// Simple logger
const logger = {
  info: (message: string, data?: unknown) => console.log(`[WS Hook] ${message}`, data || ""),
  warn: (message: string, data?: unknown) => console.warn(`[WS Hook] ${message}`, data || ""),
  error: (message: string, data?: unknown) => console.error(`[WS Hook] ${message}`, data || ""),
  debug: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.debug(`[WS Hook] ${message}`, data || "");
    }
  },
};

export interface DocumentListUpdateEvent {
  event: "document.list_update";
  data: DocumentListItem;
  timestamp: string;
}

export interface DocumentProgressEvent {
  event: "document.progress";
  data: {
    document_id: string;
    progress: number;
    status: string;
  };
  timestamp: string;
}

export interface ExportProgressEvent {
  event: "export.progress";
  data: {
    export_id: string;
    progress: number;
    status: string;
  };
  timestamp: string;
}

export interface ExportDoneEvent {
  event: "export.done";
  data: {
    export_id: string;
    download_url: string;
  };
  timestamp: string;
}

type WebSocketEvent =
  | DocumentListUpdateEvent
  | DocumentProgressEvent
  | ExportProgressEvent
  | ExportDoneEvent
  | { event: string; data: unknown; timestamp: string };

export interface UseDocumentListWebSocketOptions {
  enabled?: boolean;
  onDocumentUpdate?: (document: DocumentListItem) => void;
  onDocumentProgress?: (data: DocumentProgressEvent["data"]) => void;
  onExportProgress?: (data: ExportProgressEvent["data"]) => void;
  onExportDone?: (data: ExportDoneEvent["data"]) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useDocumentListWebSocket(options: UseDocumentListWebSocketOptions = {}) {
  const {
    enabled = true,
    onDocumentUpdate,
    onDocumentProgress,
    onExportProgress,
    onExportDone,
    onConnectionChange,
  } = options;

  const wsRef = useRef<WebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const isConnectingRef = useRef(false);

  // Store callbacks in refs to avoid reconnection on callback changes
  const callbacksRef = useRef({
    onDocumentUpdate,
    onDocumentProgress,
    onExportProgress,
    onExportDone,
    onConnectionChange,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onDocumentUpdate,
      onDocumentProgress,
      onExportProgress,
      onExportDone,
      onConnectionChange,
    };
  }, [onDocumentUpdate, onDocumentProgress, onExportProgress, onExportDone, onConnectionChange]);

  // Connect on mount, disconnect on unmount
  // Create connection directly in useEffect to avoid stale closures
  useEffect(() => {
    const timestamp = new Date().toISOString();
    logger.info(`🎣 [WS Hook] useEffect FIRED at ${timestamp}`);
    logger.info(`🎣 [WS Hook] enabled: ${enabled}`);
    logger.info(`🎣 [WS Hook] isConnectingRef.current: ${isConnectingRef.current}`);
    logger.info(`🎣 [WS Hook] wsRef.current exists: ${wsRef.current !== null}`);
    logger.info(`🎣 [WS Hook] wsRef.current?.isConnected(): ${wsRef.current?.isConnected()}`);

    if (!enabled) {
      logger.info(`⏸️ [WS Hook] Skipping - not enabled`);
      return;
    }

    // Prevent duplicate connection attempts
    if (isConnectingRef.current || wsRef.current?.isConnected()) {
      logger.warn(
        `⚠️ [WS Hook] Skipping - already connecting (${isConnectingRef.current}) or connected (${wsRef.current?.isConnected()})`
      );
      return;
    }

    logger.info(`🎣 [WS Hook] Setting isConnectingRef.current = true`);
    isConnectingRef.current = true;

    // Cancel flag for StrictMode cleanup
    let cancelled = false;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as WebSocketEvent;
        logger.debug("WebSocket message received:", message);

        switch (message.event) {
          case "document.list_update":
            callbacksRef.current.onDocumentUpdate?.(message.data as DocumentListItem);
            break;

          case "document.progress":
            callbacksRef.current.onDocumentProgress?.(
              message.data as DocumentProgressEvent["data"]
            );
            break;

          case "export.progress":
            callbacksRef.current.onExportProgress?.(message.data as ExportProgressEvent["data"]);
            break;

          case "export.done":
            callbacksRef.current.onExportDone?.(message.data as ExportDoneEvent["data"]);
            break;

          case "document.list_connected":
            logger.info("Document list WebSocket connected");
            break;

          case "system.pong":
            // Heartbeat response, no action needed
            break;

          default:
            logger.debug("Unknown WebSocket event:", message.event);
        }
      } catch (error) {
        logger.error("Failed to parse WebSocket message:", error);
      }
    };

    logger.info(`🎣 [WS Hook] Calling WebSocketFactory.createDocumentListConnection()...`);
    const ws = WebSocketFactory.createDocumentListConnection({
      onOpen: () => {
        if (cancelled) return; // Ignore if connection was cancelled
        logger.info(`✅ [WS Hook] onOpen callback fired - connection successful!`);
        isConnectingRef.current = false; // Reset on successful connection
        setIsConnected(true);
        setConnectionError(null);
        callbacksRef.current.onConnectionChange?.(true);
        logger.info("✅ [WS Hook] Document list WebSocket connected");
      },
      onMessage: handleMessage,
      onClose: () => {
        if (cancelled) return; // Ignore if connection was cancelled
        logger.warn(`👋 [WS Hook] onClose callback fired - connection closed`);
        isConnectingRef.current = false; // Reset on close to allow reconnection
        setIsConnected(false);
        callbacksRef.current.onConnectionChange?.(false);
        logger.info("👋 [WS Hook] Document list WebSocket disconnected");
      },
      onError: (error) => {
        if (cancelled) return; // Ignore if connection was cancelled
        logger.error(`❌ [WS Hook] onError callback fired - connection error`);
        isConnectingRef.current = false; // Reset on error to allow reconnection
        setConnectionError("WebSocket connection failed");
        logger.error("❌ [WS Hook] Document list WebSocket error:", error);
      },
      autoReconnect: true,
    });

    logger.info(`🎣 [WS Hook] WebSocketManager instance received, storing in wsRef.current`);
    wsRef.current = ws;

    logger.info(`🎣 [WS Hook] Calling ws.connect()...`);
    ws.connect().catch((error) => {
      if (cancelled) return; // Ignore if connection was cancelled
      logger.error(`❌ [WS Hook] ws.connect() promise rejected`);
      isConnectingRef.current = false; // Reset on connection failure
      setConnectionError("Failed to connect to WebSocket");
      logger.error("❌ [WS Hook] Failed to connect document list WebSocket:", error);
    });

    return () => {
      cancelled = true; // Mark as cancelled to ignore all pending callbacks
      logger.info(`🧹 [WS Hook] useEffect cleanup function called`);
      isConnectingRef.current = false; // Reset on cleanup
      if (wsRef.current) {
        logger.info(`🧹 [WS Hook] Closing existing WebSocket connection`);
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      logger.info(`🧹 [WS Hook] Cleanup complete`);
    };
  }, [enabled]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    // Connection will be re-established by the useEffect
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
  };
}

/**
 * Custom hook for WebSocket connection to a specific document's progress
 */
export interface UseDocumentProgressWebSocketOptions {
  documentId: string;
  enabled?: boolean;
  onProgress?: (progress: number, status: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useDocumentProgressWebSocket(options: UseDocumentProgressWebSocketOptions) {
  const { documentId, enabled = true, onProgress, onConnectionChange } = options;

  const wsRef = useRef<WebSocketManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");

  const callbacksRef = useRef({ onProgress, onConnectionChange });

  useEffect(() => {
    callbacksRef.current = { onProgress, onConnectionChange };
  }, [onProgress, onConnectionChange]);

  useEffect(() => {
    if (!enabled || !documentId) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.event === "document.progress") {
          const { progress: newProgress, status: newStatus } = message.data;
          setProgress(newProgress);
          setStatus(newStatus);
          callbacksRef.current.onProgress?.(newProgress, newStatus);
        } else if (message.event === "document.connection_established") {
          logger.info(`Document ${documentId} WebSocket connected`);
        }
      } catch (error) {
        logger.error("Failed to parse document progress message:", error);
      }
    };

    const ws = WebSocketFactory.createDocumentStatusConnection(documentId, {
      onOpen: () => {
        setIsConnected(true);
        callbacksRef.current.onConnectionChange?.(true);
      },
      onMessage: handleMessage,
      onClose: () => {
        setIsConnected(false);
        callbacksRef.current.onConnectionChange?.(false);
      },
      autoReconnect: true,
    });

    wsRef.current = ws;

    ws.connect().catch((error) => {
      logger.error(`Failed to connect document ${documentId} WebSocket:`, error);
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [documentId, enabled]);

  return {
    isConnected,
    progress,
    status,
  };
}

export default useDocumentListWebSocket;

/**
 * WebSocket Client
 *
 * Centralized WebSocket client with connection management,
 * automatic reconnection, and event handling.
 */

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:50080";

export type WebSocketEventType =
  | "document.status_change"
  | "document.completed"
  | "document.failed"
  | "project.updated"
  | "notification";

export interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
  timestamp: string;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private isIntentionallyClosed = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatIntervalTime = 30000; // 30 seconds

  constructor(endpoint: string) {
    this.url = `${WS_BASE_URL}${endpoint}`;
  }

  /**
   * Connect to WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;

    try {
      // Add authentication token to URL
      const token = localStorage.getItem("access_token");
      const urlWithAuth = token ? `${this.url}?token=${token}` : this.url;

      this.ws = new WebSocket(urlWithAuth);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      console.error("[WebSocket] Connection error:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("[WebSocket] Cannot send message - not connected");
    }
  }

  /**
   * Subscribe to WebSocket event
   */
  on(eventType: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }

    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Unsubscribe from WebSocket event
   */
  off(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get connection state
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    console.log("[WebSocket] Connected");
    this.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    console.log("[WebSocket] Disconnected");

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Attempt reconnection if not intentionally closed
    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error("[WebSocket] Error:", event);
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Emit to registered handlers
      const handlers = this.eventHandlers.get(message.type);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            console.error("[WebSocket] Handler error:", error);
          }
        });
      }
    } catch (error) {
      console.error("[WebSocket] Failed to parse message:", error);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WebSocket] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[WebSocket] Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "ping" });
      }
    }, this.heartbeatIntervalTime);
  }
}

/**
 * Create WebSocket client instance
 */
export const createWebSocketClient = (endpoint: string): WebSocketClient => {
  return new WebSocketClient(endpoint);
};

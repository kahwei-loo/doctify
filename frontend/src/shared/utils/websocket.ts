/**
 * WebSocket Connection Manager
 * Centralized WebSocket connection management for Doctify
 */

// API Configuration from environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
// Use explicit WS URL if provided, otherwise derive from API URL
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || API_BASE_URL.replace(/^http/, "ws");

// WebSocket configuration
const WEBSOCKET_CONFIG = {
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000,
};

// Simple logger
const logger = {
  info: (message: string, data?: unknown) => console.log(`[WS] ${message}`, data || ""),
  warn: (message: string, data?: unknown) => console.warn(`[WS] ${message}`, data || ""),
  error: (message: string, data?: unknown) => console.error(`[WS] ${message}`, data || ""),
  debug: (message: string, data?: unknown) => {
    if (import.meta.env.DEV) {
      console.debug(`[WS] ${message}`, data || "");
    }
  },
};

// API Endpoints
const WEBSOCKET_ENDPOINTS = {
  DOCUMENT_STATUS: (documentId: string) => `/api/v1/ws/documents/${documentId}/status`,
  DOCUMENT_LIST: "/api/v1/ws/documents",
  NOTIFICATIONS: "/api/v1/ws/notifications",
};

export interface WebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private options: WebSocketOptions;
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isManualClose = false;

  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url;
    this.options = {
      autoReconnect: true,
      maxReconnectAttempts: WEBSOCKET_CONFIG.RECONNECT_ATTEMPTS,
      reconnectDelay: WEBSOCKET_CONFIG.RECONNECT_DELAY,
      heartbeatInterval: WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL,
      ...options,
    };
  }

  /**
   * Connect to WebSocket
   */
  connect(): Promise<void> {
    const timestamp = new Date().toISOString();
    logger.info(`🔌 [WS Client] connect() called at ${timestamp}`);
    logger.info(`🔌 [WS Client] URL: ${this.url}`);
    logger.info(`🔌 [WS Client] Auto-reconnect: ${this.options.autoReconnect}`);
    logger.info(`🔌 [WS Client] Reconnect attempts so far: ${this.reconnectAttempts}`);

    return new Promise((resolve, reject) => {
      try {
        logger.info(`🔌 [WS Client] Creating new WebSocket object...`);
        this.ws = new WebSocket(this.url);
        logger.info(
          `🔌 [WS Client] WebSocket object created, initial readyState: ${this.ws.readyState} (0=CONNECTING)`
        );
        this.isManualClose = false;

        this.ws.onopen = (event) => {
          logger.info(`✅ [WS Client] WebSocket OPEN event fired: ${this.url}`);
          logger.info(`✅ [WS Client] readyState: ${this.ws?.readyState} (1=OPEN)`);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.options.onOpen?.(event);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Process heartbeat response (backend sends event: "system.pong")
            if (data.event === "system.pong" || data.type === "pong") {
              logger.debug("Heartbeat received from server");
              return;
            }

            // Process connection confirmation
            if (
              data.event === "document.connection_established" ||
              data.event === "document.list_connected" ||
              data.type === "connection_established"
            ) {
              logger.debug("Connection confirmed by server", data);
            }

            this.options.onMessage?.(event);
          } catch {
            logger.error("WebSocket message parsing error");
            this.options.onMessage?.(event); // Still pass raw message
          }
        };

        this.ws.onerror = (event) => {
          logger.error(`❌ [WS Client] WebSocket ERROR event fired: ${this.url}`);
          logger.error(`❌ [WS Client] readyState: ${this.ws?.readyState}`, event);
          this.options.onError?.(event);
          reject(event);
        };

        this.ws.onclose = (event) => {
          logger.warn(`👋 [WS Client] WebSocket CLOSE event fired: ${this.url}`);
          logger.warn(
            `👋 [WS Client] Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`
          );
          logger.warn(`👋 [WS Client] readyState: ${this.ws?.readyState} (3=CLOSED)`);
          logger.warn(
            `👋 [WS Client] Manual close: ${this.isManualClose}, Auto-reconnect: ${this.options.autoReconnect}`
          );
          this.stopHeartbeat();
          this.options.onClose?.(event);

          // Attempt reconnection if not manually closed and auto-reconnect is enabled
          if (!this.isManualClose && this.options.autoReconnect) {
            logger.info(
              `🔄 [WS Client] Will attempt reconnect (attempt ${this.reconnectAttempts + 1}/${this.options.maxReconnectAttempts})`
            );
            this.attemptReconnect();
          }
        };
      } catch (error) {
        logger.error("❌ [WS Client] WebSocket connection error in try-catch", error);
        reject(error);
      }
    });
  }

  /**
   * Send message
   */
  send(data: string | Record<string, unknown>): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const message = typeof data === "string" ? data : JSON.stringify(data);
        this.ws.send(message);
        return true;
      } catch (error) {
        logger.error("WebSocket send error", error);
        return false;
      }
    }
    logger.warn("WebSocket is not connected");
    return false;
  }

  /**
   * Close connection
   */
  close(): void {
    this.isManualClose = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get connection state
   */
  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (this.options.heartbeatInterval && this.options.heartbeatInterval > 0) {
      this.heartbeatTimer = setInterval(() => {
        if (this.isConnected()) {
          this.send("ping");
        }
      }, this.options.heartbeatInterval);
    }
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Attempt reconnection
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 0)) {
      logger.error("Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay! * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        logger.error("Reconnect failed", error);
      });
    }, delay);
  }
}

/**
 * WebSocket Factory
 */
export class WebSocketFactory {
  private static connections = new Map<string, WebSocketManager>();

  /**
   * Build WebSocket URL with authentication token
   */
  private static buildWsUrl(endpoint: string): string {
    const token = localStorage.getItem("access_token");
    const baseUrl = `${WS_BASE_URL}${endpoint}`;

    // Add token as query parameter if available
    if (token) {
      const separator = endpoint.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}token=${token}`;
    }

    return baseUrl;
  }

  /**
   * Create document status WebSocket connection
   */
  static createDocumentStatusConnection(
    documentId: string,
    options: WebSocketOptions = {}
  ): WebSocketManager {
    const key = `document-${documentId}`;
    const url = this.buildWsUrl(WEBSOCKET_ENDPOINTS.DOCUMENT_STATUS(documentId));

    // Reuse existing connection if it's still connected or connecting
    const existing = this.connections.get(key);
    if (existing) {
      const state = existing.getReadyState();
      // Only reuse if CONNECTING or OPEN, close if CLOSING or CLOSED
      if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
        logger.debug(`Reusing existing document ${documentId} WebSocket connection`);
        return existing;
      }
      // Close stale connection
      existing.close();
    }

    const ws = new WebSocketManager(url, options);
    this.connections.set(key, ws);
    return ws;
  }

  /**
   * Create document list WebSocket connection
   */
  static createDocumentListConnection(options: WebSocketOptions = {}): WebSocketManager {
    const timestamp = new Date().toISOString();
    logger.info(`🏭 [WS Factory] createDocumentListConnection() called at ${timestamp}`);

    const key = "document-list";
    const url = this.buildWsUrl(WEBSOCKET_ENDPOINTS.DOCUMENT_LIST);
    logger.info(`🏭 [WS Factory] Connection key: ${key}`);
    logger.info(`🏭 [WS Factory] URL: ${url}`);

    // Reuse existing connection if it's still connected or connecting
    const existing = this.connections.get(key);
    if (existing) {
      const state = existing.getReadyState();
      logger.info(
        `🏭 [WS Factory] Existing connection found, readyState: ${state} (0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)`
      );

      // Only reuse if CONNECTING or OPEN, close if CLOSING or CLOSED
      if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
        logger.info(
          `✅ [WS Factory] Reusing existing document list WebSocket connection (state=${state})`
        );
        return existing;
      }

      // Close stale connection
      logger.warn(
        `⚠️ [WS Factory] Closing stale connection (state=${state}) before creating new one`
      );
      existing.close();
    } else {
      logger.info(`🏭 [WS Factory] No existing connection found in map`);
    }

    logger.info(`🏭 [WS Factory] Creating NEW WebSocketManager instance...`);
    const ws = new WebSocketManager(url, options);
    this.connections.set(key, ws);
    logger.info(`✅ [WS Factory] New WebSocketManager created and stored in connections map`);
    return ws;
  }

  /**
   * Create notification WebSocket connection
   */
  static createNotificationConnection(options: WebSocketOptions = {}): WebSocketManager {
    const key = "notifications";
    const url = this.buildWsUrl(WEBSOCKET_ENDPOINTS.NOTIFICATIONS);

    // Reuse existing connection if it's still connected or connecting
    const existing = this.connections.get(key);
    if (existing) {
      const state = existing.getReadyState();
      // Only reuse if CONNECTING or OPEN, close if CLOSING or CLOSED
      if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
        logger.debug("Reusing existing notifications WebSocket connection");
        return existing;
      }
      // Close stale connection
      existing.close();
    }

    const ws = new WebSocketManager(url, options);
    this.connections.set(key, ws);
    return ws;
  }

  /**
   * Get existing connection
   */
  static getConnection(key: string): WebSocketManager | undefined {
    return this.connections.get(key);
  }

  /**
   * Close specified connection
   */
  static closeConnection(key: string): void {
    const ws = this.connections.get(key);
    if (ws) {
      ws.close();
      this.connections.delete(key);
    }
  }

  /**
   * Close all connections
   */
  static closeAllConnections(): void {
    this.connections.forEach((ws) => {
      ws.close();
    });
    this.connections.clear();
  }
}

export default WebSocketManager;

/**
 * WebSocket Manager
 *
 * Manages multiple WebSocket connections and provides a unified interface.
 */

import {
  WebSocketClient,
  createWebSocketClient,
  WebSocketEventType,
  WebSocketEventHandler,
} from "./client";

class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map();

  /**
   * Get or create WebSocket client for endpoint
   */
  getClient(endpoint: string): WebSocketClient {
    if (!this.clients.has(endpoint)) {
      const client = createWebSocketClient(endpoint);
      this.clients.set(endpoint, client);
    }

    return this.clients.get(endpoint)!;
  }

  /**
   * Connect to WebSocket endpoint
   */
  connect(endpoint: string): void {
    const client = this.getClient(endpoint);
    client.connect();
  }

  /**
   * Disconnect from WebSocket endpoint
   */
  disconnect(endpoint: string): void {
    const client = this.clients.get(endpoint);
    if (client) {
      client.disconnect();
      this.clients.delete(endpoint);
    }
  }

  /**
   * Disconnect from all WebSocket endpoints
   */
  disconnectAll(): void {
    this.clients.forEach((client) => {
      client.disconnect();
    });
    this.clients.clear();
  }

  /**
   * Subscribe to event on specific endpoint
   */
  on(endpoint: string, eventType: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    const client = this.getClient(endpoint);
    return client.on(eventType, handler);
  }

  /**
   * Check if endpoint is connected
   */
  isConnected(endpoint: string): boolean {
    const client = this.clients.get(endpoint);
    return client?.isConnected() || false;
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();

// Export WebSocket endpoints
export const WS_ENDPOINTS = {
  DOCUMENTS: "/api/v1/ws/documents",
  PROJECTS: "/api/v1/ws/projects",
  NOTIFICATIONS: "/api/v1/ws/notifications",
} as const;

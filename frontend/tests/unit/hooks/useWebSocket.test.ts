/**
 * Unit Tests for useWebSocket Hook
 *
 * Tests WebSocket connection, messaging, and reconnection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWebSocket } from "@/shared/hooks/useWebSocket";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private static instances: MockWebSocket[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  // Helper to simulate connection opening
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event("open"));
    }
  }

  // Helper to simulate connection closing
  simulateClose(code = 1000, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent("close", { code, reason }));
    }
  }

  // Helper to simulate receiving a message
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  // Helper to simulate error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }

  send = vi.fn();

  close() {
    this.readyState = MockWebSocket.CLOSING;
    // Simulate async close
    setTimeout(() => {
      this.simulateClose();
    }, 0);
  }

  static getLastInstance(): MockWebSocket | undefined {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1];
  }

  static clearInstances() {
    MockWebSocket.instances = [];
  }
}

// Save original WebSocket
const OriginalWebSocket = global.WebSocket;

describe("useWebSocket Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.clearInstances();
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    global.WebSocket = OriginalWebSocket;
  });

  describe("Connection", () => {
    it("auto-connects to WebSocket server on mount", async () => {
      renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      const ws = MockWebSocket.getLastInstance();
      expect(ws).toBeDefined();
      expect(ws?.url).toBe("ws://localhost:8000/ws");
    });

    it("sets isConnected to true when connection opens", async () => {
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      expect(result.current.isConnected).toBe(false);

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });

    it("calls onOpen callback when connected", async () => {
      const onOpen = vi.fn();
      renderHook(() => useWebSocket("ws://localhost:8000/ws", { onOpen }));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it("does not reconnect if already connected", async () => {
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      const instanceCountBefore = MockWebSocket["instances"].length;

      act(() => {
        result.current.connect();
      });

      // Should not create a new instance
      expect(MockWebSocket["instances"].length).toBe(instanceCountBefore);
    });
  });

  describe("Disconnection", () => {
    it("sets isConnected to false when disconnected", async () => {
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });

    it("calls onClose callback when disconnected", async () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws", { onClose }));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("cleans up connection on unmount", async () => {
      const onClose = vi.fn();
      const { unmount } = renderHook(() => useWebSocket("ws://localhost:8000/ws", { onClose }));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      unmount();

      // Should have triggered close
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe("Sending Messages", () => {
    it("sends message successfully when connected", async () => {
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      act(() => {
        result.current.send("Hello, World!");
      });

      expect(ws?.send).toHaveBeenCalledWith("Hello, World!");
    });

    it("does not throw when sending while disconnected", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      // Not connected yet, should warn but not throw
      expect(() => {
        act(() => {
          result.current.send("test");
        });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith("WebSocket is not connected. Cannot send message.");

      consoleSpy.mockRestore();
    });

    it("sends different data types", async () => {
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      // String
      act(() => {
        result.current.send("string message");
      });
      expect(ws?.send).toHaveBeenCalledWith("string message");

      // JSON stringified object
      const jsonData = JSON.stringify({ type: "test", data: "hello" });
      act(() => {
        result.current.send(jsonData);
      });
      expect(ws?.send).toHaveBeenCalledWith(jsonData);
    });
  });

  describe("Receiving Messages", () => {
    it("updates lastMessage when message received", async () => {
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      expect(result.current.lastMessage).toBeNull();

      act(() => {
        ws?.simulateMessage('{"type": "notification", "data": "test"}');
      });

      expect(result.current.lastMessage).toBeDefined();
      expect(result.current.lastMessage?.data).toBe('{"type": "notification", "data": "test"}');
    });

    it("calls onMessage callback when message received", async () => {
      const onMessage = vi.fn();
      renderHook(() => useWebSocket("ws://localhost:8000/ws", { onMessage }));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      act(() => {
        ws?.simulateMessage("test message");
      });

      expect(onMessage).toHaveBeenCalledTimes(1);
      expect(onMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: "test message",
        })
      );
    });

    it("updates lastMessage on each new message", async () => {
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      act(() => {
        ws?.simulateMessage("message 1");
      });
      expect(result.current.lastMessage?.data).toBe("message 1");

      act(() => {
        ws?.simulateMessage("message 2");
      });
      expect(result.current.lastMessage?.data).toBe("message 2");
    });
  });

  describe("Reconnection", () => {
    it("attempts reconnection when connection closes unexpectedly", async () => {
      vi.useFakeTimers();

      renderHook(() =>
        useWebSocket("ws://localhost:8000/ws", {
          reconnect: true,
          reconnectInterval: 1000,
        })
      );

      const ws1 = MockWebSocket.getLastInstance();
      act(() => {
        ws1?.simulateOpen();
      });

      const instanceCountAfterFirst = MockWebSocket["instances"].length;

      // Simulate unexpected close (server-initiated)
      act(() => {
        ws1?.simulateClose(1006, "Connection lost");
      });

      // Advance timer to trigger reconnection
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should have created a new WebSocket instance
      expect(MockWebSocket["instances"].length).toBeGreaterThan(instanceCountAfterFirst);

      vi.useRealTimers();
    });

    it("does not reconnect when reconnect is disabled", async () => {
      vi.useFakeTimers();

      renderHook(() =>
        useWebSocket("ws://localhost:8000/ws", {
          reconnect: false,
        })
      );

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      const instanceCount = MockWebSocket["instances"].length;

      act(() => {
        ws?.simulateClose();
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not have created new instances
      expect(MockWebSocket["instances"].length).toBe(instanceCount);

      vi.useRealTimers();
    });

    it("stops reconnecting after max attempts", async () => {
      vi.useFakeTimers();

      renderHook(() =>
        useWebSocket("ws://localhost:8000/ws", {
          reconnect: true,
          reconnectInterval: 100,
          reconnectAttempts: 2,
        })
      );

      const ws1 = MockWebSocket.getLastInstance();
      act(() => {
        ws1?.simulateOpen();
      });

      // First close - should trigger first reconnect attempt
      act(() => {
        ws1?.simulateClose();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const ws2 = MockWebSocket.getLastInstance();
      act(() => {
        ws2?.simulateClose(); // Second close
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const ws3 = MockWebSocket.getLastInstance();
      act(() => {
        ws3?.simulateClose(); // Third close - should not trigger more
      });

      const instanceCountAfterMax = MockWebSocket["instances"].length;

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should not have created more instances after max attempts
      expect(MockWebSocket["instances"].length).toBe(instanceCountAfterMax);

      vi.useRealTimers();
    });

    it("does not reconnect when disconnect is called manually", async () => {
      vi.useFakeTimers();

      const { result } = renderHook(() =>
        useWebSocket("ws://localhost:8000/ws", {
          reconnect: true,
          reconnectInterval: 100,
        })
      );

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      const instanceCount = MockWebSocket["instances"].length;

      // Manual disconnect
      act(() => {
        result.current.disconnect();
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should not have created new instances after manual disconnect
      expect(MockWebSocket["instances"].length).toBe(instanceCount);

      vi.useRealTimers();
    });

    it("resets reconnect count after successful connection", async () => {
      vi.useFakeTimers();

      renderHook(() =>
        useWebSocket("ws://localhost:8000/ws", {
          reconnect: true,
          reconnectInterval: 100,
          reconnectAttempts: 3,
        })
      );

      const ws1 = MockWebSocket.getLastInstance();
      act(() => {
        ws1?.simulateOpen();
      });

      // First close and reconnect
      act(() => {
        ws1?.simulateClose();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      const ws2 = MockWebSocket.getLastInstance();
      // Successfully reconnect
      act(() => {
        ws2?.simulateOpen();
      });

      // Close again - should start fresh with attempts
      act(() => {
        ws2?.simulateClose();
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should have created a new instance (not blocked by max attempts)
      expect(MockWebSocket["instances"].length).toBeGreaterThan(2);

      vi.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    it("calls onError callback on WebSocket error", async () => {
      const onError = vi.fn();
      renderHook(() => useWebSocket("ws://localhost:8000/ws", { onError }));

      const ws = MockWebSocket.getLastInstance();
      act(() => {
        ws?.simulateOpen();
      });

      act(() => {
        ws?.simulateError();
      });

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("handles connection creation failure gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Make WebSocket constructor throw
      const ThrowingWebSocket = class {
        constructor() {
          throw new Error("Connection failed");
        }
      } as unknown as typeof WebSocket;
      global.WebSocket = ThrowingWebSocket;

      // Should not throw - the hook catches the error internally
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      // The hook should remain in a disconnected state when connection fails
      expect(result.current.isConnected).toBe(false);

      // Try to manually connect and verify it handles the error
      act(() => {
        result.current.connect();
      });

      // Should still be disconnected after failed connection attempt
      expect(result.current.isConnected).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe("Manual Connection Control", () => {
    it("can manually connect after disconnect", async () => {
      const { result } = renderHook(() => useWebSocket("ws://localhost:8000/ws"));

      const ws1 = MockWebSocket.getLastInstance();
      act(() => {
        ws1?.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);

      // Disconnect
      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Manual reconnect
      act(() => {
        result.current.connect();
      });

      const ws2 = MockWebSocket.getLastInstance();
      act(() => {
        ws2?.simulateOpen();
      });

      expect(result.current.isConnected).toBe(true);
    });
  });
});

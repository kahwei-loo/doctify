/**
 * Unit tests for useChatWebSocket hook
 *
 * Phase 13 - Chatbot Implementation
 */

import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useChatWebSocket, StreamChunk } from '@/features/chat/hooks/useChatWebSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection opening after a brief delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }
}

describe('useChatWebSocket', () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
  });

  it('initializes with disconnected state', () => {
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isSending).toBe(false);
  });

  it('connects to WebSocket on mount', async () => {
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('constructs correct WebSocket URL', () => {
    const onChunk = vi.fn();
    renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-conversation-id',
        onChunk,
      })
    );

    // Check that WebSocket was created with correct URL
    expect(MockWebSocket).toHaveBeenCalledWith(
      expect.stringContaining('test-conversation-id')
    );
  });

  it('includes token in URL when provided', () => {
    const onChunk = vi.fn();
    renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
        token: 'test-token',
      })
    );

    expect(MockWebSocket).toHaveBeenCalledWith(
      expect.stringContaining('token=test-token')
    );
  });

  it('handles incoming message chunks', async () => {
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    // Wait for connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate incoming message
    const mockChunk: StreamChunk = {
      type: 'chunk',
      data: 'Hello',
    };

    const ws = (global.WebSocket as any).mock.results[0].value;
    ws.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(mockChunk),
    }));

    expect(onChunk).toHaveBeenCalledWith(mockChunk);
  });

  it('sets isSending to true when sending message', async () => {
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Send a message
    result.current.sendMessage('Test message');

    expect(result.current.isSending).toBe(true);
  });

  it('sets isSending to false on complete chunk', async () => {
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Send message
    result.current.sendMessage('Test message');

    // Simulate complete chunk
    const completeChunk: StreamChunk = {
      type: 'complete',
      data: 'message-id',
    };

    const ws = (global.WebSocket as any).mock.results[0].value;
    ws.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(completeChunk),
    }));

    await waitFor(() => {
      expect(result.current.isSending).toBe(false);
    });
  });

  it('sets isSending to false on error chunk', async () => {
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Send message
    result.current.sendMessage('Test message');

    // Simulate error chunk
    const errorChunk: StreamChunk = {
      type: 'error',
      data: 'Error message',
    };

    const ws = (global.WebSocket as any).mock.results[0].value;
    ws.onmessage?.(new MessageEvent('message', {
      data: JSON.stringify(errorChunk),
    }));

    await waitFor(() => {
      expect(result.current.isSending).toBe(false);
    });
  });

  it('does not send empty messages', async () => {
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const ws = (global.WebSocket as any).mock.results[0].value;
    const sendSpy = vi.spyOn(ws, 'send');

    // Try to send empty message
    result.current.sendMessage('   ');

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('closes WebSocket on unmount', async () => {
    const onChunk = vi.fn();
    const { unmount } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalled();
    });

    const ws = (global.WebSocket as any).mock.results[0].value;
    const closeSpy = vi.spyOn(ws, 'close');

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('handles WebSocket errors gracefully', async () => {
    const onChunk = vi.fn();
    const { result } = renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const ws = (global.WebSocket as any).mock.results[0].value;

    // Simulate error
    ws.onerror?.(new Event('error'));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('handles malformed JSON in messages', async () => {
    const onChunk = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() =>
      useChatWebSocket({
        conversationId: 'test-id',
        onChunk,
      })
    );

    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalled();
    });

    const ws = (global.WebSocket as any).mock.results[0].value;

    // Send malformed JSON
    ws.onmessage?.(new MessageEvent('message', {
      data: 'not valid json',
    }));

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(onChunk).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

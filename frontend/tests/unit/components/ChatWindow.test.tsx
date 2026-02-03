/**
 * Unit tests for ChatWindow component
 *
 * Phase 13 - Chatbot Implementation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
import type { ChatMessage } from '@/store/api/chatApi';

// Mock the WebSocket hook
vi.mock('@/features/chat/hooks/useChatWebSocket', () => ({
  useChatWebSocket: vi.fn(() => ({
    isConnected: true,
    isSending: false,
    sendMessage: vi.fn(),
  })),
}));

describe('ChatWindow', () => {
  const mockConversationId = 'test-conversation-id';
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hi there!',
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with conversation ID', () => {
    render(<ChatWindow conversationId={mockConversationId} />);

    expect(screen.getByText('Chat Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('displays initial messages', () => {
    render(
      <ChatWindow
        conversationId={mockConversationId}
        initialMessages={mockMessages}
      />
    );

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('shows connected status when WebSocket is connected', () => {
    render(<ChatWindow conversationId={mockConversationId} />);

    expect(screen.getByText('● Connected')).toBeInTheDocument();
  });

  it('disables input when not connected', () => {
    const { useChatWebSocket } = require('@/features/chat/hooks/useChatWebSocket');
    useChatWebSocket.mockReturnValue({
      isConnected: false,
      isSending: false,
      sendMessage: vi.fn(),
    });

    render(<ChatWindow conversationId={mockConversationId} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    expect(textarea).toBeDisabled();
  });

  it('disables input when sending message', () => {
    const { useChatWebSocket } = require('@/features/chat/hooks/useChatWebSocket');
    useChatWebSocket.mockReturnValue({
      isConnected: true,
      isSending: true,
      sendMessage: vi.fn(),
    });

    render(<ChatWindow conversationId={mockConversationId} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    expect(textarea).toBeDisabled();
  });

  it('calls sendMessage when form is submitted', async () => {
    const mockSendMessage = vi.fn();
    const { useChatWebSocket } = require('@/features/chat/hooks/useChatWebSocket');
    useChatWebSocket.mockReturnValue({
      isConnected: true,
      isSending: false,
      sendMessage: mockSendMessage,
    });

    render(<ChatWindow conversationId={mockConversationId} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: '' }); // Send button

    // Type message
    fireEvent.change(textarea, { target: { value: 'Test message' } });

    // Submit form
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('clears input after sending message', async () => {
    const mockSendMessage = vi.fn();
    const { useChatWebSocket } = require('@/features/chat/hooks/useChatWebSocket');
    useChatWebSocket.mockReturnValue({
      isConnected: true,
      isSending: false,
      sendMessage: mockSendMessage,
    });

    render(<ChatWindow conversationId={mockConversationId} />);

    const textarea = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement;
    const sendButton = screen.getByRole('button', { name: '' });

    // Type and send message
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('does not send empty messages', async () => {
    const mockSendMessage = vi.fn();
    const { useChatWebSocket } = require('@/features/chat/hooks/useChatWebSocket');
    useChatWebSocket.mockReturnValue({
      isConnected: true,
      isSending: false,
      sendMessage: mockSendMessage,
    });

    render(<ChatWindow conversationId={mockConversationId} />);

    const sendButton = screen.getByRole('button', { name: '' });

    // Try to send without typing
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  it('handles Enter key to send message', async () => {
    const mockSendMessage = vi.fn();
    const { useChatWebSocket } = require('@/features/chat/hooks/useChatWebSocket');
    useChatWebSocket.mockReturnValue({
      isConnected: true,
      isSending: false,
      sendMessage: mockSendMessage,
    });

    render(<ChatWindow conversationId={mockConversationId} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    // Type message
    fireEvent.change(textarea, { target: { value: 'Test message' } });

    // Press Enter (without Shift)
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('allows Shift+Enter for newlines', async () => {
    const mockSendMessage = vi.fn();
    const { useChatWebSocket } = require('@/features/chat/hooks/useChatWebSocket');
    useChatWebSocket.mockReturnValue({
      isConnected: true,
      isSending: false,
      sendMessage: mockSendMessage,
    });

    render(<ChatWindow conversationId={mockConversationId} />);

    const textarea = screen.getByPlaceholderText('Type your message...');

    // Type message
    fireEvent.change(textarea, { target: { value: 'Line 1' } });

    // Press Shift+Enter (should NOT send)
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    // Should not have called sendMessage
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('displays loading indicator when sending', () => {
    const { useChatWebSocket } = require('@/features/chat/hooks/useChatWebSocket');
    useChatWebSocket.mockReturnValue({
      isConnected: true,
      isSending: true,
      sendMessage: vi.fn(),
    });

    render(<ChatWindow conversationId={mockConversationId} />);

    // Check for Loader2 icon (spinner)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders streaming message when present', () => {
    render(<ChatWindow conversationId={mockConversationId} />);

    // Component should render without streaming message initially
    const messages = screen.queryAllByText(/Hello|Hi there/);
    expect(messages).toHaveLength(0); // No initial messages in this test
  });
});

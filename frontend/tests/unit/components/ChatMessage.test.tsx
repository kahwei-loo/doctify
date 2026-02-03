/**
 * Unit tests for ChatMessage component
 *
 * Phase 13 - Chatbot Implementation
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatMessage } from '@/features/chat/components/ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/store/api/chatApi';

describe('ChatMessage', () => {
  const baseMessage: ChatMessageType = {
    id: 'test-id',
    role: 'user',
    content: 'Test message content',
    created_at: new Date().toISOString(),
  };

  it('renders user message with correct styling', () => {
    render(<ChatMessage message={baseMessage} />);

    const messageContent = screen.getByText('Test message content');
    expect(messageContent).toBeInTheDocument();

    // User messages should have flex-row-reverse class
    const messageContainer = messageContent.closest('.flex');
    expect(messageContainer).toHaveClass('flex-row-reverse');
  });

  it('renders assistant message with correct styling', () => {
    const assistantMessage: ChatMessageType = {
      ...baseMessage,
      role: 'assistant',
      content: 'Assistant response',
    };

    render(<ChatMessage message={assistantMessage} />);

    const messageContent = screen.getByText('Assistant response');
    expect(messageContent).toBeInTheDocument();

    // Assistant messages should NOT have flex-row-reverse
    const messageContainer = messageContent.closest('.flex');
    expect(messageContainer).not.toHaveClass('flex-row-reverse');
  });

  it('displays streaming indicator when isStreaming is true', () => {
    render(<ChatMessage message={baseMessage} isStreaming={true} />);

    // Check for the streaming indicator (animated pulse span)
    const streamingIndicator = document.querySelector('.animate-pulse');
    expect(streamingIndicator).toBeInTheDocument();
  });

  it('does not display streaming indicator when isStreaming is false', () => {
    render(<ChatMessage message={baseMessage} isStreaming={false} />);

    const streamingIndicator = document.querySelector('.animate-pulse');
    expect(streamingIndicator).not.toBeInTheDocument();
  });

  it('preserves whitespace in message content', () => {
    const messageWithWhitespace: ChatMessageType = {
      ...baseMessage,
      content: 'Line 1\n\nLine 2\nLine 3',
    };

    render(<ChatMessage message={messageWithWhitespace} />);

    const messageContent = screen.getByText(/Line 1/);
    expect(messageContent).toHaveClass('whitespace-pre-wrap');
  });

  it('renders user icon for user messages', () => {
    render(<ChatMessage message={baseMessage} />);

    // Check for user icon
    const iconContainer = document.querySelector('.bg-primary');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders bot icon for assistant messages', () => {
    const assistantMessage: ChatMessageType = {
      ...baseMessage,
      role: 'assistant',
    };

    render(<ChatMessage message={assistantMessage} />);

    // Check for bot icon
    const iconContainer = document.querySelector('.bg-muted');
    expect(iconContainer).toBeInTheDocument();
  });

  it('renders empty message content', () => {
    const emptyMessage: ChatMessageType = {
      ...baseMessage,
      content: '',
    };

    render(<ChatMessage message={emptyMessage} />);

    // Component should still render even with empty content
    const messageContainer = document.querySelector('.flex');
    expect(messageContainer).toBeInTheDocument();
  });

  it('renders long message content', () => {
    const longMessage: ChatMessageType = {
      ...baseMessage,
      content: 'A'.repeat(1000),
    };

    render(<ChatMessage message={longMessage} />);

    const messageContent = screen.getByText(/A+/);
    expect(messageContent).toBeInTheDocument();
    expect(messageContent.textContent).toHaveLength(1000);
  });

  it('applies max-width constraint to message bubble', () => {
    render(<ChatMessage message={baseMessage} />);

    const messageBubble = screen.getByText('Test message content').closest('.rounded-lg');
    expect(messageBubble).toHaveClass('max-w-[80%]');
  });
});

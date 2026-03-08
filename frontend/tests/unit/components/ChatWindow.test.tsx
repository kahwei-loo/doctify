/**
 * Unit tests for ChatWindow component
 *
 * Phase 13 - Chatbot Implementation
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChatMessage } from "@/store/api/chatApi";

// Shared mock state object — mutated per test
const mockState = {
  isConnected: true,
  isSending: false,
  sendMessage: vi.fn(),
};

vi.mock("@/features/chat/hooks/useChatWebSocket", () => ({
  useChatWebSocket: () => mockState,
}));

vi.mock("@/features/chat/components/ChatMessage", () => ({
  ChatMessage: ({ message }: { message: { content: string } }) => (
    <div data-testid="chat-message">{message.content}</div>
  ),
}));

import { ChatWindow } from "@/features/chat/components/ChatWindow";

// Stable empty array reference — passing no initialMessages prop causes an infinite
// useEffect loop because the default `= []` creates a new reference every render,
// which re-triggers `useEffect(() => setMessages(initialMessages), [initialMessages])`.
const EMPTY_MESSAGES: ChatMessage[] = [];

describe("ChatWindow", () => {
  const mockConversationId = "test-conversation-id";

  beforeEach(() => {
    mockState.isConnected = true;
    mockState.isSending = false;
    mockState.sendMessage = vi.fn();
  });

  it("renders with conversation ID", () => {
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    expect(screen.getByText("Chat Assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
  });

  it("displays initial messages", () => {
    const mockMessages: ChatMessage[] = [
      { id: "1", role: "user", content: "Hello", created_at: new Date().toISOString() },
      { id: "2", role: "assistant", content: "Hi there!", created_at: new Date().toISOString() },
    ];
    render(<ChatWindow conversationId={mockConversationId} initialMessages={mockMessages} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
  });

  it("shows connected status", () => {
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    expect(screen.getByText("● Connected")).toBeInTheDocument();
  });

  it("disables input when not connected", () => {
    mockState.isConnected = false;
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    expect(screen.getByPlaceholderText("Type your message...")).toBeDisabled();
  });

  it("disables input when sending", () => {
    mockState.isSending = true;
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    expect(screen.getByPlaceholderText("Type your message...")).toBeDisabled();
  });

  it("calls sendMessage when form is submitted", () => {
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    const textarea = screen.getByPlaceholderText("Type your message...");
    const sendButton = screen.getByRole("button");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.click(sendButton);
    expect(mockState.sendMessage).toHaveBeenCalledWith("Test message");
  });

  it("clears input after sending message", () => {
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    const textarea = screen.getByPlaceholderText("Type your message...") as HTMLTextAreaElement;
    const sendButton = screen.getByRole("button");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.click(sendButton);
    expect(textarea.value).toBe("");
  });

  it("does not send empty messages", () => {
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    const sendButton = screen.getByRole("button");
    fireEvent.click(sendButton);
    expect(mockState.sendMessage).not.toHaveBeenCalled();
  });

  it("handles Enter key to send message", () => {
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    const textarea = screen.getByPlaceholderText("Type your message...");
    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(mockState.sendMessage).toHaveBeenCalledWith("Test message");
  });

  it("allows Shift+Enter for newlines", () => {
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    const textarea = screen.getByPlaceholderText("Type your message...");
    fireEvent.change(textarea, { target: { value: "Line 1" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(mockState.sendMessage).not.toHaveBeenCalled();
  });

  it("displays loading indicator when sending", () => {
    mockState.isSending = true;
    render(<ChatWindow conversationId={mockConversationId} initialMessages={EMPTY_MESSAGES} />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });
});

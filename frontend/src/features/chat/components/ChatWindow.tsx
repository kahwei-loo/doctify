/**
 * ChatWindow Component
 *
 * Main chat interface with WebSocket streaming support.
 * Phase 13 - Chatbot Implementation
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatWebSocket, StreamChunk } from "../hooks/useChatWebSocket";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/store/api/chatApi";

interface ChatWindowProps {
  conversationId: string;
  initialMessages?: ChatMessageType[];
}

export function ChatWindow({ conversationId, initialMessages = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streamingMessage, setStreamingMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDemoMode = localStorage.getItem("demo_mode") === "true";

  // Sync messages when initialMessages prop changes (e.g., switching conversations)
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const handleChunk = useCallback(
    (chunk: StreamChunk) => {
      if (chunk.type === "intent") {
        console.log("Intent:", chunk.data);
      } else if (chunk.type === "tool_start") {
        console.log("Tool started:", chunk.data);
      } else if (chunk.type === "chunk") {
        setStreamingMessage((prev) => prev + chunk.data);
      } else if (chunk.type === "complete") {
        // Finalize message
        const assistantMessage: ChatMessageType = {
          id: chunk.data as string,
          role: "assistant",
          content: streamingMessage,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingMessage("");
      } else if (chunk.type === "error") {
        console.error("Chat error:", chunk.data);
        setStreamingMessage("");
      }
    },
    [streamingMessage]
  ); // Include streamingMessage as it's used in the 'complete' handler

  const { isConnected, isSending, sendMessage } = useChatWebSocket({
    conversationId,
    onChunk: handleChunk,
  });

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isSending) return;

    // Add user message to UI
    const userMessage: ChatMessageType = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Send via WebSocket
    sendMessage(input);
    setInput("");
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chat Assistant</span>
          <span
            className={`text-xs ${isConnected || isDemoMode ? "text-green-500" : "text-red-500"}`}
          >
            {isDemoMode ? "● Demo Mode" : isConnected ? "● Connected" : "○ Disconnected"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {streamingMessage && (
              <ChatMessage
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingMessage,
                  created_at: new Date().toISOString(),
                }}
                isStreaming
              />
            )}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[60px] max-h-[120px]"
              disabled={isSending || (!isConnected && !isDemoMode)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSending || !input.trim() || (!isConnected && !isDemoMode)}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

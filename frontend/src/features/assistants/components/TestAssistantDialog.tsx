/**
 * TestAssistantDialog Component
 *
 * Dialog with a chat interface for testing an assistant via the public chat API.
 * Uses the same public chat endpoint as the embeddable widget.
 */

import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, Send, Trash2, User, Loader2 } from "lucide-react";
import { useSendPublicMessageMutation } from "@/store/api/publicChatApi";
import { cn } from "@/lib/utils";
import type { Assistant, Message } from "../types";

interface TestAssistantDialogProps {
  open: boolean;
  onClose: () => void;
  assistant: Assistant;
  onMessageSent?: () => void;
}

export const TestAssistantDialog: React.FC<TestAssistantDialogProps> = ({
  open,
  onClose,
  assistant,
  onMessageSent,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [sendMessage, { isLoading: isSending }] = useSendPublicMessageMutation();

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isSending) return;

    setInput("");

    // Add user message
    const userMsg: Message = {
      message_id: `user-${Date.now()}`,
      conversation_id: "test",
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const result = await sendMessage({
        assistant_id: assistant.assistant_id,
        session_id: sessionId,
        content,
        context: { source: "test_dialog" },
      }).unwrap();

      // Add assistant response
      setMessages((prev) => [...prev, result.data.assistant_message]);

      // Notify parent to refresh conversation list
      onMessageSent?.();
    } catch {
      // Show error as assistant message
      const errorMsg: Message = {
        message_id: `error-${Date.now()}`,
        conversation_id: "test",
        role: "assistant",
        content:
          "Failed to get a response. The assistant may not be configured with a valid AI provider.",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <DialogTitle className="text-base">Test: {assistant.name}</DialogTitle>
              <span className="text-xs text-muted-foreground">{assistant.model_config.model}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="rounded-full bg-primary/10 p-3 mb-3">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">Start a test conversation</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Send a message to test how {assistant.name} responds.
                {assistant.model_config.system_prompt && (
                  <> This assistant has a system prompt configured.</>
                )}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.message_id}
              className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-lg px-3 py-2 max-w-[80%] text-sm whitespace-pre-wrap",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isSending}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isSending} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

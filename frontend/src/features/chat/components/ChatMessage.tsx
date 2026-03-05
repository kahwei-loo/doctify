/**
 * ChatMessage Component
 *
 * Individual chat message display with role-based styling.
 * Phase 13 - Chatbot Implementation
 */

import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/store/api/chatApi";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div
        className={cn(
          "flex-1 rounded-lg p-3 max-w-[80%]",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />}
      </div>
    </div>
  );
}

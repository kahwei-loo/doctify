/**
 * ChatMessage Component
 *
 * Individual chat message display with role-based styling and basic markdown.
 * Phase 13 - Chatbot Implementation
 */

import React, { useMemo } from "react";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/store/api/chatApi";

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
}

type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string };

function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) tokens.push({ type: "bold", value: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: "italic", value: match[2] });
    else if (match[3] !== undefined) tokens.push({ type: "code", value: match[3] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

function renderInlineTokens(tokens: InlineToken[]): React.ReactNode[] {
  return tokens.map((token, i) => {
    switch (token.type) {
      case "bold":
        return <strong key={i}>{token.value}</strong>;
      case "italic":
        return <em key={i}>{token.value}</em>;
      case "code":
        return (
          <code key={i} className="bg-background/50 px-1 py-0.5 rounded text-xs">
            {token.value}
          </code>
        );
      default:
        return <React.Fragment key={i}>{token.value}</React.Fragment>;
    }
  });
}

function FormattedContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {renderInlineTokens(tokenizeInline(line))}
        </React.Fragment>
      ))}
    </>
  );
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const content = useMemo(() => <FormattedContent text={message.content} />, [message.content]);

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
        <div className="text-sm">{content}</div>
        {isStreaming && <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />}
      </div>
    </div>
  );
}

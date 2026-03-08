/**
 * PublicChatWidget Component
 *
 * Embeddable chat widget for public/anonymous users.
 * Features:
 * - Floating launcher button (bottom-right)
 * - Expandable/minimizable chat window
 * - Anonymous session tracking via localStorage
 * - Rate limiting warnings and UI feedback
 */

import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Send,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePublicChatSession } from "../hooks/usePublicChatSession";
import { useSendPublicMessageMutation, useGetPublicMessagesQuery } from "@/store/api/publicChatApi";
import type { Message } from "../types";
import dayjs from "dayjs";
import toast from "react-hot-toast";

interface PublicChatWidgetProps {
  /** ID of the assistant to chat with */
  assistantId: string;
  /** Name to display in the header */
  assistantName?: string;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Position of the widget */
  position?: "bottom-right" | "bottom-left";
  /** Primary color for the widget */
  primaryColor?: string;
  /** Custom welcome message */
  welcomeMessage?: string;
  /** Custom class name */
  className?: string;
}

export const PublicChatWidget: React.FC<PublicChatWidgetProps> = ({
  assistantId,
  assistantName = "AI Assistant",
  defaultOpen = false,
  position = "bottom-right",
  primaryColor = "#3b82f6", // blue-500
  welcomeMessage = "Hi! I'm here to help. What would you like to know?",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session management with rate limiting
  const { sessionId, isRateLimited, rateLimitRemaining, incrementMessageCount, resetSession } =
    usePublicChatSession({
      assistantId,
      onRateLimitWarning: (remaining) => {
        toast.custom(
          (t) => (
            <div
              className={cn(
                "flex items-center gap-2 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-3 rounded-lg shadow-lg",
                t.visible ? "animate-enter" : "animate-leave"
              )}
            >
              <AlertTriangle className="h-5 w-5" />
              <span>Rate limit approaching: {remaining} messages remaining this minute</span>
            </div>
          ),
          { duration: 4000 }
        );
      },
      onRateLimitExceeded: () => {
        toast.error("Rate limit exceeded. Please wait a minute before sending more messages.");
      },
    });

  // API hooks
  const {
    data: messagesResponse,
    isLoading: isLoadingMessages,
    isError: messagesError,
    refetch: refetchMessages,
  } = useGetPublicMessagesQuery(
    { assistant_id: assistantId, session_id: sessionId },
    { skip: !isOpen }
  );
  const [sendMessage, { isLoading: isSending }] = useSendPublicMessageMutation();

  // Sync messages from API
  useEffect(() => {
    if (messagesResponse?.data) {
      setLocalMessages(messagesResponse.data);
    }
  }, [messagesResponse]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [localMessages, isMinimized]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending || isRateLimited) return;

    // Check rate limit before sending
    const canSend = incrementMessageCount();
    if (!canSend) return;

    const content = messageInput.trim();
    setMessageInput("");

    // Optimistic update: Add user message immediately
    const optimisticUserMessage: Message = {
      message_id: `temp-${Date.now()}`,
      conversation_id: "pending",
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, optimisticUserMessage]);

    try {
      const result = await sendMessage({
        assistant_id: assistantId,
        session_id: sessionId,
        content,
        context: { source: "widget", page_url: window.location.href },
      }).unwrap();

      // Keep optimistic user message (has correct content) and add assistant response
      setLocalMessages((prev) => [...prev, result.data.assistant_message]);
    } catch (error) {
      // Remove optimistic message on error
      setLocalMessages((prev) =>
        prev.filter((m) => m.message_id !== optimisticUserMessage.message_id)
      );
      toast.error("Failed to send message. Please try again.");
    }
  };

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Position classes
  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  };

  return (
    <div
      className={cn("fixed z-50", positionClasses[position], className)}
      style={{ "--widget-primary": primaryColor } as React.CSSProperties}
    >
      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "mb-4 bg-background rounded-lg shadow-2xl border overflow-hidden transition-all duration-300",
            isMinimized ? "h-14" : "w-80 sm:w-96 h-[500px]"
          )}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{assistantName}</h3>
                {!isMinimized && (
                  <p className="text-xs opacity-80">{isRateLimited ? "Rate limited" : "Online"}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(500px-56px-80px)]">
                {/* Loading State */}
                {isLoadingMessages && localMessages.length === 0 && (
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-12 w-48 rounded-lg" />
                    </div>
                    <div className="flex gap-3 flex-row-reverse">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-10 w-36 rounded-lg" />
                    </div>
                  </div>
                )}

                {/* Error State */}
                {messagesError && localMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                    <div className="rounded-full bg-destructive/10 p-3 mb-3">
                      <WifiOff className="h-5 w-5 text-destructive" />
                    </div>
                    <p className="text-sm text-destructive mb-1">Connection Error</p>
                    <p className="text-xs text-muted-foreground mb-3">Unable to load messages</p>
                    <Button variant="outline" size="sm" onClick={() => refetchMessages()}>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  </div>
                )}

                {/* Welcome Message */}
                {!isLoadingMessages && !messagesError && localMessages.length === 0 && (
                  <div className="flex gap-3">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <Bot className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <div className="bg-muted rounded-lg rounded-tl-none px-4 py-2 max-w-[80%]">
                      <p className="text-sm">{welcomeMessage}</p>
                    </div>
                  </div>
                )}

                {/* Message List */}
                {localMessages.map((message) => (
                  <MessageBubble
                    key={message.message_id}
                    message={message}
                    primaryColor={primaryColor}
                  />
                ))}

                {/* Typing Indicator */}
                {isSending && (
                  <div className="flex gap-3">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${primaryColor}20` }}
                    >
                      <Bot className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <div className="bg-muted rounded-lg rounded-tl-none px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Rate Limit Warning */}
              {isRateLimited && (
                <div className="px-4 pb-2">
                  <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/40 text-xs">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Rate limit exceeded. Please wait.</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={resetSession}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 border-t bg-muted/30">
                <div className="flex gap-2">
                  <Textarea
                    placeholder={
                      isRateLimited
                        ? "Please wait before sending more messages..."
                        : "Type your message..."
                    }
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSending || isRateLimited}
                    className="min-h-[44px] max-h-[100px] resize-none text-sm"
                    rows={1}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || isSending || isRateLimited}
                    size="icon"
                    className="self-end h-[44px] w-[44px]"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {rateLimitRemaining <= 5 && !isRateLimited && (
                  <p className="text-xs text-orange-600 mt-1">
                    {rateLimitRemaining} messages remaining this minute
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Launcher Button */}
      <Button
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
        }}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg transition-transform hover:scale-110",
          isOpen && "rotate-90"
        )}
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
};

// Message Bubble Component
interface MessageBubbleProps {
  message: Message;
  primaryColor: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, primaryColor }) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-gray-200 dark:bg-gray-700" : ""
        )}
        style={!isUser ? { backgroundColor: `${primaryColor}20` } : undefined}
      >
        {isUser ? (
          <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <Bot className="h-4 w-4" style={{ color: primaryColor }} />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2",
          isUser ? "text-white rounded-tr-none" : "bg-muted rounded-tl-none"
        )}
        style={isUser ? { backgroundColor: primaryColor } : undefined}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={cn("text-xs mt-1", isUser ? "text-white/70" : "text-muted-foreground")}>
          {dayjs(message.created_at).format("h:mm A")}
        </p>
      </div>
    </div>
  );
};

export default PublicChatWidget;

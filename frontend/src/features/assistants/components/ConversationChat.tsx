/**
 * ConversationChat Component
 *
 * Right pane of the Intercom-style inbox showing message history and input.
 * Supports status management (Resolve/Reopen) and staff replies.
 * Features real-time message updates via WebSocket.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  CheckCircle2,
  RotateCcw,
  User,
  Bot,
  Loader2,
  AlertCircle,
  MessageSquare,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  useGetConversationMessagesQuery,
  useUpdateConversationStatusMutation,
  useSendMessageMutation,
} from '@/store/api/conversationsApi';
import { useAssistantWebSocket, type WebSocketEventUnion } from '../hooks';
import type { Conversation, Message, ConversationStatus } from '../types';
import { ErrorState } from './ErrorState';
import { ConversationChatSkeleton } from './LoadingStates';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

interface ConversationChatProps {
  conversation: Conversation;
  className?: string;
}

export const ConversationChat: React.FC<ConversationChatProps> = ({
  conversation,
  className,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  const { data: response, isLoading, isError, refetch } = useGetConversationMessagesQuery(
    conversation.conversation_id
  );
  const messages = response?.data || [];

  // Mutations
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateConversationStatusMutation();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  // WebSocket event handler - refetch messages on new message
  const handleWebSocketEvent = useCallback(
    (event: WebSocketEventUnion) => {
      if (event.type === 'message.created') {
        // Refetch messages to get the new message
        refetch();
      } else if (event.type === 'conversation.updated') {
        // Conversation status changed, could trigger UI update
        refetch();
      }
    },
    [refetch]
  );

  // Connect to WebSocket for real-time conversation updates
  const { isConnected: wsConnected } = useAssistantWebSocket({
    conversationId: conversation.conversation_id,
    onEvent: handleWebSocketEvent,
    enabled: true,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle status change
  const handleStatusChange = async (newStatus: ConversationStatus) => {
    try {
      await updateStatus({
        conversationId: conversation.conversation_id,
        status: newStatus,
      }).unwrap();
      toast.success(
        newStatus === 'resolved' ? 'Conversation resolved' : 'Conversation reopened'
      );
    } catch (error) {
      toast.error('Failed to update conversation status');
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || isSending) return;

    try {
      await sendMessage({
        conversation_id: conversation.conversation_id,
        content: messageInput.trim(),
        role: 'assistant',
      }).unwrap();
      setMessageInput('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Status badge config
  const statusConfig = {
    unresolved: {
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/20',
      label: 'Unresolved',
    },
    in_progress: {
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      label: 'In Progress',
    },
    resolved: {
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/20',
      label: 'Resolved',
    },
  };

  const status = statusConfig[conversation.status];

  // Loading state
  if (isLoading) {
    return <ConversationChatSkeleton className={className} />;
  }

  // Error state
  if (isError) {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Conversation</h3>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center">
          <ErrorState
            type="server"
            title="Failed to load messages"
            message="We couldn't load the conversation messages. Please try again."
            onRetry={refetch}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">Conversation</h3>
            <Badge
              variant="outline"
              className={cn('text-xs h-5', status.color, status.bg, 'border-0')}
            >
              {status.label}
            </Badge>
            {/* WebSocket Status Indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center">
                    {wsConnected ? (
                      <Wifi className="h-3 w-3 text-green-500" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {wsConnected ? 'Real-time updates active' : 'Real-time updates inactive'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground">
            {dayjs(conversation.created_at).format('MMM D, YYYY h:mm A')} •{' '}
            {conversation.message_count} messages
          </p>
        </div>

        {/* Status Action */}
        <div>
          {conversation.status !== 'resolved' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('resolved')}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Resolve
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('unresolved')}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.message_id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Resolved State Info */}
      {conversation.status === 'resolved' && (
        <div className="px-4 pb-2">
          <div className="flex items-center justify-center py-3 px-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/40">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-sm text-green-700 dark:text-green-300">
              This conversation has been resolved
            </span>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Textarea
            placeholder={
              conversation.status === 'resolved'
                ? 'Reopen to send a message...'
                : 'Type a message...'
            }
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={conversation.status === 'resolved' || isSending}
            className="min-h-[80px] resize-none"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending || conversation.status === 'resolved'}
            className="self-end"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

// Message Bubble Component
interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? '' : 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isUser
            ? 'bg-blue-600 text-white rounded-tl-none'
            : 'bg-muted rounded-tr-none'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            'text-xs mt-1',
            isUser ? 'text-blue-100' : 'text-muted-foreground'
          )}
        >
          {dayjs(message.created_at).format('h:mm A')}
        </p>
      </div>
    </div>
  );
};

export default ConversationChat;

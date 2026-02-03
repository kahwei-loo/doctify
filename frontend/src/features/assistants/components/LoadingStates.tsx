/**
 * Loading States Components
 *
 * Skeleton loaders and loading indicators for the Assistants feature.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * AssistantsPanel Loading Skeleton
 */
export const AssistantsPanelSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex flex-col h-full border-r bg-muted/30', className)}>
      <div className="p-4 border-b bg-background space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-16" />
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        {/* Search */}
        <Skeleton className="h-10 w-full" />
        {/* Filters */}
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 flex-1" />
        </div>
      </div>
      {/* Assistant Cards */}
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <AssistantCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

/**
 * Single Assistant Card Skeleton
 */
export const AssistantCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex gap-2 mt-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );
};

/**
 * ConversationsList Loading Skeleton
 */
export const ConversationsListSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex flex-col h-full bg-muted/30', className)}>
      <div className="p-4 border-b bg-background space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>
      <div className="flex-1 p-2 space-y-2">
        {[...Array(5)].map((_, i) => (
          <ConversationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

/**
 * Single Conversation Item Skeleton
 */
export const ConversationItemSkeleton: React.FC = () => {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
};

/**
 * ConversationChat Loading Skeleton
 */
export const ConversationChatSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 p-4 space-y-4">
        {[...Array(4)].map((_, i) => (
          <MessageBubbleSkeleton key={i} isUser={i % 2 === 0} />
        ))}
      </div>
      {/* Input */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-20" />
          <Skeleton className="h-10 w-10 self-end" />
        </div>
      </div>
    </div>
  );
};

/**
 * Message Bubble Skeleton
 */
export const MessageBubbleSkeleton: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => {
  return (
    <div className={cn('flex gap-3', isUser ? '' : 'flex-row-reverse')}>
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className={cn('max-w-[70%]', isUser ? '' : 'ml-auto')}>
        <Skeleton className="h-16 w-48 rounded-lg" />
      </div>
    </div>
  );
};

/**
 * PublicChatWidget Loading State
 */
export const PublicChatWidgetSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-6 w-6" />
      </div>
      {/* Messages */}
      <div className="flex-1 p-3 space-y-3">
        <MessageBubbleSkeleton isUser={false} />
        <MessageBubbleSkeleton isUser={true} />
        <MessageBubbleSkeleton isUser={false} />
      </div>
      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
};

/**
 * Inline Loading Spinner
 */
interface InlineLoadingProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = 'Loading...',
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={cn('flex items-center justify-center gap-2 text-muted-foreground', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
};

/**
 * Full Page Loading State
 */
export const FullPageLoading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default {
  AssistantsPanelSkeleton,
  AssistantCardSkeleton,
  ConversationsListSkeleton,
  ConversationItemSkeleton,
  ConversationChatSkeleton,
  MessageBubbleSkeleton,
  PublicChatWidgetSkeleton,
  InlineLoading,
  FullPageLoading,
};

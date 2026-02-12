/**
 * ConversationsList Component
 *
 * Left pane of the Intercom-style inbox showing conversation items with filtering.
 * Supports status filtering: All, Unresolved, In Progress, Resolved
 */

import React, { useState } from 'react';
import {
  Search,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  FlaskConical,
  Globe,
  Code,
} from 'lucide-react';
import { useGetConversationsQuery } from '@/store/api/conversationsApi';
import type { Conversation, ConversationStatus } from '../types';
import { ErrorState } from './ErrorState';
import { ConversationsListSkeleton } from './LoadingStates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

// Enable relative time plugin
dayjs.extend(relativeTime);

interface ConversationsListProps {
  assistantId: string;
  assistantName?: string;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  className?: string;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  assistantId,
  assistantName,
  selectedConversationId,
  onSelectConversation,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | 'all'>('all');

  // Fetch conversations
  const { data: response, isLoading, isError, refetch } = useGetConversationsQuery({
    filters: {
      assistant_id: assistantId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
    },
  });

  const conversations = response?.data || [];

  // Status filter buttons config
  const statusFilters: { value: ConversationStatus | 'all'; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: 'All', icon: Inbox },
    { value: 'unresolved', label: 'Unresolved', icon: AlertCircle },
    { value: 'in_progress', label: 'In Progress', icon: Clock },
    { value: 'resolved', label: 'Resolved', icon: CheckCircle2 },
  ];

  // Loading state
  if (isLoading) {
    return <ConversationsListSkeleton className={className} />;
  }

  // Error state
  if (isError) {
    return (
      <div className={cn('flex flex-col h-full bg-muted/30', className)}>
        <div className="p-4 border-b bg-background">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversations
          </h3>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <ErrorState
            type="server"
            title="Failed to load conversations"
            message="We couldn't load the conversations. Please try again."
            onRetry={refetch}
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-muted/30', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-background space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conversations
            {conversations.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {conversations.length}
              </Badge>
            )}
          </h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-1 flex-wrap">
          {statusFilters.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={statusFilter === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(value)}
              className="h-7 text-xs"
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="text-sm font-semibold mb-1">No Conversations</h4>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              {statusFilter !== 'all'
                ? `No ${statusFilter.replace('_', ' ')} conversations found.`
                : assistantName
                  ? `${assistantName} hasn't received any conversations yet.`
                  : 'No conversations to display.'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.conversation_id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.conversation_id}
                onClick={() => onSelectConversation(conversation.conversation_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Source Badge Component
const sourceConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  test_dialog: {
    icon: FlaskConical,
    label: 'Test',
    className: 'text-purple-600 dark:text-purple-400',
  },
  widget: {
    icon: Globe,
    label: 'Widget',
    className: 'text-blue-600 dark:text-blue-400',
  },
  api: {
    icon: Code,
    label: 'API',
    className: 'text-green-600 dark:text-green-400',
  },
};

const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const config = sourceConfig[source];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <div className={cn('flex items-center gap-1', config.className)}>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </div>
  );
};

// Conversation Item Component
interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isSelected,
  onClick,
}) => {
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

  return (
    <div
      className={cn(
        'p-3 rounded-lg cursor-pointer transition-all',
        'hover:bg-accent hover:shadow-sm',
        'border border-transparent',
        isSelected && 'bg-accent border-primary/20 shadow-sm'
      )}
      onClick={onClick}
    >
      {/* Status Badge & Time */}
      <div className="flex items-center justify-between mb-2">
        <Badge
          variant="outline"
          className={cn('text-xs h-5', status.color, status.bg, 'border-0')}
        >
          {status.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {dayjs(conversation.last_message_at).fromNow()}
        </span>
      </div>

      {/* Message Preview */}
      <p className="text-sm line-clamp-2 mb-2">{conversation.last_message_preview}</p>

      {/* Source & Message Count */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {conversation.context?.source && (
          <SourceBadge source={conversation.context.source} />
        )}
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          <span>{conversation.message_count} messages</span>
        </div>
      </div>
    </div>
  );
};

export default ConversationsList;

/**
 * ConversationHistory Component
 *
 * Displays query history for a conversation in a sidebar format.
 */

import React from "react";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useGetQueryHistoryQuery } from "@/store/api/insightsApi";
import type { QueryHistoryItem, QueryStatus } from "../types";

interface ConversationHistoryProps {
  conversationId: string | null;
  selectedQueryId?: string | null;
  onSelectQuery?: (query: QueryHistoryItem) => void;
  className?: string;
}

const STATUS_CONFIG: Record<QueryStatus, { icon: React.ElementType; color: string }> = {
  completed: {
    icon: CheckCircle2,
    color: "text-green-500",
  },
  processing: {
    icon: Loader2,
    color: "text-blue-500",
  },
  pending: {
    icon: Clock,
    color: "text-yellow-500",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
  },
};

const formatTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
};

interface QueryItemProps {
  query: QueryHistoryItem;
  isSelected: boolean;
  onSelect: () => void;
}

const QueryItem: React.FC<QueryItemProps> = ({ query, isSelected, onSelect }) => {
  const statusConfig = STATUS_CONFIG[query.status];
  const StatusIcon = statusConfig.icon;
  const hasChart = !!query.response_chart;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-3 rounded-lg border transition-colors",
        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring",
        isSelected && "border-primary bg-primary/5"
      )}
    >
      <div className="flex items-start gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2">{truncateText(query.user_input, 80)}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <StatusIcon
              className={cn(
                "h-3 w-3",
                statusConfig.color,
                query.status === "processing" && "animate-spin"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(query.created_at)}
            </span>
            {hasChart && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <BarChart3 className="h-2.5 w-2.5 mr-0.5" />
                Chart
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-colors",
            isSelected && "text-primary"
          )}
        />
      </div>
    </button>
  );
};

/**
 * Empty State
 */
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
    <p className="text-sm text-muted-foreground">No queries yet</p>
    <p className="text-xs text-muted-foreground mt-1">Ask a question to get started</p>
  </div>
);

/**
 * Loading State
 */
const LoadingState: React.FC = () => (
  <div className="space-y-2 p-2">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-3 rounded-lg border">
        <div className="flex items-start gap-2">
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * No Conversation Selected State
 */
const NoConversationState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
    <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-2" />
    <p className="text-sm text-muted-foreground">Select a dataset</p>
    <p className="text-xs text-muted-foreground mt-1">Query history will appear here</p>
  </div>
);

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversationId,
  selectedQueryId,
  onSelectQuery,
  className,
}) => {
  const { data: historyResponse, isLoading } = useGetQueryHistoryQuery(
    { conversationId: conversationId! },
    { skip: !conversationId }
  );

  const queries = historyResponse?.queries || [];

  if (!conversationId) {
    return (
      <div className={cn("border rounded-lg", className)}>
        <div className="p-3 border-b">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Query History
          </h3>
        </div>
        <NoConversationState />
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg flex flex-col", className)}>
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Query History
          </h3>
          {queries.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {queries.length}
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : queries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 p-2">
            {queries.map((query) => (
              <QueryItem
                key={query.id}
                query={query}
                isSelected={selectedQueryId === query.id}
                onSelect={() => onSelectQuery?.(query)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;

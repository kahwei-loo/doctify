/**
 * AssistantsPanel Component (L2 Navigation)
 *
 * Displays assistant list with stats cards and selection management.
 * Similar to ProjectPanel in Documents page.
 */

import React, { useState } from "react";
import {
  Bot,
  Plus,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle2,
  Search,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { useGetAssistantsQuery, useGetAssistantStatsQuery } from "@/store/api/assistantsApi";
import type { Assistant, AssistantFilters } from "../types";
import { ErrorState } from "./ErrorState";
import { AssistantsPanelSkeleton } from "./LoadingStates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AssistantsPanelProps {
  selectedAssistantId: string | null;
  onSelectAssistant: (assistantId: string | null) => void;
  onCreateAssistant: () => void;
  onEditAssistant: (assistant: Assistant) => void;
  onDeleteAssistant: (assistant: Assistant) => void;
  onToggleStatus: (assistantId: string, newStatus: boolean) => void;
  className?: string;
}

export const AssistantsPanel: React.FC<AssistantsPanelProps> = ({
  selectedAssistantId,
  onSelectAssistant,
  onCreateAssistant,
  onEditAssistant,
  onDeleteAssistant,
  onToggleStatus,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | undefined>(undefined);

  // Fetch assistant stats
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useGetAssistantStatsQuery();

  // Fetch assistants with filters
  const filters: AssistantFilters = {
    search: searchQuery || undefined,
    status: statusFilter,
  };

  const {
    data: assistantsResponse,
    isLoading: assistantsLoading,
    isError: assistantsError,
    refetch: refetchAssistants,
  } = useGetAssistantsQuery(filters);
  const assistants = assistantsResponse?.data || [];

  // Handle retry for errors
  const handleRetry = () => {
    refetchStats();
    refetchAssistants();
  };

  // Loading state
  if (statsLoading || assistantsLoading) {
    return <AssistantsPanelSkeleton className={className} />;
  }

  // Error state
  if (statsError || assistantsError) {
    return (
      <div className={cn("flex flex-col h-full border-r bg-muted/30", className)}>
        <div className="p-4 border-b bg-background">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistants
          </h2>
        </div>
        <div className="flex-1 p-6 flex items-center justify-center">
          <ErrorState
            type="server"
            title="Failed to load assistants"
            message="We couldn't load your AI assistants. Please try again."
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  // Empty state: no assistants at all
  if (assistants.length === 0 && !searchQuery && !statusFilter) {
    return (
      <div
        className={cn(
          "flex flex-col h-full w-[280px] border border-border/60 bg-card/50 rounded-xl shadow-sm",
          className
        )}
      >
        <div className="p-4 border-b bg-background">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistants
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-2">No AI Assistants Yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-[220px]">
            Create your first AI assistant to start handling conversations automatically.
          </p>
          <Button onClick={onCreateAssistant}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assistant
          </Button>
        </div>
      </div>
    );
  }

  // Empty state: no active assistants
  const hasActiveAssistants = assistants.some((a) => a.is_active);

  return (
    <div
      className={cn(
        "flex flex-col h-full w-[280px] border border-border/60 bg-card/50 rounded-xl shadow-sm",
        className
      )}
    >
      {/* Header with Stats */}
      <div className="p-4 border-b bg-background space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistants
          </h2>
          <Button size="sm" onClick={onCreateAssistant}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-2">
            <StatsCard
              icon={TrendingUp}
              label="Active"
              value={stats.active_assistants}
              total={stats.total_assistants}
              iconClassName="text-blue-600 dark:text-blue-400"
            />
            <StatsCard
              icon={MessageSquare}
              label="Unresolved"
              value={stats.unresolved_conversations}
              iconClassName="text-orange-600 dark:text-orange-400"
            />
            <StatsCard
              icon={Clock}
              label="Avg Response"
              value={`${stats.avg_response_time.toFixed(1)}s`}
              iconClassName="text-purple-600 dark:text-purple-400"
            />
            <StatsCard
              icon={CheckCircle2}
              label="Resolution"
              value={`${(stats.avg_resolution_rate * 100).toFixed(0)}%`}
              iconClassName="text-green-600 dark:text-green-400"
            />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assistants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(undefined)}
            className="flex-1"
          >
            All
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="flex-1"
          >
            Active
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
            className="flex-1"
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Assistant List */}
      <div className="flex-1 overflow-y-auto">
        {assistants.length === 0 ? (
          <div className="p-6 text-center">
            {!hasActiveAssistants && statusFilter === "active" ? (
              <>
                <Bot className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium mb-1">No Active Assistants</p>
                <p className="text-xs text-muted-foreground">
                  All assistants are currently inactive
                </p>
              </>
            ) : (
              <>
                <Bot className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No assistants match your filters</p>
              </>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {assistants.map((assistant) => (
              <AssistantCard
                key={assistant.assistant_id}
                assistant={assistant}
                isSelected={selectedAssistantId === assistant.assistant_id}
                onClick={() => onSelectAssistant(assistant.assistant_id)}
                onEdit={() => onEditAssistant(assistant)}
                onDelete={() => onDeleteAssistant(assistant)}
                onToggleStatus={(newStatus) => onToggleStatus(assistant.assistant_id, newStatus)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Stats Card Component
interface StatsCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  total?: number;
  iconClassName?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  icon: Icon,
  label,
  value,
  total,
  iconClassName,
}) => {
  return (
    <div className="bg-card rounded-lg p-3 border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-lg font-semibold">
            {value}
            {total !== undefined && <span className="text-xs text-muted-foreground">/{total}</span>}
          </p>
        </div>
        <Icon className={cn("h-4 w-4", iconClassName)} />
      </div>
    </div>
  );
};

// Assistant Card Component
interface AssistantCardProps {
  assistant: Assistant;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (newStatus: boolean) => void;
}

const AssistantCard: React.FC<AssistantCardProps> = ({
  assistant,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't select card if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="menuitem"]')) {
      return;
    }
    onClick();
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md rounded-2xl border-2",
        isSelected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-transparent hover:border-border",
        !assistant.is_active && "opacity-60"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{assistant.name}</h3>
              {!assistant.is_active && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{assistant.description}</p>
          </div>

          {/* Actions Menu */}
          <div className="flex items-center gap-1 ml-2">
            {/* Status Toggle */}
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={assistant.is_active}
                onCheckedChange={(checked) => onToggleStatus(checked)}
                aria-label={`Toggle ${assistant.name} status`}
              />
            </div>

            {/* More Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Assistant
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Assistant
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span>{assistant.total_conversations}</span>
          </div>
          {assistant.unresolved_count > 0 && (
            <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <span className="font-medium">{assistant.unresolved_count} unresolved</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 text-xs">
          <Badge variant="outline" className="text-xs">
            {assistant.model_config.provider}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {assistant.model_config.model}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

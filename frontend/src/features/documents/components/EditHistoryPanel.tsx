/**
 * EditHistoryPanel Component
 *
 * Displays document edit history with timeline view and rollback capability.
 * Shows modifications to extraction results with user attribution.
 */

import React, { useState, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  RotateCcw,
  User,
  Clock,
  ChevronRight,
  ChevronDown,
  Loader2,
  FileEdit,
  Bot,
  Layers,
} from "lucide-react";
import {
  useGetEditHistoryQuery,
  useRollbackChangesMutation,
  type EditHistoryEntry,
  VALID_EDIT_TYPES,
} from "@/store/api/editHistoryApi";

interface EditHistoryPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Document ID to show history for */
  documentId: string;
  /** Callback after rollback is performed */
  onRollback?: () => void;
}

/**
 * Get icon for edit type
 */
const EditTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case "manual":
      return <FileEdit className="h-4 w-4 text-blue-500" />;
    case "bulk":
      return <Layers className="h-4 w-4 text-purple-500" />;
    case "rollback":
      return <RotateCcw className="h-4 w-4 text-orange-500" />;
    case "ai_correction":
      return <Bot className="h-4 w-4 text-green-500" />;
    default:
      return <FileEdit className="h-4 w-4 text-muted-foreground" />;
  }
};

/**
 * Get badge variant for edit type
 */
const getEditTypeBadgeVariant = (
  type: string
): "default" | "secondary" | "outline" | "destructive" => {
  switch (type) {
    case "rollback":
      return "destructive";
    case "ai_correction":
      return "default";
    default:
      return "secondary";
  }
};

/**
 * Format edit type for display
 */
const formatEditType = (type: string): string => {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Format field path for display
 */
const formatFieldPath = (path: string): string => {
  return path.split(".").pop() || path;
};

/**
 * Format value for display
 */
const formatValue = (value: Record<string, unknown> | null): string => {
  if (!value) return "(empty)";
  if ("value" in value) {
    const v = value.value;
    if (v === null || v === undefined) return "(empty)";
    if (typeof v === "string") return v.length > 50 ? `${v.slice(0, 50)}...` : v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return JSON.stringify(v).slice(0, 50);
  }
  return JSON.stringify(value).slice(0, 50);
};

/**
 * Single history entry component
 */
interface HistoryEntryProps {
  entry: EditHistoryEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onRollback: () => void;
  isRollingBack: boolean;
}

const HistoryEntry: React.FC<HistoryEntryProps> = ({
  entry,
  isExpanded,
  onToggle,
  onRollback,
  isRollingBack,
}) => {
  return (
    <div className="border-l-2 border-muted pl-4 pb-4 relative">
      {/* Timeline dot */}
      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-muted flex items-center justify-center">
        <EditTypeIcon type={entry.edit_type} />
      </div>

      {/* Entry header */}
      <button type="button" onClick={onToggle} className="w-full text-left group">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {formatFieldPath(entry.field_path)}
              </span>
              <Badge variant={getEditTypeBadgeVariant(entry.edit_type)} className="text-xs">
                {formatEditType(entry.edit_type)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{entry.user_name || entry.user_email || "System"}</span>
              <Clock className="h-3 w-3 ml-2" />
              <span title={format(new Date(entry.created_at), "PPpp")}>
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Field path */}
          <div className="text-xs">
            <span className="text-muted-foreground">Field: </span>
            <code className="bg-muted px-1 py-0.5 rounded">{entry.field_path}</code>
          </div>

          {/* Value changes */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-red-50 dark:bg-red-950 p-2 rounded">
              <span className="text-red-600 dark:text-red-400 font-medium">Old value:</span>
              <pre className="mt-1 text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                {formatValue(entry.old_value)}
              </pre>
            </div>
            <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
              <span className="text-green-600 dark:text-green-400 font-medium">New value:</span>
              <pre className="mt-1 text-green-700 dark:text-green-300 whitespace-pre-wrap break-all">
                {formatValue(entry.new_value)}
              </pre>
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Source: {entry.source}</div>
            {entry.ip_address && <div>IP: {entry.ip_address}</div>}
          </div>

          {/* Rollback button */}
          {entry.edit_type !== "rollback" && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRollback();
              }}
              disabled={isRollingBack}
              className="w-full"
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Rolling back...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Rollback this change
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Loading skeleton for history entries
 */
const HistoryEntrySkeleton: React.FC = () => (
  <div className="border-l-2 border-muted pl-4 pb-4">
    <Skeleton className="h-5 w-32 mb-2" />
    <Skeleton className="h-4 w-48" />
  </div>
);

export const EditHistoryPanel: React.FC<EditHistoryPanelProps> = ({
  open,
  onOpenChange,
  documentId,
  onRollback,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [rollbackEntryId, setRollbackEntryId] = useState<string | null>(null);

  // Fetch edit history
  const {
    data: historyResponse,
    isLoading,
    isFetching,
  } = useGetEditHistoryQuery(
    {
      documentId,
      page,
      page_size: 20,
      edit_type: filterType === "all" ? undefined : filterType,
    },
    { skip: !open }
  );

  // Rollback mutation
  const [rollback, { isLoading: isRollingBack }] = useRollbackChangesMutation();

  // Filter entries
  const entries = useMemo(() => {
    return historyResponse?.data || [];
  }, [historyResponse]);

  // Handle rollback confirmation
  const handleRollbackConfirm = async () => {
    if (!rollbackEntryId) return;

    try {
      await rollback({
        documentId,
        rollback: { entry_id: rollbackEntryId },
      }).unwrap();

      setRollbackEntryId(null);
      onRollback?.();
    } catch (error) {
      console.error("Failed to rollback:", error);
    }
  };

  // Reset state when closing
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setExpandedId(null);
      setFilterType("all");
      setPage(1);
    }
    onOpenChange(isOpen);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Edit History
            </SheetTitle>
            <SheetDescription>
              View and rollback changes made to extraction results
            </SheetDescription>
          </SheetHeader>

          {/* Filter */}
          <div className="flex items-center gap-2 py-4">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {VALID_EDIT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {formatEditType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {/* History list */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 py-2">
              {isLoading ? (
                <>
                  <HistoryEntrySkeleton />
                  <HistoryEntrySkeleton />
                  <HistoryEntrySkeleton />
                </>
              ) : entries.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No edit history found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Changes to extraction results will appear here
                  </p>
                </div>
              ) : (
                entries.map((entry) => (
                  <HistoryEntry
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    onRollback={() => setRollbackEntryId(entry.id)}
                    isRollingBack={isRollingBack && rollbackEntryId === entry.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {historyResponse && historyResponse.total_pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {page} of {historyResponse.total_pages} ({historyResponse.total} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(historyResponse.total_pages, p + 1))}
                  disabled={page >= historyResponse.total_pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Rollback confirmation dialog */}
      <AlertDialog
        open={!!rollbackEntryId}
        onOpenChange={(open) => !open && setRollbackEntryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback this change? The field will be restored to its
              previous value. This action will be recorded in the edit history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollbackConfirm} disabled={isRollingBack}>
              {isRollingBack ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rolling back...
                </>
              ) : (
                "Rollback"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditHistoryPanel;

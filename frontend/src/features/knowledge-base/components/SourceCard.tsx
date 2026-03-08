/**
 * SourceCard Component
 *
 * Compact, type-differentiated card for the sources panel.
 * Colored left border per type, inline status, content preview.
 */

import React from "react";
import {
  MoreVertical,
  Eye,
  Pencil,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSourceTypeConfig, isEditableType, formatRelativeTime } from "../utils/sourceTypeConfig";
import type { DataSource } from "../types";
import type { SourceAction } from "./SourcesPanel";

interface SourceCardProps {
  source: DataSource;
  onClick: () => void;
  onAction: (action: SourceAction) => void;
  isSelected: boolean;
}

const EmbeddingStatus: React.FC<{ source: DataSource }> = ({ source }) => {
  if (source.status === "syncing") {
    return (
      <div className="flex items-center gap-1 text-blue-600">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }
  if ((source.embedding_count || 0) > 0) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-3 w-3" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-amber-500">
      <AlertCircle className="h-3 w-3" />
    </div>
  );
};

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  onClick,
  onAction,
  isSelected,
}) => {
  const config = getSourceTypeConfig(source.type);
  const Icon = config.icon;
  const metadata = config.getMetadata(source);
  const preview = config.getPreview(source);
  const timestamp = source.updated_at || source.created_at;

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-l-4 p-3 cursor-pointer transition-all hover:shadow-sm hover:bg-accent/50",
        config.borderColor,
        isSelected && "ring-2 ring-primary/50 bg-accent/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: Icon + Name + Type */}
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div
            className={cn(
              "flex items-center justify-center h-7 w-7 rounded-md shrink-0",
              config.bgColor
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", config.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{source.name}</p>
              {source.type === "structured_data" ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full font-medium">
                  <Database className="h-2.5 w-2.5" />
                  Analytics
                </span>
              ) : (
                <EmbeddingStatus source={source} />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metadata}
              {timestamp && (
                <span className="ml-1.5">&middot; {formatRelativeTime(timestamp)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Action menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onAction("view")}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {isEditableType(source.type) && (
              <DropdownMenuItem onClick={() => onAction("edit")}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {source.type !== "structured_data" && (
              <DropdownMenuItem onClick={() => onAction("regenerate")}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-generate Embeddings
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onAction("delete")}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content Preview */}
      {preview && (
        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 pl-10">{preview}</p>
      )}
    </div>
  );
};

export default SourceCard;

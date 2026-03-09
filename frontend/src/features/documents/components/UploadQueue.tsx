/**
 * UploadQueue Component
 *
 * Displays a queue of files being uploaded with progress indicators.
 *
 * Features:
 * - Progress bar for each file
 * - Status indicators (pending, uploading, completed, error)
 * - Cancel/retry actions
 * - File type icons
 * - Collapsible design
 */

import React, { useState } from "react";
import {
  FileText,
  Image,
  X,
  Check,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

interface UploadQueueProps {
  uploads: Map<string, UploadProgress>;
  onCancel?: (fileId: string) => void;
  onRetry?: (fileId: string, file: File) => void;
  onClearCompleted?: () => void;
  onClearAll?: () => void;
  className?: string;
}

/**
 * Get file icon based on MIME type
 */
const getFileIcon = (file: File) => {
  if (file.type === "application/pdf") {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (file.type.startsWith("image/")) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

/**
 * Format file size to human readable
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Get status icon based on upload status
 */
const StatusIcon: React.FC<{ status: UploadProgress["status"] }> = ({ status }) => {
  switch (status) {
    case "pending":
      return <div className="h-4 w-4 rounded-full bg-muted-foreground/30" />;
    case "uploading":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "completed":
      return <Check className="h-4 w-4 text-green-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
};

/**
 * Single upload item in the queue
 */
const UploadQueueItem: React.FC<{
  fileId: string;
  upload: UploadProgress;
  onCancel?: (fileId: string) => void;
  onRetry?: (fileId: string, file: File) => void;
}> = ({ fileId, upload, onCancel, onRetry }) => {
  const { file, progress, status, error } = upload;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        status === "error" && "border-destructive/50 bg-destructive/5",
        status === "completed" && "border-green-500/50 bg-green-500/5",
        (status === "pending" || status === "uploading") && "border-border"
      )}
    >
      {/* File Icon */}
      <div className="flex-shrink-0">{getFileIcon(file)}</div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <StatusIcon status={status} />
        </div>

        {/* Progress bar for uploading state */}
        {status === "uploading" && <Progress value={progress} className="h-1.5 mt-2" />}

        {/* Status text */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
          <span
            className={cn(
              "text-xs",
              status === "error" && "text-destructive",
              status === "completed" && "text-green-600",
              status === "uploading" && "text-primary",
              status === "pending" && "text-muted-foreground"
            )}
          >
            {status === "uploading" && `${progress}%`}
            {status === "completed" && "Uploaded"}
            {status === "pending" && "Waiting..."}
            {status === "error" && (typeof error === "string" ? error : "Upload failed")}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        {(status === "pending" || status === "uploading") && onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onCancel(fileId)}
            title="Cancel upload"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {status === "error" && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onRetry(fileId, file)}
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};

export const UploadQueue: React.FC<UploadQueueProps> = ({
  uploads,
  onCancel,
  onRetry,
  onClearCompleted,
  onClearAll,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  // Convert Map to array for rendering
  const uploadsList = Array.from(uploads.entries());

  // Count by status
  const counts = {
    total: uploadsList.length,
    pending: uploadsList.filter(([, u]) => u.status === "pending").length,
    uploading: uploadsList.filter(([, u]) => u.status === "uploading").length,
    completed: uploadsList.filter(([, u]) => u.status === "completed").length,
    error: uploadsList.filter(([, u]) => u.status === "error").length,
  };

  const hasActiveUploads = counts.pending > 0 || counts.uploading > 0;
  const hasCompletedUploads = counts.completed > 0;

  if (uploadsList.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-t-lg border border-b-0">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent">
            <span className="font-medium text-sm">Upload Queue ({counts.total})</span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
        </CollapsibleTrigger>

        {/* Status summary */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {hasActiveUploads && (
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {counts.uploading + counts.pending} remaining
            </span>
          )}
          {counts.completed > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-3 w-3" />
              {counts.completed} completed
            </span>
          )}
          {counts.error > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {counts.error} failed
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {hasCompletedUploads && onClearCompleted && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearCompleted}>
              Clear completed
            </Button>
          )}
          {!hasActiveUploads && onClearAll && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClearAll}
              title="Clear all"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Queue items */}
      <CollapsibleContent>
        <div className="space-y-2 p-3 border border-t-0 rounded-b-lg max-h-[300px] overflow-y-auto">
          {uploadsList.map(([fileId, upload]) => (
            <UploadQueueItem
              key={fileId}
              fileId={fileId}
              upload={upload}
              onCancel={onCancel}
              onRetry={onRetry}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default UploadQueue;

/**
 * RestoreDraftDialog Component
 *
 * Confirmation dialog for restoring unsaved draft changes.
 * Replaces window.confirm() with a proper accessible dialog.
 *
 * Week 7 Task 1.4.1: Replace window.confirm() usage
 */

import React from "react";
import { FileText, Clock, X, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface RestoreDraftDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when the user chooses to restore the draft */
  onRestore: () => void;
  /** Callback when the user chooses to discard the draft */
  onDiscard: () => void;
  /** Optional: timestamp when the draft was saved */
  draftTimestamp?: string;
}

/**
 * Formats a timestamp for display
 */
const formatDraftTime = (timestamp?: string): string => {
  if (!timestamp) return "some time ago";

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "some time ago";
  }
};

export const RestoreDraftDialog: React.FC<RestoreDraftDialogProps> = ({
  open,
  onOpenChange,
  onRestore,
  onDiscard,
  draftTimestamp,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <AlertDialogTitle>Restore Unsaved Changes?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            We found unsaved changes from a previous editing session. Would you like to restore
            them?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Draft saved {formatDraftTime(draftTimestamp)}</span>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onDiscard} className="gap-2 sm:order-1">
            <X className="h-4 w-4" />
            Discard Draft
          </Button>
          <AlertDialogAction onClick={onRestore} className="gap-2 sm:order-2">
            <RotateCcw className="h-4 w-4" />
            Restore Draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RestoreDraftDialog;

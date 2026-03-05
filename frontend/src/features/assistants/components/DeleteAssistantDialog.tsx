/**
 * DeleteAssistantDialog Component
 *
 * Confirmation dialog for deleting AI assistants with warning about consequences.
 */

import React from "react";
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
import { Loader2, AlertTriangle } from "lucide-react";
import type { Assistant } from "../types";

interface DeleteAssistantDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assistant: Assistant | null;
  isDeleting?: boolean;
}

export const DeleteAssistantDialog: React.FC<DeleteAssistantDialogProps> = ({
  open,
  onClose,
  onConfirm,
  assistant,
  isDeleting = false,
}) => {
  if (!assistant) return null;

  const hasConversations = assistant.total_conversations > 0;
  const unresolvedCount = assistant.unresolved_count || 0;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete Assistant?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2 pt-2">
            <p>
              You are about to delete <strong>{assistant.name}</strong>. This action cannot be
              undone.
            </p>

            {hasConversations && (
              <div className="rounded-md bg-muted p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  ⚠️ Warning: This assistant has conversations
                </p>
                <ul className="text-sm space-y-1 ml-4 list-disc">
                  <li>
                    Total conversations: <strong>{assistant.total_conversations}</strong>
                  </li>
                  {unresolvedCount > 0 && (
                    <li className="text-destructive">
                      Unresolved conversations: <strong>{unresolvedCount}</strong>
                    </li>
                  )}
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  All conversation history and messages will be permanently deleted.
                </p>
              </div>
            )}

            {!hasConversations && (
              <p className="text-sm text-muted-foreground">
                This assistant has no conversations yet.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Assistant"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

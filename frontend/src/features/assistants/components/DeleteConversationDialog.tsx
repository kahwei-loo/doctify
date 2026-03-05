/**
 * DeleteConversationDialog Component
 *
 * Confirmation dialog for deleting a conversation.
 * Warns users that this action cannot be undone.
 *
 * Week 7 Task 1.4.3: Delete Conversation Dialog
 */

import React from "react";
import { Trash2, MessageSquare, AlertTriangle } from "lucide-react";
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

interface DeleteConversationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms deletion */
  onConfirm: () => void;
  /** Number of messages in the conversation */
  messageCount?: number;
  /** Preview of the conversation (optional) */
  conversationPreview?: string;
  /** Whether deletion is in progress */
  isDeleting?: boolean;
}

export const DeleteConversationDialog: React.FC<DeleteConversationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  messageCount,
  conversationPreview,
  isDeleting = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Conversation?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>

              {/* Conversation Info */}
              {(messageCount !== undefined || conversationPreview) && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {messageCount !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span>
                        <strong>{messageCount}</strong> message{messageCount !== 1 ? "s" : ""} will
                        be deleted
                      </span>
                    </div>
                  )}

                  {conversationPreview && (
                    <p className="text-sm text-muted-foreground line-clamp-2 italic">
                      "{conversationPreview}"
                    </p>
                  )}
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  All messages, attachments, and conversation history will be permanently removed.
                </span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Conversation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteConversationDialog;

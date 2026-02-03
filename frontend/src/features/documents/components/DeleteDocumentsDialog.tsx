/**
 * DeleteDocumentsDialog Component
 *
 * Confirmation dialog for batch deleting documents.
 * Shows document count and displays additional warning for large batches (>5).
 *
 * Week 1 Task 1.2.2: Confirmation Dialogs
 */

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteDocumentsDialogProps {
  documentIds: string[];
  documentNames?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteDocumentsDialog: React.FC<DeleteDocumentsDialogProps> = ({
  documentIds,
  documentNames = [],
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}) => {
  const count = documentIds.length;
  const isLargeBatch = count > 5;
  const isSingle = count === 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete {count} {isSingle ? 'document' : 'documents'}?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Main warning message */}
              <p className="text-foreground">
                {isSingle ? 'This document' : 'These documents'} will be permanently
                deleted along with all extracted data and processing history.
              </p>

              {/* Show document names for small batches */}
              {!isSingle && count <= 3 && documentNames.length > 0 && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm font-medium mb-2">Documents to delete:</p>
                  <ul className="text-sm space-y-1">
                    {documentNames.map((name, index) => (
                      <li key={index} className="truncate">
                        • {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Large batch warning */}
              {isLargeBatch && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                      Large Batch Operation
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                      You are about to delete {count} documents. This operation may take
                      a few moments to complete.
                    </p>
                  </div>
                </div>
              )}

              {/* Cannot undo warning */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">
                    This action cannot be undone
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    {isSingle
                      ? 'The document and all its data will be permanently removed from our servers.'
                      : `All ${count} documents and their data will be permanently removed from our servers.`}
                  </p>
                </div>
              </div>

              {/* Export suggestion for large batches */}
              {count > 10 && (
                <p className="text-xs text-muted-foreground">
                  💡 Tip: Consider exporting your data before deletion if you might need
                  it in the future.
                </p>
              )}
            </div>
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
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {isSingle ? 'Document' : `${count} Documents`}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

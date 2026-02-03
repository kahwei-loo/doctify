/**
 * DeleteProjectDialog Component
 *
 * Confirmation dialog for deleting a project with impact details.
 * Shows the number of documents and warns about permanent deletion.
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

interface Project {
  project_id: string;
  name: string;
  document_count?: number;
}

interface DeleteProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteProjectDialog: React.FC<DeleteProjectDialogProps> = ({
  project,
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
}) => {
  const documentCount = project.document_count || 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete "{project.name}"?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-foreground">
                This will permanently delete the following:
              </p>

              {/* Impact Details */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <ul className="list-disc list-inside text-sm space-y-1.5">
                  <li>
                    <strong className="font-semibold">{documentCount}</strong>{' '}
                    {documentCount === 1 ? 'document' : 'documents'}
                  </li>
                  <li>All extracted data and processing history</li>
                  <li>All project configuration and settings</li>
                  <li>All associated metadata and annotations</li>
                </ul>
              </div>

              {/* Warning Banner */}
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">
                    This action cannot be undone
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    All data associated with this project will be permanently deleted
                    from our servers.
                  </p>
                </div>
              </div>

              {/* Additional warning for projects with many documents */}
              {documentCount > 10 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                    ⚠️ This project contains {documentCount} documents. Consider exporting
                    your data before deletion.
                  </p>
                </div>
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
                Delete Project
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

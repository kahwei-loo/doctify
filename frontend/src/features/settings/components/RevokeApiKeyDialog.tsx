/**
 * RevokeApiKeyDialog Component
 *
 * Confirmation dialog for revoking an API key.
 * Replaces window.confirm() with a proper accessible dialog.
 *
 * Week 7 Task 1.4.1: Replace window.confirm() usage
 */

import React from 'react';
import { Loader2, Key, AlertTriangle } from 'lucide-react';
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

interface RevokeApiKeyDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** The name of the API key to revoke */
  keyName: string;
  /** Callback when the user confirms revocation */
  onConfirm: () => void;
  /** Whether the revocation is in progress */
  isRevoking?: boolean;
}

export const RevokeApiKeyDialog: React.FC<RevokeApiKeyDialogProps> = ({
  open,
  onOpenChange,
  keyName,
  onConfirm,
  isRevoking = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Key className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Are you sure you want to revoke the API key{' '}
            <span className="font-medium text-foreground">"{keyName}"</span>?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="font-medium text-amber-700 dark:text-amber-500">Important:</p>
          </div>
          <ul className="mt-1 text-muted-foreground space-y-1 list-disc list-inside ml-6">
            <li>Any applications using this key will lose access immediately</li>
            <li>This action cannot be undone</li>
            <li>You will need to create a new key and update your applications</li>
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isRevoking}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isRevoking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking...
              </>
            ) : (
              'Revoke Key'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RevokeApiKeyDialog;

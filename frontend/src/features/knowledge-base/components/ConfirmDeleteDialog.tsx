/**
 * ConfirmDeleteDialog Component
 *
 * Confirmation dialog for destructive actions.
 *
 * Features:
 * - Customizable title and message
 * - Impact preview (items to be deleted)
 * - Cancel/Confirm actions
 * - Destructive styling
 */

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName?: string;
  impact?: {
    label: string;
    count: number;
  }[];
  isDeleting?: boolean;
}

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  impact = [],
  isDeleting = false,
}) => {
  const handleConfirm = () => {
    onConfirm();
    // Dialog will be closed by parent after successful deletion
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Name Display */}
          {itemName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Deleting:</p>
              <p className="text-sm text-muted-foreground mt-1">{itemName}</p>
            </div>
          )}

          {/* Impact Preview */}
          {impact.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">This will also delete:</p>
                <ul className="list-disc list-inside space-y-1">
                  {impact.map((item, index) => (
                    <li key={index}>
                      {item.count} {item.label}
                      {item.count !== 1 ? 's' : ''}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning Message */}
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. All associated data will be permanently removed.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDeleteDialog;

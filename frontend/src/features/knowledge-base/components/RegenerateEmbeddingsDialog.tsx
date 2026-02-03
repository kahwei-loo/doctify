/**
 * RegenerateEmbeddingsDialog Component
 *
 * Confirmation dialog for regenerating embeddings.
 * Warns users about replacing existing embeddings and potential costs.
 *
 * Week 7 Task 1.4.2: Embeddings Regeneration Confirmation
 */

import React from 'react';
import { AlertTriangle, Zap, Clock, DollarSign } from 'lucide-react';
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

interface RegenerateEmbeddingsDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when user confirms regeneration */
  onConfirm: () => void;
  /** Number of data sources to process */
  dataSourceCount: number;
  /** Whether regeneration is in progress */
  isRegenerating?: boolean;
  /** Estimated cost (optional) */
  estimatedCost?: number;
}

export const RegenerateEmbeddingsDialog: React.FC<RegenerateEmbeddingsDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  dataSourceCount,
  isRegenerating = false,
  estimatedCost,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  // Estimate processing time (rough estimate: 10 chunks per source, 0.5s per chunk)
  const estimatedMinutes = Math.ceil((dataSourceCount * 10 * 0.5) / 60);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Regenerate Embeddings?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                This will regenerate all vector embeddings for this knowledge base.
                Existing embeddings will be replaced.
              </p>

              {/* Impact Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Zap className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>
                    <strong>{dataSourceCount}</strong> data source{dataSourceCount !== 1 ? 's' : ''} will be processed
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>
                    Estimated time: <strong>~{estimatedMinutes} minute{estimatedMinutes !== 1 ? 's' : ''}</strong>
                  </span>
                </div>

                {estimatedCost !== undefined && (
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="h-4 w-4 text-green-500 shrink-0" />
                    <span>
                      Estimated cost: <strong>${estimatedCost.toFixed(2)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Warning */}
              <p className="text-sm text-amber-600 dark:text-amber-400">
                During regeneration, search results may be incomplete or unavailable.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRegenerating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isRegenerating}
            className="bg-primary"
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RegenerateEmbeddingsDialog;

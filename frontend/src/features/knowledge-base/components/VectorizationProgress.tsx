/**
 * VectorizationProgress Component
 *
 * Displays the progress of document vectorization/embedding generation.
 * Shows different states: pending, processing, completed, failed.
 */

import React from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type VectorizationStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface VectorizationProgressProps {
  /** Current status of vectorization */
  status: VectorizationStatus;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Number of documents/chunks processed */
  processedCount?: number;
  /** Total number of documents/chunks to process */
  totalCount?: number;
  /** Error message if failed */
  error?: string;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  /** Custom title */
  title?: string;
  /** Additional class names */
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    iconColor: 'text-muted-foreground',
    bgColor: 'bg-muted',
    title: 'Waiting to Start',
    description: 'Vectorization will begin shortly...',
  },
  processing: {
    icon: Loader2,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    title: 'Generating Embeddings',
    description: 'Processing documents and creating vector embeddings...',
  },
  completed: {
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    title: 'Vectorization Complete',
    description: 'All documents have been successfully vectorized.',
  },
  failed: {
    icon: AlertCircle,
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
    title: 'Vectorization Failed',
    description: 'An error occurred during vectorization.',
  },
};

export const VectorizationProgress: React.FC<VectorizationProgressProps> = ({
  status,
  progress = 0,
  processedCount,
  totalCount,
  error,
  onRetry,
  onCancel,
  isRetrying = false,
  title,
  className,
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayTitle = title || config.title;

  const hasProgress = typeof processedCount === 'number' && typeof totalCount === 'number';
  const progressPercentage = hasProgress && totalCount > 0
    ? Math.round((processedCount / totalCount) * 100)
    : progress;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center h-12 w-12 rounded-lg shrink-0',
              config.bgColor
            )}
          >
            <Icon
              className={cn(
                'h-6 w-6',
                config.iconColor,
                status === 'processing' && 'animate-spin'
              )}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1">{displayTitle}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {status === 'failed' && error ? error : config.description}
            </p>

            {/* Progress bar for pending/processing */}
            {(status === 'pending' || status === 'processing') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {hasProgress
                      ? `${processedCount} / ${totalCount}`
                      : `${progressPercentage}%`}
                  </span>
                </div>
                <Progress
                  value={progressPercentage}
                  className={cn(
                    'h-2',
                    status === 'processing' && '[&>div]:bg-blue-500'
                  )}
                />
                {hasProgress && (
                  <p className="text-xs text-muted-foreground">
                    {totalCount - processedCount} remaining
                  </p>
                )}
              </div>
            )}

            {/* Completion stats */}
            {status === 'completed' && hasProgress && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {processedCount} documents vectorized
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4">
              {status === 'failed' && onRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isRetrying}
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw
                    className={cn('h-4 w-4', isRetrying && 'animate-spin')}
                  />
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Button>
              )}
              {status === 'processing' && onCancel && (
                <Button
                  onClick={onCancel}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * VectorizationProgressCompact Component
 *
 * A smaller inline version for use in lists or cards.
 */
interface VectorizationProgressCompactProps {
  status: VectorizationStatus;
  progress?: number;
  className?: string;
}

export const VectorizationProgressCompact: React.FC<
  VectorizationProgressCompactProps
> = ({ status, progress = 0, className }) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Icon
        className={cn(
          'h-4 w-4',
          config.iconColor,
          status === 'processing' && 'animate-spin'
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs">
          <span className="truncate">{config.title}</span>
          {(status === 'pending' || status === 'processing') && (
            <span className="text-muted-foreground ml-2">{progress}%</span>
          )}
        </div>
        {(status === 'pending' || status === 'processing') && (
          <Progress value={progress} className="h-1 mt-1" />
        )}
      </div>
    </div>
  );
};

export default VectorizationProgress;

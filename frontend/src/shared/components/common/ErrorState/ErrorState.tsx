/**
 * ErrorState Component
 *
 * Unified error display component with retry functionality.
 * Supports multiple error types, variants, and display modes.
 *
 * @example
 * // Basic usage
 * <ErrorState
 *   type="network"
 *   onRetry={handleRetry}
 * />
 *
 * @example
 * // Custom message with alert variant
 * <ErrorState
 *   title="Upload Failed"
 *   message="The file could not be uploaded"
 *   variant="alert"
 *   onRetry={handleRetry}
 * />
 */

import React from 'react';
import {
  AlertCircle,
  RefreshCw,
  WifiOff,
  ServerCrash,
  FileWarning,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ErrorType =
  | 'network'
  | 'server'
  | 'not-found'
  | 'unauthorized'
  | 'timeout'
  | 'unknown';

export interface ErrorStateProps {
  /** Type of error - determines icon and default messaging */
  type?: ErrorType;
  /** Custom title (overrides default based on type) */
  title?: string;
  /** Custom message (overrides default based on type) */
  message?: string;
  /** Technical details (e.g., error codes) */
  details?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  /** Show retry button (default: true if onRetry provided) */
  showRetry?: boolean;
  /** Display variant */
  variant?: 'card' | 'alert' | 'inline' | 'compact';
  /** Additional class names */
  className?: string;
}

interface ErrorConfig {
  icon: React.FC<{ className?: string }>;
  defaultTitle: string;
  defaultMessage: string;
}

const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  network: {
    icon: WifiOff,
    defaultTitle: 'Network Error',
    defaultMessage:
      'Unable to connect to the server. Please check your internet connection.',
  },
  server: {
    icon: ServerCrash,
    defaultTitle: 'Server Error',
    defaultMessage: 'The server encountered an error. Please try again later.',
  },
  'not-found': {
    icon: FileWarning,
    defaultTitle: 'Not Found',
    defaultMessage: 'The requested resource could not be found.',
  },
  unauthorized: {
    icon: ShieldAlert,
    defaultTitle: 'Access Denied',
    defaultMessage:
      'You do not have permission to access this resource. Please sign in or contact support.',
  },
  timeout: {
    icon: Clock,
    defaultTitle: 'Request Timeout',
    defaultMessage:
      'The request took too long to complete. Please try again.',
  },
  unknown: {
    icon: AlertCircle,
    defaultTitle: 'Something Went Wrong',
    defaultMessage: 'An unexpected error occurred. Please try again.',
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'unknown',
  title,
  message,
  details,
  onRetry,
  isRetrying = false,
  showRetry = true,
  variant = 'card',
  className,
}) => {
  const config = ERROR_CONFIGS[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;
  const shouldShowRetry = showRetry && onRetry;

  // Compact variant - minimal inline display
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-4 text-center',
          className
        )}
      >
        <Icon className="h-6 w-6 text-destructive mb-2" />
        <p className="text-sm font-medium text-destructive mb-1">
          {displayTitle}
        </p>
        <p className="text-xs text-muted-foreground mb-3">{displayMessage}</p>
        {shouldShowRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="gap-2"
          >
            <RefreshCw
              className={cn('h-3 w-3', isRetrying && 'animate-spin')}
            />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        )}
      </div>
    );
  }

  // Alert variant - uses shadcn Alert component
  if (variant === 'alert') {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{displayTitle}</AlertTitle>
        <AlertDescription>
          <p>{displayMessage}</p>
          {details && (
            <div className="mt-2 p-2 bg-background/50 rounded text-xs font-mono">
              {details}
            </div>
          )}
          {shouldShowRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
            >
              <RefreshCw
                className={cn('h-4 w-4', isRetrying && 'animate-spin')}
              />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Content for card and inline variants
  const content = (
    <div className="flex items-start gap-4">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 shrink-0">
        <Icon className="h-6 w-6 text-destructive" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold mb-1">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground mb-2">{displayMessage}</p>
        {details && (
          <div className="mt-2 p-2 bg-muted rounded text-xs font-mono text-muted-foreground overflow-auto">
            {details}
          </div>
        )}
        {shouldShowRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
          >
            <RefreshCw
              className={cn('h-4 w-4', isRetrying && 'animate-spin')}
            />
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        )}
      </div>
    </div>
  );

  // Inline variant - no card wrapper
  if (variant === 'inline') {
    return <div className={cn('py-8', className)}>{content}</div>;
  }

  // Card variant (default)
  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardContent className="py-8">{content}</CardContent>
    </Card>
  );
};

/**
 * InlineError Component
 *
 * A smaller error display for use within components (e.g., form fields, panels).
 */
export interface InlineErrorProps {
  /** Error message */
  message: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Additional class names */
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-destructive/10 border border-destructive/20',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
        <span className="text-sm text-destructive">{message}</span>
      </div>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-7 text-xs text-destructive hover:text-destructive"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
};

export default ErrorState;

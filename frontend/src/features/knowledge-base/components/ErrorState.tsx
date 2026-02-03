/**
 * ErrorState Component
 *
 * Error display with retry action.
 *
 * Features:
 * - Error icon and message
 * - Optional retry button
 * - Customizable error details
 * - Support for different error types
 */

import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ErrorType = 'network' | 'server' | 'not-found' | 'unknown';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  details?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  showRetry?: boolean;
  variant?: 'card' | 'alert' | 'inline';
  className?: string;
}

const ERROR_CONFIGS: Record<ErrorType, { icon: React.ReactNode; defaultTitle: string; defaultMessage: string }> = {
  network: {
    icon: <WifiOff className="h-8 w-8" />,
    defaultTitle: 'Network Error',
    defaultMessage: 'Unable to connect to the server. Please check your internet connection.',
  },
  server: {
    icon: <ServerCrash className="h-8 w-8" />,
    defaultTitle: 'Server Error',
    defaultMessage: 'The server encountered an error. Please try again later.',
  },
  'not-found': {
    icon: <FileWarning className="h-8 w-8" />,
    defaultTitle: 'Not Found',
    defaultMessage: 'The requested resource could not be found.',
  },
  unknown: {
    icon: <AlertCircle className="h-8 w-8" />,
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
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  const content = (
    <>
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 shrink-0">
          {config.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{displayTitle}</h3>
          <p className="text-sm text-muted-foreground mb-2">{displayMessage}</p>
          {details && (
            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono text-muted-foreground">
              {details}
            </div>
          )}
          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              variant="outline"
              size="sm"
              className="mt-4 gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
        </div>
      </div>
    </>
  );

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
          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              disabled={isRetrying}
              variant="outline"
              size="sm"
              className="mt-3 gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'inline') {
    return <div className={cn('py-8', className)}>{content}</div>;
  }

  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardContent className="py-8">{content}</CardContent>
    </Card>
  );
};

export default ErrorState;

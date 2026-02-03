/**
 * Error State Component
 *
 * Reusable error display with retry functionality for the Assistants feature.
 */

import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ErrorType = 'generic' | 'network' | 'server' | 'notFound';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

const errorConfig: Record<ErrorType, { icon: React.ElementType; title: string; message: string }> = {
  generic: {
    icon: AlertCircle,
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
  },
  network: {
    icon: WifiOff,
    title: 'Connection Error',
    message: 'Unable to connect to the server. Please check your internet connection.',
  },
  server: {
    icon: ServerCrash,
    title: 'Server Error',
    message: 'The server encountered an error. Please try again later.',
  },
  notFound: {
    icon: AlertCircle,
    title: 'Not Found',
    message: 'The requested resource could not be found.',
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'generic',
  title,
  message,
  onRetry,
  className,
  compact = false,
}) => {
  const config = errorConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  if (compact) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-4 text-center', className)}>
        <Icon className="h-6 w-6 text-destructive mb-2" />
        <p className="text-sm font-medium text-destructive mb-1">{displayTitle}</p>
        <p className="text-xs text-muted-foreground mb-3">{displayMessage}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <Icon className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-destructive mb-2">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{displayMessage}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Inline Error Alert
 *
 * Smaller error display for use within components
 */
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, onRetry, className }) => {
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

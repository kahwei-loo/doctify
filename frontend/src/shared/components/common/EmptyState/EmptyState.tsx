/**
 * EmptyState Component
 *
 * Unified empty state component for displaying no-data states across the application.
 * Supports multiple variants (card, inline, full-page) and optional action buttons.
 *
 * @example
 * // Basic usage with card variant (default)
 * <EmptyState
 *   icon={FileText}
 *   title="No documents"
 *   description="Upload your first document to get started"
 *   action={{ label: "Upload Document", onClick: handleUpload }}
 * />
 *
 * @example
 * // Inline variant for use within tables/lists
 * <EmptyState
 *   icon={Search}
 *   title="No results found"
 *   description="Try adjusting your search"
 *   variant="inline"
 * />
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Main title text */
  title: string;
  /** Description text explaining the empty state */
  description: string;
  /** Primary action button configuration */
  action?: EmptyStateAction;
  /** Secondary action button configuration */
  secondaryAction?: EmptyStateAction;
  /** Optional tip text displayed below the action */
  tip?: string;
  /** Visual variant of the empty state */
  variant?: 'card' | 'inline' | 'full-page';
  /** Additional class names */
  className?: string;
  /** Icon container class names for custom styling */
  iconClassName?: string;
  /** Size of the icon */
  iconSize?: 'sm' | 'md' | 'lg';
}

const iconSizes = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const iconContainerSizes = {
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
};

const EmptyStateContent: React.FC<
  Omit<EmptyStateProps, 'variant' | 'className'>
> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tip,
  iconClassName,
  iconSize = 'lg',
}) => {
  return (
    <>
      <div
        className={cn(
          'rounded-full bg-muted mb-4',
          iconContainerSizes[iconSize],
          iconClassName
        )}
      >
        <Icon className={cn('text-muted-foreground', iconSizes[iconSize])} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6 text-center">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size="lg"
            >
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'outline'}
              size="lg"
            >
              {secondaryAction.icon && (
                <secondaryAction.icon className="mr-2 h-4 w-4" />
              )}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
      {tip && (
        <p className="text-xs text-muted-foreground mt-4 text-center">{tip}</p>
      )}
    </>
  );
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'card',
  className,
  ...props
}) => {
  const contentClassName =
    'flex flex-col items-center justify-center py-12 px-6 text-center';

  if (variant === 'card') {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className={contentClassName}>
          <EmptyStateContent {...props} />
        </CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn(contentClassName, 'py-8', className)}>
        <EmptyStateContent {...props} iconSize="md" />
      </div>
    );
  }

  // full-page variant
  return (
    <div
      className={cn(contentClassName, 'min-h-[50vh]', className)}
    >
      <EmptyStateContent {...props} />
    </div>
  );
};

export default EmptyState;

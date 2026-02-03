/**
 * CardSkeleton Component
 *
 * A skeleton loading state for card-based views.
 * Supports various card layouts and content types.
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardSkeletonProps {
  /** Show card header area */
  showHeader?: boolean;
  /** Show avatar/icon in header */
  showAvatar?: boolean;
  /** Show card footer area */
  showFooter?: boolean;
  /** Number of content lines */
  contentLines?: number;
  /** Show action buttons area */
  showActions?: boolean;
  /** Additional class names */
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showHeader = true,
  showAvatar = true,
  showFooter = true,
  contentLines = 2,
  showActions = false,
  className,
}) => {
  return (
    <Card className={cn('animate-pulse', className)}>
      {showHeader && (
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
          {showAvatar && (
            <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
          {showActions && <Skeleton className="h-8 w-8 rounded" />}
        </CardHeader>
      )}
      <CardContent className="space-y-2">
        {Array.from({ length: contentLines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-4', i === contentLines - 1 ? 'w-3/4' : 'w-full')}
          />
        ))}
      </CardContent>
      {showFooter && (
        <CardFooter className="pt-3">
          <div className="flex items-center gap-4 w-full">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

/**
 * CardGridSkeleton Component
 *
 * A grid of card skeletons for loading states.
 */
interface CardGridSkeletonProps {
  /** Number of cards to display */
  count?: number;
  /** Grid columns configuration */
  columns?: 1 | 2 | 3 | 4;
  /** Card configuration */
  cardProps?: Omit<CardSkeletonProps, 'className'>;
  /** Additional class names */
  className?: string;
}

export const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({
  count = 6,
  columns = 3,
  cardProps,
  className,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} {...cardProps} />
      ))}
    </div>
  );
};

export default CardSkeleton;

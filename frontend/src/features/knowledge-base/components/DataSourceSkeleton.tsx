/**
 * DataSourceSkeleton Component
 *
 * Loading skeleton for data source cards.
 *
 * Features:
 * - Grid layout matching DataSourceList
 * - Card skeletons with stats layout
 * - Animated shimmer effect
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataSourceSkeletonProps {
  count?: number;
  className?: string;
}

export const DataSourceSkeleton: React.FC<DataSourceSkeletonProps> = ({
  count = 3,
  className,
}) => {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardHeader>

          <CardContent className="pb-4">
            {/* Stats skeleton */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <Skeleton className="h-6 w-8 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
            </div>

            {/* Metadata skeleton */}
            <div className="space-y-1">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DataSourceSkeleton;

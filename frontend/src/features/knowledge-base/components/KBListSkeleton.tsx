/**
 * KBListSkeleton Component
 *
 * Loading skeleton for knowledge base list panel.
 *
 * Features:
 * - Card skeletons matching KBListPanel layout
 * - Animated shimmer effect
 * - Responsive design
 */

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KBListSkeletonProps {
  count?: number;
  className?: string;
}

export const KBListSkeleton: React.FC<KBListSkeletonProps> = ({ count = 3, className }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          {/* Icon skeleton */}
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Status skeleton */}
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
};

export default KBListSkeleton;

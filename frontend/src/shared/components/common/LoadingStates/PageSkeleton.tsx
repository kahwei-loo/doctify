/**
 * PageSkeleton Component
 *
 * A skeleton loading state for full page layouts.
 * Includes header, stats, and content areas.
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  /** Show page header area */
  showHeader?: boolean;
  /** Show statistics cards */
  showStats?: boolean;
  /** Number of stat cards */
  statCount?: number;
  /** Show search/filter bar */
  showFilters?: boolean;
  /** Content area type */
  contentType?: "cards" | "table" | "list";
  /** Number of content items */
  contentCount?: number;
  /** Additional class names */
  className?: string;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  showHeader = true,
  showStats = false,
  statCount = 4,
  showFilters = true,
  contentType = "cards",
  contentCount = 6,
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      )}

      {/* Statistics */}
      {showStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: statCount }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {contentType === "cards" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: contentCount }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {contentType === "table" && (
        <Card>
          <div className="p-4 space-y-4">
            {Array.from({ length: contentCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {contentType === "list" && (
        <div className="space-y-2">
          {Array.from({ length: contentCount }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * InlineLoading Component
 *
 * A simple inline loading indicator with optional message.
 */
interface InlineLoadingProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = "Loading...",
  className,
  size = "md",
}) => {
  return (
    <div className={cn("flex items-center justify-center gap-2 text-muted-foreground", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
};

/**
 * FullPageLoading Component
 *
 * A centered full-page loading indicator.
 */
interface FullPageLoadingProps {
  message?: string;
  className?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  message = "Loading...",
  className,
}) => {
  return (
    <div
      className={cn("flex flex-col items-center justify-center h-full min-h-[400px]", className)}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default PageSkeleton;

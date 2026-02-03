/**
 * DocumentTableSkeleton Component
 *
 * Loading skeleton specifically designed for the DocumentTable component.
 * Matches the exact layout and structure of the document table.
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DocumentTableSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Additional class names */
  className?: string;
}

export const DocumentTableSkeleton: React.FC<DocumentTableSkeletonProps> = ({
  rows = 5,
  className,
}) => {
  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {/* Checkbox */}
            <TableHead className="w-10">
              <Skeleton className="h-4 w-4" />
            </TableHead>
            {/* Document (filename) */}
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            {/* Status */}
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            {/* Confidence */}
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            {/* Date */}
            <TableHead>
              <Skeleton className="h-4 w-12" />
            </TableHead>
            {/* Actions */}
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i} className="animate-pulse">
              {/* Checkbox */}
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
              {/* Document (filename + size) */}
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </TableCell>
              {/* Status */}
              <TableCell>
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
              {/* Confidence */}
              <TableCell>
                <Skeleton className="h-2 w-24" />
              </TableCell>
              {/* Date */}
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              {/* Actions */}
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DocumentTableSkeleton;

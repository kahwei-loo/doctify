/**
 * TableSkeleton Component
 *
 * A skeleton loading state for table views.
 * Mimics the structure of a data table with configurable rows and columns.
 */

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface TableSkeletonColumn {
  /** Width of the column (e.g., 'w-8', 'w-32', 'flex-1') */
  width?: string;
  /** Whether to show a checkbox skeleton */
  checkbox?: boolean;
}

interface TableSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Column configuration */
  columns?: TableSkeletonColumn[];
  /** Whether to show header row */
  showHeader?: boolean;
  /** Additional class names */
  className?: string;
}

const defaultColumns: TableSkeletonColumn[] = [
  { width: "w-8", checkbox: true },
  { width: "w-48" },
  { width: "w-24" },
  { width: "w-20" },
  { width: "w-24" },
  { width: "w-8" },
];

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = defaultColumns,
  showHeader = true,
  className,
}) => {
  return (
    <div className={cn("rounded-lg border", className)}>
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className={col.width}>
                  {col.checkbox ? (
                    <Skeleton className="h-4 w-4" />
                  ) : (
                    <Skeleton className="h-4 w-full max-w-[100px]" />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((col, colIndex) => (
                <TableCell key={colIndex} className={col.width}>
                  {col.checkbox ? (
                    <Skeleton className="h-4 w-4" />
                  ) : (
                    <Skeleton className="h-4 w-full" />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TableSkeleton;

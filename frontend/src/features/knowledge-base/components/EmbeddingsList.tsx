/**
 * EmbeddingsList Component
 *
 * Display embeddings in a paginated table.
 * Pattern: Based on DocumentTable.tsx
 *
 * Features:
 * - Sortable columns (text, created date)
 * - Pagination (50 per page)
 * - Text preview with truncation
 * - Source information
 * - Status badges
 */

import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Embedding } from '../types';

interface EmbeddingsListProps {
  embeddings: Embedding[];
  isLoading?: boolean;
  className?: string;
}

/**
 * Format date to relative time
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Truncate text to max length
 */
const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const EmbeddingsList: React.FC<EmbeddingsListProps> = ({
  embeddings,
  isLoading = false,
  className,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'created_at', desc: true },
  ]);

  // Define columns
  const columns = React.useMemo<ColumnDef<Embedding>[]>(
    () => [
      // Text preview column
      {
        accessorKey: 'text',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 -ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Text Content
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const text = row.getValue('text') as string;
          return (
            <div className="max-w-md">
              <p className="text-sm font-mono text-muted-foreground">
                {truncateText(text, 150)}
              </p>
            </div>
          );
        },
      },
      // Source column
      {
        accessorKey: 'source_name',
        header: 'Source',
        cell: ({ row }) => {
          const sourceName = row.getValue('source_name') as string | undefined;
          return (
            <div className="min-w-[150px]">
              {sourceName ? (
                <span className="text-sm text-muted-foreground truncate block max-w-[150px]">
                  {sourceName}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground italic">No source</span>
              )}
            </div>
          );
        },
      },
      // Status column
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string; className?: string }> = {
            active: { variant: 'default', label: 'Active', className: 'bg-green-500' },
            pending: { variant: 'secondary', label: 'Pending' },
            failed: { variant: 'destructive', label: 'Failed' },
          };
          const config = statusConfig[status] || statusConfig.active;

          return (
            <Badge variant={config.variant} className={config.className}>
              {config.label}
            </Badge>
          );
        },
        size: 100,
      },
      // Vector dimensions column
      {
        accessorKey: 'vector',
        header: 'Dimensions',
        cell: ({ row }) => {
          const vector = row.getValue('vector') as number[] | undefined;
          return (
            <span className="text-sm text-muted-foreground">
              {vector ? vector.length : '-'}
            </span>
          );
        },
        size: 100,
      },
      // Date column
      {
        accessorKey: 'created_at',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 -ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Created
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const date = row.getValue('created_at') as string;
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {formatDate(date)}
            </span>
          );
        },
        size: 120,
      },
    ],
    []
  );

  const table = useReactTable({
    data: embeddings,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  return (
    <div className={className}>
      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Zap className="h-8 w-8" />
                    <p>No embeddings found</p>
                    <p className="text-xs">Generate embeddings from your data sources</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              embeddings.length
            )}{' '}
            of {embeddings.length} embeddings
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddingsList;

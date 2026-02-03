/**
 * DocumentTable Component
 *
 * Data table for displaying documents with sorting, filtering, and selection.
 * Built with @tanstack/react-table for performance.
 *
 * Features:
 * - Sortable columns
 * - Row selection (checkbox)
 * - Status badges with color coding
 * - Confidence bars
 * - Responsive design
 * - Click to view document
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from '@tanstack/react-table';
import {
  FileText,
  Image,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { EmptyDocumentsState } from './EmptyDocumentsState';
import { DocumentTableSkeleton } from './DocumentTableSkeleton';
import type { DocumentListItem, DocumentStatus } from '../types';

interface DocumentTableProps {
  documents: DocumentListItem[];
  isLoading?: boolean;
  onDelete?: (documentIds: string[]) => void;
  onReprocess?: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
  onUpload?: () => void;
  hasProjectFilter?: boolean;
  hasSearchQuery?: boolean;
  onClearSearch?: () => void;
  className?: string;
}

/**
 * Get file icon based on MIME type
 */
const getFileIcon = (mimeType: string) => {
  if (mimeType === 'application/pdf') {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (mimeType.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

/**
 * Get status badge variant and text
 */
const getStatusConfig = (status: DocumentStatus): { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className?: string } => {
  switch (status) {
    case 'completed':
      return { variant: 'default', label: 'Completed', className: 'bg-green-500 hover:bg-green-500/80' };
    case 'processing':
      return { variant: 'secondary', label: 'Processing', className: 'bg-blue-500 text-white hover:bg-blue-500/80' };
    case 'pending':
      return { variant: 'outline', label: 'Pending' };
    case 'failed':
      return { variant: 'destructive', label: 'Failed' };
    case 'cancelled':
      return { variant: 'outline', label: 'Cancelled', className: 'text-muted-foreground' };
    default:
      return { variant: 'outline', label: status };
  }
};

/**
 * Format file size to human readable
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

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

// Extend DocumentListItem to include confidence for display
interface DocumentWithConfidence extends DocumentListItem {
  confidence?: number;
}

/**
 * Memoized DocumentTable component to prevent unnecessary re-renders
 * Uses React.memo with custom comparison for optimal performance
 */
export const DocumentTable: React.FC<DocumentTableProps> = React.memo(({
  documents,
  isLoading = false,
  onDelete,
  onReprocess,
  onDownload,
  onUpload,
  hasProjectFilter = false,
  hasSearchQuery = false,
  onClearSearch,
  className,
}) => {
  const navigate = useNavigate();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Define columns
  const columns = React.useMemo<ColumnDef<DocumentWithConfidence>[]>(
    () => [
      // Selection column
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      // Filename column
      {
        accessorKey: 'filename',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 -ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Document
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
          const doc = row.original;
          return (
            <div className="flex items-center gap-3">
              {getFileIcon(doc.mime_type)}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {doc.filename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(doc.file_size)}
                </p>
              </div>
            </div>
          );
        },
      },
      // Status column
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 -ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Status
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
          const status = row.getValue('status') as DocumentStatus;
          const config = getStatusConfig(status);
          return (
            <div className="flex items-center gap-2">
              {status === 'processing' && (
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
              )}
              <Badge variant={config.variant} className={config.className}>
                {config.label}
              </Badge>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      // Confidence column
      {
        accessorKey: 'confidence',
        header: 'Confidence',
        cell: ({ row }) => {
          const confidence = row.getValue('confidence') as number | undefined;
          const status = row.getValue('status') as DocumentStatus;

          if (status !== 'completed' || confidence === undefined) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }

          return (
            <div className="w-24">
              <ConfidenceBar value={confidence} size="sm" showLabel labelPosition="inline" />
            </div>
          );
        },
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
            Date
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
            <span className="text-sm text-muted-foreground">
              {formatDate(date)}
            </span>
          );
        },
      },
      // Actions column
      {
        id: 'actions',
        cell: ({ row }) => {
          const doc = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/documents/${doc.document_id}`);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {onDownload && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(doc.document_id);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                )}
                {(doc.status === 'pending' || doc.status === 'failed' || doc.status === 'processing') && onReprocess && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onReprocess(doc.document_id);
                    }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {doc.status === 'pending' ? 'Start Processing' : doc.status === 'processing' ? 'Reset & Reprocess' : 'Reprocess'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete([doc.document_id]);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 40,
      },
    ],
    [navigate, onDelete, onReprocess, onDownload]
  );

  const table = useReactTable({
    data: documents,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.document_id,
  });

  // Get selected document IDs
  const selectedIds = Object.keys(rowSelection);

  // Show skeleton while loading
  if (isLoading) {
    return <DocumentTableSkeleton rows={5} className={className} />;
  }

  return (
    <div className={className}>
      {/* Bulk actions bar */}
      {selectedIds.length > 0 && onDelete && (
        <div className="flex items-center justify-between p-3 mb-4 bg-muted/50 rounded-lg border">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} document{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRowSelection({})}
            >
              Clear selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(selectedIds);
                setRowSelection({});
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete selected
            </Button>
          </div>
        </div>
      )}

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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer"
                  onClick={() => navigate(`/documents/${row.original.document_id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <EmptyDocumentsState
                    onUpload={onUpload}
                    hasProjectFilter={hasProjectFilter}
                    hasSearchQuery={hasSearchQuery}
                    onClearSearch={onClearSearch}
                    variant="inline"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

DocumentTable.displayName = 'DocumentTable';

export default DocumentTable;

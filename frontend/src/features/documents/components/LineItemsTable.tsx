/**
 * LineItemsTable Component
 *
 * Specialized table for displaying invoice/receipt line items.
 * Supports currency formatting, sorting, and export functionality.
 *
 * Features:
 * - Sortable columns
 * - Currency formatting
 * - Subtotal/total calculations
 * - HTML sanitization for descriptions
 * - Export to CSV
 * - Responsive design
 */

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Copy,
  Check,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { sanitizeAIOutput } from '@/shared/utils/sanitize';

/**
 * Line item data structure
 */
export interface LineItem {
  itemNo?: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  amount: number;
  confidence?: number;
}

interface LineItemsTableProps {
  /** Array of line items */
  items: LineItem[];
  /** Currency code (e.g., 'USD', 'EUR') */
  currency?: string;
  /** Locale for number formatting */
  locale?: string;
  /** Whether to show subtotal/total row */
  showTotal?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback for export */
  onExport?: () => void;
}

/**
 * Format currency value
 */
const formatCurrency = (
  value: number | undefined | null,
  currency: string,
  locale: string
): string => {
  if (value === undefined || value === null) return '-';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

/**
 * Format number value
 */
const formatNumber = (
  value: number | undefined | null,
  locale: string,
  decimals: number = 2
): string => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format percentage
 */
const formatPercent = (
  value: number | undefined | null,
  locale: string
): string => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

/**
 * Empty state component
 */
const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
    <p className="text-muted-foreground">No line items to display</p>
  </div>
);

export const LineItemsTable: React.FC<LineItemsTableProps> = ({
  items,
  currency = 'MYR', // Default to Malaysian Ringgit for Malaysian market
  locale = 'en-MY', // Default to Malaysian locale
  showTotal = true,
  className,
  onExport,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [copied, setCopied] = useState(false);

  // Sanitize line items
  const sanitizedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      description: sanitizeAIOutput({ description: item.description }).description,
      itemNo: item.itemNo ? sanitizeAIOutput({ itemNo: item.itemNo }).itemNo : item.itemNo,
      unit: item.unit ? sanitizeAIOutput({ unit: item.unit }).unit : item.unit,
    }));
  }, [items]);

  // Calculate totals
  const totals = useMemo(() => {
    return sanitizedItems.reduce(
      (acc, item) => ({
        quantity: acc.quantity + (item.quantity || 0),
        subtotal: acc.subtotal + (item.quantity || 1) * (item.unitPrice || 0),
        discount: acc.discount + (item.discount || 0),
        tax: acc.tax + (item.taxAmount || 0),
        total: acc.total + item.amount,
      }),
      { quantity: 0, subtotal: 0, discount: 0, tax: 0, total: 0 }
    );
  }, [sanitizedItems]);

  // Determine which columns to show based on data
  const hasQuantity = sanitizedItems.some((item) => item.quantity !== undefined);
  const hasUnit = sanitizedItems.some((item) => item.unit !== undefined);
  const hasUnitPrice = sanitizedItems.some((item) => item.unitPrice !== undefined);
  const hasDiscount = sanitizedItems.some((item) => item.discount !== undefined);
  const hasTax = sanitizedItems.some(
    (item) => item.taxRate !== undefined || item.taxAmount !== undefined
  );

  // Define columns - use explicit accessor column type for accessorKey support
  const columns = useMemo<ColumnDef<LineItem, unknown>[]>(() => {
    const cols: ColumnDef<LineItem, unknown>[] = [
      // Item number (optional)
      {
        accessorKey: 'itemNo',
        header: '#',
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-sm">
            {row.original.itemNo || row.index + 1}
          </span>
        ),
        size: 60,
      },
      // Description (always shown)
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 -ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Description
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="max-w-[300px] truncate block" title={row.original.description}>
            {row.original.description}
          </span>
        ),
      },
    ];

    // Quantity column
    if (hasQuantity) {
      cols.push({
        accessorKey: 'quantity',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 -ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Qty
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
          const qty = row.original.quantity;
          const unit = row.original.unit;
          return (
            <span className="tabular-nums">
              {formatNumber(qty, locale, 0)}
              {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
            </span>
          );
        },
        size: 80,
      });
    }

    // Unit price column
    if (hasUnitPrice) {
      cols.push({
        accessorKey: 'unitPrice',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 -ml-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Unit Price
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-right block">
            {formatCurrency(row.original.unitPrice, currency, locale)}
          </span>
        ),
        size: 100,
      });
    }

    // Discount column
    if (hasDiscount) {
      cols.push({
        accessorKey: 'discount',
        header: 'Discount',
        cell: ({ row }) => {
          const discount = row.original.discount;
          if (!discount) return <span className="text-muted-foreground">-</span>;
          return (
            <span className="tabular-nums text-red-500">
              -{formatCurrency(discount, currency, locale)}
            </span>
          );
        },
        size: 100,
      });
    }

    // Tax column
    if (hasTax) {
      cols.push({
        accessorKey: 'taxAmount',
        header: 'Tax',
        cell: ({ row }) => {
          const { taxRate, taxAmount } = row.original;
          if (taxAmount !== undefined) {
            return (
              <div className="tabular-nums text-right">
                <span>{formatCurrency(taxAmount, currency, locale)}</span>
                {taxRate !== undefined && (
                  <span className="text-muted-foreground text-xs ml-1">
                    ({formatPercent(taxRate, locale)})
                  </span>
                )}
              </div>
            );
          }
          if (taxRate !== undefined) {
            return (
              <span className="text-muted-foreground">
                {formatPercent(taxRate, locale)}
              </span>
            );
          }
          return <span className="text-muted-foreground">-</span>;
        },
        size: 100,
      });
    }

    // Amount column (always shown)
    cols.push({
      accessorKey: 'amount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2 -ml-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Amount
          {column.getIsSorted() === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      ),
      cell: ({ row }) => (
        <span className="tabular-nums font-medium text-right block">
          {formatCurrency(row.original.amount, currency, locale)}
        </span>
      ),
      size: 120,
    });

    return cols;
  }, [hasQuantity, hasUnit, hasUnitPrice, hasDiscount, hasTax, currency, locale]);

  const table = useReactTable({
    data: sanitizedItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Copy table to clipboard
  const copyToClipboard = async () => {
    const headers = columns.map((col) => {
      if (typeof col.header === 'string') return col.header;
      if ('accessorKey' in col && col.accessorKey) return String(col.accessorKey);
      return '';
    });

    const rows = sanitizedItems.map((item) => [
      item.itemNo || '',
      item.description,
      item.quantity?.toString() || '',
      item.unitPrice?.toString() || '',
      item.discount?.toString() || '',
      item.taxAmount?.toString() || '',
      item.amount.toString(),
    ]);

    const csv = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');

    await navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (sanitizedItems.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={cn(className)}>
      {/* Table - No separate actions bar */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize() !== 150 ? header.getSize() : undefined,
                    }}
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {showTotal && (
            <TableFooter>
              {/* Subtotal row */}
              {(hasDiscount || hasTax) && (
                <TableRow className="bg-muted/30">
                  <TableCell
                    colSpan={columns.length - 1}
                    className="text-right font-medium"
                  >
                    Subtotal
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(totals.subtotal, currency, locale)}
                  </TableCell>
                </TableRow>
              )}
              {/* Discount row */}
              {hasDiscount && totals.discount > 0 && (
                <TableRow className="bg-muted/30">
                  <TableCell
                    colSpan={columns.length - 1}
                    className="text-right font-medium"
                  >
                    Discount
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-red-500">
                    -{formatCurrency(totals.discount, currency, locale)}
                  </TableCell>
                </TableRow>
              )}
              {/* Tax row */}
              {hasTax && totals.tax > 0 && (
                <TableRow className="bg-muted/30">
                  <TableCell
                    colSpan={columns.length - 1}
                    className="text-right font-medium"
                  >
                    Tax
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(totals.tax, currency, locale)}
                  </TableCell>
                </TableRow>
              )}
              {/* Total row */}
              <TableRow className="bg-primary/5">
                <TableCell
                  colSpan={columns.length - 1}
                  className="text-right font-bold text-base"
                >
                  Total
                </TableCell>
                <TableCell className="text-right tabular-nums font-bold text-base">
                  {formatCurrency(totals.total, currency, locale)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
};

export default LineItemsTable;

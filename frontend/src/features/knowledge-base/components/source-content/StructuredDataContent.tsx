/**
 * StructuredDataContent — expanded view for structured data (CSV/XLSX) sources.
 *
 * Source Panel shows: file info card (with "View Data Table" button) + schema.
 * Full table viewing happens in a near-full-screen Dialog — outside the panel.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Rows3,
  Columns3,
  Table2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { knowledgeBaseApi } from '../../services/mockData';
import type { DataSource } from '../../types';

interface StructuredDataContentProps {
  source: DataSource;
}

interface PreviewData {
  columns: string[];
  rows: any[][];
  total_rows: number;
}

const DIALOG_PAGE_SIZE = 50;

/**
 * Near-full-screen data table dialog with pagination.
 * Opens OUTSIDE the Source Panel for comfortable viewing of large datasets.
 */
const DataTableDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: DataSource;
  datasetId: string;
}> = ({ open, onOpenChange, source, datasetId }) => {
  const [data, setData] = useState<PreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = data ? Math.ceil(data.total_rows / DIALOG_PAGE_SIZE) : 0;

  const loadPage = useCallback(
    async (pageNum: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await knowledgeBaseApi.getDatasetPreview(
          datasetId,
          DIALOG_PAGE_SIZE,
          pageNum * DIALOG_PAGE_SIZE
        );
        setData(result);
        setPage(pageNum);
      } catch {
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    },
    [datasetId]
  );

  useEffect(() => {
    if (open) {
      loadPage(0);
    }
  }, [open, loadPage]);

  const fileInfo = source.config.file_info;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-red-600" />
            {source.name}
            {fileInfo && (
              <span className="text-xs text-muted-foreground font-normal">
                ({fileInfo.row_count?.toLocaleString()} rows, {fileInfo.column_count} columns)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading && !data && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center gap-2 justify-center text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Scrollable table — flex-1 min-h-0 gives it a bounded height so overflow works */}
        {data && (
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap w-12 border-r">
                    #
                  </th>
                  {data.columns.map((col) => (
                    <th
                      key={col}
                      className="text-left px-3 py-2 font-medium whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-t hover:bg-muted/20 align-top">
                    <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums border-r whitespace-nowrap">
                      {page * DIALOG_PAGE_SIZE + rowIdx + 1}
                    </td>
                    {row.map((cell, colIdx) => (
                      <td
                        key={colIdx}
                        className="px-3 py-1.5 max-w-[400px]"
                      >
                        {cell === null || cell === undefined ? (
                          <span className="text-muted-foreground/50 italic text-xs">null</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {data && (
          <div className="flex items-center justify-between pt-3 border-t shrink-0">
            <p className="text-xs text-muted-foreground">
              {totalPages > 1 ? (
                <>
                  Showing {page * DIALOG_PAGE_SIZE + 1}–
                  {Math.min((page + 1) * DIALOG_PAGE_SIZE, data.total_rows)} of{' '}
                  {data.total_rows.toLocaleString()} rows
                </>
              ) : (
                <>{data.total_rows.toLocaleString()} rows total</>
              )}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(page - 1)}
                  disabled={page === 0 || isLoading}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  Page {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPage(page + 1)}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const StructuredDataContent: React.FC<StructuredDataContentProps> = ({ source }) => {
  const fileInfo = source.config.file_info;
  const schema = source.config.schema_definition;
  const datasetId = source.config.dataset_id;

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-3">
      {/* File Info Card + View Data Button */}
      {fileInfo && (
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium truncate">{fileInfo.filename}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="flex items-center justify-center gap-1">
                <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-bold">
                  {fileInfo.row_count?.toLocaleString() || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Rows</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="flex items-center justify-center gap-1">
                <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-bold">{fileInfo.column_count || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">Columns</p>
            </div>
          </div>

          {/* Prominent "View Data Table" button */}
          {datasetId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="w-full gap-1.5 text-xs"
            >
              <Table2 className="h-3.5 w-3.5" />
              View Data Table
            </Button>
          )}
        </div>
      )}

      {/* Schema */}
      {schema?.columns && schema.columns.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Schema
          </p>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium">Column</th>
                  <th className="text-left px-3 py-1.5 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {schema.columns.slice(0, 10).map((col: { name: string; dtype: string }) => (
                  <tr key={col.name} className="border-t">
                    <td className="px-3 py-1.5 font-mono">{col.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{col.dtype}</td>
                  </tr>
                ))}
                {schema.columns.length > 10 && (
                  <tr className="border-t">
                    <td colSpan={2} className="px-3 py-1.5 text-muted-foreground text-center">
                      +{schema.columns.length - 10} more columns
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!fileInfo && !schema && !datasetId && (
        <p className="text-sm text-muted-foreground italic">
          No structured data information available
        </p>
      )}

      {/* Full Data Dialog — renders outside Source Panel's DOM */}
      {datasetId && (
        <DataTableDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          source={source}
          datasetId={datasetId}
        />
      )}
    </div>
  );
};

/**
 * DatasetList Component
 *
 * Displays a list of user's datasets with selection and management.
 */

import React from "react";
import {
  Database,
  FileSpreadsheet,
  Trash2,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGetDatasetsQuery, useDeleteDatasetMutation } from "@/store/api/insightsApi";
import type { Dataset, DatasetStatus } from "../types";

interface DatasetListProps {
  selectedDatasetId?: string | null;
  onSelectDataset?: (dataset: Dataset) => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  DatasetStatus,
  { icon: React.ElementType; color: string; label: string }
> = {
  ready: {
    icon: CheckCircle2,
    color: "text-green-500",
    label: "Ready",
  },
  processing: {
    icon: Loader2,
    color: "text-blue-500",
    label: "Processing",
  },
  pending: {
    icon: Clock,
    color: "text-yellow-500",
    label: "Pending",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    label: "Error",
  },
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface DatasetItemProps {
  dataset: Dataset;
  isSelected: boolean;
  onSelect: (dataset: Dataset) => void;
  onDelete: (dataset: Dataset) => void;
}

const DatasetItem: React.FC<DatasetItemProps> = ({ dataset, isSelected, onSelect, onDelete }) => {
  const statusConfig = STATUS_CONFIG[dataset.status];
  const StatusIcon = statusConfig.icon;
  const isClickable = dataset.status === "ready";

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
        isClickable && "cursor-pointer hover:bg-muted/50",
        isSelected && "border-primary bg-primary/5",
        !isClickable && "opacity-60"
      )}
      onClick={() => isClickable && onSelect(dataset)}
    >
      <div
        className={cn(
          "flex items-center justify-center h-10 w-10 rounded-lg",
          isSelected ? "bg-primary/10" : "bg-muted"
        )}
      >
        <FileSpreadsheet
          className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{dataset.name}</p>
          <Badge variant="secondary" className={cn("shrink-0", statusConfig.color)}>
            <StatusIcon
              className={cn("h-3 w-3 mr-1", dataset.status === "processing" && "animate-spin")}
            />
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{formatFileSize(dataset.file_info.size_bytes)}</span>
          <span>•</span>
          <span>{dataset.row_count?.toLocaleString() || "?"} rows</span>
          <span>•</span>
          <span>{formatDate(dataset.created_at)}</span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(dataset);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const DatasetList: React.FC<DatasetListProps> = ({
  selectedDatasetId,
  onSelectDataset,
  className,
}) => {
  const [datasetToDelete, setDatasetToDelete] = React.useState<Dataset | null>(null);

  const { data: datasetsResponse, isLoading, error } = useGetDatasetsQuery({});
  const [deleteDataset, { isLoading: isDeleting }] = useDeleteDatasetMutation();

  const datasets = datasetsResponse?.datasets || [];

  const handleDelete = async () => {
    if (!datasetToDelete) return;

    try {
      await deleteDataset(datasetToDelete.id).unwrap();
      setDatasetToDelete(null);
    } catch (err) {
      console.error("Failed to delete dataset:", err);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Datasets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Datasets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load datasets</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Datasets
            </span>
            <Badge variant="secondary">{datasets.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No datasets yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload a CSV or XLSX file to get started
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {datasets.map((dataset) => (
                <DatasetItem
                  key={dataset.id}
                  dataset={dataset}
                  isSelected={selectedDatasetId === dataset.id}
                  onSelect={(d) => onSelectDataset?.(d)}
                  onDelete={setDatasetToDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!datasetToDelete}
        onOpenChange={(open) => !open && setDatasetToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{datasetToDelete?.name}"? This will also delete all
              conversations and query history associated with this dataset. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DatasetList;

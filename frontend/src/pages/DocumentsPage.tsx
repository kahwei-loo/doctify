/**
 * DocumentsPage
 *
 * Main documents management page with project-based filtering.
 * Features full-page drag-and-drop upload, document table, project sidebar,
 * and real-time WebSocket updates.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  FileText,
  Upload,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { type FileRejection } from "react-dropzone";
import {
  useGetDocumentsQuery,
  useDeleteDocumentMutation,
  useRetryProcessingMutation,
} from "@/store/api/documentsApi";
import { useGetProjectQuery, useUpdateExtractionConfigMutation } from "@/store/api/projectsApi";
import { ProjectConfigModal, type ProjectConfig, type ExtractionConfig } from "@/features/projects";
import type { DocumentStatus, DocumentListItem } from "@/features/documents/types";
import {
  ProjectPanel,
  DocumentUploadZone,
  getFileRejectionMessage,
  UploadQueue,
  DocumentTable,
  DeleteDocumentsDialog,
  ProjectSettingsDrawer,
} from "@/features/documents/components";
import {
  useDocumentUpload,
  useDocumentListWebSocket,
  type DocumentProgressEvent,
} from "@/features/documents/hooks";
import { useDemoMode } from "@/features/demo/hooks/useDemoMode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Accepted file types for document upload
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/tiff",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DocumentsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | undefined>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Project settings drawer state
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Full-page drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Demo mode hook
  const {
    isDemoMode,
    isRestricted: _isRestricted,
    getRestrictionMessage: _getRestrictionMessage,
  } = useDemoMode();

  // Document upload hook
  const { uploads, isUploading, uploadMultiple, cancelUpload, clearCompleted, clearAll } =
    useDocumentUpload();

  // Validate files before upload
  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; rejected: FileRejection[] } => {
      const valid: File[] = [];
      const rejected: FileRejection[] = [];

      files.forEach((file) => {
        const errors: { code: string; message: string }[] = [];

        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
          errors.push({
            code: "file-invalid-type",
            message: `File type ${file.type || "unknown"} is not supported`,
          });
        }

        if (file.size > MAX_FILE_SIZE) {
          errors.push({
            code: "file-too-large",
            message: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
          });
        }

        if (errors.length > 0) {
          rejected.push({ file, errors });
        } else {
          valid.push(file);
        }
      });

      return { valid, rejected };
    },
    []
  );

  // Fetch documents with project filter
  const { data, isLoading, isFetching, refetch } = useGetDocumentsQuery({
    filters: {
      status: statusFilter,
      project_id: selectedProjectId || undefined,
      search: searchQuery || undefined,
    },
    pagination: { page, per_page: 20 },
  });

  const [deleteDocument] = useDeleteDocumentMutation();
  const [retryProcessing] = useRetryProcessingMutation();

  // Fetch selected project for configuration
  const { data: selectedProject } = useGetProjectQuery(selectedProjectId || "", {
    skip: !selectedProjectId,
  });

  // Fetch project for settings drawer
  const { data: settingsProject } = useGetProjectQuery(settingsProjectId || "", {
    skip: !settingsProjectId,
  });

  const [updateExtractionConfig, { isLoading: isUpdatingConfig }] =
    useUpdateExtractionConfigMutation();

  const documents = data?.data || [];
  const pagination = data?.pagination;

  // WebSocket for real-time document updates
  const { isConnected: wsConnected } = useDocumentListWebSocket({
    enabled: !isDemoMode,
    onDocumentUpdate: useCallback(
      (document: DocumentListItem) => {
        // Filter by current project if one is selected
        if (!selectedProjectId || document.project_id === selectedProjectId) {
          refetch();
        }
      },
      [selectedProjectId, refetch]
    ),
    onDocumentProgress: useCallback((progressData: DocumentProgressEvent["data"]) => {
      // Could show progress indicator in the UI if needed
      console.debug("[Documents] Progress update:", progressData);
    }, []),
  });

  // Full-page drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      dragCounterRef.current = 0;

      if (isDemoMode) {
        toast.error("⚠️ Upload disabled in demo mode. Sign up to upload documents.");
        return;
      }

      if (!selectedProjectId) {
        toast.error("Please select a project first");
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const { valid, rejected } = validateFiles(files);

      // Show errors for rejected files
      rejected.forEach((rejection) => {
        toast.error(getFileRejectionMessage(rejection));
      });

      // Upload valid files
      if (valid.length > 0) {
        try {
          await uploadMultiple(valid, selectedProjectId);
          toast.success(
            valid.length === 1
              ? "Document uploaded successfully"
              : `${valid.length} documents uploaded successfully`
          );
          refetch();
        } catch (error) {
          // Individual file errors are tracked in the upload queue
        }
      }
    },
    [selectedProjectId, validateFiles, uploadMultiple, refetch]
  );

  // Reset page when project changes
  const handleSelectProject = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId);
    setPage(1);
  }, []);

  // Open project settings drawer
  const handleOpenSettings = useCallback((projectId: string) => {
    setSettingsProjectId(projectId);
    setSettingsDrawerOpen(true);
  }, []);

  // Handle accepted files from dropzone
  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      if (!selectedProjectId) {
        toast.error("Please select a project first");
        return;
      }

      try {
        await uploadMultiple(files, selectedProjectId);
        toast.success(
          files.length === 1
            ? "Document uploaded successfully"
            : `${files.length} documents uploaded successfully`
        );
        refetch();
      } catch (error) {
        // Individual file errors are tracked in the upload queue
      }
    },
    [selectedProjectId, uploadMultiple, refetch]
  );

  // Handle rejected files from dropzone
  const handleFilesRejected = useCallback((rejections: FileRejection[]) => {
    rejections.forEach((rejection) => {
      toast.error(getFileRejectionMessage(rejection));
    });
  }, []);

  // Handle retry upload
  const handleRetryUpload = useCallback(
    async (_fileId: string, file: File) => {
      if (!selectedProjectId) return;
      try {
        await uploadMultiple([file], selectedProjectId);
        refetch();
      } catch (error) {
        // Error tracked in upload queue
      }
    },
    [selectedProjectId, uploadMultiple, refetch]
  );

  // Handle document delete - show confirmation dialog
  const handleDelete = useCallback(
    (documentIds: string[]) => {
      if (isDemoMode) {
        toast.error("⚠️ Delete disabled in demo mode");
        return;
      }
      setDocumentsToDelete(documentIds);
      setDeleteDialogOpen(true);
    },
    [isDemoMode]
  );

  // Confirm and execute document deletion
  const handleConfirmDelete = useCallback(async () => {
    if (documentsToDelete.length === 0) return;

    const count = documentsToDelete.length;
    setIsDeleting(true);

    try {
      await Promise.all(documentsToDelete.map((id) => deleteDocument(id).unwrap()));
      toast.success(count === 1 ? "Document deleted" : `${count} documents deleted`);
      setDeleteDialogOpen(false);
      setDocumentsToDelete([]);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to delete document(s)");
    } finally {
      setIsDeleting(false);
    }
  }, [documentsToDelete, deleteDocument, refetch]);

  // Handle document reprocess
  const handleReprocess = useCallback(
    async (documentId: string) => {
      try {
        await retryProcessing(documentId).unwrap();
        toast.success("Document queued for reprocessing");
        refetch();
      } catch (error: any) {
        toast.error(error?.data?.detail || "Failed to reprocess document");
      }
    },
    [retryProcessing, refetch]
  );

  // Handle project config save
  const handleSaveConfig = useCallback(
    async (projectId: string, config: ProjectConfig | ExtractionConfig) => {
      try {
        await updateExtractionConfig({
          projectId,
          extractionConfig: config as unknown as Record<string, unknown>,
        }).unwrap();
        toast.success("Project configuration saved");
        setIsConfigModalOpen(false);
      } catch (error: any) {
        toast.error(error?.data?.detail || "Failed to save configuration");
        throw error;
      }
    },
    [updateExtractionConfig]
  );

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        "flex h-[calc(100vh-112px)] relative",
        isDraggingOver && "ring-2 ring-primary ring-inset"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-Page Drag Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div
            className={cn(
              "bg-background border-2 border-dashed rounded-lg p-8 shadow-lg",
              isDemoMode ? "border-yellow-400" : "border-primary"
            )}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={cn("p-4 rounded-full", isDemoMode ? "bg-yellow-100" : "bg-primary/10")}
              >
                <Upload
                  className={cn("h-12 w-12", isDemoMode ? "text-yellow-600" : "text-primary")}
                />
              </div>
              <div>
                <p className="text-xl font-semibold">
                  {isDemoMode ? "Upload disabled in demo mode" : "Drop files to upload"}
                </p>
                <p className="text-muted-foreground mt-1">
                  {isDemoMode
                    ? "Sign up to upload your own documents"
                    : selectedProjectId
                      ? "Release to upload documents to this project"
                      : "Select a project first to upload documents"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Panel (Left Sidebar) */}
      <ProjectPanel
        selectedProjectId={selectedProjectId}
        onSelectProject={handleSelectProject}
        collapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
        onOpenSettings={handleOpenSettings}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Mobile panel toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              >
                {isPanelCollapsed ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Documents</h1>
                <p className="text-muted-foreground mt-1">
                  {selectedProjectId ? "Project documents" : "All documents across projects"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* WebSocket connection indicator (hidden in demo mode) */}
              {!isDemoMode && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                    wsConnected
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  )}
                  title={
                    wsConnected ? "Real-time updates active" : "Connecting to real-time updates..."
                  }
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      wsConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                    )}
                  />
                  {wsConnected ? "Live" : "Connecting"}
                </div>
              )}
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
                Refresh
              </Button>
              {/* Project Settings Button */}
              {selectedProjectId && (
                <Button
                  variant="outline"
                  onClick={() => setIsConfigModalOpen(true)}
                  title="Configure project extraction settings"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configure
                </Button>
              )}
            </div>
          </div>

          {/* Upload Zone */}
          {isDemoMode ? (
            <Card className="border-dashed border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
              <CardContent className="py-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                      <Upload className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-medium text-lg text-yellow-900 dark:text-yellow-100">
                        File uploads are disabled in demo mode
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Sign up to upload and process your own documents
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => (window.location.href = "/auth/register")}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Sign Up to Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedProjectId ? (
            <DocumentUploadZone
              onFilesAccepted={handleFilesAccepted}
              onFilesRejected={handleFilesRejected}
              disabled={isUploading}
              compact={documents.length > 0}
            />
          ) : (
            <Card className="border-dashed border-primary/50 bg-primary/5">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Select a project to upload documents</p>
                    <p className="text-sm text-muted-foreground">
                      Choose a project from the left panel to start uploading and processing
                      documents
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Queue */}
          {uploads.size > 0 && (
            <UploadQueue
              uploads={uploads}
              onCancel={cancelUpload}
              onRetry={handleRetryUpload}
              onClearCompleted={clearCompleted}
              onClearAll={clearAll}
            />
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="mr-2 h-4 w-4" />
                      {statusFilter ? statusFilter : "All Status"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setStatusFilter(undefined);
                        setPage(1);
                      }}
                    >
                      All Status
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setStatusFilter("pending");
                        setPage(1);
                      }}
                    >
                      Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setStatusFilter("processing");
                        setPage(1);
                      }}
                    >
                      Processing
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setStatusFilter("completed");
                        setPage(1);
                      }}
                    >
                      Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setStatusFilter("failed");
                        setPage(1);
                      }}
                    >
                      Failed
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedProjectId ? "Project Documents" : "All Documents"}</CardTitle>
              <CardDescription>{pagination?.total || 0} documents total</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentTable
                documents={documents}
                isLoading={isLoading}
                onDelete={handleDelete}
                onReprocess={handleReprocess}
              />

              {/* Pagination */}
              {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.has_prev}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.has_next}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Configuration Modal */}
      <ProjectConfigModal
        open={isConfigModalOpen}
        onOpenChange={setIsConfigModalOpen}
        project={selectedProject?.data ?? null}
        onSave={handleSaveConfig}
        isLoading={isUpdatingConfig}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDocumentsDialog
        documentIds={documentsToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Project Settings Drawer */}
      <ProjectSettingsDrawer
        open={settingsDrawerOpen}
        onOpenChange={setSettingsDrawerOpen}
        project={settingsProject?.data ?? null}
      />
    </div>
  );
};

export default DocumentsPage;

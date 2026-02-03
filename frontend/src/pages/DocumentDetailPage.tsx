/**
 * DocumentDetailPage
 *
 * Redesigned document detail page with split view layout.
 * Left panel: Document preview (PDF/image)
 * Right panel: Extracted data and structured view
 *
 * Features:
 * - Resizable split view
 * - PDF and image preview with zoom/rotation
 * - Structured data view with tabs
 * - Line items table for invoices
 * - Export functionality
 * - Processing status display
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Settings,
  Wifi,
  WifiOff,
  Image,
  FileType,
  Calendar,
  Zap,
  Timer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  formatFileSize,
  formatConfidence,
  formatTokens,
  estimateCost,
  formatDuration,
} from '@/shared/utils/formatters';
import {
  useGetDocumentQuery,
  useDeleteDocumentMutation,
  useProcessDocumentMutation,
  useRetryProcessingMutation,
} from '@/store/api/documentsApi';
import {
  DocumentSplitView,
  DocumentPreview,
  ExtractedStructuredView,
  ExtractedDataView,
  LineItemsTable,
  DocumentConfirmationView,
  OCRErrorState,
  NetworkErrorState,
  CorruptedFileError,
  DeleteDocumentsDialog,
  type LineItem,
} from '@/features/documents/components';

import { useDocumentProgressWebSocket } from '@/features/documents/hooks';
import type { DocumentStatus, ExtractionResult } from '@/features/documents/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { documentFileApi } from '@/features/documents/services/api';

/**
 * Get status badge configuration
 */
const getStatusConfig = (status: DocumentStatus) => {
  const configs: Record<
    DocumentStatus,
    { icon: React.ReactNode; label: string; className: string }
  > = {
    completed: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: 'Completed',
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
    },
    processing: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      label: 'Processing',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
    pending: {
      icon: <Timer className="h-4 w-4" />,
      label: 'Pending',
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    },
    failed: {
      icon: <XCircle className="h-4 w-4" />,
      label: 'Failed',
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
    },
    cancelled: {
      icon: <XCircle className="h-4 w-4" />,
      label: 'Cancelled',
      className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    },
  };

  return configs[status];
};

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Extract line items from extraction result
 */
const extractLineItems = (result: ExtractionResult | undefined): LineItem[] => {
  if (!result?.metadata) return [];

  // Check for common line items field names
  const possibleFields = ['line_items', 'lineItems', 'items', 'lines'];
  for (const field of possibleFields) {
    const items = result.metadata[field];
    if (Array.isArray(items) && items.length > 0) {
      return items.map((item: any, index: number) => ({
        itemNo: item.item_no || item.itemNo || item.no || String(index + 1),
        description: item.description || item.name || item.item || '',
        quantity: item.quantity || item.qty || 1,
        unit: item.unit,
        unitPrice: item.unit_price || item.unitPrice || item.price,
        discount: item.discount,
        taxRate: item.tax_rate || item.taxRate,
        taxAmount: item.tax_amount || item.taxAmount || item.tax,
        amount: item.amount || item.total || item.subtotal || 0,
        confidence: item.confidence,
      }));
    }
  }

  return [];
};

/**
 * Processing Status Component with WebSocket progress
 */
const ProcessingStatus: React.FC<{
  status: DocumentStatus;
  errorMessage?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  progress?: number;
  wsStatus?: string;
  wsConnected?: boolean;
  document?: any;
}> = ({ status, errorMessage, onRetry, isRetrying, progress = 0, wsStatus, wsConnected, document }) => {
  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <h3 className="text-xl font-semibold">Processing Document</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Your document is being analyzed and processed. This may take a few moments
          depending on the document size and complexity.
        </p>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="w-full max-w-xs mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{wsStatus || 'Processing...'}</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* WebSocket connection indicator */}
        <div className={cn(
          'flex items-center gap-1.5 mt-4 text-xs',
          wsConnected ? 'text-green-600' : 'text-yellow-600'
        )}>
          {wsConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              <span>Live updates active</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>Connecting...</span>
            </>
          )}
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Timer className="h-16 w-16 text-yellow-500 mb-6" />
        <h3 className="text-xl font-semibold">Pending Processing</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          This document is waiting to be processed. Processing will start automatically.
        </p>
      </div>
    );
  }

  if (status === 'failed') {
    // Check if it's a file corruption error
    const isCorruptedFile = errorMessage?.toLowerCase().includes('corrupt') ||
      errorMessage?.toLowerCase().includes('invalid file') ||
      errorMessage?.toLowerCase().includes('cannot read');

    if (isCorruptedFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="max-w-2xl w-full">
            <CorruptedFileError
              filename={document?.filename}
              onUploadNew={() => window.history.back()}
            />
          </div>
        </div>
      );
    }

    // Use OCRErrorState for OCR processing failures
    if (document && onRetry) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="max-w-3xl w-full">
            <OCRErrorState document={document} onRetry={onRetry} />
          </div>
        </div>
      );
    }

    // Fallback to generic error
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <XCircle className="h-16 w-16 text-destructive mb-6" />
        <h3 className="text-xl font-semibold">Processing Failed</h3>
        {errorMessage && (
          <p className="text-destructive/80 mt-2 max-w-md">{errorMessage}</p>
        )}
        {onRetry && (
          <Button className="mt-6" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Retry Processing
          </Button>
        )}
      </div>
    );
  }

  if (status === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-6" />
        <h3 className="text-xl font-semibold">Processing Cancelled</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Document processing was cancelled.
        </p>
      </div>
    );
  }

  return null;
};

const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useGetDocumentQuery(documentId!, {
    skip: !documentId,
  });
  const [deleteDocument, { isLoading: isDeleting }] = useDeleteDocumentMutation();
  const [processDocument, { isLoading: isProcessing }] = useProcessDocumentMutation();
  const [retryProcessing, { isLoading: isRetrying }] = useRetryProcessingMutation();

  const document = data?.data;

  // Debug: Monitor document data
  useEffect(() => {
    if (document && document.status === 'completed') {
      console.log('📄 Document Loaded:', {
        status: document.status,
        hasExtractionResult: !!document.extraction_result,
        extraction_result: document.extraction_result,
        metadata: document.extraction_result?.metadata,
        metadataKeys: document.extraction_result?.metadata ? Object.keys(document.extraction_result.metadata) : [],
      });
    }
  }, [document]);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Panel ratio state for dynamic display
  const [panelRatio, setPanelRatio] = useState(40);

  // Debug: Monitor panelRatio changes
  useEffect(() => {
    console.log('📐 Panel Ratio Changed:', panelRatio, 'Type:', typeof panelRatio);
  }, [panelRatio]);

  // WebSocket for real-time progress updates during processing
  const shouldConnectWs = document?.status === 'processing' || document?.status === 'pending';
  const {
    isConnected: wsConnected,
    progress: wsProgress,
    status: wsStatus,
  } = useDocumentProgressWebSocket({
    documentId: documentId || '',
    enabled: shouldConnectWs && !!documentId,
    onProgress: useCallback((progress: number, status: string) => {
      // When processing completes, refetch document data
      if (status === 'completed' || status === 'failed') {
        refetch();
      }
    }, [refetch]),
  });

  // Stop polling once completed or failed - now handled by WebSocket
  const shouldPoll = false; // Disabled in favor of WebSocket

  // Fetch document file as authenticated blob URL for preview
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  useEffect(() => {
    const isReady = documentId && document?.status === 'completed';
    if (!isReady) {
      setPreviewUrl(undefined);
      return;
    }

    let revoked = false;
    let objectUrl: string | undefined;

    documentFileApi.getPreviewBlob(documentId)
      .then((blob) => {
        if (!revoked) {
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!revoked) {
          setPreviewUrl(undefined);
        }
      });

    return () => {
      revoked = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentId, document?.status]);

  // Extract line items
  const lineItems = useMemo(() => {
    return extractLineItems(document?.extraction_result);
  }, [document?.extraction_result]);

  // Handlers
  const handleDelete = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!documentId) return;

    try {
      await deleteDocument(documentId).unwrap();
      toast.success('Document deleted');
      setDeleteDialogOpen(false);
      navigate('/documents');
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to delete document');
    }
  }, [documentId, deleteDocument, navigate]);

  const handleProcess = useCallback(async () => {
    if (!documentId) return;

    try {
      await processDocument({ documentId }).unwrap();
      toast.success('Processing started');
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to start processing');
    }
  }, [documentId, processDocument]);

  const handleRetry = useCallback(async () => {
    if (!documentId) return;

    try {
      await retryProcessing(documentId).unwrap();
      toast.success('Retrying processing');
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to retry processing');
    }
  }, [documentId, retryProcessing]);

  const handleExport = useCallback((format: 'json' | 'csv') => {
    if (!document?.extraction_result) return;

    const data =
      format === 'json'
        ? JSON.stringify(document.extraction_result, null, 2)
        : 'Export to CSV not implemented';

    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.filename}-extracted.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
  }, [document]);

  const handleDownload = useCallback(async () => {
    if (!documentId || !document) return;
    try {
      await documentFileApi.downloadFile(documentId, document.filename);
    } catch {
      toast.error('Failed to download file');
    }
  }, [documentId, document]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !document) {
    // Check if it's a network error
    const isNetworkError = error && (
      (error as any).status === 'FETCH_ERROR' ||
      (error as any).status === 0 ||
      (error as any).originalStatus === 503 ||
      (error as any).originalStatus === 504
    );

    if (isNetworkError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <NetworkErrorState
            onRetry={() => refetch()}
            message="Unable to load document. Please check your connection and try again."
          />
        </div>
      );
    }

    // Document not found
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Document not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The document you're looking for doesn't exist or has been deleted.
        </p>
        <Button className="mt-4" onClick={() => navigate('/documents')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Documents
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(document.status);

  // Get file type icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <FileType className="h-4 w-4" />;
  };

  // Get document type badge
  const docType = document?.extraction_result?.metadata?.docType ||
                  document?.extraction_result?.metadata?.doc_type ||
                  document?.extraction_result?.metadata?.documentType;
  const confidence = document?.extraction_result?.confidence;

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/documents')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Documents</span>
          </Button>

          <div className="h-8 w-px bg-border" />

          <div className="min-w-0 flex-1">
            {/* Filename */}
            <h1 className="text-lg font-semibold truncate">{document.filename}</h1>

            {/* Metadata Row */}
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {/* Doc Type Badge (if completed) */}
              {document.status === 'completed' && docType && confidence !== undefined && (
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1.5 font-medium',
                      confidence >= 0.7 ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                    )}
                  >
                    {docType} {formatConfidence(confidence)}
                  </Badge>
                  <div className="h-1 w-1 rounded-full bg-border" />
                </>
              )}

              {/* Status Badge (if not completed) */}
              {document.status !== 'completed' && (
                <>
                  <Badge variant="outline" className={cn('gap-1.5', statusConfig.className)}>
                    {statusConfig.icon}
                    {statusConfig.label}
                  </Badge>
                  <div className="h-1 w-1 rounded-full bg-border" />
                </>
              )}

              {/* File Info */}
              <div className="flex items-center gap-1.5">
                {getFileIcon(document.mime_type)}
                <span>{formatFileSize(document.file_size)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Refresh Button (for completed docs) */}
          {document.status === 'completed' && (
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}

          {/* Process Button (for pending docs) */}
          {document.status === 'pending' && (
            <Button size="sm" onClick={handleProcess} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Process
            </Button>
          )}

          {/* Retry Button (for failed docs) */}
          {document.status === 'failed' && (
            <Button size="sm" onClick={handleRetry} disabled={isRetrying}>
              {isRetrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Retry
            </Button>
          )}

          {/* Export Button (for completed docs) */}
          {document.status === 'completed' && (
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download Original
              </DropdownMenuItem>
              {document.status === 'completed' && (
                <>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onClick={() => copyToClipboard(document.document_id)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Document ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content - Direct Split View */}
      <div className="flex-1 min-h-0 p-6">
        <div className="h-full flex flex-col">
            {document.status === 'completed' && document.extraction_result ? (
              <DocumentSplitView
                leftPanel={
                  <DocumentPreview
                    url={previewUrl}
                    mimeType={document.mime_type}
                    filename={document.filename}
                  />
                }
                rightPanel={
                  <ExtractedDataView
                    result={document.extraction_result}
                    document={document}
                  />
                }
                leftTitle="Document Preview"
                rightTitle="Extracted Data"
                defaultLeftSize={40}
                onPanelResize={setPanelRatio}
              />
            ) : (
              <Card className="h-full">
                <CardContent className="h-full flex items-center justify-center">
                  <ProcessingStatus
                    status={document.status}
                    errorMessage={document.error_message}
                    onRetry={handleRetry}
                    isRetrying={isRetrying}
                    progress={wsProgress}
                    wsStatus={wsStatus}
                    wsConnected={wsConnected}
                    document={document}
                  />
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      {/* Page-Level Footer - Simplified Single Line */}
      {document && document.status === 'completed' && document.extraction_result && (() => {
        // Debug: Check document structure
        console.log('📊 Footer Debug - Document:', {
          extraction_result: document.extraction_result,
          metadata: document.extraction_result?.metadata,
          token_usage: document.extraction_result?.metadata?.token_usage,
          total_token_usage: document.extraction_result?.metadata?.total_token_usage,
          panelRatio: panelRatio,
        });
        return (
        <div className="border-t bg-card/50 backdrop-blur-sm px-6 py-3">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Uploaded: {formatDate(document.created_at)}
            </span>
            {document.extraction_result.metadata?.token_usage && (
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                {formatTokens(
                  document.extraction_result.metadata.token_usage.total_tokens || 0
                )} tokens (~
                {estimateCost(
                  document.extraction_result.metadata.token_usage.total_tokens || 0
                )})
              </span>
            )}
            <span className="ml-auto text-muted-foreground">
              Panel ratio: {Math.round(panelRatio)}%
            </span>
          </div>
        </div>
        );
      })()}

      {/* Delete Confirmation Dialog */}
      {documentId && (
        <DeleteDocumentsDialog
          documentIds={[documentId]}
          documentNames={document?.filename ? [document.filename] : []}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default DocumentDetailPage;

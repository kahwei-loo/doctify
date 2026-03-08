/**
 * UploadedDocsContent — expanded view for uploaded document data sources.
 *
 * Shows file metadata + inline content preview for ALL file types:
 * - Text files (txt, md, csv): fetches and displays content inline
 * - Images (png, jpg, etc.): inline thumbnail, click to open full viewer
 * - PDFs: inline embedded viewer, click to open full viewer
 */

import React, { useState, useEffect } from "react";
import {
  File,
  FileText,
  Image,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  Maximize2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { knowledgeBaseApi } from "../..";
import type { DataSource, DocumentMeta } from "../../types";

interface UploadedDocsContentProps {
  source: DataSource;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextFile(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "application/csv"
  );
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdfFile(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

function getFileIcon(mimeType: string) {
  if (isTextFile(mimeType)) return FileText;
  if (isImageFile(mimeType)) return Image;
  return File;
}

// ── Shared hook: fetch blob URL ──────────────────────────────────────

function useBlobUrl(documentId: string, shouldFetch: boolean) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shouldFetch) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    knowledgeBaseApi
      .getDocumentBlobUrl(documentId)
      .then((url) => {
        if (!cancelled) setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      // Revoke on cleanup
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [documentId, shouldFetch]);

  return { blobUrl, loading, error };
}

// ── Inline Text Preview ──────────────────────────────────────────────

const InlineTextPreview: React.FC<{ documentId: string; filename: string }> = ({
  documentId,
  filename,
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    knowledgeBaseApi
      .getDocumentTextContent(documentId)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/20">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading content...</span>
      </div>
    );
  }

  if (error || !content) return null;

  const isLong = content.length > 500;
  const displayContent = isLong && !expanded ? content.slice(0, 500) + "..." : content;

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden">
      <div className="px-3 py-1.5 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">{filename}</span>
      </div>
      <div className="p-3">
        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-[400px] overflow-y-auto">
          {displayContent}
        </pre>
        {isLong && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 px-2 mt-2 text-xs text-muted-foreground gap-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Show full content
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Inline Image Preview ─────────────────────────────────────────────

const InlineImagePreview: React.FC<{
  documentId: string;
  filename: string;
  onClickExpand: () => void;
}> = ({ documentId, filename, onClickExpand }) => {
  const { blobUrl, loading, error } = useBlobUrl(documentId, true);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 rounded-lg border border-dashed bg-muted/20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/20">
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Failed to load image preview</span>
      </div>
    );
  }

  return (
    <div
      className="relative group rounded-lg border bg-muted/10 overflow-hidden cursor-pointer"
      onClick={onClickExpand}
    >
      <img src={blobUrl} alt={filename} className="w-full max-h-[300px] object-contain" />
      {/* Expand overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-2">
          <Maximize2 className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

// ── Inline PDF Preview ───────────────────────────────────────────────

const InlinePdfPreview: React.FC<{
  documentId: string;
  filename: string;
  onClickExpand: () => void;
}> = ({ documentId, filename, onClickExpand }) => {
  const { blobUrl, loading, error } = useBlobUrl(documentId, true);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 rounded-lg border border-dashed bg-muted/20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/20">
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Failed to load PDF preview</span>
      </div>
    );
  }

  return (
    <div className="relative group rounded-lg border overflow-hidden">
      <iframe src={blobUrl} className="w-full h-[300px] border-0" title={filename} />
      {/* Expand button overlay */}
      <button
        onClick={onClickExpand}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white rounded-md p-1.5"
        title="Open full viewer"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ── File Viewer Dialog (full screen) ─────────────────────────────────

const FileViewerDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentMeta;
}> = ({ open, onOpenChange, document }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    knowledgeBaseApi
      .getDocumentBlobUrl(document.id)
      .then((url) => {
        if (!cancelled) setBlobUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load file preview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, document.id]);

  const handleDownload = () => {
    knowledgeBaseApi.downloadDocument(document.id, document.filename);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold truncate pr-4">
              {document.filename}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-7 gap-1 text-xs shrink-0"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={handleDownload} className="mt-3 gap-1">
                <Download className="h-3.5 w-3.5" /> Download File
              </Button>
            </div>
          ) : blobUrl ? (
            isPdfFile(document.type) ? (
              <iframe src={blobUrl} className="w-full h-full border-0" title={document.filename} />
            ) : isImageFile(document.type) ? (
              <div className="w-full h-full flex items-center justify-center p-4 bg-muted/10">
                <img
                  src={blobUrl}
                  alt={document.filename}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>Preview not available for this file type.</p>
                <Button variant="outline" size="sm" onClick={handleDownload} className="mt-3 gap-1">
                  <Download className="h-3.5 w-3.5" /> Download File
                </Button>
              </div>
            )
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Document Card ────────────────────────────────────────────────────

const DocumentCard: React.FC<{ doc: DocumentMeta }> = ({ doc }) => {
  const [viewerOpen, setViewerOpen] = useState(false);
  const Icon = getFileIcon(doc.type);
  const isText = isTextFile(doc.type);
  const isImage = isImageFile(doc.type);
  const isPdf = isPdfFile(doc.type);
  const canPreviewInDialog = isPdf || isImage;

  return (
    <>
      <div className="space-y-2">
        {/* File metadata card */}
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg border bg-card p-2.5",
            canPreviewInDialog && "cursor-pointer hover:border-primary/30 transition-colors"
          )}
          onClick={canPreviewInDialog ? () => setViewerOpen(true) : undefined}
        >
          <div
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-md shrink-0",
              isText ? "bg-blue-50" : isPdf ? "bg-red-50" : isImage ? "bg-purple-50" : "bg-gray-50"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                isText
                  ? "text-blue-600"
                  : isPdf
                    ? "text-red-600"
                    : isImage
                      ? "text-purple-600"
                      : "text-gray-600"
              )}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{doc.filename}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{doc.type}</span>
              <span>&middot;</span>
              <span>{formatFileSize(doc.size)}</span>
            </div>
          </div>
          {canPreviewInDialog && (
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
        </div>

        {/* Inline previews by type */}
        {isText && <InlineTextPreview documentId={doc.id} filename={doc.filename} />}
        {isImage && (
          <InlineImagePreview
            documentId={doc.id}
            filename={doc.filename}
            onClickExpand={() => setViewerOpen(true)}
          />
        )}
        {isPdf && (
          <InlinePdfPreview
            documentId={doc.id}
            filename={doc.filename}
            onClickExpand={() => setViewerOpen(true)}
          />
        )}
      </div>

      {/* Full viewer dialog */}
      {canPreviewInDialog && (
        <FileViewerDialog open={viewerOpen} onOpenChange={setViewerOpen} document={doc} />
      )}
    </>
  );
};

// ── Main Component ───────────────────────────────────────────────────

export const UploadedDocsContent: React.FC<UploadedDocsContentProps> = ({ source }) => {
  const docs = source.config.documents || [];
  const docCount = source.document_count || docs.length || source.config.document_ids?.length || 0;

  if (docCount === 0 && docs.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No documents uploaded</p>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-2">
        {docCount} document{docCount !== 1 ? "s" : ""} uploaded
      </div>

      {docs.length > 0 ? (
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-3 text-center">
          <File className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">
            {docCount} file{docCount !== 1 ? "s" : ""} uploaded (metadata not available)
          </p>
        </div>
      )}
    </div>
  );
};

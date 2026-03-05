/**
 * DocumentPreview Component
 *
 * Unified document preview component supporting PDF and image formats.
 * Uses react-pdf for PDF rendering with security configurations.
 *
 * Features:
 * - PDF preview with page navigation and zoom
 * - Image preview with zoom and pan
 * - Loading states and error handling
 * - Secure PDF rendering (JavaScript disabled)
 * - Keyboard navigation
 */

import React, { useState, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Import PDF.js worker
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Secure PDF options - disable JavaScript execution
const PDF_OPTIONS = {
  disableAutoFetch: true,
  disableStream: true,
  isEvalSupported: false, // Critical: disable eval
  standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

interface DocumentPreviewProps {
  /** URL to the document */
  url?: string;
  /** Document MIME type */
  mimeType: string;
  /** Document filename */
  filename: string;
  /** Custom class name */
  className?: string;
  /** Callback for download action */
  onDownload?: () => void;
  /** Whether to show toolbar */
  showToolbar?: boolean;
}

type PreviewType = "pdf" | "image" | "unsupported";

/**
 * Determine preview type from MIME type
 */
const getPreviewType = (mimeType: string): PreviewType => {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return "unsupported";
};

/**
 * PDF Preview Component
 */
const PDFPreview: React.FC<{
  url: string;
  showToolbar?: boolean;
  onDownload?: () => void;
}> = ({ url, showToolbar = true, onDownload }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInputValue, setPageInputValue] = useState("1");

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(err.message || "Failed to load PDF");
    setIsLoading(false);
  }, []);

  // Page navigation
  const goToPage = useCallback(
    (page: number) => {
      if (numPages && page >= 1 && page <= numPages) {
        setPageNumber(page);
        setPageInputValue(String(page));
      }
    },
    [numPages]
  );

  const prevPage = useCallback(() => goToPage(pageNumber - 1), [pageNumber, goToPage]);
  const nextPage = useCallback(() => goToPage(pageNumber + 1), [pageNumber, goToPage]);

  // Handle page input
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };

  const handlePageInputBlur = () => {
    const page = parseInt(pageInputValue, 10);
    if (!isNaN(page) && numPages) {
      goToPage(Math.min(Math.max(1, page), numPages));
    } else {
      setPageInputValue(String(pageNumber));
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePageInputBlur();
    }
  };

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  // Rotation
  const rotate = () => setRotation((r) => (r + 90) % 360);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "ArrowLeft":
          prevPage();
          break;
        case "ArrowRight":
          nextPage();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "r":
          rotate();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevPage, nextPage]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive">Failed to load PDF</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
        {onDownload && (
          <Button variant="outline" className="mt-4" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Instead
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
          {/* Page navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={prevPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={pageInputValue}
                onChange={handlePageInputChange}
                onBlur={handlePageInputBlur}
                onKeyDown={handlePageInputKeyDown}
                className="h-8 w-12 text-center text-sm"
              />
              <span className="text-sm text-muted-foreground">/ {numPages || "?"}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={nextPage}
              disabled={!numPages || pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom & actions */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={zoomOut}
                    disabled={scale <= 0.5}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out (-)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={zoomIn}
                    disabled={scale >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in (+)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="w-px h-6 bg-border mx-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={rotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate (R)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onDownload && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-muted/20 flex items-start justify-center p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          options={PDF_OPTIONS}
          className={cn(isLoading && "invisible")}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            rotate={rotation}
            loading={null}
            className="shadow-lg"
            renderTextLayer
            renderAnnotationLayer
          />
        </Document>
      </div>
    </div>
  );
};

/**
 * Image Preview Component
 */
const ImagePreview: React.FC<{
  url: string;
  filename: string;
  showToolbar?: boolean;
  onDownload?: () => void;
}> = ({ url, filename, showToolbar = true, onDownload }) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25));
  const resetZoom = () => setScale(1);
  const rotate = () => setRotation((r) => (r + 90) % 360);

  const handleImageLoad = () => setIsLoading(false);
  const handleImageError = () => {
    setError("Failed to load image");
    setIsLoading(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "r":
          rotate();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive">Failed to load image</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
        {onDownload && (
          <Button variant="outline" className="mt-4" onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download Instead
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
          <span className="text-sm text-muted-foreground truncate max-w-[200px]">{filename}</span>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={zoomOut}
                    disabled={scale <= 0.25}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out (-)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={zoomIn}
                    disabled={scale >= 3}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in (+)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="w-px h-6 bg-border mx-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={rotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rotate (R)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onDownload && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      {/* Image Viewer */}
      <div className="flex-1 overflow-auto bg-muted/20 flex items-center justify-center p-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        <img
          src={url}
          alt={filename}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            "max-w-full max-h-full object-contain transition-transform duration-200 shadow-lg",
            isLoading && "invisible"
          )}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
};

/**
 * Unsupported Format Preview
 */
const UnsupportedPreview: React.FC<{
  mimeType: string;
  filename: string;
  onDownload?: () => void;
}> = ({ mimeType, filename, onDownload }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <p className="text-lg font-medium">Preview not available</p>
      <p className="text-sm text-muted-foreground mt-2">{filename}</p>
      <p className="text-xs text-muted-foreground mt-1">Format: {mimeType}</p>
      {onDownload && (
        <Button variant="outline" className="mt-4" onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download File
        </Button>
      )}
    </div>
  );
};

/**
 * Demo Preview Placeholder
 */
const DemoPreviewPlaceholder: React.FC<{
  filename: string;
  mimeType: string;
}> = ({ filename, mimeType }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-muted/20">
      <FileText className="h-16 w-16 text-muted-foreground/40 mb-4" />
      <p className="text-lg font-medium">Document Preview</p>
      <p className="text-sm text-muted-foreground mt-2">{filename}</p>
      <p className="text-xs text-muted-foreground mt-1">Format: {mimeType}</p>
      <div className="mt-4 px-4 py-2 rounded-md bg-muted text-xs text-muted-foreground">
        Preview not available in demo mode
      </div>
    </div>
  );
};

/**
 * No Document Placeholder
 */
const NoDocumentPlaceholder: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <p className="text-lg font-medium text-muted-foreground">No document selected</p>
      <p className="text-sm text-muted-foreground mt-2">
        Select a document to preview its contents
      </p>
    </div>
  );
};

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  url,
  mimeType,
  filename,
  className,
  onDownload,
  showToolbar = true,
}) => {
  const isDemoMode = localStorage.getItem("demo_mode") === "true";

  if (!url) {
    return (
      <div className={cn("h-full", className)}>
        <NoDocumentPlaceholder />
      </div>
    );
  }

  if (isDemoMode) {
    return (
      <div className={cn("h-full", className)}>
        <DemoPreviewPlaceholder filename={filename} mimeType={mimeType} />
      </div>
    );
  }

  const previewType = getPreviewType(mimeType);

  return (
    <div className={cn("h-full", className)}>
      {previewType === "pdf" && (
        <PDFPreview url={url} showToolbar={showToolbar} onDownload={onDownload} />
      )}
      {previewType === "image" && (
        <ImagePreview
          url={url}
          filename={filename}
          showToolbar={showToolbar}
          onDownload={onDownload}
        />
      )}
      {previewType === "unsupported" && (
        <UnsupportedPreview mimeType={mimeType} filename={filename} onDownload={onDownload} />
      )}
    </div>
  );
};

export default DocumentPreview;

/**
 * OCRErrorState Component
 *
 * Displays detailed error information when OCR processing fails,
 * including possible reasons and actions to resolve the issue.
 *
 * Week 1 Task 1.2.1: Enhanced Error States
 * Week 7 Task 1.3.3: Unified Error Handling Integration
 */

import React from "react";
import { AlertCircle, RefreshCw, BookOpen, Upload, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DocumentDetail } from "@/features/documents/types";

export type OCRErrorType =
  | "processing"
  | "quality"
  | "format"
  | "encrypted"
  | "corrupted"
  | "timeout"
  | "unknown";

interface OCRErrorStateProps {
  /** Document with error details */
  document: DocumentDetail;
  /** Callback when retry is clicked */
  onRetry: () => void;
  /** Callback when re-upload is clicked */
  onReupload?: () => void;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  /** Additional class names */
  className?: string;
  /** Specific error type for targeted guidance */
  errorType?: OCRErrorType;
}

const errorTypeConfig: Record<
  OCRErrorType,
  {
    title: string;
    icon: React.FC<{ className?: string }>;
    possibleReasons: string[];
    tips: string[];
  }
> = {
  processing: {
    title: "OCR Processing Failed",
    icon: AlertCircle,
    possibleReasons: [
      "The document may be too complex for automated extraction",
      "Server encountered an unexpected error during processing",
      "Processing was interrupted due to system maintenance",
    ],
    tips: ["Try processing the document again", "If the issue persists, contact support"],
  },
  quality: {
    title: "Image Quality Issue",
    icon: FileWarning,
    possibleReasons: [
      "Poor image quality or low resolution (below 300 DPI recommended)",
      "Blurry or out-of-focus images",
      "Poor lighting or contrast in scanned documents",
    ],
    tips: [
      "Ensure the document resolution is at least 300 DPI",
      "Re-scan the document with better lighting",
      "Use a higher quality camera or scanner",
    ],
  },
  format: {
    title: "Unsupported Format",
    icon: FileWarning,
    possibleReasons: [
      "Unsupported document format or encoding",
      "Text is handwritten or in an unsupported language",
      "Document contains only images without extractable text",
    ],
    tips: [
      "Try converting the document to PDF format",
      "Ensure text is machine-readable (not handwritten)",
      "Convert images to a supported format (PDF, PNG, JPG)",
    ],
  },
  encrypted: {
    title: "Document Protected",
    icon: AlertCircle,
    possibleReasons: [
      "Document is encrypted or password-protected",
      "Digital rights management (DRM) restrictions",
      "Security settings prevent text extraction",
    ],
    tips: [
      "Remove password protection before uploading",
      "Check if the document has DRM restrictions",
      "Export to a new PDF without security settings",
    ],
  },
  corrupted: {
    title: "File Corrupted",
    icon: FileWarning,
    possibleReasons: [
      "File is corrupted or incomplete",
      "File was damaged during upload",
      "Incomplete or truncated download",
    ],
    tips: [
      "Re-download the original file",
      "Try uploading a different copy",
      "Check if the original file opens correctly",
    ],
  },
  timeout: {
    title: "Processing Timeout",
    icon: AlertCircle,
    possibleReasons: [
      "Document is too large for processing",
      "Server load is high, causing delays",
      "Complex document requiring extended processing time",
    ],
    tips: [
      "Try again during off-peak hours",
      "Split large documents into smaller parts",
      "Compress images before uploading",
    ],
  },
  unknown: {
    title: "OCR Processing Failed",
    icon: AlertCircle,
    possibleReasons: [
      "Poor image quality or low resolution (below 300 DPI recommended)",
      "Unsupported document format or encoding",
      "Document is encrypted or password-protected",
      "Text is handwritten or in an unsupported language",
      "File is corrupted or incomplete",
      "Document contains only images without extractable text",
    ],
    tips: [
      "Try converting the document to PDF format",
      "Ensure the document resolution is at least 300 DPI",
      "Check if the document is password-protected and remove it",
      "Make sure the text is machine-readable (not handwritten)",
    ],
  },
};

/**
 * Detects error type from error message
 */
function detectErrorType(errorMessage?: string | null): OCRErrorType {
  if (!errorMessage) return "unknown";

  const message = errorMessage.toLowerCase();

  if (message.includes("timeout") || message.includes("timed out")) {
    return "timeout";
  }
  if (message.includes("corrupt") || message.includes("invalid file")) {
    return "corrupted";
  }
  if (
    message.includes("encrypt") ||
    message.includes("password") ||
    message.includes("protected")
  ) {
    return "encrypted";
  }
  if (
    message.includes("format") ||
    message.includes("unsupported") ||
    message.includes("handwritten")
  ) {
    return "format";
  }
  if (message.includes("quality") || message.includes("resolution") || message.includes("blur")) {
    return "quality";
  }
  if (message.includes("processing") || message.includes("failed")) {
    return "processing";
  }

  return "unknown";
}

export const OCRErrorState: React.FC<OCRErrorStateProps> = ({
  document,
  onRetry,
  onReupload,
  isRetrying = false,
  className,
  errorType: explicitErrorType,
}) => {
  const detectedType = explicitErrorType || detectErrorType(document.error_message);
  const config = errorTypeConfig[detectedType];
  const Icon = config.icon;

  return (
    <Card className={cn("border-destructive/50 bg-destructive/5", className)}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Error Icon */}
          <div className="p-3 rounded-full bg-destructive/10 flex-shrink-0">
            <Icon className="h-6 w-6 text-destructive" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Error Title */}
            <h3 className="font-semibold text-lg mb-2">{config.title}</h3>

            {/* Error Message */}
            <p className="text-muted-foreground mb-4">
              {document.error_message ||
                "Unable to extract text from this document. The OCR processing encountered an error."}
            </p>

            {/* Possible Reasons */}
            <div className="bg-background rounded-lg p-4 mb-4 border">
              <p className="text-sm font-medium mb-2">Possible reasons:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                {config.possibleReasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>

            {/* Troubleshooting Tips */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-muted">
              <p className="text-sm font-medium mb-2">💡 Troubleshooting Tips:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                {config.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={onRetry} disabled={isRetrying} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
                {isRetrying ? "Retrying..." : "Retry Processing"}
              </Button>
              {onReupload && (
                <Button variant="outline" onClick={onReupload} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Re-upload Document
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open("/docs/ocr-troubleshooting", "_blank")}
              >
                <BookOpen className="h-4 w-4" />
                Troubleshooting Guide
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Compact OCR Error State
 *
 * A smaller inline version for use in lists or table cells.
 */
interface OCRErrorCompactProps {
  errorMessage?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export const OCRErrorCompact: React.FC<OCRErrorCompactProps> = ({
  errorMessage,
  onRetry,
  isRetrying = false,
  className,
}) => {
  const errorType = detectErrorType(errorMessage);
  const config = errorTypeConfig[errorType];

  return (
    <div className={cn("flex items-center gap-2 text-destructive", className)}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm truncate">{config.title}</span>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          disabled={isRetrying}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
        </Button>
      )}
    </div>
  );
};

export default OCRErrorState;

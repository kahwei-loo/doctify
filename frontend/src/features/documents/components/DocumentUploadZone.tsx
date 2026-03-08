/**
 * DocumentUploadZone Component
 *
 * Drag-and-drop upload zone for documents with visual feedback.
 * Uses react-dropzone for file handling.
 *
 * Features:
 * - Drag-and-drop support
 * - File type validation
 * - Size limit validation
 * - Visual feedback for drag states
 * - Click-to-upload fallback
 */

import React, { useCallback } from "react";
import { useDropzone, type FileRejection, type DropEvent } from "react-dropzone";
import { Upload, FileText, Image, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Supported file types and their MIME types
const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "text/plain": [".txt"],
  "text/markdown": [".md"],
  "text/csv": [".csv"],
  "application/json": [".json"],
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Max files per upload
const MAX_FILES = 20;

interface DocumentUploadZoneProps {
  onFilesAccepted: (files: File[]) => void;
  onFilesRejected?: (rejections: FileRejection[]) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export const DocumentUploadZone: React.FC<DocumentUploadZoneProps> = ({
  onFilesAccepted,
  onFilesRejected,
  disabled = false,
  className,
  compact = false,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[], _event: DropEvent) => {
      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
      if (rejectedFiles.length > 0 && onFilesRejected) {
        onFilesRejected(rejectedFiles);
      }
    },
    [onFilesAccepted, onFilesRejected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject, open } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_FILE_TYPES,
      maxSize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
      disabled,
      noClick: compact, // In compact mode, only allow drag or button click
      noKeyboard: false,
    });

  // Determine the current state for styling
  const getStateStyles = () => {
    if (disabled) {
      return "border-muted-foreground/20 bg-muted/50 cursor-not-allowed";
    }
    if (isDragReject) {
      return "border-destructive bg-destructive/5 cursor-not-allowed";
    }
    if (isDragAccept) {
      return "border-primary bg-primary/5 cursor-copy";
    }
    if (isDragActive) {
      return "border-primary/50 bg-primary/5 cursor-copy";
    }
    return "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 cursor-pointer";
  };

  // Compact version for inline use
  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "flex items-center gap-3 p-3 border-2 border-dashed rounded-lg transition-all",
          getStateStyles(),
          className
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-lg",
            isDragActive ? "bg-primary/10" : "bg-muted"
          )}
        >
          <Upload
            className={cn("h-5 w-5", isDragActive ? "text-primary" : "text-muted-foreground")}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isDragActive
              ? isDragReject
                ? "Invalid file type"
                : "Drop files here"
              : "Drag & drop files"}
          </p>
          <p className="text-xs text-muted-foreground">PDF, TXT, MD, CSV, PNG, JPG up to 10MB</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={open} disabled={disabled}>
          Browse
        </Button>
      </div>
    );
  }

  // Full upload zone
  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all min-h-[200px]",
        getStateStyles(),
        className
      )}
    >
      <input {...getInputProps()} />

      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center h-16 w-16 rounded-full mb-4 transition-colors",
          isDragActive ? (isDragReject ? "bg-destructive/10" : "bg-primary/10") : "bg-muted"
        )}
      >
        {isDragReject ? (
          <AlertCircle className="h-8 w-8 text-destructive" />
        ) : (
          <Upload
            className={cn(
              "h-8 w-8 transition-colors",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
      </div>

      {/* Main Text */}
      <p className="text-lg font-medium mb-1">
        {isDragActive
          ? isDragReject
            ? "Invalid file type"
            : "Drop files to upload"
          : "Drag & drop documents here"}
      </p>

      {/* Subtitle */}
      <p className="text-sm text-muted-foreground mb-4">or click to browse your files</p>

      {/* File Type Icons */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="text-xs">PDF</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="text-xs">TXT</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="text-xs">MD</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="text-xs">CSV</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Image className="h-4 w-4" />
          <span className="text-xs">PNG</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Image className="h-4 w-4" />
          <span className="text-xs">JPG</span>
        </div>
      </div>

      {/* Size Limit */}
      <p className="text-xs text-muted-foreground">
        Maximum file size: 10MB • Up to {MAX_FILES} files at once
      </p>
    </div>
  );
};

/**
 * Get human-readable error message for file rejection
 */
export const getFileRejectionMessage = (rejection: FileRejection): string => {
  const { file, errors } = rejection;
  const errorMessages: string[] = [];

  for (const error of errors) {
    switch (error.code) {
      case "file-invalid-type":
        errorMessages.push(`"${file.name}" has an unsupported file type`);
        break;
      case "file-too-large":
        errorMessages.push(`"${file.name}" exceeds the 10MB size limit`);
        break;
      case "file-too-small":
        errorMessages.push(`"${file.name}" is too small`);
        break;
      case "too-many-files":
        errorMessages.push(`Too many files selected (max ${MAX_FILES})`);
        break;
      default:
        errorMessages.push(`"${file.name}": ${error.message}`);
    }
  }

  return errorMessages.join(", ");
};

export default DocumentUploadZone;

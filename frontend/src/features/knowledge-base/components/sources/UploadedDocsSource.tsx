/**
 * UploadedDocsSource Component
 *
 * Document upload interface for knowledge base.
 *
 * Features:
 * - 100% reuses DocumentUploadZone component
 * - Drag-and-drop support
 * - File type validation
 * - Selected files list with remove capability
 */

import React, { useState } from "react";
import { FileStack, AlertCircle, FileText, Image, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DocumentUploadZone,
  getFileRejectionMessage,
} from "@/features/documents/components/DocumentUploadZone";
import type { FileRejection } from "react-dropzone";
import { cn } from "@/lib/utils";

interface UploadedDocsSourceProps {
  selectedFiles?: File[];
  onFilesSelected?: (files: File[]) => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(file: File) {
  if (file.type.startsWith("image/")) {
    return <Image className="h-4 w-4 text-green-600" />;
  }
  return <FileText className="h-4 w-4 text-blue-600" />;
}

export const UploadedDocsSource: React.FC<UploadedDocsSourceProps> = ({
  selectedFiles = [],
  onFilesSelected,
  className,
}) => {
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  const handleFilesAccepted = (files: File[]) => {
    setUploadErrors([]);
    // Append to existing selection
    const combined = [...selectedFiles, ...files];
    onFilesSelected?.(combined);
  };

  const handleFilesRejected = (rejections: FileRejection[]) => {
    const errors = rejections.map((rejection) => getFileRejectionMessage(rejection));
    setUploadErrors(errors);
  };

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    onFilesSelected?.(updated);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      <DocumentUploadZone
        onFilesAccepted={handleFilesAccepted}
        onFilesRejected={handleFilesRejected}
      />

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
          </p>
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2.5 rounded-lg border bg-card p-2"
            >
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted shrink-0">
                {getFileIcon(file)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => handleRemoveFile(index)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {uploadErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Supported types hint */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <FileStack className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>PDF, TXT, MD, CSV, JSON, PNG, JPG — max 10MB per file, up to 20 files</span>
      </div>
    </div>
  );
};

export default UploadedDocsSource;

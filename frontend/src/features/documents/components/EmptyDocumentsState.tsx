/**
 * EmptyDocumentsState Component
 *
 * Empty state displayed when a project has no documents.
 * Provides a clear CTA to upload the first document.
 */

import React from "react";
import { FileText, Upload, FolderOpen } from "lucide-react";
import { EmptyState } from "@/shared/components/common/EmptyState";

interface EmptyDocumentsStateProps {
  /** Called when user clicks the upload button */
  onUpload?: () => void;
  /** Whether this is showing documents for a specific project */
  hasProjectFilter?: boolean;
  /** Whether there's an active search query */
  hasSearchQuery?: boolean;
  /** Called when user clicks to clear search */
  onClearSearch?: () => void;
  /** Variant of the empty state display */
  variant?: "card" | "inline" | "full-page";
  /** Additional class names */
  className?: string;
}

export const EmptyDocumentsState: React.FC<EmptyDocumentsStateProps> = ({
  onUpload,
  hasProjectFilter = false,
  hasSearchQuery = false,
  onClearSearch,
  variant = "inline",
  className,
}) => {
  // Search results empty state
  if (hasSearchQuery) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents found"
        description="No documents match your search criteria. Try adjusting your search or filter settings."
        action={
          onClearSearch
            ? {
                label: "Clear Search",
                onClick: onClearSearch,
                variant: "outline",
              }
            : undefined
        }
        variant={variant}
        className={className}
      />
    );
  }

  // Project-specific empty state
  if (hasProjectFilter) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No documents in this project"
        description="Upload your first document to extract structured data with AI-powered OCR. We'll automatically process and organize your data."
        action={
          onUpload
            ? {
                label: "Upload Document",
                onClick: onUpload,
                icon: Upload,
              }
            : undefined
        }
        tip="Supported formats: PDF, PNG, JPG • Max 10MB per file"
        variant={variant}
        className={className}
      />
    );
  }

  // General empty state (no project selected)
  return (
    <EmptyState
      icon={FileText}
      title="No documents yet"
      description="Upload your first document to get started. Our AI will automatically extract and structure your data."
      action={
        onUpload
          ? {
              label: "Upload Document",
              onClick: onUpload,
              icon: Upload,
            }
          : undefined
      }
      tip="Supported formats: PDF, PNG, JPG • Max 10MB per file"
      variant={variant}
      className={className}
    />
  );
};

export default EmptyDocumentsState;

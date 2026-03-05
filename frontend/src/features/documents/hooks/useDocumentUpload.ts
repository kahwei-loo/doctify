/**
 * useDocumentUpload Hook
 *
 * Custom hook for document upload operations with progress tracking
 * and error handling.
 */

import { useState, useCallback } from "react";
import { documentApi } from "../services/api";
import type { DocumentUploadResponse } from "../types";

interface UploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  response?: DocumentUploadResponse;
}

interface UseDocumentUploadReturn {
  uploads: Map<string, UploadProgress>;
  isUploading: boolean;
  uploadDocument: (file: File, projectId: string) => Promise<DocumentUploadResponse>;
  uploadMultiple: (files: File[], projectId: string) => Promise<void>;
  cancelUpload: (fileId: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
}

export const useDocumentUpload = (): UseDocumentUploadReturn => {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Generate unique file identifier
   */
  const getFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  /**
   * Update upload progress for a specific file
   */
  const updateUploadProgress = useCallback((fileId: string, updates: Partial<UploadProgress>) => {
    setUploads((prev) => {
      const newUploads = new Map(prev);
      const existing = newUploads.get(fileId);
      if (existing) {
        newUploads.set(fileId, { ...existing, ...updates });
      }
      return newUploads;
    });
  }, []);

  /**
   * Upload a single document
   */
  const uploadDocument = useCallback(
    async (file: File, projectId: string): Promise<DocumentUploadResponse> => {
      const fileId = getFileId(file);

      // Initialize upload state
      setUploads((prev) => {
        const newUploads = new Map(prev);
        newUploads.set(fileId, {
          file,
          progress: 0,
          status: "pending",
        });
        return newUploads;
      });

      setIsUploading(true);

      try {
        // Update to uploading status
        updateUploadProgress(fileId, { status: "uploading", progress: 0 });

        // Perform upload
        const response = await documentApi.upload(file, projectId);

        // Automatically trigger processing after successful upload
        if (response.data?.document_id) {
          try {
            await documentApi.process(response.data.document_id);
          } catch (processError) {
            // Log but don't fail the upload if processing trigger fails
            console.warn("Failed to auto-trigger processing:", processError);
          }
        }

        // Update to completed
        updateUploadProgress(fileId, {
          status: "completed",
          progress: 100,
          response,
        });

        return response;
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || "Upload failed";

        // Update to error status
        updateUploadProgress(fileId, {
          status: "error",
          error: errorMessage,
        });

        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [updateUploadProgress]
  );

  /**
   * Upload multiple documents in parallel
   */
  const uploadMultiple = useCallback(
    async (files: File[], projectId: string): Promise<void> => {
      setIsUploading(true);

      try {
        // Upload all files in parallel
        const uploadPromises = files.map((file) => uploadDocument(file, projectId));

        await Promise.allSettled(uploadPromises);
      } finally {
        setIsUploading(false);
      }
    },
    [uploadDocument]
  );

  /**
   * Cancel an upload
   */
  const cancelUpload = useCallback((fileId: string) => {
    setUploads((prev) => {
      const newUploads = new Map(prev);
      const upload = newUploads.get(fileId);
      if (upload && upload.status === "uploading") {
        newUploads.set(fileId, {
          ...upload,
          status: "error",
          error: "Upload cancelled",
        });
      }
      return newUploads;
    });
  }, []);

  /**
   * Clear completed uploads
   */
  const clearCompleted = useCallback(() => {
    setUploads((prev) => {
      const newUploads = new Map(prev);
      for (const [fileId, upload] of newUploads.entries()) {
        if (upload.status === "completed") {
          newUploads.delete(fileId);
        }
      }
      return newUploads;
    });
  }, []);

  /**
   * Clear all uploads
   */
  const clearAll = useCallback(() => {
    setUploads(new Map());
    setIsUploading(false);
  }, []);

  return {
    uploads,
    isUploading,
    uploadDocument,
    uploadMultiple,
    cancelUpload,
    clearCompleted,
    clearAll,
  };
};

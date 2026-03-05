/**
 * Document API Service
 *
 * Handles all document-related API calls including upload, processing,
 * listing, and export operations.
 */

import { apiClient } from "@/services/api/client";
import type {
  DocumentListResponse,
  DocumentUploadResponse,
  DocumentDetail,
  PaginationParams,
  DocumentFilters,
  QualityValidation,
  ExportFormat,
} from "../types";

const DOC_BASE_URL = "/documents";

// =============================================================================
// Document Upload API
// =============================================================================

export const documentUploadApi = {
  /**
   * Upload a new document
   */
  upload: async (file: File, projectId: string): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<DocumentUploadResponse>(
      `${DOC_BASE_URL}/upload`,
      formData,
      {
        params: { project_id: projectId },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },
};

// =============================================================================
// Document Processing API
// =============================================================================

export const documentProcessingApi = {
  /**
   * Start processing a document
   */
  process: async (
    documentId: string,
    extractionConfig?: Record<string, any>
  ): Promise<{ success: boolean; data: any; message: string }> => {
    const response = await apiClient.post(`${DOC_BASE_URL}/${documentId}/process`, {
      extraction_config: extractionConfig,
    });
    return response.data;
  },

  /**
   * Cancel document processing
   */
  cancel: async (documentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`${DOC_BASE_URL}/${documentId}/cancel`);
    return response.data;
  },

  /**
   * Retry failed document
   */
  retry: async (documentId: string): Promise<{ success: boolean; data: any; message: string }> => {
    const response = await apiClient.post(`${DOC_BASE_URL}/${documentId}/retry`);
    return response.data;
  },

  /**
   * Validate extraction quality
   */
  validateQuality: async (
    documentId: string,
    minimumConfidence = 0.75
  ): Promise<{ success: boolean; data: QualityValidation }> => {
    const response = await apiClient.get(`${DOC_BASE_URL}/${documentId}/validate-quality`, {
      params: { minimum_confidence: minimumConfidence },
    });
    return response.data;
  },
};

// =============================================================================
// Document Query API
// =============================================================================

export const documentQueryApi = {
  /**
   * Get document by ID
   */
  getById: async (documentId: string): Promise<{ success: boolean; data: DocumentDetail }> => {
    const response = await apiClient.get(`${DOC_BASE_URL}/${documentId}`);
    return response.data;
  },

  /**
   * List documents with filters and pagination
   */
  list: async (
    filters: DocumentFilters = {},
    pagination: PaginationParams = { page: 1, per_page: 20 }
  ): Promise<DocumentListResponse> => {
    const params: any = {
      page: pagination.page,
      per_page: pagination.per_page,
    };

    if (filters.project_id) {
      params.project_id = filters.project_id;
    }

    if (filters.status) {
      params.status_filter = filters.status;
    }

    const response = await apiClient.get<DocumentListResponse>(DOC_BASE_URL, { params });
    return response.data;
  },

  /**
   * Delete document
   */
  delete: async (documentId: string): Promise<void> => {
    await apiClient.delete(`${DOC_BASE_URL}/${documentId}`);
  },
};

// =============================================================================
// Document Export API
// =============================================================================

export const documentExportApi = {
  /**
   * Export document to specified format
   */
  export: async (
    documentId: string,
    format: ExportFormat = "json",
    includeMetadata = true
  ): Promise<Blob> => {
    const response = await apiClient.get(`${DOC_BASE_URL}/${documentId}/export`, {
      params: {
        export_format: format,
        include_metadata: includeMetadata,
      },
      responseType: "blob",
    });

    return response.data;
  },

  /**
   * Download exported document
   */
  download: async (
    documentId: string,
    format: ExportFormat = "json",
    includeMetadata = true
  ): Promise<void> => {
    const blob = await documentExportApi.export(documentId, format, includeMetadata);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `document_${documentId}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

// =============================================================================
// Document File API (Original File Preview & Download)
// =============================================================================

export const documentFileApi = {
  /**
   * Get document file as blob for preview (authenticated)
   */
  getPreviewBlob: async (documentId: string): Promise<Blob> => {
    const response = await apiClient.get(`${DOC_BASE_URL}/${documentId}/file/preview`, {
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Download original document file (authenticated)
   */
  downloadFile: async (documentId: string, filename: string): Promise<void> => {
    const response = await apiClient.get(`${DOC_BASE_URL}/${documentId}/file/download`, {
      responseType: "blob",
    });

    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};

// =============================================================================
// Combined Document API
// =============================================================================

export const documentApi = {
  ...documentUploadApi,
  ...documentProcessingApi,
  ...documentQueryApi,
  ...documentExportApi,
  ...documentFileApi,
};

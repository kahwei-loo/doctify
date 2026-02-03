/**
 * useDocuments Hook
 *
 * Custom hook for document operations including listing, filtering,
 * pagination, and basic CRUD operations.
 */

import { useState, useCallback, useEffect } from 'react';
import { documentApi } from '../services/api';
import type {
  DocumentListItem,
  DocumentFilters,
  PaginationParams,
  PaginationMeta,
  DocumentDetail,
} from '../types';

interface UseDocumentsReturn {
  documents: DocumentListItem[];
  currentDocument: DocumentDetail | null;
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  filters: DocumentFilters;
  fetchDocuments: (filters?: DocumentFilters, pagination?: PaginationParams) => Promise<void>;
  fetchDocument: (documentId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
  setFilters: (filters: DocumentFilters) => void;
  clearError: () => void;
}

export const useDocuments = (autoFetch = true): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [currentDocument, setCurrentDocument] = useState<DocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [filters, setFiltersState] = useState<DocumentFilters>({});

  /**
   * Fetch documents list with filters and pagination
   */
  const fetchDocuments = useCallback(
    async (
      newFilters: DocumentFilters = filters,
      paginationParams: PaginationParams = { page: 1, per_page: 20 }
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await documentApi.list(newFilters, paginationParams);
        setDocuments(response.data);
        setPagination(response.pagination);
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to fetch documents';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [filters]
  );

  /**
   * Fetch single document by ID
   */
  const fetchDocument = useCallback(async (documentId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await documentApi.getById(documentId);
      setCurrentDocument(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch document';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete document
   */
  const deleteDocument = useCallback(
    async (documentId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await documentApi.delete(documentId);

        // Remove from local state
        setDocuments((prev) => prev.filter((doc) => doc.document_id !== documentId));

        // Refresh list
        await fetchDocuments();
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Failed to delete document';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchDocuments]
  );

  /**
   * Update filters
   */
  const setFilters = useCallback((newFilters: DocumentFilters) => {
    setFiltersState(newFilters);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchDocuments();
    }
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    if (autoFetch && Object.keys(filters).length > 0) {
      fetchDocuments(filters);
    }
  }, [filters, autoFetch, fetchDocuments]);

  return {
    documents,
    currentDocument,
    isLoading,
    error,
    pagination,
    filters,
    fetchDocuments,
    fetchDocument,
    deleteDocument,
    setFilters,
    clearError,
  };
};

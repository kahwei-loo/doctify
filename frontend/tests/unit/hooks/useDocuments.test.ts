/**
 * Unit Tests for useDocuments Hook
 *
 * Tests document fetching, filtering, deletion, and state management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDocuments } from '@/features/documents/hooks/useDocuments';
import { documentApi } from '@/features/documents/services/api';

// Mock the documentApi
vi.mock('@/features/documents/services/api', () => ({
  documentApi: {
    list: vi.fn(),
    getById: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockDocumentApi = vi.mocked(documentApi);

describe('useDocuments Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for list to prevent errors
    mockDocumentApi.list.mockResolvedValue({
      data: [],
      pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('returns initial state correctly', async () => {
      const { result } = renderHook(() => useDocuments(false));

      expect(result.current.documents).toEqual([]);
      expect(result.current.currentDocument).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.pagination).toBeNull();
      expect(result.current.filters).toEqual({});
    });

    it('auto-fetches documents on mount when autoFetch is true', async () => {
      mockDocumentApi.list.mockResolvedValue({
        data: [{ document_id: '1', filename: 'doc1.pdf', status: 'completed' }],
        pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
      });

      renderHook(() => useDocuments(true));

      await waitFor(() => {
        expect(mockDocumentApi.list).toHaveBeenCalled();
      });
    });

    it('does not auto-fetch when autoFetch is false', async () => {
      renderHook(() => useDocuments(false));

      // Wait a bit to ensure no fetch happens
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockDocumentApi.list).not.toHaveBeenCalled();
    });
  });

  describe('Fetching Documents', () => {
    it('fetches documents successfully', async () => {
      const mockDocuments = [
        { document_id: '1', filename: 'doc1.pdf', status: 'completed' },
        { document_id: '2', filename: 'doc2.pdf', status: 'pending' },
      ];

      mockDocumentApi.list.mockResolvedValue({
        data: mockDocuments,
        pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
      });

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocuments();
      });

      expect(result.current.documents).toEqual(mockDocuments);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles fetch error', async () => {
      mockDocumentApi.list.mockRejectedValue({
        response: { data: { detail: 'Failed to fetch documents' } },
      });

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocuments();
      });

      expect(result.current.error).toBe('Failed to fetch documents');
      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading state during fetch', async () => {
      // Create a promise that we control
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockDocumentApi.list.mockReturnValue(pendingPromise as any);

      const { result } = renderHook(() => useDocuments(false));

      // Start fetching
      act(() => {
        result.current.fetchDocuments();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          data: [],
          pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 },
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('fetches documents with custom pagination', async () => {
      mockDocumentApi.list.mockResolvedValue({
        data: [],
        pagination: { page: 2, per_page: 10, total: 0, total_pages: 1 },
      });

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocuments({}, { page: 2, per_page: 10 });
      });

      expect(mockDocumentApi.list).toHaveBeenCalledWith({}, { page: 2, per_page: 10 });
    });
  });

  describe('Fetching Single Document', () => {
    it('fetches document by ID successfully', async () => {
      const mockDocument = {
        document_id: '1',
        filename: 'doc1.pdf',
        status: 'completed',
        content: 'Document content',
      };

      mockDocumentApi.getById.mockResolvedValue({
        data: mockDocument,
      });

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocument('1');
      });

      expect(result.current.currentDocument).toEqual(mockDocument);
      expect(result.current.error).toBeNull();
    });

    it('handles fetch document error', async () => {
      mockDocumentApi.getById.mockRejectedValue({
        response: { data: { detail: 'Document not found' } },
      });

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocument('invalid-id');
      });

      expect(result.current.error).toBe('Document not found');
      expect(result.current.currentDocument).toBeNull();
    });
  });

  describe('Filtering', () => {
    it('updates filters correctly', async () => {
      const { result } = renderHook(() => useDocuments(false));

      act(() => {
        result.current.setFilters({ status: 'completed' });
      });

      expect(result.current.filters).toEqual({ status: 'completed' });
    });

    it('fetches with new filters when autoFetch is enabled', async () => {
      mockDocumentApi.list.mockResolvedValue({
        data: [],
        pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 },
      });

      const { result } = renderHook(() => useDocuments(true));

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockDocumentApi.list).toHaveBeenCalled();
      });

      const initialCallCount = mockDocumentApi.list.mock.calls.length;

      // Update filters
      act(() => {
        result.current.setFilters({ project_id: 'project-123' });
      });

      // Wait for filter-triggered fetch
      await waitFor(() => {
        expect(mockDocumentApi.list.mock.calls.length).toBeGreaterThan(initialCallCount);
      });

      // Check the last call included the filter
      const lastCall = mockDocumentApi.list.mock.calls[mockDocumentApi.list.mock.calls.length - 1];
      expect(lastCall[0]).toEqual({ project_id: 'project-123' });
    });

    it('passes filters to fetchDocuments', async () => {
      mockDocumentApi.list.mockResolvedValue({
        data: [],
        pagination: { page: 1, per_page: 20, total: 0, total_pages: 1 },
      });

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocuments({ status: 'processing' });
      });

      expect(mockDocumentApi.list).toHaveBeenCalledWith(
        { status: 'processing' },
        { page: 1, per_page: 20 }
      );
    });
  });

  describe('Document Deletion', () => {
    it('deletes document successfully', async () => {
      const mockDocuments = [
        { document_id: '1', filename: 'doc1.pdf', status: 'completed' },
        { document_id: '2', filename: 'doc2.pdf', status: 'completed' },
      ];

      mockDocumentApi.list.mockResolvedValue({
        data: mockDocuments,
        pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
      });
      mockDocumentApi.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDocuments(false));

      // First fetch documents
      await act(async () => {
        await result.current.fetchDocuments();
      });

      expect(result.current.documents).toHaveLength(2);

      // Mock the list call after deletion to return updated list
      mockDocumentApi.list.mockResolvedValue({
        data: [{ document_id: '2', filename: 'doc2.pdf', status: 'completed' }],
        pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
      });

      // Delete document
      await act(async () => {
        await result.current.deleteDocument('1');
      });

      expect(mockDocumentApi.delete).toHaveBeenCalledWith('1');
    });

    it('handles deletion error', async () => {
      mockDocumentApi.delete.mockRejectedValue({
        response: { data: { detail: 'Failed to delete document' } },
      });

      const { result } = renderHook(() => useDocuments(false));

      // The hook throws the error after setting state, so we need to catch it
      await act(async () => {
        try {
          await result.current.deleteDocument('1');
        } catch {
          // Expected to throw
        }
      });

      // Wait for the error state to be set
      await waitFor(() => {
        expect(result.current.error).toBe('Failed to delete document');
      });
    });

    it('removes document from local state immediately', async () => {
      const mockDocuments = [
        { document_id: '1', filename: 'doc1.pdf', status: 'completed' },
        { document_id: '2', filename: 'doc2.pdf', status: 'completed' },
      ];

      mockDocumentApi.list.mockResolvedValue({
        data: mockDocuments,
        pagination: { page: 1, per_page: 20, total: 2, total_pages: 1 },
      });
      mockDocumentApi.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDocuments(false));

      // First fetch documents
      await act(async () => {
        await result.current.fetchDocuments();
      });

      expect(result.current.documents).toHaveLength(2);

      // Mock list for refresh after delete
      mockDocumentApi.list.mockResolvedValue({
        data: [{ document_id: '2', filename: 'doc2.pdf', status: 'completed' }],
        pagination: { page: 1, per_page: 20, total: 1, total_pages: 1 },
      });

      // Delete document
      await act(async () => {
        await result.current.deleteDocument('1');
      });

      // Check document was removed
      await waitFor(() => {
        const doc1 = result.current.documents.find((d) => d.document_id === '1');
        expect(doc1).toBeUndefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('clears error with clearError', async () => {
      mockDocumentApi.list.mockRejectedValue({
        response: { data: { detail: 'Some error' } },
      });

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocuments();
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('uses default error message when detail is missing', async () => {
      mockDocumentApi.list.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocuments();
      });

      expect(result.current.error).toBe('Failed to fetch documents');
    });
  });

  describe('Pagination', () => {
    it('stores pagination metadata from response', async () => {
      const mockPagination = {
        page: 2,
        per_page: 10,
        total: 50,
        total_pages: 5,
      };

      mockDocumentApi.list.mockResolvedValue({
        data: [],
        pagination: mockPagination,
      });

      const { result } = renderHook(() => useDocuments(false));

      await act(async () => {
        await result.current.fetchDocuments({}, { page: 2, per_page: 10 });
      });

      expect(result.current.pagination).toEqual(mockPagination);
    });
  });
});

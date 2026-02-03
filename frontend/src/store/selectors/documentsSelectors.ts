/**
 * Documents Selectors
 *
 * Memoized selectors for documents state with reselect.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectDocumentsState = (state: RootState) => state.documents;

// Memoized selectors
export const selectDocuments = createSelector(
  [selectDocumentsState],
  (documents) => documents.documents
);

export const selectCurrentDocument = createSelector(
  [selectDocumentsState],
  (documents) => documents.currentDocument
);

export const selectDocumentsFilters = createSelector(
  [selectDocumentsState],
  (documents) => documents.filters
);

export const selectDocumentsPagination = createSelector(
  [selectDocumentsState],
  (documents) => documents.pagination
);

export const selectSelectedDocuments = createSelector(
  [selectDocumentsState],
  (documents) => documents.selectedDocuments
);

export const selectDocumentsLoading = createSelector(
  [selectDocumentsState],
  (documents) => documents.isLoading
);

export const selectDocumentsError = createSelector(
  [selectDocumentsState],
  (documents) => documents.error
);

// Derived selectors
export const selectDocumentById = (documentId: string) =>
  createSelector([selectDocuments], (documents) =>
    documents.find((doc) => doc.document_id === documentId)
  );

export const selectDocumentsByStatus = (status: string) =>
  createSelector([selectDocuments], (documents) =>
    documents.filter((doc) => doc.status === status)
  );

export const selectPendingDocuments = createSelector([selectDocuments], (documents) =>
  documents.filter((doc) => doc.status === 'pending')
);

export const selectProcessingDocuments = createSelector([selectDocuments], (documents) =>
  documents.filter((doc) => doc.status === 'processing')
);

export const selectCompletedDocuments = createSelector([selectDocuments], (documents) =>
  documents.filter((doc) => doc.status === 'completed')
);

export const selectFailedDocuments = createSelector([selectDocuments], (documents) =>
  documents.filter((doc) => doc.status === 'failed')
);

export const selectSelectedDocumentIds = createSelector(
  [selectSelectedDocuments],
  (selectedDocs) => selectedDocs
);

export const selectSelectedDocumentsCount = createSelector(
  [selectSelectedDocuments],
  (selectedDocs) => selectedDocs.length
);

export const selectAreAllDocumentsSelected = createSelector(
  [selectDocuments, selectSelectedDocuments],
  (documents, selectedDocs) => documents.length > 0 && documents.every((doc) => selectedDocs.includes(doc.document_id))
);

export const selectAreSomeDocumentsSelected = createSelector(
  [selectDocuments, selectSelectedDocuments],
  (documents, selectedDocs) =>
    selectedDocs.length > 0 && selectedDocs.length < documents.length
);

export const selectTotalDocuments = createSelector(
  [selectDocumentsPagination],
  (pagination) => pagination?.total || 0
);

export const selectHasNextPage = createSelector(
  [selectDocumentsPagination],
  (pagination) => pagination?.has_next || false
);

export const selectHasPrevPage = createSelector(
  [selectDocumentsPagination],
  (pagination) => pagination?.has_prev || false
);

export const selectCurrentPage = createSelector(
  [selectDocumentsPagination],
  (pagination) => pagination?.page || 1
);

export const selectTotalPages = createSelector(
  [selectDocumentsPagination],
  (pagination) => pagination?.total_pages || 1
);

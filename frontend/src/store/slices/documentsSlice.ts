/**
 * Documents Slice
 *
 * Redux slice for documents state management.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  DocumentListItem,
  DocumentDetail,
  DocumentFilters,
  PaginationMeta,
} from '../../features/documents/types';
import { documentsApi } from '../api/documentsApi';

interface DocumentsState {
  documents: DocumentListItem[];
  currentDocument: DocumentDetail | null;
  filters: DocumentFilters;
  pagination: PaginationMeta | null;
  selectedDocuments: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DocumentsState = {
  documents: [],
  currentDocument: null,
  filters: {},
  pagination: null,
  selectedDocuments: [],
  isLoading: false,
  error: null,
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<DocumentFilters>) => {
      state.filters = action.payload;
    },

    clearFilters: (state) => {
      state.filters = {};
    },

    selectDocument: (state, action: PayloadAction<string>) => {
      if (!state.selectedDocuments.includes(action.payload)) {
        state.selectedDocuments.push(action.payload);
      }
    },

    deselectDocument: (state, action: PayloadAction<string>) => {
      state.selectedDocuments = state.selectedDocuments.filter((id) => id !== action.payload);
    },

    toggleDocumentSelection: (state, action: PayloadAction<string>) => {
      if (state.selectedDocuments.includes(action.payload)) {
        state.selectedDocuments = state.selectedDocuments.filter((id) => id !== action.payload);
      } else {
        state.selectedDocuments.push(action.payload);
      }
    },

    selectAllDocuments: (state) => {
      const allIds = state.documents.map((doc) => doc.document_id);
      state.selectedDocuments = [...new Set([...state.selectedDocuments, ...allIds])];
    },

    deselectAllDocuments: (state) => {
      state.selectedDocuments = [];
    },

    setCurrentDocument: (state, action: PayloadAction<DocumentDetail | null>) => {
      state.currentDocument = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    // WebSocket update handler
    updateDocumentStatus: (
      state,
      action: PayloadAction<{ document_id: string; status: string; confidence?: number }>
    ) => {
      // Update in documents list
      const docIndex = state.documents.findIndex(
        (doc) => doc.document_id === action.payload.document_id
      );
      if (docIndex !== -1) {
        state.documents[docIndex].status = action.payload.status as any;
      }

      // Update current document if it's the same
      if (state.currentDocument?.document_id === action.payload.document_id) {
        state.currentDocument.status = action.payload.status as any;
        if (action.payload.confidence !== undefined && state.currentDocument.extraction_result) {
          state.currentDocument.extraction_result.confidence = action.payload.confidence;
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Handle getDocuments
    builder
      .addMatcher(documentsApi.endpoints.getDocuments.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(documentsApi.endpoints.getDocuments.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.documents = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addMatcher(documentsApi.endpoints.getDocuments.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as any)?.data?.detail || 'Failed to fetch documents';
      });

    // Handle getDocument
    builder
      .addMatcher(documentsApi.endpoints.getDocument.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(documentsApi.endpoints.getDocument.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.currentDocument = action.payload.data;
      })
      .addMatcher(documentsApi.endpoints.getDocument.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as any)?.data?.detail || 'Failed to fetch document';
      });

    // Handle uploadDocument
    builder
      .addMatcher(documentsApi.endpoints.uploadDocument.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(documentsApi.endpoints.uploadDocument.matchFulfilled, (state) => {
        state.isLoading = false;
      })
      .addMatcher(documentsApi.endpoints.uploadDocument.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as any)?.data?.detail || 'Upload failed';
      });

    // Handle deleteDocument
    builder
      .addMatcher(documentsApi.endpoints.deleteDocument.matchFulfilled, (state, action) => {
        // Remove from selected documents
        state.selectedDocuments = state.selectedDocuments.filter(
          (id) => id !== action.meta.arg.originalArgs
        );

        // Clear current document if it was deleted
        if (state.currentDocument?.document_id === action.meta.arg.originalArgs) {
          state.currentDocument = null;
        }
      })
      .addMatcher(documentsApi.endpoints.deleteDocument.matchRejected, (state, action) => {
        state.error = (action.payload as any)?.data?.detail || 'Failed to delete document';
      });
  },
});

export const {
  setFilters,
  clearFilters,
  selectDocument,
  deselectDocument,
  toggleDocumentSelection,
  selectAllDocuments,
  deselectAllDocuments,
  setCurrentDocument,
  setError,
  clearError,
  updateDocumentStatus,
} = documentsSlice.actions;

export default documentsSlice.reducer;

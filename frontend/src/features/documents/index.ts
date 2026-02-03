/**
 * Documents Feature Module
 *
 * Exports all document-related functionality including types, services,
 * and hooks.
 */

// Types
export type {
  Document,
  DocumentListItem,
  DocumentDetail,
  DocumentUploadData,
  DocumentUploadResponse,
  DocumentProcessConfig,
  DocumentStatus,
  ExportFormat,
  ExtractionResult,
  ExtractedEntity,
  ExtractedTable,
  PaginationParams,
  PaginationMeta,
  DocumentListResponse,
  QualityValidation,
  DocumentFilters,
  DocumentState,
  WebSocketDocumentUpdate,
} from './types';

// Services
export {
  documentUploadApi,
  documentProcessingApi,
  documentQueryApi,
  documentExportApi,
  documentApi,
} from './services/api';

// Hooks
export { useDocuments } from './hooks/useDocuments';
export { useDocumentUpload } from './hooks/useDocumentUpload';
export { useDocumentProcessing } from './hooks/useDocumentProcessing';
export { useDocumentWebSocket } from './hooks/useDocumentWebSocket';

// Components
export {
  ProjectPanel,
  ProjectPanelItem,
  ProjectPanelSearch,
  DocumentUploadZone,
  getFileRejectionMessage,
  UploadQueue,
  DocumentTable,
  DocumentSplitView,
  DocumentPreview,
  ExtractedStructuredView,
  LineItemsTable,
  type LineItem,
} from './components';

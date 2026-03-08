/**
 * Document Types
 *
 * Type definitions for document management including upload, processing,
 * and export operations.
 */

// DocumentStatus matches backend domain entity (Single Source of Truth)
// See: backend/app/domain/entities/document.py
export type DocumentStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export type ExportFormat = "json" | "csv" | "xml";

export interface Document {
  document_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  created_at: string;
  completed_at?: string;
  project_id: string;
  user_id: string;
  result_id?: string;
  error_message?: string;
  celery_task_id?: string;
}

export interface DocumentListItem {
  document_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  created_at: string;
  completed_at?: string;
  project_id?: string;
  project_name?: string;
  confidence_score?: number;
}

export interface DocumentUploadData {
  file: File;
  project_id: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  data: {
    document_id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    status: DocumentStatus;
    created_at: string;
  };
  message: string;
  timestamp: string;
}

export interface DocumentProcessConfig {
  extraction_config?: Record<string, any>;
}

export interface DocumentDetail {
  document_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  status: DocumentStatus;
  created_at: string;
  completed_at?: string;
  project_id: string;
  extraction_result?: ExtractionResult;
  error_message?: string;
}

export interface ExtractionResult {
  text: string;
  confidence: number;
  metadata?: Record<string, any>;
  extracted_data?: Record<string, any>;
  confidence_scores?: Record<string, number>;
  entities?: ExtractedEntity[];
  tables?: ExtractedTable[];
}

export interface ExtractedEntity {
  type: string;
  value: string;
  confidence: number;
  position?: {
    page: number;
    bbox: [number, number, number, number];
  };
}

export interface ExtractedTable {
  rows: string[][];
  confidence: number;
  page: number;
}

export interface PaginationParams {
  page: number;
  per_page: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface DocumentListResponse {
  success: boolean;
  data: DocumentListItem[];
  pagination: PaginationMeta;
  timestamp: string;
}

export interface QualityValidation {
  document_id: string;
  overall_confidence: number;
  passed: boolean;
  minimum_confidence: number;
  low_confidence_sections?: Array<{
    section: string;
    confidence: number;
  }>;
  recommendations?: string[];
}

export interface DocumentFilters {
  project_id?: string;
  status?: DocumentStatus;
  search?: string;
}

export interface DocumentState {
  documents: DocumentListItem[];
  currentDocument: DocumentDetail | null;
  isLoading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  filters: DocumentFilters;
}

export interface WebSocketDocumentUpdate {
  type: "document.status_change" | "document.completed" | "document.failed";
  data: {
    document_id: string;
    status: DocumentStatus;
    confidence?: number;
    error?: string;
    result_id?: string;
  };
  timestamp: string;
}

export interface ConfirmDocumentRequest {
  documentId: string;
  data: {
    ocr_data: ExtractionResult;
    user_confirmed: boolean;
    field_changes?: FieldChange[];
  };
}

export interface FieldChange {
  field: string;
  original_value: any;
  new_value: any;
  timestamp: string;
}

export interface ConfirmDocumentResponse {
  success: boolean;
  data: DocumentDetail;
  message: string;
  timestamp: string;
}

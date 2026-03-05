/**
 * Documents Feature Components
 *
 * Export all components from the documents feature.
 */

// Project Panel
export { ProjectPanel } from "./ProjectPanel";
export { ProjectPanelItem } from "./ProjectPanelItem";
export { ProjectPanelSearch } from "./ProjectPanelSearch";

// Document Upload
export { DocumentUploadZone, getFileRejectionMessage } from "./DocumentUploadZone";
export { UploadQueue } from "./UploadQueue";

// Document Display
export { DocumentTable } from "./DocumentTable";
export { DocumentTableSkeleton } from "./DocumentTableSkeleton";
export { EmptyDocumentsState } from "./EmptyDocumentsState";

// Document Detail
export { DocumentSplitView } from "./DocumentSplitView";
export { DocumentPreview } from "./DocumentPreview";
export { ExtractedStructuredView } from "./ExtractedStructuredView";
export { ExtractedDataView } from "./ExtractedDataView";
export { LineItemsTable, type LineItem } from "./LineItemsTable";
export { DocumentConfirmationView } from "./DocumentConfirmationView";

// Error States
export { OCRErrorState, OCRErrorCompact, type OCRErrorType } from "./OCRErrorState";
export { NetworkErrorState } from "./NetworkErrorState";
export { CorruptedFileError } from "./CorruptedFileError";

// Dialogs
export { DeleteDocumentsDialog } from "./DeleteDocumentsDialog";
export { RestoreDraftDialog } from "./RestoreDraftDialog";

// Drawers
export { ProjectSettingsDrawer } from "./ProjectSettingsDrawer";

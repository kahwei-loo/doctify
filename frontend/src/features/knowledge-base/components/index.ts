/**
 * Knowledge Base Components
 *
 * Export all knowledge base components
 */

// Overall View (KB list page, no kbId selected)
export { OverallViewPage } from "./OverallViewPage";

// NotebookLM-inspired Split Layout
export { KBSplitLayout } from "./KBSplitLayout";
export { SourcesPanel } from "./SourcesPanel";
export { ChatPanel } from "./ChatPanel";
export { SourceCard } from "./SourceCard";
export { SourceExpandedView } from "./SourceExpandedView";

// Sidebar & Navigation
export { KBListPanel } from "./KBListPanel";

// Dialogs
export { AddDataSourceDialog } from "./AddDataSourceDialog";
export { DataSourceConfigDialog } from "./DataSourceConfigDialog";
export { EditDataSourceDialog } from "./EditDataSourceDialog";
export { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

// Settings
export { KBSettings } from "./KBSettings";

// Critical States
export { KBListSkeleton } from "./KBListSkeleton";
export { EmptyKBState } from "./EmptyKBState";
export { ErrorState } from "./ErrorState";

// Data Source Type Components
export {
  UploadedDocsSource,
  WebsiteCrawlerSource,
  TextInputSource,
  QAPairsSource,
} from "./sources";

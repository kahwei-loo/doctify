/**
 * Projects Feature Module
 *
 * Exports all project-related functionality including types, components,
 * and utilities.
 */

// Types - New ProjectConfig types
export type {
  FieldType,
  LegacyFieldType,
  FieldDefinition,
  ColumnDefinition,
  TableDefinition,
  ExtractionField,
  AIModel,
  OCRLanguage,
  OutputFormat,
  ProcessingSettings,
  ProjectConfig,
  ExtractionConfig,
} from './types';

export {
  DEFAULT_PROJECT_CONFIG,
  DEFAULT_EXTRACTION_CONFIG,
  FIELD_TYPE_LABELS,
  LEGACY_FIELD_TYPE_LABELS,
  AI_MODEL_LABELS,
  LANGUAGE_LABELS,
  normalizeFieldType,
  toFieldDefinition,
  toExtractionField,
  toExtractionConfig,
  toProjectConfig,
} from './types';

// Components
export {
  // Field Management
  FieldForm,
  FieldList,
  FieldEditor,
  // Settings
  ProcessingSettings as ProcessingSettingsComponent,
  ProjectSettingsTab,
  // Statistics & Display
  ProjectStats,
  type ProjectStatsData,
  EnhancedProjectCard,
  EnhancedProjectCardSkeleton,
  ProcessingChart,
  type ProcessingChartData,
  TokenUsageChart,
  type TokenUsageByProject,
  // Configuration
  ProjectConfigModal,
  // Dialogs
  DeleteProjectDialog,
  // Empty States
  EmptyProjectsState,
} from './components';

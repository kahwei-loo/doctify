/**
 * Projects Feature Types
 *
 * Export all types from the projects feature.
 */

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
} from './extraction';

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
} from './extraction';

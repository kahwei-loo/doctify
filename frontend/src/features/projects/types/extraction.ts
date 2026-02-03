/**
 * Extraction Configuration Types
 *
 * Types for document extraction fields and processing settings.
 * Updated to match backend ProjectConfig structure.
 */

/**
 * Supported field types for extraction
 */
export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object';

/**
 * Legacy field type (for backward compatibility)
 */
export type LegacyFieldType = 'string' | 'float';

/**
 * Individual field definition for extraction configuration
 * Matches backend FieldDefinition Pydantic model
 */
export interface FieldDefinition {
  name: string;
  description?: string;
  type: FieldType;
  required: boolean;
  default_value?: string;
  fixed_value?: string;
}

/**
 * Column definition for table extraction
 * Matches backend ColumnDefinition Pydantic model
 */
export interface ColumnDefinition {
  name: string;
  description?: string;
  type: Exclude<FieldType, 'array' | 'object'>;
  required: boolean;
  default_value?: string;
  fixed_value?: string;
}

/**
 * Table definition for line item extraction
 * Matches backend TableDefinition Pydantic model
 */
export interface TableDefinition {
  name: string;
  description?: string;
  columns: ColumnDefinition[];
}

/**
 * Legacy extraction field (for backward compatibility with existing components)
 */
export interface ExtractionField {
  id: string;
  name: string;
  type: FieldType | LegacyFieldType;
  required: boolean;
  description?: string;
  defaultValue?: string | number | boolean;
}

/**
 * Supported AI models for document processing
 */
export type AIModel =
  | 'openai/gpt-4o-mini'
  | 'openai/gpt-4o'
  | 'anthropic/claude-3-5-sonnet'
  | 'anthropic/claude-3-opus'
  | 'google/gemini-pro'
  // Legacy values for backward compatibility
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus'
  | 'claude-3-sonnet';

/**
 * Supported languages for OCR
 */
export type OCRLanguage = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'ar' | 'my' | 'auto';

/**
 * Output format options
 */
export type OutputFormat = 'json' | 'csv' | 'xml' | 'xlsx';

/**
 * Processing settings for a project
 */
export interface ProcessingSettings {
  ocr_enabled: boolean;
  ai_model: AIModel;
  language: OCRLanguage;
  output_format: OutputFormat;
}

/**
 * Complete project configuration
 * Matches backend ProjectConfig Pydantic model
 */
export interface ProjectConfig {
  // Basic OCR settings
  ocr_enabled: boolean;
  ai_model: AIModel;
  language: OCRLanguage;
  output_format: OutputFormat;

  // Field configuration (core feature from old project)
  fields: FieldDefinition[];

  // Table configuration (core feature from old project)
  tables: TableDefinition[];

  // Custom prompt (Layer 3 - highest priority)
  message_content?: string | null;

  // Sample output for AI few-shot learning
  sample_output?: Record<string, unknown> | null;

  // Validation rules
  validation_rules?: Record<string, unknown>;
}

/**
 * Legacy extraction configuration (for backward compatibility)
 */
export interface ExtractionConfig {
  extraction_fields: ExtractionField[];
  ocr_enabled: boolean;
  ai_model: AIModel;
  language: OCRLanguage;
  output_format: OutputFormat;
  validation_rules?: Record<string, unknown>;
}

/**
 * Default project configuration
 * Matches backend default structure
 */
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  ocr_enabled: true,
  ai_model: 'openai/gpt-4o-mini',
  language: 'en',
  output_format: 'json',
  fields: [],
  tables: [],
  message_content: null,
  sample_output: null,
  validation_rules: {},
};

/**
 * Default extraction configuration (legacy)
 */
export const DEFAULT_EXTRACTION_CONFIG: ExtractionConfig = {
  extraction_fields: [],
  ocr_enabled: true,
  ai_model: 'openai/gpt-4o-mini',
  language: 'en',
  output_format: 'json',
  validation_rules: {},
};

/**
 * Field type display labels
 */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  boolean: 'Yes/No',
  array: 'List',
  object: 'Object',
};

/**
 * Legacy field type labels (for backward compatibility)
 */
export const LEGACY_FIELD_TYPE_LABELS: Record<LegacyFieldType, string> = {
  string: 'Text',
  float: 'Decimal',
};

/**
 * AI model display labels
 */
export const AI_MODEL_LABELS: Record<string, string> = {
  // New model format
  'openai/gpt-4o-mini': 'GPT-4o Mini (Recommended)',
  'openai/gpt-4o': 'GPT-4o (Premium)',
  'anthropic/claude-3-5-sonnet': 'Claude 3.5 Sonnet (Balanced)',
  'anthropic/claude-3-opus': 'Claude 3 Opus (Premium)',
  'google/gemini-pro': 'Gemini Pro',
  // Legacy format (for backward compatibility)
  'gpt-4': 'GPT-4 (Legacy)',
  'gpt-4-turbo': 'GPT-4 Turbo (Legacy)',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo (Legacy)',
  'claude-3-opus': 'Claude 3 Opus (Legacy)',
  'claude-3-sonnet': 'Claude 3 Sonnet (Legacy)',
};

/**
 * Language display labels
 */
export const LANGUAGE_LABELS: Record<OCRLanguage, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  my: 'Malay',
  auto: 'Auto-detect',
};

/**
 * Helper function to convert legacy field type to new type
 */
export function normalizeFieldType(type: FieldType | LegacyFieldType): FieldType {
  if (type === 'string') return 'text';
  if (type === 'float') return 'number';
  return type as FieldType;
}

/**
 * Helper function to convert ExtractionField to FieldDefinition
 */
export function toFieldDefinition(field: ExtractionField): FieldDefinition {
  return {
    name: field.name,
    description: field.description,
    type: normalizeFieldType(field.type),
    required: field.required,
    default_value: field.defaultValue?.toString(),
  };
}

/**
 * Helper function to convert FieldDefinition to ExtractionField
 */
export function toExtractionField(field: FieldDefinition, id?: string): ExtractionField {
  return {
    id: id || `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: field.name,
    description: field.description,
    type: field.type,
    required: field.required,
    defaultValue: field.default_value,
  };
}

/**
 * Helper function to convert ProjectConfig to ExtractionConfig (legacy)
 */
export function toExtractionConfig(config: ProjectConfig): ExtractionConfig {
  return {
    extraction_fields: config.fields.map((f, i) => toExtractionField(f, `field_${i}`)),
    ocr_enabled: config.ocr_enabled,
    ai_model: config.ai_model,
    language: config.language,
    output_format: config.output_format,
    validation_rules: config.validation_rules,
  };
}

/**
 * Helper function to convert ExtractionConfig to ProjectConfig
 */
export function toProjectConfig(config: ExtractionConfig): ProjectConfig {
  return {
    ...DEFAULT_PROJECT_CONFIG,
    ocr_enabled: config.ocr_enabled,
    ai_model: config.ai_model,
    language: config.language,
    output_format: config.output_format,
    fields: config.extraction_fields.map(toFieldDefinition),
    validation_rules: config.validation_rules,
  };
}

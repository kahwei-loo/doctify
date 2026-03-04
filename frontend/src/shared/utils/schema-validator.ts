/**
 * Schema Validation Utilities
 *
 * Provides Zod schemas for validating user input and AI output.
 * Includes security measures to prevent injection attacks.
 */

import { z } from 'zod';

// ============================================================================
// Field Name Validation (Security)
// ============================================================================

/**
 * Valid field name pattern: starts with letter, alphanumeric + underscore, max 64 chars
 */
const FIELD_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

/**
 * Reserved names that could be used for prototype pollution attacks
 */
const RESERVED_NAMES = [
  '__proto__',
  'constructor',
  'prototype',
  'eval',
  'function',
  'this',
  'window',
  'document',
  'global',
  'process',
];

/**
 * Zod schema for field names with security validation
 */
export const FieldNameSchema = z
  .string()
  .min(1, 'Field name is required')
  .max(64, 'Field name must be 64 characters or less')
  .regex(FIELD_NAME_REGEX, 'Field name must start with a letter and contain only letters, numbers, and underscores')
  .refine(
    (name) => !RESERVED_NAMES.includes(name.toLowerCase()),
    'This field name is reserved and cannot be used'
  );

// ============================================================================
// Schema Builder Types
// ============================================================================

/**
 * Supported field types in Schema Builder
 */
export const FieldTypeEnum = z.enum([
  'text',
  'number',
  'boolean',
  'date',
  'enum',
  'array',
]);

export type FieldType = z.infer<typeof FieldTypeEnum>;

/**
 * Schema for a single field definition
 */
export const FieldDefinitionSchema = z.object({
  name: FieldNameSchema,
  type: FieldTypeEnum,
  description: z.string().max(500).optional(),
  required: z.boolean().default(false),
  enumOptions: z.array(z.string().max(100)).max(50).optional(),
  arrayItemType: FieldTypeEnum.optional(),
});

export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>;

/**
 * Schema for table column definition
 */
export const TableColumnSchema = z.object({
  name: FieldNameSchema,
  type: FieldTypeEnum,
  description: z.string().max(500).optional(),
});

export type TableColumn = z.infer<typeof TableColumnSchema>;

/**
 * Schema for table configuration
 */
export const TableConfigSchema = z.object({
  description: z.string().max(1000),
  columns: z.array(TableColumnSchema).max(20),
});

export type TableConfig = z.infer<typeof TableConfigSchema>;

/**
 * Complete project schema definition
 */
export const ProjectSchemaDefinition = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500),
  fields: z.array(FieldDefinitionSchema).max(50),
  tableConfig: TableConfigSchema.optional(),
});

export type ProjectSchema = z.infer<typeof ProjectSchemaDefinition>;

// ============================================================================
// Line Item Validation
// ============================================================================

/**
 * Schema for a single line item (extracted from documents)
 */
export const LineItemSchema = z.object({
  itemNo: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  quantity: z.number().positive().max(999999).optional(),
  unitPrice: z.number().nonnegative().max(999999999).optional(),
  discount: z.number().nonnegative().max(999999999).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxAmount: z.number().nonnegative().max(999999999).optional(),
  amount: z.number().nonnegative().max(999999999).optional(),
});

export type LineItem = z.infer<typeof LineItemSchema>;

/**
 * Schema for extracted document results
 */
export const ExtractedResultSchema = z.object({
  fields: z.record(z.string(), z.unknown()).optional(),
  lineItems: z.array(LineItemSchema).max(1000).optional(),
  confidence: z.number().min(0).max(100).optional(),
});

export type ExtractedResult = z.infer<typeof ExtractedResultSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a field name for security
 */
export const validateFieldName = (name: string): { valid: boolean; error?: string } => {
  const result = FieldNameSchema.safeParse(name);
  if (result.success) {
    return { valid: true };
  }
  return { valid: false, error: result.error.issues[0]?.message };
};

/**
 * Validate a complete project schema
 */
export const validateProjectSchema = (
  schema: unknown
): { valid: boolean; data?: ProjectSchema; errors?: z.ZodError } => {
  const result = ProjectSchemaDefinition.safeParse(schema);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, errors: result.error };
};

/**
 * Validate extracted results from AI
 */
export const validateExtractedResult = (
  result: unknown
): { valid: boolean; data?: ExtractedResult; errors?: z.ZodError } => {
  const parsed = ExtractedResultSchema.safeParse(result);
  if (parsed.success) {
    return { valid: true, data: parsed.data };
  }
  return { valid: false, errors: parsed.error };
};

/**
 * Validate line items array
 */
export const validateLineItems = (
  items: unknown[]
): { valid: boolean; data?: LineItem[]; errors?: z.ZodError } => {
  const schema = z.array(LineItemSchema).max(1000);
  const result = schema.safeParse(items);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, errors: result.error };
};

// ============================================================================
// Type Coercion Utilities
// ============================================================================

/**
 * Coerce a value to the expected type based on field definition
 */
export const coerceToType = (value: unknown, type: FieldType): unknown => {
  if (value === null || value === undefined) {
    return getDefaultForType(type);
  }

  switch (type) {
    case 'text':
      return String(value);
    case 'number': {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    }
    case 'boolean':
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value);
    case 'date':
      if (value instanceof Date) return value.toISOString();
      if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? '' : date.toISOString();
      }
      return '';
    case 'enum':
      return String(value);
    case 'array':
      return Array.isArray(value) ? value : [value];
    default:
      return value;
  }
};

/**
 * Get default value for a field type
 */
export const getDefaultForType = (type: FieldType): unknown => {
  switch (type) {
    case 'text':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'date':
      return '';
    case 'enum':
      return '';
    case 'array':
      return [];
    default:
      return null;
  }
};

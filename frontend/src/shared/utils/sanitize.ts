/**
 * HTML Sanitization Utilities
 *
 * Provides functions to sanitize user input and AI-generated content
 * to prevent XSS attacks.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize a single string value
 */
export const sanitizeString = (value: string): string => {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize HTML content while preserving safe tags
 * Use this for rich text content that needs some formatting
 */
export const sanitizeHTML = (value: string): string => {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'span'],
    ALLOWED_ATTR: ['class'],
  });
};

/**
 * Recursively sanitize all string values in an object
 * Used for sanitizing AI output before rendering
 */
export const sanitizeAIOutput = <T extends Record<string, unknown>>(
  data: T
): T => {
  const sanitized = { ...data };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = value.map((item) => {
        if (typeof item === 'string') {
          return sanitizeString(item);
        }
        if (typeof item === 'object' && item !== null) {
          return sanitizeAIOutput(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeAIOutput(
        value as Record<string, unknown>
      );
    }
  }

  return sanitized;
};

/**
 * Sanitize extracted fields from document processing
 */
export interface ExtractedField {
  [key: string]: unknown;
}

export interface LineItem {
  itemNo?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  taxRate?: number;
  taxAmount?: number;
  amount?: number;
  [key: string]: unknown;
}

export interface ExtractedResult {
  fields?: ExtractedField;
  lineItems?: LineItem[];
  confidence?: number;
  [key: string]: unknown;
}

export const sanitizeExtractedResult = (result: ExtractedResult): ExtractedResult => {
  const sanitized: ExtractedResult = {
    ...result,
    confidence: result.confidence,
  };

  // Sanitize fields
  if (result.fields) {
    sanitized.fields = {};
    for (const [key, value] of Object.entries(result.fields)) {
      if (typeof value === 'string') {
        sanitized.fields[key] = sanitizeString(value);
      } else {
        sanitized.fields[key] = value;
      }
    }
  }

  // Sanitize line items
  if (result.lineItems) {
    sanitized.lineItems = result.lineItems.map((item) => ({
      ...item,
      itemNo: item.itemNo ? sanitizeString(item.itemNo) : item.itemNo,
      description: item.description
        ? sanitizeString(item.description)
        : item.description,
    }));
  }

  return sanitized;
};

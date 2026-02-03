/**
 * ExtractedStructuredView Component
 *
 * Displays extracted document data in structured or JSON format.
 * Uses HTML sanitization for XSS protection when rendering AI output.
 *
 * Features:
 * - Structured view with labeled fields
 * - Raw JSON view for developers
 * - Copy to clipboard functionality
 * - Confidence indicators for each field
 * - Entity highlighting
 * - HTML sanitization for security
 */

import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  FileJson,
  Layout,
  Download,
  ChevronDown,
  ChevronRight,
  Tag,
  Table2,
  FileText,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ConfidenceBar } from '@/components/ui/confidence-bar';
import { sanitizeAIOutput } from '@/shared/utils/sanitize';
import type { ExtractionResult, ExtractedEntity, ExtractedTable } from '../types';

interface ExtractedStructuredViewProps {
  /** Extraction result data */
  result: ExtractionResult | null | undefined;
  /** Custom class name */
  className?: string;
  /** Callback when exporting data */
  onExport?: (format: 'json' | 'csv') => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether fields are editable */
  editable?: boolean;
  /** Callback when field value changes */
  onChange?: (fieldPath: string, value: any) => void;
  /** Render function for line items table (optional) */
  renderLineItems?: (lineItems: any[]) => React.ReactNode;
}

/**
 * Structured Field Display with Edit Support
 */
const StructuredField: React.FC<{
  label: string;
  value: string | number | boolean | null | undefined;
  confidence?: number;
  type?: 'text' | 'number' | 'date' | 'boolean';
  editable?: boolean;
  fieldKey?: string;
  onChange?: (value: any) => void;
}> = ({ label, value, confidence, type = 'text', editable = false, fieldKey, onChange }) => {
  const [copied, setCopied] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  const displayValue = useMemo(() => {
    if (localValue === null || localValue === undefined) return '-';
    if (typeof localValue === 'boolean') return localValue ? 'Yes' : 'No';
    if (typeof localValue === 'string') {
      // Sanitize string values from AI output
      return sanitizeAIOutput({ value: localValue }).value;
    }
    return String(localValue);
  }, [localValue]);

  const copyValue = async () => {
    if (displayValue && displayValue !== '-') {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleChange = (newValue: string) => {
    let parsedValue: any = newValue;

    // Type conversion based on field type
    if (type === 'number') {
      parsedValue = newValue === '' ? null : parseFloat(newValue);
    } else if (type === 'boolean') {
      parsedValue = newValue === 'true' || newValue === 'Yes';
    }

    setLocalValue(parsedValue);
    onChange?.(parsedValue);
  };

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>

        {editable ? (
          <div className="space-y-1">
            {type === 'text' && displayValue.length > 50 ? (
              <Textarea
                value={displayValue === '-' ? '' : displayValue}
                onChange={(e) => handleChange(e.target.value)}
                className="min-h-[60px] font-medium"
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            ) : (
              <Input
                type={type === 'number' ? 'number' : 'text'}
                value={displayValue === '-' ? '' : displayValue}
                onChange={(e) => handleChange(e.target.value)}
                className="font-medium"
                placeholder={`Enter ${label.toLowerCase()}`}
              />
            )}
            {confidence !== undefined && (
              <div className="w-24">
                <ConfidenceBar value={confidence} size="sm" showLabel labelPosition="inline" />
              </div>
            )}
          </div>
        ) : (
          <>
            <p className={cn(
              'font-medium break-words',
              displayValue === '-' && 'text-muted-foreground'
            )}>
              {displayValue}
            </p>
            {confidence !== undefined && (
              <div className="mt-1.5 w-24">
                <ConfidenceBar value={confidence} size="sm" showLabel labelPosition="inline" />
              </div>
            )}
          </>
        )}
      </div>

      {!editable && displayValue && displayValue !== '-' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={copyValue}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
};

/**
 * Entity Display Component
 */
const EntityBadge: React.FC<{ entity: ExtractedEntity }> = ({ entity }) => {
  const sanitizedValue = sanitizeAIOutput({ value: entity.value }).value;

  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1.5 py-1',
        entity.confidence >= 0.9 && 'bg-green-500/10 border-green-500/20',
        entity.confidence >= 0.7 && entity.confidence < 0.9 && 'bg-yellow-500/10 border-yellow-500/20',
        entity.confidence < 0.7 && 'bg-red-500/10 border-red-500/20'
      )}
    >
      <Tag className="h-3 w-3" />
      <span className="text-muted-foreground">{entity.type}:</span>
      <span className="font-medium">{sanitizedValue}</span>
    </Badge>
  );
};

/**
 * Table Preview Component
 */
const TablePreview: React.FC<{
  table: ExtractedTable;
  index: number;
}> = ({ table, index }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Sanitize table data
  const sanitizedRows = useMemo(() => {
    return table.rows.map(row =>
      row.map(cell => sanitizeAIOutput({ value: cell }).value)
    );
  }, [table.rows]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto"
        >
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-muted-foreground" />
            <span>Table {index + 1}</span>
            <Badge variant="outline" className="text-xs">
              {table.rows.length} rows
            </Badge>
            {table.page && (
              <Badge variant="outline" className="text-xs">
                Page {table.page}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="overflow-x-auto mt-2 border rounded-lg">
          <table className="min-w-full divide-y divide-border">
            {sanitizedRows.length > 0 && (
              <>
                <thead className="bg-muted/50">
                  <tr>
                    {sanitizedRows[0].map((cell, idx) => (
                      <th
                        key={idx}
                        className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                      >
                        {cell || `Column ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sanitizedRows.slice(1).map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="px-3 py-2 text-sm whitespace-nowrap"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/**
 * JSON View Component
 */
const JSONView: React.FC<{
  data: any;
  onCopy: () => void;
  copied: boolean;
}> = ({ data, onCopy, copied }) => {
  const jsonString = useMemo(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="absolute right-2 top-2 z-10"
        onClick={onCopy}
      >
        {copied ? (
          <>
            <Check className="mr-2 h-4 w-4 text-green-500" />
            Copied
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </>
        )}
      </Button>
      <pre className="p-4 pt-12 rounded-lg bg-muted/50 overflow-auto max-h-[600px] text-sm font-mono">
        {jsonString}
      </pre>
    </div>
  );
};

/**
 * Empty State Component
 */
const EmptyState: React.FC<{ message?: string }> = ({
  message = 'No extraction results available',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

/**
 * Loading State Component
 */
const LoadingState: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-6 w-full bg-muted rounded" />
        </div>
      ))}
    </div>
  );
};

export const ExtractedStructuredView: React.FC<ExtractedStructuredViewProps> = ({
  result,
  className,
  onExport,
  isLoading = false,
  editable = false,
  onChange,
  renderLineItems,
}) => {
  const [activeTab, setActiveTab] = useState<'structured' | 'json'>('structured');
  const [jsonCopied, setJsonCopied] = useState(false);

  // Copy JSON to clipboard
  const copyJson = async () => {
    if (result) {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 1500);
    }
  };

  // Handle field changes
  const handleFieldChange = (fieldPath: string, value: any) => {
    if (onChange) {
      onChange(fieldPath, value);
    }
  };

  // Extract metadata fields for structured view
  const metadataFields = useMemo(() => {
    if (!result?.metadata) return [];

    return Object.entries(result.metadata)
      .filter(([key]) => !key.includes('line_items') && !key.includes('lineItems'))
      .map(([key, value]) => ({
        label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value,
        key,
      }));
  }, [result?.metadata]);

  if (isLoading) {
    return (
      <div className={cn('h-full', className)}>
        <LoadingState />
      </div>
    );
  }

  if (!result) {
    return (
      <div className={cn('h-full', className)}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'structured' | 'json')}
        className="flex-1 flex flex-col"
      >
        {/* Tab Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <TabsList>
            <TabsTrigger value="structured" className="gap-2">
              <Layout className="h-4 w-4" />
              Structured
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="h-4 w-4" />
              JSON
            </TabsTrigger>
          </TabsList>

          {/* Actions */}
          {onExport && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('json')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('csv')}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          )}
        </div>

        {/* Structured View */}
        <TabsContent value="structured" className="flex-1 overflow-auto m-0 p-4">
          <div className="space-y-6">
            {/* Overall Confidence */}
            <div className="p-4 rounded-lg bg-muted/30 border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Confidence</span>
                <ConfidenceBar
                  value={result.confidence}
                  size="md"
                  showLabel
                  labelPosition="left"
                />
              </div>
              {result.confidence < 0.7 && (
                <div className="flex items-center gap-2 mt-2 text-yellow-600 dark:text-yellow-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    Low confidence - manual review recommended
                  </span>
                </div>
              )}
            </div>

            {/* Extracted Text */}
            {result.text && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Extracted Text
                </h4>
                <div className="p-4 rounded-lg bg-muted/30 border max-h-48 overflow-auto">
                  <p className="text-sm whitespace-pre-wrap">
                    {sanitizeAIOutput({ text: result.text }).text}
                  </p>
                </div>
              </div>
            )}

            {/* Metadata Fields */}
            {metadataFields.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  Extracted Fields
                  {editable && (
                    <Badge variant="secondary" className="gap-1">
                      <Edit3 className="h-3 w-3" />
                      Editable
                    </Badge>
                  )}
                </h4>
                <div className="rounded-lg border divide-y">
                  {metadataFields.map((field) => (
                    <StructuredField
                      key={field.key}
                      label={field.label}
                      value={field.value as string | number | boolean}
                      editable={editable}
                      fieldKey={field.key}
                      onChange={(value) => handleFieldChange(`metadata.${field.key}`, value)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Line Items - Custom Renderer */}
            {renderLineItems && renderLineItems([])}

            {/* Entities */}
            {result.entities && result.entities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Extracted Entities ({result.entities.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.entities.map((entity, idx) => (
                    <EntityBadge key={idx} entity={entity} />
                  ))}
                </div>
              </div>
            )}

            {/* Tables */}
            {result.tables && result.tables.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Table2 className="h-4 w-4" />
                  Extracted Tables ({result.tables.length})
                </h4>
                <div className="space-y-2">
                  {result.tables.map((table, idx) => (
                    <TablePreview key={idx} table={table} index={idx} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* JSON View */}
        <TabsContent value="json" className="flex-1 overflow-auto m-0 p-4">
          <JSONView data={result} onCopy={copyJson} copied={jsonCopied} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExtractedStructuredView;

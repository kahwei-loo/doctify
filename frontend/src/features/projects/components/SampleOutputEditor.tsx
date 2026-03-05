/**
 * SampleOutputEditor Component
 *
 * JSON editor for defining sample output structure.
 * Provides a template for AI few-shot learning.
 *
 * Features:
 * - JSON syntax highlighting
 * - Validation with error display
 * - Auto-generate from fields and tables
 * - Format/beautify button
 * - Copy to clipboard
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Code, Copy, Check, Wand2, AlertCircle, FileJson, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldDefinition, TableDefinition } from "../types";

interface SampleOutputEditorProps {
  fields: FieldDefinition[];
  tables: TableDefinition[];
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown> | null) => void;
}

/**
 * Generate sample value based on field type
 */
function generateSampleValue(type: string): unknown {
  switch (type) {
    case "text":
      return "Sample text";
    case "number":
      return 100;
    case "date":
      return "2024-01-15";
    case "boolean":
      return true;
    case "array":
      return [];
    case "object":
      return {};
    default:
      return "";
  }
}

/**
 * Generate sample output from fields and tables
 */
function generateSampleOutput(
  fields: FieldDefinition[],
  tables: TableDefinition[]
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  // Generate field values
  fields.forEach((field) => {
    if (field.fixed_value) {
      output[field.name] = field.fixed_value;
    } else if (field.default_value) {
      output[field.name] = field.default_value;
    } else {
      output[field.name] = generateSampleValue(field.type);
    }
  });

  // Generate table values
  tables.forEach((table) => {
    const sampleRow: Record<string, unknown> = {};
    table.columns.forEach((column) => {
      if (column.fixed_value) {
        sampleRow[column.name] = column.fixed_value;
      } else if (column.default_value) {
        sampleRow[column.name] = column.default_value;
      } else {
        sampleRow[column.name] = generateSampleValue(column.type);
      }
    });
    output[table.name] = [sampleRow];
  });

  return output;
}

export const SampleOutputEditor: React.FC<SampleOutputEditorProps> = ({
  fields,
  tables,
  value,
  onChange,
}) => {
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Initialize JSON text from value
  useEffect(() => {
    if (value) {
      setJsonText(JSON.stringify(value, null, 2));
      setParseError(null);
    } else {
      setJsonText("");
    }
  }, [value]);

  // Handle text change
  const handleTextChange = useCallback(
    (text: string) => {
      setJsonText(text);
      setCopied(false);

      if (!text.trim()) {
        setParseError(null);
        onChange(null);
        return;
      }

      try {
        const parsed = JSON.parse(text);
        if (typeof parsed !== "object" || Array.isArray(parsed)) {
          setParseError("Sample output must be a JSON object");
          return;
        }
        setParseError(null);
        onChange(parsed);
      } catch (e) {
        setParseError(`Invalid JSON: ${(e as Error).message}`);
      }
    },
    [onChange]
  );

  // Format JSON
  const handleFormat = useCallback(() => {
    if (!jsonText.trim()) return;

    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (e) {
      setParseError(`Cannot format - Invalid JSON: ${(e as Error).message}`);
    }
  }, [jsonText]);

  // Generate from fields and tables
  const handleGenerate = useCallback(() => {
    const generated = generateSampleOutput(fields, tables);
    const newText = JSON.stringify(generated, null, 2);
    setJsonText(newText);
    setParseError(null);
    onChange(generated);
  }, [fields, tables, onChange]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [jsonText]);

  // Check if generate is available
  const canGenerate = fields.length > 0 || tables.length > 0;

  // Calculate line count for textarea height
  const lineCount = useMemo(() => {
    return Math.max(10, jsonText.split("\n").length + 2);
  }, [jsonText]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <FileJson className="h-5 w-5" />
            Sample Output
          </h3>
          <p className="text-sm text-muted-foreground">
            Define an example JSON output to guide AI extraction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate sample output from defined fields and tables</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFormat}
                  disabled={!jsonText.trim()}
                >
                  <Wand2 className="h-4 w-4 mr-1" />
                  Format
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Beautify JSON formatting</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!jsonText.trim()}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Error display */}
      {parseError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {/* JSON Editor */}
      <div className="relative">
        <Textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`{
  "invoice_number": "INV-001",
  "invoice_date": "2024-01-15",
  "total_amount": 1500.00,
  "line_items": [
    {
      "description": "Item 1",
      "quantity": 2,
      "unit_price": 500.00
    }
  ]
}`}
          className={cn(
            "font-mono text-sm min-h-[200px] resize-y",
            parseError && "border-destructive focus-visible:ring-destructive"
          )}
          style={{ height: `${Math.min(lineCount * 24, 400)}px` }}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          <Code className="h-3 w-3 inline mr-1" />
          JSON
        </div>
      </div>

      {/* Help text */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <p className="font-medium mb-1">Tips:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Use the Generate button to create a template from your fields and tables</li>
          <li>The sample output helps AI understand the expected extraction format</li>
          <li>Include realistic example values for better accuracy</li>
          <li>Tables should be represented as arrays of objects</li>
        </ul>
      </div>
    </div>
  );
};

export default SampleOutputEditor;

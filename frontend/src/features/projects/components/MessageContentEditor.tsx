/**
 * MessageContentEditor Component
 *
 * Editor for custom extraction prompts (Layer 3).
 * Allows users to define their own extraction instructions
 * that take highest priority over field/table configurations.
 *
 * Features:
 * - Multi-line text editor
 * - Character count
 * - Template suggestions
 * - Preview mode
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Wand2, AlertTriangle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageContentEditorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * Predefined prompt templates
 */
const PROMPT_TEMPLATES = [
  {
    id: "invoice",
    name: "Invoice Extraction",
    content: `Extract the following information from this invoice document:

1. Vendor/Supplier Information:
   - Company name
   - Address
   - Phone/Email

2. Invoice Details:
   - Invoice number
   - Invoice date
   - Due date

3. Financial Information:
   - Subtotal
   - Tax amount and rate
   - Total amount

4. Line Items (as a table):
   - Item description
   - Quantity
   - Unit price
   - Line total

Return the data in a structured JSON format.`,
  },
  {
    id: "receipt",
    name: "Receipt Extraction",
    content: `Extract the following from this receipt:

1. Store name and location
2. Transaction date and time
3. Items purchased with:
   - Item name
   - Quantity
   - Price
4. Subtotal
5. Tax
6. Total paid
7. Payment method (if visible)

Format as JSON with "items" as an array.`,
  },
  {
    id: "contract",
    name: "Contract Analysis",
    content: `Analyze this contract document and extract:

1. Contract title
2. Parties involved (Party A and Party B)
3. Effective date
4. Expiration date
5. Key terms and conditions (list)
6. Payment terms
7. Important clauses

Return as structured JSON.`,
  },
  {
    id: "form",
    name: "Form Data Extraction",
    content: `Extract all filled fields from this form:

1. Identify each form field and its label
2. Extract the corresponding value
3. Handle checkboxes as boolean values
4. Handle multiple choice as the selected option
5. Preserve the structure of grouped fields

Return as a flat JSON object with field labels as keys.`,
  },
  {
    id: "custom",
    name: "Custom (Start from scratch)",
    content: "",
  },
];

export const MessageContentEditor: React.FC<MessageContentEditorProps> = ({ value, onChange }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplate(templateId);
      const template = PROMPT_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        onChange(template.content || null);
      }
    },
    [onChange]
  );

  // Handle text change
  const handleTextChange = useCallback(
    (text: string) => {
      onChange(text.trim() || null);
      setSelectedTemplate(null); // Clear template selection when manually editing
    },
    [onChange]
  );

  // Clear content
  const handleClear = useCallback(() => {
    onChange(null);
    setSelectedTemplate(null);
  }, [onChange]);

  const charCount = value?.length || 0;
  const hasContent = Boolean(value?.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Custom Extraction Prompt
          </h3>
          <p className="text-sm text-muted-foreground">
            Define a custom prompt for document extraction (Layer 3 - Highest Priority).
          </p>
        </div>
      </div>

      {/* Priority warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          When set, this custom prompt will <strong>override</strong> the field and table
          configurations. Use this for complete control over extraction behavior.
        </AlertDescription>
      </Alert>

      {/* Template selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Start from template:</Label>
        <Select value={selectedTemplate || undefined} onValueChange={handleTemplateSelect}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select a template..." />
          </SelectTrigger>
          <SelectContent>
            {PROMPT_TEMPLATES.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  {template.id === "custom" ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  {template.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasContent && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Text editor */}
      <div className="relative">
        <Textarea
          value={value || ""}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter your custom extraction instructions here...

Example:
Extract the invoice number, date, vendor name, and total amount.
For line items, extract: description, quantity, unit price, and total.
Return the data as a JSON object."
          className="min-h-[250px] resize-y"
          rows={12}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {charCount} characters
        </div>
      </div>

      {/* Help section */}
      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="text-muted-foreground">
            <p className="font-medium mb-1">Prompt Tips:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Be specific about what data to extract</li>
              <li>Mention the expected output format (e.g., JSON)</li>
              <li>Describe how to handle tables or line items</li>
              <li>Include examples for complex extractions</li>
              <li>Specify how to handle missing or unclear data</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Layer explanation */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-medium text-sm">Extraction Priority Layers</h4>
        <div className="space-y-2 text-sm">
          <div
            className={cn(
              "flex items-center gap-3 p-2 rounded",
              hasContent ? "bg-primary/10 border border-primary/20" : "opacity-50"
            )}
          >
            <span className="font-mono text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
              L3
            </span>
            <span>Custom Prompt</span>
            {hasContent && <span className="ml-auto text-xs text-primary font-medium">Active</span>}
          </div>
          <div
            className={cn(
              "flex items-center gap-3 p-2 rounded",
              !hasContent ? "bg-muted" : "opacity-50"
            )}
          >
            <span className="font-mono text-xs bg-muted-foreground/20 px-2 py-0.5 rounded">L2</span>
            <span>Field & Table Configuration</span>
            {!hasContent && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
          </div>
          <div className="flex items-center gap-3 p-2 rounded opacity-50">
            <span className="font-mono text-xs bg-muted-foreground/20 px-2 py-0.5 rounded">L1</span>
            <span>System Default Prompt</span>
            <span className="ml-auto text-xs text-muted-foreground">Fallback</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageContentEditor;

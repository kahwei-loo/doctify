/**
 * ExtractedDataView Component - Redesigned
 *
 * Displays extracted document data with clean information hierarchy.
 * Shows business data (extracted fields) to users, hides technical metadata.
 *
 * Design Philosophy:
 * - Primary: Business data (document fields, line items)
 * - Secondary: Cost summary (footer)
 * - Tertiary: Technical details (collapsible)
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Copy,
  Check,
  FileJson,
  ChevronDown,
  ChevronUp,
  Calendar,
  Hash,
  Zap,
  Cpu,
  Clock,
  AlertTriangle,
  FileText,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineItemsTable, type LineItem } from "./LineItemsTable";
import {
  formatConfidence,
  formatTokens,
  estimateCost,
  formatDate,
  formatDuration,
  formatCurrency,
} from "@/shared/utils/formatters";
import type { ExtractionResult, DocumentDetail } from "../types";

interface ExtractedDataViewProps {
  /** Extraction result data */
  result: ExtractionResult | null | undefined;
  /** Document metadata */
  document: DocumentDetail;
  /** Custom class name */
  className?: string;
  /** Show internal footer with cost summary and technical details */
  showFooter?: boolean;
}

/**
 * Technical fields that should NOT be displayed in Structured view
 * These are system internal metadata, not business data
 */
const TECHNICAL_FIELDS = [
  "model",
  "provider",
  "process_time",
  "processTime",
  "token_usage",
  "tokenUsage",
  "field_confidences",
  "fieldConfidences",
  "l25_metadata",
  "l25Metadata",
  "retry_count",
  "retryCount",
  "confidence",
  "raw_text",
  "rawText",
];

/**
 * Format field label for display
 */
const formatFieldLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, " $1") // Add space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()) // Capitalize first letter of each word
    .trim();
};

/**
 * Format field value for display
 * Accepts optional currency code for proper currency formatting
 */
const formatFieldValue = (value: any, fieldKey: string, currency?: string): string => {
  if (value === null || value === undefined) return "-";

  const lowerKey = fieldKey.toLowerCase();

  // Format dates
  if (lowerKey.includes("date") && typeof value === "string") {
    return formatDate(value);
  }

  // Format amounts/prices with correct currency
  if (
    (lowerKey.includes("total") || lowerKey.includes("amount") || lowerKey.includes("price")) &&
    typeof value === "number"
  ) {
    return formatCurrency(value, { currency: currency || "MYR" });
  }

  // Format booleans
  if (typeof value === "boolean") return value ? "Yes" : "No";

  return String(value);
};

/**
 * Business Field Display - Table Cell (Compact Design)
 */
const BusinessField: React.FC<{
  label: string;
  value: any;
  fieldKey: string;
  currency?: string;
}> = ({ label, value, fieldKey, currency }) => {
  const [copied, setCopied] = useState(false);
  const displayValue = formatFieldValue(value, fieldKey, currency);

  const copyValue = async () => {
    if (displayValue && displayValue !== "-") {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="group relative border-b border-r last:border-r-0 hover:bg-muted/30 transition-colors">
      <div className="p-2 h-full flex flex-col gap-0.5">
        {/* Label - Compact spacing */}
        <div className="text-xs text-muted-foreground">{label}</div>

        {/* Value - Prominent display */}
        <div className="flex items-center justify-between gap-2">
          <div
            className={cn(
              "text-sm font-medium break-words flex-1",
              displayValue === "-" && "text-muted-foreground"
            )}
          >
            {displayValue}
          </div>

          {/* Copy button - Compact */}
          {displayValue && displayValue !== "-" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
              onClick={copyValue}
              aria-label="Copy value"
            >
              {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * JSON View Component
 */
const JSONView: React.FC<{
  data: any;
}> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="absolute right-2 top-2 z-10"
        onClick={copyJson}
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
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export const ExtractedDataView: React.FC<ExtractedDataViewProps> = ({
  result,
  document,
  className,
  showFooter = false,
}) => {
  const [activeTab, setActiveTab] = useState<"structured" | "json">("structured");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [lineItemsExpanded, setLineItemsExpanded] = useState<boolean>(false);

  // Extract currency from document for proper formatting
  const documentCurrency = useMemo(() => {
    return result?.extracted_data?.currency || "MYR";
  }, [result?.extracted_data]);

  // Extract business fields (exclude technical/system fields)
  const businessFields = useMemo(() => {
    if (!result?.extracted_data) return [];

    return Object.entries(result.extracted_data)
      .filter(([key]) => {
        // Exclude technical fields
        if (TECHNICAL_FIELDS.includes(key)) return false;
        // Exclude line items (will be displayed separately)
        if (key.toLowerCase().includes("lineitems") || key.toLowerCase().includes("line_items"))
          return false;
        return true;
      })
      .map(([key, value]) => ({
        label: formatFieldLabel(key),
        value,
        key,
      }));
  }, [result?.extracted_data]);

  // Extract line items for table display
  const lineItems = useMemo(() => {
    if (!result?.extracted_data) return null;

    const lineItemsKey = Object.keys(result.extracted_data).find(
      (key) => key.toLowerCase().includes("lineitems") || key.toLowerCase().includes("line_items")
    );

    if (!lineItemsKey) return null;

    const items = result.extracted_data[lineItemsKey];
    if (!Array.isArray(items) || items.length === 0) return null;

    return items as LineItem[];
  }, [result?.extracted_data]);

  // Technical data for collapsible section
  const technicalData = useMemo(() => {
    if (!result) return null;

    return {
      model: result.metadata?.model || "N/A",
      provider: result.metadata?.provider || "N/A",
      retryCount: result.metadata?.retry_count || result.metadata?.retryCount || 0,
      processTime: result.metadata?.process_time || result.metadata?.processTime,
      confidence: result.confidence,
      tokens: result.metadata?.token_usage || result.metadata?.tokenUsage,
    };
  }, [result]);

  // Smart default for line items expansion (≤5 items: expanded, >5 items: collapsed)
  useEffect(() => {
    if (lineItems) {
      setLineItemsExpanded(lineItems.length <= 5);
    }
  }, [lineItems]);

  const confidence = result?.confidence || 0;
  const isLowConfidence = confidence < 0.7;

  return (
    <div className={cn("h-full flex flex-col", className)}>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "structured" | "json")}
        className="flex-1 flex flex-col"
      >
        {/* Tab Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Extracted Results</span>
              <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/20">
                Completed
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="structured">Structured</TabsTrigger>
              <TabsTrigger value="json" className="gap-2">
                <FileJson className="h-3.5 w-3.5" />
                JSON
              </TabsTrigger>
            </TabsList>

            <div
              className={cn(
                "flex items-center gap-2 px-2.5 py-1 rounded-md text-sm font-medium font-serif",
                isLowConfidence
                  ? "bg-yellow-500/10 text-yellow-600"
                  : "bg-green-500/10 text-green-600"
              )}
            >
              {formatConfidence(confidence)}
            </div>

            <Button variant="ghost" size="icon" disabled className="opacity-50">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Structured View - Compact spacing */}
        <TabsContent value="structured" className="flex-1 overflow-auto m-0 p-4 space-y-4">
          {/* Low Confidence Warning */}
          {isLowConfidence && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-600">Low Confidence Detection</p>
                <p className="text-sm text-yellow-600/80 mt-1">
                  Manual review recommended. The AI confidence for this extraction is below 70%.
                </p>
              </div>
            </div>
          )}

          {/* Business Data Fields - Table Grid Layout */}
          {businessFields.length > 0 && (
            <div className="rounded-lg border bg-card/50 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {businessFields.map((field) => (
                  <BusinessField
                    key={field.key}
                    label={field.label}
                    value={field.value}
                    fieldKey={field.key}
                    currency={documentCurrency}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Line Items Table - Integrated header with actions */}
          {lineItems && lineItems.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setLineItemsExpanded(!lineItemsExpanded)}
                className="w-full flex items-center justify-between hover:bg-muted/30 rounded-md px-3 py-2 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Line Items</span>
                  <Badge variant="outline" className="text-xs">
                    {lineItems.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {/* Inline action buttons - Compact */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Copy line items"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Copy line items as TSV
                      const headers = ["#", "Description", "Qty", "Unit Price", "Amount"];
                      const rows = lineItems.map((item, i) => [
                        item.itemNo || String(i + 1),
                        item.description,
                        item.quantity?.toString() || "",
                        item.unitPrice?.toString() || "",
                        item.amount.toString(),
                      ]);
                      const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
                        "\n"
                      );
                      navigator.clipboard.writeText(tsv);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Export line items"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Export functionality would go here
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  {lineItemsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {lineItemsExpanded && (
                <div className="rounded-lg border bg-card/50 overflow-hidden">
                  <LineItemsTable items={lineItems} currency={documentCurrency} />
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* JSON View - Shows extracted_data (business data only) */}
        <TabsContent value="json" className="flex-1 overflow-auto m-0 p-6">
          <JSONView data={result?.extracted_data || {}} />
        </TabsContent>
      </Tabs>

      {/* Footer - Cost Summary & Technical Details (Optional) */}
      {showFooter && (
        <div className="border-t bg-card/50 backdrop-blur-sm">
          {/* Cost Summary - Compressed Single Line */}
          <div className="flex items-center justify-between px-6 py-3 text-sm border-b">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {formatDate(document.created_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <Hash className="h-3 w-3" />
                {document.project_id || "Auto Detect"}
              </span>
              {technicalData?.tokens && (
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  {formatTokens(
                    technicalData.tokens.total_tokens || technicalData.tokens.totalTokens || 0
                  )}{" "}
                  (
                  {estimateCost(
                    technicalData.tokens.total_tokens || technicalData.tokens.totalTokens || 0
                  )}
                  )
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              >
                {showTechnicalDetails ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {showTechnicalDetails ? "Hide" : "Show"} Details
              </Button>
            </div>
          </div>

          {/* Technical Details - Collapsible */}
          {showTechnicalDetails && technicalData && (
            <div className="px-6 pb-4 animate-in slide-in-from-top-2">
              <div className="p-4 rounded-lg bg-muted/20 border space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Model Information */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Cpu className="h-3.5 w-3.5" />
                      Model Information
                    </h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">{technicalData.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Provider:</span>
                        <span className="font-medium">{technicalData.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Retry Count:</span>
                        <span className="font-medium">{technicalData.retryCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-medium">
                          {formatConfidence(technicalData.confidence)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Processing Statistics */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Processing Statistics
                    </h4>
                    <div className="space-y-1.5 text-sm">
                      {technicalData.processTime && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Process Time:</span>
                          <span className="font-medium">
                            {formatDuration(technicalData.processTime)}
                          </span>
                        </div>
                      )}
                      {technicalData.tokens && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Prompt Tokens:</span>
                            <span className="font-medium">
                              {formatTokens(
                                technicalData.tokens.prompt_tokens ||
                                  technicalData.tokens.promptTokens ||
                                  0
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Completion Tokens:</span>
                            <span className="font-medium">
                              {formatTokens(
                                technicalData.tokens.completion_tokens ||
                                  technicalData.tokens.completionTokens ||
                                  0
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Tokens:</span>
                            <span className="font-medium">
                              {formatTokens(
                                technicalData.tokens.total_tokens ||
                                  technicalData.tokens.totalTokens ||
                                  0
                              )}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExtractedDataView;

/**
 * ProjectConfigModal Component
 *
 * Modal dialog for configuring project extraction settings.
 * Combines field configuration, table configuration, sample output,
 * custom prompts, and processing settings.
 *
 * Features:
 * - Tabbed interface for different config sections
 * - Field configuration builder
 * - Table configuration builder
 * - Sample output editor
 * - Custom prompt editor (Layer 3)
 * - Processing settings (AI model, OCR, language)
 * - Save/cancel workflow
 * - Loading and error states
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  FileText,
  Zap,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Info,
  TableIcon,
  MessageSquare,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldEditor } from "./FieldEditor";
import { TableConfigBuilder } from "./TableConfigBuilder";
import { SampleOutputEditor } from "./SampleOutputEditor";
import { MessageContentEditor } from "./MessageContentEditor";
import { ProcessingSettings as ProcessingSettingsComponent } from "./ProcessingSettings";
import type { Project } from "@/store/api/projectsApi";
import type {
  ProjectConfig,
  ExtractionConfig,
  ExtractionField,
  FieldDefinition,
  TableDefinition,
  ProcessingSettings,
} from "../types";
import { DEFAULT_PROJECT_CONFIG, toFieldDefinition, toExtractionField } from "../types";

interface ProjectConfigModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Project being configured */
  project: Project | null;
  /** Callback when configuration is saved - accepts new ProjectConfig format */
  onSave: (projectId: string, config: ProjectConfig | ExtractionConfig) => Promise<void>;
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
}

/**
 * Parse project config from project (supports both old and new formats)
 */
const parseProjectConfig = (project: Project | null): ProjectConfig => {
  if (!project?.extraction_config) {
    return { ...DEFAULT_PROJECT_CONFIG };
  }

  const rawConfig = project.extraction_config as Record<string, unknown>;

  // Check if it's the new format (has 'fields' key) or legacy format (has 'extraction_fields')
  const isNewFormat = "fields" in rawConfig;

  if (isNewFormat) {
    return {
      ocr_enabled: (rawConfig.ocr_enabled as boolean) ?? true,
      ai_model: (rawConfig.ai_model as ProjectConfig["ai_model"]) ?? "openai/gpt-4o-mini",
      language: (rawConfig.language as ProjectConfig["language"]) ?? "en",
      output_format: (rawConfig.output_format as ProjectConfig["output_format"]) ?? "json",
      fields: Array.isArray(rawConfig.fields) ? (rawConfig.fields as FieldDefinition[]) : [],
      tables: Array.isArray(rawConfig.tables) ? (rawConfig.tables as TableDefinition[]) : [],
      message_content: (rawConfig.message_content as string) || null,
      sample_output: (rawConfig.sample_output as Record<string, unknown>) || null,
      validation_rules: (rawConfig.validation_rules as Record<string, unknown>) ?? {},
    };
  }

  // Legacy format - convert extraction_fields to fields
  const legacyFields = Array.isArray(rawConfig.extraction_fields)
    ? (rawConfig.extraction_fields as ExtractionField[])
    : [];

  return {
    ocr_enabled: (rawConfig.ocr_enabled as boolean) ?? true,
    ai_model: (rawConfig.ai_model as ProjectConfig["ai_model"]) ?? "openai/gpt-4o-mini",
    language: (rawConfig.language as ProjectConfig["language"]) ?? "en",
    output_format: (rawConfig.output_format as ProjectConfig["output_format"]) ?? "json",
    fields: legacyFields.map(toFieldDefinition),
    tables: [],
    message_content: null,
    sample_output: null,
    validation_rules: (rawConfig.validation_rules as Record<string, unknown>) ?? {},
  };
};

/**
 * Validate project config
 */
const validateConfig = (config: ProjectConfig): string[] => {
  const errors: string[] = [];

  // Validate field names
  const fieldNames = new Set<string>();
  config.fields.forEach((field, index) => {
    if (!field.name || field.name.trim() === "") {
      errors.push(`Field ${index + 1} has no name`);
    } else if (fieldNames.has(field.name.toLowerCase())) {
      errors.push(`Duplicate field name: ${field.name}`);
    } else {
      fieldNames.add(field.name.toLowerCase());
    }

    // Validate field name format
    if (field.name && !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
      errors.push(
        `Field "${field.name}" has invalid name format (must start with letter, only letters, numbers, underscores)`
      );
    }

    // Check for reserved names
    const reservedNames = ["__proto__", "constructor", "prototype", "eval"];
    if (reservedNames.includes(field.name.toLowerCase())) {
      errors.push(`Field "${field.name}" uses a reserved name`);
    }
  });

  // Validate table names
  const tableNames = new Set<string>();
  config.tables.forEach((table, index) => {
    if (!table.name || table.name.trim() === "") {
      errors.push(`Table ${index + 1} has no name`);
    } else if (tableNames.has(table.name.toLowerCase())) {
      errors.push(`Duplicate table name: ${table.name}`);
    } else if (fieldNames.has(table.name.toLowerCase())) {
      errors.push(`Table name "${table.name}" conflicts with a field name`);
    } else {
      tableNames.add(table.name.toLowerCase());
    }

    // Validate column names within table
    const columnNames = new Set<string>();
    table.columns.forEach((column, colIndex) => {
      if (!column.name || column.name.trim() === "") {
        errors.push(`Table "${table.name}" column ${colIndex + 1} has no name`);
      } else if (columnNames.has(column.name.toLowerCase())) {
        errors.push(`Table "${table.name}" has duplicate column: ${column.name}`);
      } else {
        columnNames.add(column.name.toLowerCase());
      }
    });
  });

  return errors;
};

/**
 * Info tip component
 */
const InfoTip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
    <span>{children}</span>
  </div>
);

export const ProjectConfigModal: React.FC<ProjectConfigModalProps> = ({
  open,
  onOpenChange,
  project,
  onSave,
  isLoading = false,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<
    "fields" | "tables" | "output" | "prompt" | "processing"
  >("fields");
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_PROJECT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Reset config when project changes
  useEffect(() => {
    if (open && project) {
      setConfig(parseProjectConfig(project));
      setValidationErrors([]);
      setActiveTab("fields");
    }
  }, [open, project]);

  // Handle field changes (bridging legacy ExtractionField[] to FieldDefinition[])
  const handleFieldsChange = useCallback((fields: ExtractionField[]) => {
    setConfig((prev) => ({
      ...prev,
      fields: fields.map(toFieldDefinition),
    }));
    setValidationErrors([]);
  }, []);

  // Handle table changes
  const handleTablesChange = useCallback((tables: TableDefinition[]) => {
    setConfig((prev) => ({ ...prev, tables }));
    setValidationErrors([]);
  }, []);

  // Handle sample output changes
  const handleSampleOutputChange = useCallback((sampleOutput: Record<string, unknown> | null) => {
    setConfig((prev) => ({ ...prev, sample_output: sampleOutput }));
  }, []);

  // Handle message content changes
  const handleMessageContentChange = useCallback((messageContent: string | null) => {
    setConfig((prev) => ({ ...prev, message_content: messageContent }));
  }, []);

  // Handle processing settings changes
  const handleProcessingChange = useCallback((settings: ProcessingSettings) => {
    setConfig((prev) => ({
      ...prev,
      ocr_enabled: settings.ocr_enabled,
      ai_model: settings.ai_model,
      language: settings.language,
      output_format: settings.output_format,
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!project) return;

    // Validate config
    const errors = validateConfig(config);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(project.project_id, config);
      onOpenChange(false);
    } catch (err) {
      // Error is handled by parent
    } finally {
      setIsSaving(false);
    }
  }, [project, config, onSave, onOpenChange]);

  // Convert FieldDefinition[] to ExtractionField[] for FieldEditor
  const extractionFields = useMemo<ExtractionField[]>(
    () => config.fields.map((f, i) => toExtractionField(f, `field_${i}`)),
    [config.fields]
  );

  // Memoize processing settings
  const processingSettings = useMemo<ProcessingSettings>(
    () => ({
      ocr_enabled: config.ocr_enabled,
      ai_model: config.ai_model,
      language: config.language,
      output_format: config.output_format,
    }),
    [config]
  );

  // Check if config has changes
  const hasChanges = useMemo(() => {
    if (!project) return false;
    const originalConfig = parseProjectConfig(project);
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  }, [project, config]);

  // Calculate tab badges
  const fieldCount = config.fields.length;
  const tableCount = config.tables.length;
  const hasSampleOutput = Boolean(config.sample_output);
  const hasMessageContent = Boolean(config.message_content);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Configuration
          </DialogTitle>
          <DialogDescription>
            Configure extraction schema and processing settings for{" "}
            <span className="font-medium text-foreground">{project?.name}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Error display */}
        {(error || validationErrors.length > 0) && (
          <Alert variant="destructive" className="mx-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || validationErrors.join(", ")}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-6 grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="fields" className="gap-1.5 py-2 px-2 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fields</span>
              {fieldCount > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {fieldCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tables" className="gap-1.5 py-2 px-2 text-xs">
              <TableIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tables</span>
              {tableCount > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {tableCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="output" className="gap-1.5 py-2 px-2 text-xs">
              <FileJson className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sample</span>
              {hasSampleOutput && <span className="h-2 w-2 bg-primary rounded-full" />}
            </TabsTrigger>
            <TabsTrigger value="prompt" className="gap-1.5 py-2 px-2 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Prompt</span>
              {hasMessageContent && (
                <span className="text-[10px] bg-orange-500/20 text-orange-600 px-1.5 py-0.5 rounded-full">
                  L3
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="processing" className="gap-1.5 py-2 px-2 text-xs">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Fields Tab */}
          <TabsContent value="fields" className="flex-1 overflow-auto px-6 py-4 m-0">
            <div className="space-y-6">
              <InfoTip>
                Define the fields you want to extract from documents. The AI will use these field
                definitions to structure the extracted data.
              </InfoTip>

              <FieldEditor fields={extractionFields} onChange={handleFieldsChange} />

              {/* Quick Templates */}
              <Accordion type="single" collapsible className="border rounded-lg">
                <AccordionItem value="templates" className="border-0 px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Quick Templates</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TemplateCard
                        name="Invoice"
                        description="Standard invoice fields"
                        fieldCount={8}
                        onClick={() => {
                          handleFieldsChange([
                            {
                              id: "1",
                              name: "vendor_name",
                              type: "text",
                              required: true,
                              description: "Vendor name",
                            },
                            {
                              id: "2",
                              name: "invoice_number",
                              type: "text",
                              required: true,
                              description: "Invoice reference",
                            },
                            {
                              id: "3",
                              name: "invoice_date",
                              type: "date",
                              required: true,
                              description: "Invoice date",
                            },
                            {
                              id: "4",
                              name: "due_date",
                              type: "date",
                              required: false,
                              description: "Due date",
                            },
                            {
                              id: "5",
                              name: "subtotal",
                              type: "number",
                              required: false,
                              description: "Subtotal",
                            },
                            {
                              id: "6",
                              name: "tax_amount",
                              type: "number",
                              required: false,
                              description: "Tax amount",
                            },
                            {
                              id: "7",
                              name: "total_amount",
                              type: "number",
                              required: true,
                              description: "Total",
                            },
                          ]);
                        }}
                      />
                      <TemplateCard
                        name="Receipt"
                        description="Receipt fields"
                        fieldCount={5}
                        onClick={() => {
                          handleFieldsChange([
                            {
                              id: "1",
                              name: "store_name",
                              type: "text",
                              required: true,
                              description: "Store name",
                            },
                            {
                              id: "2",
                              name: "receipt_date",
                              type: "date",
                              required: true,
                              description: "Date",
                            },
                            {
                              id: "3",
                              name: "subtotal",
                              type: "number",
                              required: false,
                              description: "Subtotal",
                            },
                            {
                              id: "4",
                              name: "tax",
                              type: "number",
                              required: false,
                              description: "Tax",
                            },
                            {
                              id: "5",
                              name: "total",
                              type: "number",
                              required: true,
                              description: "Total",
                            },
                          ]);
                        }}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="flex-1 overflow-auto px-6 py-4 m-0">
            <div className="space-y-6">
              <InfoTip>
                Define tables for extracting line items and structured data. Each table has columns
                that define the data structure.
              </InfoTip>

              <TableConfigBuilder tables={config.tables} onChange={handleTablesChange} />
            </div>
          </TabsContent>

          {/* Sample Output Tab */}
          <TabsContent value="output" className="flex-1 overflow-auto px-6 py-4 m-0">
            <div className="space-y-6">
              <SampleOutputEditor
                fields={config.fields}
                tables={config.tables}
                value={config.sample_output ?? null}
                onChange={handleSampleOutputChange}
              />
            </div>
          </TabsContent>

          {/* Custom Prompt Tab */}
          <TabsContent value="prompt" className="flex-1 overflow-auto px-6 py-4 m-0">
            <div className="space-y-6">
              <MessageContentEditor
                value={config.message_content ?? null}
                onChange={handleMessageContentChange}
              />
            </div>
          </TabsContent>

          {/* Processing Tab */}
          <TabsContent value="processing" className="flex-1 overflow-auto px-6 py-4 m-0">
            <div className="space-y-6">
              <InfoTip>
                Configure how documents are processed. These settings affect OCR quality, AI model
                selection, and output format.
              </InfoTip>

              <ProcessingSettingsComponent
                ocrEnabled={processingSettings.ocr_enabled}
                aiModel={processingSettings.ai_model}
                language={processingSettings.language}
                outputFormat={processingSettings.output_format}
                onOcrEnabledChange={(enabled) =>
                  handleProcessingChange({ ...processingSettings, ocr_enabled: enabled })
                }
                onAiModelChange={(model) =>
                  handleProcessingChange({ ...processingSettings, ai_model: model })
                }
                onLanguageChange={(lang) =>
                  handleProcessingChange({ ...processingSettings, language: lang })
                }
                onOutputFormatChange={(format) =>
                  handleProcessingChange({ ...processingSettings, output_format: format })
                }
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {hasChanges ? "You have unsaved changes" : "No changes"}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isLoading || !hasChanges}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Template card component
 */
interface TemplateCardProps {
  name: string;
  description: string;
  fieldCount: number;
  onClick: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ name, description, fieldCount, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left p-4 rounded-lg border-2 border-dashed",
        "hover:border-primary/50 hover:bg-primary/5",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      )}
    >
      <h4 className="font-medium">{name}</h4>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <p className="text-xs text-muted-foreground/70 mt-2">{fieldCount} predefined fields</p>
    </button>
  );
};

export default ProjectConfigModal;

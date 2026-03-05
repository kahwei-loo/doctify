/**
 * ProjectSettingsTab Component
 *
 * Settings tab content combining FieldEditor and ProcessingSettings.
 * Handles saving extraction configuration to the API.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { useUpdateExtractionConfigMutation } from "@/store/api/projectsApi";
import { FieldEditor } from "./FieldEditor";
import { ProcessingSettings } from "./ProcessingSettings";
import type {
  ExtractionField,
  ExtractionConfig,
  AIModel,
  OCRLanguage,
  OutputFormat,
} from "../types";
import { DEFAULT_EXTRACTION_CONFIG } from "../types";

interface ProjectSettingsTabProps {
  projectId: string;
  initialConfig?: ExtractionConfig | null;
}

export const ProjectSettingsTab: React.FC<ProjectSettingsTabProps> = ({
  projectId,
  initialConfig,
}) => {
  // Initialize state from props or defaults
  const config = initialConfig || DEFAULT_EXTRACTION_CONFIG;

  const [fields, setFields] = useState<ExtractionField[]>(config.extraction_fields || []);
  const [ocrEnabled, setOcrEnabled] = useState(config.ocr_enabled);
  const [aiModel, setAiModel] = useState<AIModel>(config.ai_model);
  const [language, setLanguage] = useState<OCRLanguage>(config.language);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(config.output_format);

  // Track if there are unsaved changes
  const [hasChanges, setHasChanges] = useState(false);

  // RTK Query mutation hook
  const [updateConfig, { isLoading: isSaving, isError, error }] =
    useUpdateExtractionConfigMutation();

  // Reset state when initialConfig changes (e.g., project changes)
  useEffect(() => {
    const newConfig = initialConfig || DEFAULT_EXTRACTION_CONFIG;
    setFields(newConfig.extraction_fields || []);
    setOcrEnabled(newConfig.ocr_enabled);
    setAiModel(newConfig.ai_model);
    setLanguage(newConfig.language);
    setOutputFormat(newConfig.output_format);
    setHasChanges(false);
  }, [initialConfig]);

  // Build current config object
  const currentConfig = useMemo<ExtractionConfig>(
    () => ({
      extraction_fields: fields,
      ocr_enabled: ocrEnabled,
      ai_model: aiModel,
      language: language,
      output_format: outputFormat,
      validation_rules: config.validation_rules || {},
    }),
    [fields, ocrEnabled, aiModel, language, outputFormat, config.validation_rules]
  );

  // Check if config has changed from initial
  useEffect(() => {
    const initialFields = initialConfig?.extraction_fields || [];
    const initialOcr = initialConfig?.ocr_enabled ?? DEFAULT_EXTRACTION_CONFIG.ocr_enabled;
    const initialModel = initialConfig?.ai_model ?? DEFAULT_EXTRACTION_CONFIG.ai_model;
    const initialLang = initialConfig?.language ?? DEFAULT_EXTRACTION_CONFIG.language;
    const initialFormat = initialConfig?.output_format ?? DEFAULT_EXTRACTION_CONFIG.output_format;

    const fieldsChanged = JSON.stringify(fields) !== JSON.stringify(initialFields);
    const settingsChanged =
      ocrEnabled !== initialOcr ||
      aiModel !== initialModel ||
      language !== initialLang ||
      outputFormat !== initialFormat;

    setHasChanges(fieldsChanged || settingsChanged);
  }, [fields, ocrEnabled, aiModel, language, outputFormat, initialConfig]);

  // Handle field changes
  const handleFieldsChange = useCallback((newFields: ExtractionField[]) => {
    setFields(newFields);
  }, []);

  // Handle save
  const handleSave = async () => {
    try {
      await updateConfig({
        projectId,
        extractionConfig: currentConfig as unknown as Record<string, unknown>,
      }).unwrap();
      setHasChanges(false);
    } catch (err) {
      console.error("Failed to save extraction config:", err);
    }
  };

  // Handle reset
  const handleReset = () => {
    const newConfig = initialConfig || DEFAULT_EXTRACTION_CONFIG;
    setFields(newConfig.extraction_fields || []);
    setOcrEnabled(newConfig.ocr_enabled);
    setAiModel(newConfig.ai_model);
    setLanguage(newConfig.language);
    setOutputFormat(newConfig.output_format);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>
            Failed to save settings.{" "}
            {error && typeof error === "object" && "data" in error
              ? String(
                  (error as { data?: { message?: string } }).data?.message || "Please try again."
                )
              : "Please try again."}
          </span>
        </div>
      )}

      {/* Field Editor Section */}
      <Card>
        <CardContent className="pt-6">
          <FieldEditor fields={fields} onChange={handleFieldsChange} />
        </CardContent>
      </Card>

      {/* Processing Settings Section */}
      <Card>
        <CardContent className="pt-6">
          <ProcessingSettings
            ocrEnabled={ocrEnabled}
            aiModel={aiModel}
            language={language}
            outputFormat={outputFormat}
            onOcrEnabledChange={setOcrEnabled}
            onAiModelChange={setAiModel}
            onLanguageChange={setLanguage}
            onOutputFormatChange={setOutputFormat}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {hasChanges && (
            <span className="text-sm text-muted-foreground">You have unsaved changes</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsTab;

/**
 * ProcessingSettings Component
 *
 * Configuration panel for AI model, OCR, language, and output format settings.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AIModel, OCRLanguage, OutputFormat } from '../types';
import { AI_MODEL_LABELS, LANGUAGE_LABELS } from '../types';

interface ProcessingSettingsProps {
  ocrEnabled: boolean;
  aiModel: AIModel;
  language: OCRLanguage;
  outputFormat: OutputFormat;
  onOcrEnabledChange: (enabled: boolean) => void;
  onAiModelChange: (model: AIModel) => void;
  onLanguageChange: (language: OCRLanguage) => void;
  onOutputFormatChange: (format: OutputFormat) => void;
}

const AI_MODELS: AIModel[] = [
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-opus',
  'claude-3-sonnet',
];

const OCR_LANGUAGES: OCRLanguage[] = [
  'auto',
  'en',
  'es',
  'fr',
  'de',
  'zh',
  'ja',
  'ko',
  'ar',
];

const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'json', label: 'JSON' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
];

export const ProcessingSettings: React.FC<ProcessingSettingsProps> = ({
  ocrEnabled,
  aiModel,
  language,
  outputFormat,
  onOcrEnabledChange,
  onAiModelChange,
  onLanguageChange,
  onOutputFormatChange,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Processing Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure how documents are processed in this project.
        </p>
      </div>

      <div className="space-y-4">
        {/* OCR Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="ocr-enabled" className="text-base">
              OCR Processing
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable optical character recognition for scanned documents and images.
            </p>
          </div>
          <Switch
            id="ocr-enabled"
            checked={ocrEnabled}
            onCheckedChange={onOcrEnabledChange}
          />
        </div>

        {/* AI Model Selection */}
        <div className="grid gap-2">
          <Label htmlFor="ai-model">AI Model</Label>
          <Select value={aiModel} onValueChange={(v) => onAiModelChange(v as AIModel)}>
            <SelectTrigger id="ai-model">
              <SelectValue placeholder="Select AI model" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model} value={model}>
                  {AI_MODEL_LABELS[model]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the AI model for document analysis. GPT-4 offers the best accuracy.
          </p>
        </div>

        {/* Language Selection */}
        <div className="grid gap-2">
          <Label htmlFor="language">Document Language</Label>
          <Select value={language} onValueChange={(v) => onLanguageChange(v as OCRLanguage)}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {OCR_LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Primary language of documents. Use Auto-detect if documents are in multiple languages.
          </p>
        </div>

        {/* Output Format Selection */}
        <div className="grid gap-2">
          <Label htmlFor="output-format">Output Format</Label>
          <Select
            value={outputFormat}
            onValueChange={(v) => onOutputFormatChange(v as OutputFormat)}
          >
            <SelectTrigger id="output-format">
              <SelectValue placeholder="Select output format" />
            </SelectTrigger>
            <SelectContent>
              {OUTPUT_FORMATS.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Format for extracted data export. JSON is recommended for API integrations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingSettings;

import React, { useState, useEffect } from 'react';
import { Bot, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetAIModelSettingsQuery,
  useGetModelCatalogQuery,
  useUpdateAIModelSettingMutation,
} from '@/store/api/aiModelSettingsApi';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PURPOSE_LABELS: Record<string, { label: string; description: string }> = {
  chat: { label: 'Chat Model', description: 'Primary model for RAG answers and general chat' },
  chat_fast: { label: 'Fast Chat Model', description: 'Lightweight model for classifiers, evaluation, and judges' },
  embedding: { label: 'Embedding Model', description: 'Generates vector embeddings for document search' },
  vision: { label: 'Vision Model', description: 'Primary model for OCR and document image processing' },
  classifier: { label: 'Classifier Model', description: 'Intent classification and routing decisions' },
  reranker: { label: 'Reranker Model', description: 'Re-ranks search results for relevance' },
};

export const AIModelsTab: React.FC = () => {
  const { data: settingsData, isLoading, isError } = useGetAIModelSettingsQuery();
  const { data: catalogData } = useGetModelCatalogQuery();
  const [updateSetting, { isLoading: isSaving }] = useUpdateAIModelSettingMutation();

  // Local draft state: purpose → model_name
  const [draft, setDraft] = useState<Record<string, string>>({});
  // Track which purposes have been changed
  const [changed, setChanged] = useState<Set<string>>(new Set());

  const settings = settingsData?.data?.settings || [];
  const envDefaults = settingsData?.data?.env_defaults || {};
  const catalog = catalogData?.data || [];

  // Initialize draft from server settings
  useEffect(() => {
    if (settings.length > 0) {
      const initial: Record<string, string> = {};
      for (const s of settings) {
        initial[s.purpose] = s.model_name;
      }
      setDraft(initial);
      setChanged(new Set());
    }
  }, [settings]);

  const handleChange = (purpose: string, modelName: string) => {
    setDraft((prev) => ({ ...prev, [purpose]: modelName }));

    // Check if it differs from server value
    const serverValue = settings.find((s) => s.purpose === purpose)?.model_name;
    setChanged((prev) => {
      const next = new Set(prev);
      if (modelName !== serverValue) {
        next.add(purpose);
      } else {
        next.delete(purpose);
      }
      return next;
    });
  };

  const handleSave = async () => {
    const toSave = Array.from(changed);
    if (toSave.length === 0) return;

    try {
      for (const purpose of toSave) {
        await updateSetting({
          purpose,
          body: { model_name: draft[purpose] },
        }).unwrap();
      }
      toast.success(`Updated ${toSave.length} model${toSave.length > 1 ? 's' : ''}`);
      setChanged(new Set());
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to update model settings');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Failed to load AI model settings. Please try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle>AI Models</CardTitle>
        </div>
        <CardDescription>
          Configure which AI models are used for each purpose. Changes take effect immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(PURPOSE_LABELS).map(([purpose, { label, description }]) => {
          const currentValue = draft[purpose] || '';
          const envDefault = envDefaults[purpose] || '';
          // Filter catalog entries to those that support this purpose
          const compatibleModels = catalog.filter((m) => m.purposes.includes(purpose));

          return (
            <div key={purpose} className="space-y-2">
              <Label>{label}</Label>
              <Select
                value={currentValue}
                onValueChange={(val) => handleChange(purpose, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {compatibleModels.map((model) => (
                    <SelectItem key={model.model_id} value={model.model_id}>
                      {model.display_name} ({model.provider})
                    </SelectItem>
                  ))}
                  {/* If current value is not in catalog, show it as custom */}
                  {currentValue && !compatibleModels.some((m) => m.model_id === currentValue) && (
                    <SelectItem value={currentValue}>
                      {currentValue} (custom)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {description}
                {envDefault && (
                  <span className="ml-1">
                    &middot; Default: <code className="text-xs">{envDefault}</code>
                  </span>
                )}
              </p>
            </div>
          );
        })}

        <div className="pt-2">
          <Button onClick={handleSave} disabled={isSaving || changed.size === 0}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
            {changed.size > 0 && (
              <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
                {changed.size}
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

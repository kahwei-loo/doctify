import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetAIModelSettingsQuery,
  useGetModelCatalogQuery,
  useUpdateAIModelSettingMutation,
} from '@/store/api/aiModelSettingsApi';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [changed, setChanged] = useState<Set<string>>(new Set());

  const settings = settingsData?.data?.settings || [];
  const envDefaults = settingsData?.data?.env_defaults || {};
  const catalog = catalogData?.data || [];

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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Failed to load AI model settings. Please try again.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">AI Models</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure which AI models are used for each purpose. Changes take effect immediately.
        </p>
      </div>
      <div className="divide-y divide-border">
        {Object.entries(PURPOSE_LABELS).map(([purpose, { label, description }]) => {
          const currentValue = draft[purpose] || '';
          const envDefault = envDefaults[purpose] || '';
          const compatibleModels = catalog.filter((m) => m.purposes.includes(purpose));

          return (
            <div key={purpose} className="py-5 space-y-2">
              <Label className="font-medium">{label}</Label>
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
      </div>
      <div className="border-t border-border mt-6 pt-6 flex justify-end items-center gap-3">
        {changed.size > 0 && (
          <Badge variant="secondary">{changed.size} changed</Badge>
        )}
        <Button onClick={handleSave} disabled={isSaving || changed.size === 0}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
};

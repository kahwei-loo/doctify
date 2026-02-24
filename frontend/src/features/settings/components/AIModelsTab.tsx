import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetAIModelSettingsQuery,
  useGetModelCatalogQuery,
  useUpdateAIModelSettingMutation,
  useDeleteCatalogEntryMutation,
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
import { AddModelDialog } from './AddModelDialog';
import { EditModelDialog } from './EditModelDialog';
import { DeleteModelDialog } from './DeleteModelDialog';
import type { ModelCatalogEntry } from '../types';

const PURPOSE_LABELS: Record<string, { label: string; description: string }> = {
  chat: { label: 'Chat Model', description: 'Primary model for RAG answers and general chat' },
  chat_fast: { label: 'Fast Chat Model', description: 'Lightweight model for classifiers, evaluation, and judges' },
  embedding: { label: 'Embedding Model', description: 'Generates vector embeddings for document search' },
  vision: { label: 'Vision Model', description: 'Primary model for OCR and document image processing' },
  classifier: { label: 'Classifier Model', description: 'Intent classification and routing decisions' },
  reranker: { label: 'Reranker Model', description: 'Re-ranks search results for relevance' },
};

/** Map raw purpose key to friendly label for badges. */
const PURPOSE_SHORT_LABELS: Record<string, string> = {
  chat: 'Chat',
  chat_fast: 'Fast Chat',
  embedding: 'Embedding',
  vision: 'Vision',
  classifier: 'Classifier',
  reranker: 'Reranker',
};

export const AIModelsTab: React.FC = () => {
  const { data: settingsData, isLoading, isError } = useGetAIModelSettingsQuery();
  const { data: catalogData, isLoading: isCatalogLoading } = useGetModelCatalogQuery();
  const [updateSetting, { isLoading: isSaving }] = useUpdateAIModelSettingMutation();
  const [deleteEntry, { isLoading: isDeleting }] = useDeleteCatalogEntryMutation();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ModelCatalogEntry | null>(null);

  const settings = settingsData?.data?.settings || [];
  const envDefaults = settingsData?.data?.env_defaults || {};
  const catalog = catalogData?.data || [];

  /** Distinct provider names from catalog for the combobox. */
  const existingProviders = useMemo(
    () => Array.from(new Set(catalog.map((m) => m.provider))).sort(),
    [catalog]
  );

  useEffect(() => {
    if (settings.length > 0) {
      const initial: Record<string, string> = {};
      for (const s of settings) {
        initial[s.purpose] = s.model_name;
      }
      setDraft((prev) => {
        // Only reset if the server values actually changed
        const same = Object.keys(initial).every((k) => prev[k] === initial[k]);
        if (same && Object.keys(prev).length === Object.keys(initial).length) return prev;
        return initial;
      });
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
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { detail?: string } }).data?.detail
          : undefined;
      toast.error(msg || 'Failed to update model settings');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteEntry(deleteTarget.id).unwrap();
      toast.success(`Removed "${deleteTarget.display_name}" from catalog.`);
      setDeleteTarget(null);
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { detail?: string } }).data?.detail
          : undefined;
      toast.error(msg || 'Failed to delete model.');
    }
  };

  if (isLoading || isCatalogLoading) {
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
      {/* Purpose Assignments */}
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
                  {compatibleModels.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No compatible models. Add one in the catalog below.
                    </div>
                  )}
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

      {/* Model Catalog Management */}
      <div className="border-t border-border mt-8 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Model Catalog</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage the available AI models. Models added here appear in the dropdowns above.
            </p>
          </div>
          <AddModelDialog existingProviders={existingProviders} />
        </div>

        {catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No models in the catalog. Click "Add Model" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {catalog.map((entry) => (
              <div
                key={entry.id || entry.model_id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {entry.display_name}
                    </span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {entry.provider}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {entry.model_id}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entry.purposes.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {PURPOSE_SHORT_LABELS[p] || p}
                      </Badge>
                    ))}
                  </div>
                </div>
                {entry.id && (
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <EditModelDialog
                      entry={entry}
                      existingProviders={existingProviders}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteModelDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        modelName={deleteTarget?.display_name || ''}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

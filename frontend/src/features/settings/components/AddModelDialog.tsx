import React, { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAddCatalogEntryMutation } from '@/store/api/aiModelSettingsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProviderSelect } from './ProviderSelect';

const ALL_PURPOSES = [
  { value: 'chat', label: 'Chat' },
  { value: 'chat_fast', label: 'Fast Chat' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'vision', label: 'Vision' },
  { value: 'classifier', label: 'Classifier' },
  { value: 'reranker', label: 'Reranker' },
];

interface AddModelDialogProps {
  existingProviders: string[];
}

export const AddModelDialog: React.FC<AddModelDialogProps> = ({
  existingProviders,
}) => {
  const [open, setOpen] = useState(false);
  const [modelId, setModelId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [provider, setProvider] = useState('');
  const [purposes, setPurposes] = useState<string[]>([]);
  const [addEntry, { isLoading }] = useAddCatalogEntryMutation();

  const resetForm = () => {
    setModelId('');
    setDisplayName('');
    setProvider('');
    setPurposes([]);
  };

  const togglePurpose = (value: string) => {
    setPurposes((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelId || !displayName || !provider || purposes.length === 0) {
      toast.error('All fields are required and at least one purpose must be selected.');
      return;
    }
    try {
      await addEntry({
        model_id: modelId,
        display_name: displayName,
        provider,
        purposes,
      }).unwrap();
      toast.success(`Added "${displayName}" to the catalog.`);
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { detail?: string } }).data?.detail
          : undefined;
      toast.error(msg || 'Failed to add model.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Model
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Model to Catalog</DialogTitle>
            <DialogDescription>
              Add a new AI model that can be assigned to purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="model-id">Model ID</Label>
              <Input
                id="model-id"
                placeholder="e.g. openrouter/openai/gpt-4o"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                LiteLLM format: <code>provider/model-name</code>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                placeholder="e.g. GPT-4o"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <ProviderSelect
                value={provider}
                onChange={setProvider}
                existingProviders={existingProviders}
              />
            </div>
            <div className="space-y-2">
              <Label>Purposes</Label>
              <div className="grid grid-cols-3 gap-3">
                {ALL_PURPOSES.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={purposes.includes(value)}
                      onCheckedChange={() => togglePurpose(value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Model
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

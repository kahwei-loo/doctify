import React, { useState, useEffect } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpdateCatalogEntryMutation } from '@/store/api/aiModelSettingsApi';
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
import type { ModelCatalogEntry } from '../types';

const ALL_PURPOSES = [
  { value: 'chat', label: 'Chat' },
  { value: 'chat_fast', label: 'Fast Chat' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'vision', label: 'Vision' },
  { value: 'classifier', label: 'Classifier' },
  { value: 'reranker', label: 'Reranker' },
];

interface EditModelDialogProps {
  entry: ModelCatalogEntry;
  existingProviders: string[];
}

export const EditModelDialog: React.FC<EditModelDialogProps> = ({
  entry,
  existingProviders,
}) => {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(entry.display_name);
  const [provider, setProvider] = useState(entry.provider);
  const [purposes, setPurposes] = useState<string[]>(entry.purposes);
  const [updateEntry, { isLoading }] = useUpdateCatalogEntryMutation();

  useEffect(() => {
    if (open) {
      setDisplayName(entry.display_name);
      setProvider(entry.provider);
      setPurposes([...entry.purposes]);
    }
  }, [open, entry]);

  const togglePurpose = (value: string) => {
    setPurposes((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !provider || purposes.length === 0) {
      toast.error('All fields are required and at least one purpose must be selected.');
      return;
    }
    if (!entry.id) return;
    try {
      await updateEntry({
        entryId: entry.id,
        body: { display_name: displayName, provider, purposes },
      }).unwrap();
      toast.success(`Updated "${displayName}".`);
      setOpen(false);
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'data' in error
          ? (error as { data?: { detail?: string } }).data?.detail
          : undefined;
      toast.error(msg || 'Failed to update model.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Model</DialogTitle>
            <DialogDescription>
              Update details for <span className="font-medium">{entry.model_id}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

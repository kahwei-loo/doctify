import React, { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useListApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
} from '@/store/api/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { RevokeApiKeyDialog } from './RevokeApiKeyDialog';

interface ApiKeysTabProps {
  isDemoMode: boolean;
}

export const ApiKeysTab: React.FC<ApiKeysTabProps> = ({ isDemoMode }) => {
  const [newKeyName, setNewKeyName] = useState('');
  const { data: apiKeysData, isLoading: isLoadingApiKeys } = useListApiKeysQuery({});
  const [createApiKey, { isLoading: isCreatingKey }] = useCreateApiKeyMutation();
  const [revokeApiKey, { isLoading: isRevokingKey }] = useRevokeApiKeyMutation();
  const [revokeDialogKey, setRevokeDialogKey] = useState<{ id: string; name: string } | null>(null);

  const apiKeys = apiKeysData?.data?.api_keys || [];

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('API key name is required');
      return;
    }
    try {
      const result = await createApiKey({ name: newKeyName }).unwrap();
      toast.success("API key created. Copy it now - it won't be shown again!");
      navigator.clipboard.writeText(result.api_key);
      setNewKeyName('');
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to create API key');
    }
  };

  const handleConfirmRevokeApiKey = async () => {
    if (!revokeDialogKey) return;
    try {
      await revokeApiKey(revokeDialogKey.id).unwrap();
      toast.success('API key revoked');
      setRevokeDialogKey(null);
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to revoke API key');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your API keys for programmatic access
          </p>
        </div>
        <div className="space-y-6">
          <div className="flex gap-3">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="API key name"
              className={cn('flex-1', isDemoMode && 'bg-muted')}
              disabled={isDemoMode}
            />
            <Button onClick={handleCreateApiKey} disabled={isCreatingKey || isDemoMode}>
              {isCreatingKey ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Key
            </Button>
          </div>

          {isLoadingApiKeys ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No API keys created yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {apiKeys.map((key) => (
                <div
                  key={key.api_key_id}
                  className={cn(
                    'flex items-center justify-between py-3',
                    key.is_revoked && 'opacity-50'
                  )}
                >
                  <div>
                    <p className="font-medium">{key.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Created {formatDate(key.created_at)}
                      {key.is_revoked && ' \u2022 Revoked'}
                    </p>
                  </div>
                  {!key.is_revoked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setRevokeDialogKey({ id: key.api_key_id, name: key.name })}
                      disabled={isDemoMode}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <RevokeApiKeyDialog
        open={!!revokeDialogKey}
        onOpenChange={(open) => !open && setRevokeDialogKey(null)}
        keyName={revokeDialogKey?.name || ''}
        onConfirm={handleConfirmRevokeApiKey}
        isRevoking={isRevokingKey}
      />
    </>
  );
};

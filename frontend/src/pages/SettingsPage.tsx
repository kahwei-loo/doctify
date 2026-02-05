import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Key,
  Bell,
  Shield,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/selectors/authSelectors';
import { useDemoMode } from '@/features/demo/hooks/useDemoMode';
import {
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useListApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
} from '@/store/api/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RevokeApiKeyDialog } from '@/features/settings';

const SettingsPage: React.FC = () => {
  const user = useAppSelector(selectUser);
  const { isDemoMode } = useDemoMode();

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  // API Keys state
  const [newKeyName, setNewKeyName] = useState('');
  const { data: apiKeysData, isLoading: isLoadingApiKeys } = useListApiKeysQuery({});
  const [createApiKey, { isLoading: isCreatingKey }] = useCreateApiKeyMutation();
  const [revokeApiKey, { isLoading: isRevokingKey }] = useRevokeApiKeyMutation();
  const [revokeDialogKey, setRevokeDialogKey] = useState<{ id: string; name: string } | null>(null);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [documentProcessed, setDocumentProcessed] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const apiKeys = apiKeysData?.data?.api_keys || [];

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      await updateProfile({ full_name: fullName }).unwrap();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }).unwrap();
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to change password');
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('API key name is required');
      return;
    }

    try {
      const result = await createApiKey({ name: newKeyName }).unwrap();
      toast.success('API key created. Copy it now - it won\'t be shown again!');
      navigator.clipboard.writeText(result.api_key);
      setNewKeyName('');
    } catch (error: any) {
      toast.error(error?.data?.detail || 'Failed to create API key');
    }
  };

  const handleRevokeApiKey = (keyId: string, keyName: string) => {
    setRevokeDialogKey({ id: keyId, name: keyName });
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  Settings are read-only in demo mode
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-0.5">
                  Sign up to modify your account settings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="pl-10 bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              disabled={isDemoMode}
              className={cn(isDemoMode && "bg-muted")}
            />
          </div>
          <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile || isDemoMode}>
            {isUpdatingProfile ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                disabled={isDemoMode}
                className={cn(isDemoMode && "bg-muted")}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={isDemoMode}
                className={cn(isDemoMode && "bg-muted")}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={isDemoMode}
              className={cn(isDemoMode && "bg-muted")}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={isChangingPassword || isDemoMode}>
            {isChangingPassword ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <CardDescription>Manage your API keys for programmatic access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="API key name"
              className={cn("flex-1", isDemoMode && "bg-muted")}
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
            <div className="divide-y">
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
                      {key.is_revoked && ' • Revoked'}
                    </p>
                  </div>
                  {!key.is_revoked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleRevokeApiKey(key.api_key_id, key.name)}
                      disabled={isDemoMode}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Configure your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for important updates
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
              disabled={isDemoMode}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Document Processed</p>
              <p className="text-sm text-muted-foreground">
                Get notified when document processing completes
              </p>
            </div>
            <Switch
              checked={documentProcessed}
              onCheckedChange={setDocumentProcessed}
              disabled={isDemoMode}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Digest</p>
              <p className="text-sm text-muted-foreground">
                Receive a weekly summary of your activity
              </p>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={setWeeklyDigest}
              disabled={isDemoMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Revoke API Key Dialog */}
      <RevokeApiKeyDialog
        open={!!revokeDialogKey}
        onOpenChange={(open) => !open && setRevokeDialogKey(null)}
        keyName={revokeDialogKey?.name || ''}
        onConfirm={handleConfirmRevokeApiKey}
        isRevoking={isRevokingKey}
      />
    </div>
  );
};

export default SettingsPage;

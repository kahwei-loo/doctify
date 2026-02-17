import React, { useState } from 'react';
import {
  User,
  Mail,
  Bell,
  Loader2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/selectors/authSelectors';
import { useUpdateProfileMutation } from '@/store/api/authApi';
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

interface AccountTabProps {
  isDemoMode: boolean;
}

export const AccountTab: React.FC<AccountTabProps> = ({ isDemoMode }) => {
  const user = useAppSelector(selectUser);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateProfileMutation();

  // Notification preferences (local state only for now)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [documentProcessed, setDocumentProcessed] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

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

  return (
    <div className="space-y-6">
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
              className={cn(isDemoMode && 'bg-muted')}
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
    </div>
  );
};

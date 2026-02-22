import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';

interface NotificationsSectionProps {
  isDemoMode: boolean;
}

export const NotificationsSection: React.FC<NotificationsSectionProps> = ({ isDemoMode }) => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [documentProcessed, setDocumentProcessed] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your notification preferences
        </p>
      </div>
      <div className="divide-y divide-border">
        <div className="flex items-center justify-between py-4">
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
        <div className="flex items-center justify-between py-4">
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
        <div className="flex items-center justify-between py-4">
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
      </div>
    </div>
  );
};

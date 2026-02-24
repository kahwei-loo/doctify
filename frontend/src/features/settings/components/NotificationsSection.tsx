import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationsSectionProps {
  isDemoMode: boolean;
}

export const NotificationsSection: React.FC<NotificationsSectionProps> = () => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your notification preferences
        </p>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Bell className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium mb-1">Coming Soon</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Email notifications for document processing, weekly digests, and team
          activity will be available in a future update.
        </p>
      </div>
    </div>
  );
};

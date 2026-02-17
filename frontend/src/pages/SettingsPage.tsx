import React from 'react';
import { Lock } from 'lucide-react';
import { useAppSelector } from '@/store';
import { selectIsSuperuser } from '@/store/selectors/authSelectors';
import { useDemoMode } from '@/features/demo/hooks/useDemoMode';
import {
  AccountTab,
  SecurityTab,
  ApiKeysTab,
  AIModelsTab,
} from '@/features/settings';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SettingsPage: React.FC = () => {
  const { isDemoMode } = useDemoMode();
  const isSuperuser = useAppSelector(selectIsSuperuser);

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

      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          {isSuperuser && (
            <TabsTrigger value="ai-models">AI Models</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="account">
          <AccountTab isDemoMode={isDemoMode} />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab isDemoMode={isDemoMode} />
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysTab isDemoMode={isDemoMode} />
        </TabsContent>

        {isSuperuser && (
          <TabsContent value="ai-models">
            <AIModelsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default SettingsPage;

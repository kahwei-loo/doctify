/**
 * KBDetailTabs Component
 *
 * Tab navigation for knowledge base detail view.
 * Pattern: Uses ShadcnUI Tabs component
 *
 * Tabs:
 * 1. Data Sources - Manage data sources
 * 2. Embeddings - View and generate embeddings
 * 3. Test - Test query interface
 * 4. Settings - KB configuration
 */

import React from 'react';
import { FileStack, Zap, TestTube2, Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type KBTab = 'sources' | 'embeddings' | 'test' | 'settings';

interface KBDetailTabsProps {
  /** Current active tab */
  activeTab: KBTab;
  /** Tab change handler */
  onTabChange: (tab: KBTab) => void;
  /** Custom class name */
  className?: string;
  /** Content for Data Sources tab */
  sourcesContent?: React.ReactNode;
  /** Content for Embeddings tab */
  embeddingsContent?: React.ReactNode;
  /** Content for Test tab */
  testContent?: React.ReactNode;
  /** Content for Settings tab */
  settingsContent?: React.ReactNode;
}

export const KBDetailTabs: React.FC<KBDetailTabsProps> = ({
  activeTab,
  onTabChange,
  className,
  sourcesContent,
  embeddingsContent,
  testContent,
  settingsContent,
}) => {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as KBTab)}
      className={cn('flex flex-col h-full', className)}
    >
      <div className="border-b bg-card/50 px-6 pt-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="sources" className="gap-2">
            <FileStack className="h-4 w-4" />
            <span className="hidden sm:inline">Data Sources</span>
            <span className="sm:hidden">Sources</span>
          </TabsTrigger>
          <TabsTrigger value="embeddings" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Embeddings</span>
            <span className="sm:hidden">Vectors</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <TestTube2 className="h-4 w-4" />
            <span className="hidden sm:inline">Test Query</span>
            <span className="sm:hidden">Test</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TabsContent value="sources" className="mt-0 p-6">
          {sourcesContent || (
            <div className="text-center py-12">
              <FileStack className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Data sources content will go here</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="embeddings" className="mt-0 p-6">
          {embeddingsContent || (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Embeddings content will go here</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="test" className="mt-0 p-6">
          {testContent || (
            <div className="text-center py-12">
              <TestTube2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Test query content will go here</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-0 p-6">
          {settingsContent || (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Settings content will go here</p>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default KBDetailTabs;

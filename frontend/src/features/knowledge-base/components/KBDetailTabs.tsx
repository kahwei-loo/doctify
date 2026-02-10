/**
 * KBDetailTabs Component
 *
 * Tab navigation for knowledge base detail view.
 * Pattern: Uses ShadcnUI Tabs component
 *
 * Tabs (consolidated 3-tab layout):
 * 1. Overview - KB statistics, source summary, quick actions
 * 2. Sources - Manage data sources
 * 3. Query & Test - Test queries and unified analytics
 */

import React from 'react';
import { LayoutDashboard, Database, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type KBTab = 'overview' | 'sources' | 'query-test';

interface KBDetailTabsProps {
  /** Current active tab */
  activeTab: KBTab;
  /** Tab change handler */
  onTabChange: (tab: KBTab) => void;
  /** Custom class name */
  className?: string;
  /** Content for Overview tab */
  overviewContent?: React.ReactNode;
  /** Content for Sources tab */
  sourcesContent?: React.ReactNode;
  /** Content for Query & Test tab */
  queryTestContent?: React.ReactNode;
}

export const KBDetailTabs: React.FC<KBDetailTabsProps> = ({
  activeTab,
  onTabChange,
  className,
  overviewContent,
  sourcesContent,
  queryTestContent,
}) => {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as KBTab)}
      className={cn('flex flex-col h-full', className)}
    >
      <div className="border-b bg-muted/30 px-6 py-3">
        <TabsList className="grid w-full max-w-md grid-cols-3 h-9">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="sources" className="gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" />
            <span>Sources</span>
          </TabsTrigger>
          <TabsTrigger value="query-test" className="gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Query & Test</span>
            <span className="sm:hidden">Query</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TabsContent value="overview" className="mt-0 p-6">
          {overviewContent || (
            <div className="text-center py-12">
              <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Overview content will go here</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sources" className="mt-0 p-6">
          {sourcesContent || (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Data sources content will go here</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="query-test" className="mt-0 p-6 h-[calc(100vh-280px)]">
          {queryTestContent || (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Query & test content will go here</p>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
};

export default KBDetailTabs;

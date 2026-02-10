/**
 * KB Detail Page Component
 *
 * Single knowledge base detail view with consolidated 3-tab layout.
 * Displayed when navigating to /knowledge-base/{id}?tab=overview (with kbId).
 *
 * Features:
 * - KB header with name, description, and settings access
 * - 3 tabs: Overview, Sources, Query & Test
 * - Settings accessible via Sheet panel in header
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Database,
  Plus,
  Settings,
  FileStack,
  Zap,
  Search,
  HardDrive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  KBDetailTabs,
  DataSourceList,
  AddDataSourceDialog,
  DataSourceConfigDialog,
  EditDataSourceDialog,
  GenerateEmbeddingsButton,
  TestQueryPanel,
  KBSettings,
  ConfirmDeleteDialog,
  ViewContentDialog,
  ErrorState,
  type KBTab,
} from '.';
import { knowledgeBaseApi } from '../services/mockData';
import toast from 'react-hot-toast';
import type { KnowledgeBase, DataSource, DataSourceConfig, Embedding, DataSourceType } from '../types';
import { UnifiedQueryPanel } from './UnifiedQueryPanel';

interface KBDetailPageProps {
  kbId: string;
}

export const KBDetailPage: React.FC<KBDetailPageProps> = ({ kbId }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // UI State
  const [activeTab, setActiveTab] = useState<KBTab>(
    (searchParams.get('tab') as KBTab) || 'overview'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Data State
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [isLoadingKB, setIsLoadingKB] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isLoadingEmbeddings, setIsLoadingEmbeddings] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<DataSourceType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dataSourceToDelete, setDataSourceToDelete] = useState<DataSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [dataSourceToView, setDataSourceToView] = useState<DataSource | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dataSourceToEdit, setDataSourceToEdit] = useState<DataSource | null>(null);

  // Load KB details
  const loadKB = useCallback(async () => {
    if (!kbId) return;

    setIsLoadingKB(true);
    setKbError(null);
    try {
      const response = await knowledgeBaseApi.getKnowledgeBase(kbId);
      setSelectedKB(response.data);
    } catch (err) {
      setKbError('Failed to load knowledge base details');
      setSelectedKB(null);
    } finally {
      setIsLoadingKB(false);
    }
  }, [kbId]);

  // Load data sources
  const loadDataSources = useCallback(async () => {
    if (!kbId) return;

    setIsLoadingSources(true);
    try {
      const response = await knowledgeBaseApi.listDataSources(kbId);
      setDataSources(response.data);
    } catch (err) {
      console.error('Failed to load data sources:', err);
      setDataSources([]);
    } finally {
      setIsLoadingSources(false);
    }
  }, [kbId]);

  // Load embeddings
  const loadEmbeddings = useCallback(async () => {
    if (!kbId) return;

    setIsLoadingEmbeddings(true);
    try {
      const response = await knowledgeBaseApi.listEmbeddings(kbId, {
        page: 1,
        per_page: 50,
      });
      setEmbeddings(response.data);
    } catch (err) {
      console.error('Failed to load embeddings:', err);
      setEmbeddings([]);
    } finally {
      setIsLoadingEmbeddings(false);
    }
  }, [kbId]);

  // Load data on mount and when kbId changes
  useEffect(() => {
    loadKB();
    loadDataSources();
    loadEmbeddings();
  }, [loadKB, loadDataSources, loadEmbeddings]);

  // Sync URL with active tab
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', activeTab);
    setSearchParams(params, { replace: true });
  }, [activeTab, setSearchParams]);

  // Handlers
  const handleTabChange = useCallback((tab: KBTab) => {
    setActiveTab(tab);
  }, []);

  const handleAddDataSource = useCallback((type: DataSourceType) => {
    setSelectedSourceType(type);
    setShowAddSourceDialog(false);
    setShowConfigDialog(true);
  }, []);

  const handleDeleteDataSource = useCallback((dataSource: DataSource) => {
    setDataSourceToDelete(dataSource);
    setDeleteDialogOpen(true);
  }, []);

  const handleViewDataSource = useCallback((dataSource: DataSource) => {
    setDataSourceToView(dataSource);
    setViewDialogOpen(true);
  }, []);

  const handleEditDataSource = useCallback((dataSource: DataSource) => {
    setDataSourceToEdit(dataSource);
    setEditDialogOpen(true);
  }, []);

  const handleSaveDataSource = useCallback(
    async (
      dataSource: DataSource,
      updates: { name?: string; config?: Partial<DataSourceConfig> }
    ) => {
      try {
        await knowledgeBaseApi.updateDataSource(dataSource.id, updates);
        // Reload data sources to reflect changes
        await loadDataSources();
        toast.success('Data source updated successfully');
      } catch (err) {
        console.error('Failed to update data source:', err);
        toast.error('Failed to update data source');
        throw err;
      }
    },
    [loadDataSources]
  );

  const handleRegenerateEmbeddings = useCallback(async (dataSource: DataSource) => {
    try {
      await knowledgeBaseApi.generateEmbeddings(dataSource.id, true);
      // Reload data after triggering regeneration
      await Promise.all([loadDataSources(), loadEmbeddings(), loadKB()]);
    } catch (err) {
      console.error('Failed to regenerate embeddings:', err);
    }
  }, [loadDataSources, loadEmbeddings, loadKB]);

  const handleCreateDataSource = useCallback(
    async (name: string, config: DataSource['config']) => {
      if (!kbId || !selectedSourceType) return null;

      const createResponse = await knowledgeBaseApi.createDataSource({
        knowledge_base_id: kbId,
        type: selectedSourceType,
        name,
        config,
      });

      // Reload data sources after creation
      const response = await knowledgeBaseApi.listDataSources(kbId);
      setDataSources(response.data);
      setSelectedSourceType(null);

      return createResponse.data;
    },
    [kbId, selectedSourceType]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!kbId || !dataSourceToDelete) return;

    setIsDeleting(true);
    try {
      await knowledgeBaseApi.deleteDataSource(dataSourceToDelete.id);
      // Reload data sources
      const response = await knowledgeBaseApi.listDataSources(kbId);
      setDataSources(response.data);
      setDeleteDialogOpen(false);
      setDataSourceToDelete(null);
    } catch (err) {
      console.error('Failed to delete data source:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [kbId, dataSourceToDelete]);

  const handleEmbeddingsGenerated = useCallback(async () => {
    if (!kbId) return;

    // Reload embeddings and KB details after generation
    try {
      const [embeddingsResponse, kbResponse] = await Promise.all([
        knowledgeBaseApi.listEmbeddings(kbId, { page: 1, per_page: 50 }),
        knowledgeBaseApi.getKnowledgeBase(kbId),
      ]);
      setEmbeddings(embeddingsResponse.data);
      setSelectedKB(kbResponse.data);
    } catch (err) {
      console.error('Failed to reload after embeddings generation:', err);
    }
  }, [kbId]);

  const handleSettingsSaved = useCallback(
    (config: KnowledgeBase['config']) => {
      if (selectedKB) {
        setSelectedKB({ ...selectedKB, config });
      }
    },
    [selectedKB]
  );

  // Render overview content
  const renderOverviewContent = () => {
    if (!selectedKB) return null;

    // Group data sources by type
    const sourcesByType = dataSources.reduce(
      (acc, ds) => {
        acc[ds.type] = (acc[ds.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Calculate vector DB size estimate
    const embeddingCount = selectedKB.embedding_count || 0;
    const vectorSizeBytes = embeddingCount * 1536 * 4;
    const vectorSizeMB = vectorSizeBytes / (1024 * 1024);
    const vectorSizeDisplay =
      vectorSizeMB < 1
        ? `${(vectorSizeMB * 1024).toFixed(0)} KB`
        : `${vectorSizeMB.toFixed(1)} MB`;

    // Count embeddings by status
    const completedEmbeddings = embeddings.filter((e) => e.status === 'completed').length;
    const processingEmbeddings = embeddings.filter((e) => e.status === 'processing').length;
    const failedEmbeddings = embeddings.filter((e) => e.status === 'failed').length;

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-all border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Sources</p>
                  <p className="text-2xl font-bold tracking-tight">{dataSources.length}</p>
                  <p className="text-xs text-muted-foreground">Connected sources</p>
                </div>
                <div className="rounded-xl p-2.5 bg-blue-500/10">
                  <FileStack className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Uploaded Files</p>
                  <p className="text-2xl font-bold tracking-tight">
                    {(selectedKB.document_count || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Files uploaded</p>
                </div>
                <div className="rounded-xl p-2.5 bg-emerald-500/10">
                  <Database className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Embeddings</p>
                  <p className="text-2xl font-bold tracking-tight">{embeddingCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Vector embeddings</p>
                </div>
                <div className="rounded-xl p-2.5 bg-amber-500/10">
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all border-l-4 border-l-violet-500">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vector DB Size</p>
                  <p className="text-2xl font-bold tracking-tight">{vectorSizeDisplay}</p>
                  <p className="text-xs text-muted-foreground">Estimated storage</p>
                </div>
                <div className="rounded-xl p-2.5 bg-violet-500/10">
                  <HardDrive className="h-4 w-4 text-violet-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Summary & Embeddings Status */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Data Source Breakdown */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Source Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {dataSources.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No data sources added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(sourcesByType).map(([type, count]) => {
                    const typeLabels: Record<string, string> = {
                      uploaded_docs: 'Uploaded Documents',
                      website: 'Website Crawler',
                      text: 'Text Input',
                      qa_pairs: 'Q&A Pairs',
                      structured_data: 'Structured Data',
                    };
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {typeLabels[type] || type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    );
                  })}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold">{dataSources.length}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Embeddings Status */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Embeddings Status</CardTitle>
            </CardHeader>
            <CardContent>
              {embeddings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No embeddings generated yet
                </p>
              ) : (
                <div className="space-y-3">
                  {completedEmbeddings > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm text-muted-foreground">Completed</span>
                      </div>
                      <span className="text-sm font-medium">{completedEmbeddings}</span>
                    </div>
                  )}
                  {processingEmbeddings > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-sm text-muted-foreground">Processing</span>
                      </div>
                      <span className="text-sm font-medium">{processingEmbeddings}</span>
                    </div>
                  )}
                  {failedEmbeddings > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-sm text-muted-foreground">Failed</span>
                      </div>
                      <span className="text-sm font-medium">{failedEmbeddings}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold">{embeddings.length}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddSourceDialog(true)}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Source
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('query-test')}
                className="gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                Test Query
              </Button>
              <GenerateEmbeddingsButton
                knowledgeBaseId={kbId}
                dataSourceCount={dataSources.length}
                onComplete={handleEmbeddingsGenerated}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render data sources content
  const renderSourcesContent = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Data Sources</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage data sources for this knowledge base
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddSourceDialog(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Source
          </Button>
        </div>

        <DataSourceList
          dataSources={dataSources}
          onDelete={handleDeleteDataSource}
          onView={handleViewDataSource}
          onEdit={handleEditDataSource}
          onRegenerate={handleRegenerateEmbeddings}
          isLoading={isLoadingSources}
        />

        <AddDataSourceDialog
          open={showAddSourceDialog}
          onOpenChange={setShowAddSourceDialog}
          knowledgeBaseId={kbId}
          onTypeSelected={handleAddDataSource}
        />
      </div>
    );
  };

  // Render query & test content (merged test + analytics)
  const renderQueryTestContent = () => {
    if (!selectedKB) return null;

    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Test Query Section */}
        <div>
          <TestQueryPanel
            knowledgeBaseId={kbId}
            embeddingCount={selectedKB.embedding_count || 0}
          />
        </div>

        <Separator />

        {/* Unified Query / Analytics Section */}
        <div className="flex-1 min-h-0">
          <UnifiedQueryPanel knowledgeBaseId={kbId} />
        </div>
      </div>
    );
  };

  // Error state
  if (kbError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <ErrorState type="server" message={kbError} onRetry={loadKB} />
      </div>
    );
  }

  // Loading state
  if (isLoadingKB && !selectedKB) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Database className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!selectedKB) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Database className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Knowledge Base Not Found</h3>
          <p className="text-sm text-muted-foreground">
            The requested knowledge base could not be found
          </p>
        </div>
      </div>
    );
  }

  // TypeScript now knows selectedKB is not null
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* KB Header */}
      <div className="border-b bg-gradient-to-b from-background to-muted/30 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 shrink-0">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight truncate">
                {selectedKB.name}
              </h1>
              {selectedKB.description && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {selectedKB.description}
                </p>
              )}
            </div>
          </div>

          {/* Settings Button */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-9 w-9 shrink-0"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Knowledge Base Settings</SheetTitle>
                <SheetDescription>
                  Configure settings for {selectedKB.name}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <KBSettings knowledgeBase={selectedKB} onSave={handleSettingsSaved} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex-1 overflow-hidden">
        <KBDetailTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          overviewContent={renderOverviewContent()}
          sourcesContent={renderSourcesContent()}
          queryTestContent={renderQueryTestContent()}
        />
      </div>

      {/* Data Source Configuration Dialog */}
      {selectedSourceType && (
        <DataSourceConfigDialog
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          knowledgeBaseId={kbId}
          sourceType={selectedSourceType}
          onSubmit={handleCreateDataSource}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Data Source"
        description="Are you sure you want to delete this data source? This action cannot be undone."
        itemName={dataSourceToDelete?.name}
        impact={
          dataSourceToDelete
            ? [
                {
                  label: 'embedding',
                  count: dataSourceToDelete.embedding_count || 0,
                },
              ]
            : []
        }
        isDeleting={isDeleting}
      />

      {/* View Content Dialog */}
      <ViewContentDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        dataSource={dataSourceToView}
        onRegenerate={handleRegenerateEmbeddings}
      />

      {/* Edit Data Source Dialog */}
      <EditDataSourceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        dataSource={dataSourceToEdit}
        onSave={handleSaveDataSource}
      />
    </div>
  );
};

export default KBDetailPage;

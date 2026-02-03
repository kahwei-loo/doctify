/**
 * KB Detail Page Component
 *
 * Single knowledge base detail view with tabs for managing sources, embeddings, testing, and settings.
 * Displayed when navigating to /knowledge-base/{id}?tab=sources (with kbId).
 *
 * Features:
 * - KB-specific statistics
 * - KB header with name and description
 * - 4 tabs: Data Sources, Embeddings, Test, Settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Database, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  KBOverallStats,
  KBDetailTabs,
  DataSourceList,
  AddDataSourceDialog,
  DataSourceConfigDialog,
  EmbeddingsList,
  GenerateEmbeddingsButton,
  TestQueryPanel,
  KBSettings,
  ConfirmDeleteDialog,
  ErrorState,
  type KBTab,
} from '.';
import { knowledgeBaseApi } from '../services/mockData';
import type { KnowledgeBase, DataSource, Embedding, DataSourceType } from '../types';
import { cn } from '@/lib/utils';

interface KBDetailPageProps {
  kbId: string;
}

export const KBDetailPage: React.FC<KBDetailPageProps> = ({ kbId }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // UI State
  const [activeTab, setActiveTab] = useState<KBTab>(
    (searchParams.get('tab') as KBTab) || 'sources'
  );

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

  const handleCreateDataSource = useCallback(
    async (name: string, config: DataSource['config']) => {
      if (!kbId || !selectedSourceType) return;

      await knowledgeBaseApi.createDataSource({
        knowledge_base_id: kbId,
        type: selectedSourceType,
        name,
        config,
      });

      // Reload data sources after creation
      const response = await knowledgeBaseApi.listDataSources(kbId);
      setDataSources(response.data);
      setSelectedSourceType(null);
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

  // Render data sources content
  const renderSourcesContent = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Data Sources</h3>
            <p className="text-sm text-muted-foreground">
              Manage data sources for this knowledge base
            </p>
          </div>
          <Button onClick={() => setShowAddSourceDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        </div>

        <DataSourceList
          dataSources={dataSources}
          onDelete={handleDeleteDataSource}
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

  // Render embeddings content
  const renderEmbeddingsContent = () => {
    return (
      <div className="space-y-6">
        <GenerateEmbeddingsButton
          knowledgeBaseId={kbId}
          dataSourceCount={dataSources.length}
          onComplete={handleEmbeddingsGenerated}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Embeddings</h3>
              <p className="text-sm text-muted-foreground">
                Vector embeddings generated from your data sources
              </p>
            </div>
          </div>

          <EmbeddingsList embeddings={embeddings} isLoading={isLoadingEmbeddings} />
        </div>
      </div>
    );
  };

  // Render test query content
  const renderTestContent = () => {
    if (!selectedKB) return null;

    return (
      <TestQueryPanel
        knowledgeBaseId={kbId}
        embeddingCount={selectedKB.embedding_count || 0}
      />
    );
  };

  // Render settings content
  const renderSettingsContent = () => {
    if (!selectedKB) return null;

    return <KBSettings knowledgeBase={selectedKB} onSave={handleSettingsSaved} />;
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
      {/* KB-Specific Statistics */}
      <div className="border-b bg-background p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              {selectedKB.name}
            </h1>
            {selectedKB.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedKB.description}
              </p>
            )}
          </div>
        </div>

        {/* Context-aware stats for single KB */}
        <KBOverallStats
          context="single"
          data={{
            data_source_count: selectedKB.data_source_count || 0,
            document_count: selectedKB.document_count || 0,
            embedding_count: selectedKB.embedding_count || 0,
          }}
          isLoading={isLoadingKB}
        />
      </div>

      {/* Detail Tabs */}
      <div className="flex-1 overflow-hidden">
        <KBDetailTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          sourcesContent={renderSourcesContent()}
          embeddingsContent={renderEmbeddingsContent()}
          testContent={renderTestContent()}
          settingsContent={renderSettingsContent()}
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
    </div>
  );
};

export default KBDetailPage;

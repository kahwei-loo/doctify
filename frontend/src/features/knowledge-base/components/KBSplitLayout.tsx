/**
 * KBSplitLayout Component
 *
 * NotebookLM-inspired side-by-side layout for KB detail view.
 * Sources panel (left) + Chat panel (right) — always visible simultaneously.
 *
 * Uses resizable panels from react-resizable-panels for flexible split view.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Database, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SourcesPanel } from "./SourcesPanel";
import { ChatPanel } from "./ChatPanel";
import {
  AddDataSourceDialog,
  DataSourceConfigDialog,
  EditDataSourceDialog,
  KBSettings,
  ConfirmDeleteDialog,
  ErrorState,
} from ".";
import { knowledgeBaseApi } from "../services/mockData";
import toast from "react-hot-toast";
import type {
  KnowledgeBase,
  DataSource,
  DataSourceConfig,
  Embedding,
  DataSourceType,
} from "../types";

interface KBSplitLayoutProps {
  kbId: string;
}

export const KBSplitLayout: React.FC<KBSplitLayoutProps> = ({ kbId }) => {
  // UI State
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Data State
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [isLoadingKB, setIsLoadingKB] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [_isLoadingEmbeddings, setIsLoadingEmbeddings] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);

  // Dialog State
  const [showAddSourceDialog, setShowAddSourceDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<DataSourceType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dataSourceToDelete, setDataSourceToDelete] = useState<DataSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [dataSourceToEdit, setDataSourceToEdit] = useState<DataSource | null>(null);

  // ── Data Fetching ────────────────────────────────────────────────────

  const loadKB = useCallback(async () => {
    if (!kbId) return;
    setIsLoadingKB(true);
    setKbError(null);
    try {
      const response = await knowledgeBaseApi.getKnowledgeBase(kbId);
      setSelectedKB(response.data);
    } catch {
      setKbError("Failed to load knowledge base details");
      setSelectedKB(null);
    } finally {
      setIsLoadingKB(false);
    }
  }, [kbId]);

  const loadDataSources = useCallback(async () => {
    if (!kbId) return;
    setIsLoadingSources(true);
    try {
      const response = await knowledgeBaseApi.listDataSources(kbId);
      setDataSources(response.data);
    } catch {
      setDataSources([]);
    } finally {
      setIsLoadingSources(false);
    }
  }, [kbId]);

  const loadEmbeddings = useCallback(async () => {
    if (!kbId) return;
    setIsLoadingEmbeddings(true);
    try {
      const response = await knowledgeBaseApi.listEmbeddings(kbId, {
        page: 1,
        per_page: 100,
      });
      setEmbeddings(response.data);
    } catch {
      setEmbeddings([]);
    } finally {
      setIsLoadingEmbeddings(false);
    }
  }, [kbId]);

  useEffect(() => {
    loadKB();
    loadDataSources();
    loadEmbeddings();
  }, [loadKB, loadDataSources, loadEmbeddings]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleAddDataSource = useCallback((type: DataSourceType) => {
    setSelectedSourceType(type);
    setShowAddSourceDialog(false);
    setShowConfigDialog(true);
  }, []);

  const handleDeleteDataSource = useCallback((dataSource: DataSource) => {
    setDataSourceToDelete(dataSource);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditDataSource = useCallback((dataSource: DataSource) => {
    setDataSourceToEdit(dataSource);
    setEditDialogOpen(true);
  }, []);

  const handleViewDataSource = useCallback((_dataSource: DataSource) => {
    // SourcesPanel handles expanded view internally via selectedSourceId
  }, []);

  const handleSaveDataSource = useCallback(
    async (
      dataSource: DataSource,
      updates: { name?: string; config?: Partial<DataSourceConfig> }
    ) => {
      try {
        await knowledgeBaseApi.updateDataSource(dataSource.id, updates);
        await loadDataSources();
        toast.success("Data source updated successfully");
      } catch (err) {
        toast.error("Failed to update data source");
        throw err;
      }
    },
    [loadDataSources]
  );

  const handleRegenerateEmbeddings = useCallback(
    async (dataSource: DataSource) => {
      try {
        if (dataSource.type === "website") {
          // Website sources: re-crawl first, backend auto-chains to embed
          await knowledgeBaseApi.triggerCrawl(dataSource.id);
          toast.success(
            "Crawling website — embeddings will generate automatically after crawl completes"
          );
        } else {
          await knowledgeBaseApi.generateEmbeddings(dataSource.id, true);
          toast.success("Regenerating embeddings...");
        }
        await Promise.all([loadDataSources(), loadEmbeddings(), loadKB()]);
      } catch {
        toast.error("Failed to regenerate embeddings");
      }
    },
    [loadDataSources, loadEmbeddings, loadKB]
  );

  const handleCreateDataSource = useCallback(
    async (name: string, config: DataSource["config"]) => {
      if (!kbId || !selectedSourceType) return null;

      if (selectedSourceType === "structured_data") {
        const response = await knowledgeBaseApi.listDataSources(kbId);
        setDataSources(response.data);
        setSelectedSourceType(null);
        return null;
      }

      const createResponse = await knowledgeBaseApi.createDataSource({
        knowledge_base_id: kbId,
        type: selectedSourceType,
        name,
        config,
      });

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
      const response = await knowledgeBaseApi.listDataSources(kbId);
      setDataSources(response.data);
      setDeleteDialogOpen(false);
      setDataSourceToDelete(null);
      toast.success("Data source deleted");
    } catch {
      toast.error("Failed to delete data source");
    } finally {
      setIsDeleting(false);
    }
  }, [kbId, dataSourceToDelete]);

  const handleSettingsSaved = useCallback(
    (config: KnowledgeBase["config"]) => {
      if (selectedKB) {
        setSelectedKB({ ...selectedKB, config });
      }
    },
    [selectedKB]
  );

  // ── Render States ────────────────────────────────────────────────────

  if (kbError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <ErrorState type="server" message={kbError} onRetry={loadKB} />
      </div>
    );
  }

  if (isLoadingKB && !selectedKB) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  if (!selectedKB) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Database className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">Knowledge Base Not Found</h3>
          <p className="text-sm text-muted-foreground">
            The requested knowledge base could not be found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* KB Header */}
      <div className="border-b bg-gradient-to-r from-background to-muted/20 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold tracking-tight truncate">{selectedKB.name}</h1>
              {selectedKB.description && (
                <p className="text-xs text-muted-foreground truncate">{selectedKB.description}</p>
              )}
            </div>
          </div>

          {/* Settings Button */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-8 w-8 shrink-0"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="sr-only">Settings</span>
            </Button>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Knowledge Base Settings</SheetTitle>
                <SheetDescription>Configure settings for {selectedKB.name}</SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <KBSettings knowledgeBase={selectedKB} onSave={handleSettingsSaved} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Split View: Sources + Chat */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sources Panel (Left) */}
        <div className="w-[45%] min-w-[280px] max-w-[560px] border-r overflow-hidden">
          <SourcesPanel
            dataSources={dataSources}
            embeddings={embeddings}
            isLoading={isLoadingSources}
            onAddSource={() => setShowAddSourceDialog(true)}
            onDeleteSource={handleDeleteDataSource}
            onEditSource={handleEditDataSource}
            onViewSource={handleViewDataSource}
            onRegenerateEmbeddings={handleRegenerateEmbeddings}
            knowledgeBaseId={kbId}
          />
        </div>

        {/* Chat Panel (Right) */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel knowledgeBaseId={kbId} />
        </div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}

      <AddDataSourceDialog
        open={showAddSourceDialog}
        onOpenChange={setShowAddSourceDialog}
        knowledgeBaseId={kbId}
        onTypeSelected={handleAddDataSource}
      />

      {selectedSourceType && (
        <DataSourceConfigDialog
          open={showConfigDialog}
          onOpenChange={(open) => {
            setShowConfigDialog(open);
            if (!open) {
              // Refresh after dialog closes — the two-step upload flow
              // (create DS → upload files) means the list is stale
              loadDataSources();
              loadEmbeddings();
            }
          }}
          knowledgeBaseId={kbId}
          sourceType={selectedSourceType}
          onSubmit={handleCreateDataSource}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Data Source"
        description="Are you sure you want to delete this data source? This action cannot be undone."
        itemName={dataSourceToDelete?.name}
        impact={
          dataSourceToDelete
            ? [{ label: "embedding", count: dataSourceToDelete.embedding_count || 0 }]
            : []
        }
        isDeleting={isDeleting}
      />

      <EditDataSourceDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        dataSource={dataSourceToEdit}
        onSave={handleSaveDataSource}
      />
    </div>
  );
};

export default KBSplitLayout;

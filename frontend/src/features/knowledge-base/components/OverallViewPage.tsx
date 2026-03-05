/**
 * Overall View Page Component
 *
 * Global overview page showing all knowledge bases and aggregated statistics.
 * Displayed when navigating to /knowledge-base (no kbId).
 *
 * Features:
 * - Global statistics across all KBs
 * - All KBs grid/list view
 * - Click KB card to navigate to detail view
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Grid3x3, List, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyKBState } from "./EmptyKBState";
import { ErrorState } from "./ErrorState";
import { KBListSkeleton } from "./KBListSkeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { knowledgeBaseApi, isMockMode } from "../services/mockData";
import type { KnowledgeBase } from "../types";

type ViewMode = "grid" | "list";

export const OverallViewPage: React.FC = () => {
  const navigate = useNavigate();

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Data State
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoadingKBs, setIsLoadingKBs] = useState(false);
  const [kbsError, setKBsError] = useState<string | null>(null);

  // Load all knowledge bases
  const loadKBs = useCallback(async () => {
    setIsLoadingKBs(true);
    setKBsError(null);
    try {
      const response = await knowledgeBaseApi.listKnowledgeBases();
      setKnowledgeBases(response.data);
    } catch (err) {
      setKBsError("Failed to load knowledge bases");
    } finally {
      setIsLoadingKBs(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadKBs();
  }, [loadKBs]);

  // Handle KB card click
  const handleSelectKB = useCallback(
    (kbId: string) => {
      navigate(`/knowledge-base/${kbId}`);
    },
    [navigate]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadKBs();
  }, [loadKBs]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-gradient-to-b from-background to-muted/30 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Knowledge Bases</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your knowledge bases and data sources
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isMockMode && (
              <Badge variant="secondary" className="text-xs">
                Mock Mode
              </Badge>
            )}
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoadingKBs}>
              <RefreshCw className={cn("h-4 w-4", isLoadingKBs && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Knowledge Bases Grid/List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">All Knowledge Bases</h2>
            <p className="text-sm text-muted-foreground">
              {knowledgeBases.length}{" "}
              {knowledgeBases.length === 1 ? "knowledge base" : "knowledge bases"}
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 px-3"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingKBs && <KBListSkeleton count={6} />}

        {/* Error State */}
        {kbsError && !isLoadingKBs && (
          <ErrorState type="server" message={kbsError} onRetry={loadKBs} />
        )}

        {/* Empty State */}
        {!isLoadingKBs && !kbsError && knowledgeBases.length === 0 && <EmptyKBState />}

        {/* KB Cards - Grid View */}
        {!isLoadingKBs && !kbsError && knowledgeBases.length > 0 && viewMode === "grid" && (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {knowledgeBases.map((kb) => (
              <div
                key={kb.id}
                onClick={() => handleSelectKB(kb.id)}
                className="group p-5 border rounded-xl cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10 shrink-0">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                        {kb.name}
                      </h3>
                      {kb.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {kb.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {kb.status === "processing" && (
                    <Badge variant="secondary" className="ml-2">
                      Processing
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4 pt-4 border-t">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{kb.data_source_count || 0}</span>
                    <span>sources</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{kb.embedding_count || 0}</span>
                    <span>embeddings</span>
                  </div>
                </div>

                {/* Last Updated */}
                <div className="text-xs text-muted-foreground mt-3">
                  Updated {new Date(kb.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KB Cards - List View */}
        {!isLoadingKBs && !kbsError && knowledgeBases.length > 0 && viewMode === "list" && (
          <div className="space-y-2">
            {knowledgeBases.map((kb) => (
              <div
                key={kb.id}
                onClick={() => handleSelectKB(kb.id)}
                className="group flex items-center justify-between p-4 border rounded-xl cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10 shrink-0">
                    <Database className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {kb.name}
                    </h3>
                    {kb.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {kb.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{kb.data_source_count || 0}</span>
                    <span>sources</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-foreground">{kb.embedding_count || 0}</span>
                    <span>embeddings</span>
                  </div>
                  {kb.status === "processing" && <Badge variant="secondary">Processing</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OverallViewPage;

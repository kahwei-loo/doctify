/**
 * SourcesPanel Component
 *
 * Left panel in the split layout showing source list or expanded source view.
 * - List mode: compact source cards with search/filter
 * - Expanded mode: full source detail with content + chunks
 */

import React, { useState, useMemo } from "react";
import { Plus, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SourceCard } from "./SourceCard";
import { SourceExpandedView } from "./SourceExpandedView";
import type { DataSource, Embedding } from "../types";

interface SourcesPanelProps {
  dataSources: DataSource[];
  embeddings: Embedding[];
  isLoading: boolean;
  onAddSource: () => void;
  onDeleteSource: (ds: DataSource) => void;
  onEditSource: (ds: DataSource) => void;
  onViewSource: (ds: DataSource) => void;
  onRegenerateEmbeddings: (ds: DataSource) => void;
  knowledgeBaseId: string;
  className?: string;
}

export type SourceAction = "view" | "edit" | "regenerate" | "delete";

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  dataSources,
  embeddings,
  isLoading,
  onAddSource,
  onDeleteSource,
  onEditSource,
  onViewSource: _onViewSource,
  onRegenerateEmbeddings,
  knowledgeBaseId,
  className,
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedSource = useMemo(
    () => dataSources.find((ds) => ds.id === selectedSourceId) || null,
    [dataSources, selectedSourceId]
  );

  const sourceEmbeddings = useMemo(
    () => (selectedSourceId ? embeddings.filter((e) => e.data_source_id === selectedSourceId) : []),
    [embeddings, selectedSourceId]
  );

  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return dataSources;
    const query = searchQuery.toLowerCase();
    return dataSources.filter(
      (ds) => ds.name.toLowerCase().includes(query) || ds.type.toLowerCase().includes(query)
    );
  }, [dataSources, searchQuery]);

  const embeddableSources = dataSources.filter((ds) => ds.type !== "structured_data");
  const embeddedCount = embeddableSources.filter((ds) => (ds.embedding_count || 0) > 0).length;

  const handleSourceClick = (source: DataSource) => {
    setSelectedSourceId(source.id);
  };

  const handleSourceAction = (source: DataSource, action: SourceAction) => {
    switch (action) {
      case "view":
        setSelectedSourceId(source.id);
        break;
      case "edit":
        onEditSource(source);
        break;
      case "regenerate":
        onRegenerateEmbeddings(source);
        break;
      case "delete":
        onDeleteSource(source);
        break;
    }
  };

  const handleBack = () => {
    setSelectedSourceId(null);
  };

  // Expanded view for a selected source
  if (selectedSource) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <SourceExpandedView
          source={selectedSource}
          embeddings={sourceEmbeddings}
          knowledgeBaseId={knowledgeBaseId}
          onBack={handleBack}
          onAction={(action) => handleSourceAction(selectedSource, action)}
        />
      </div>
    );
  }

  // List view
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Panel Header */}
      <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Sources</h2>
          <Button size="sm" variant="default" onClick={onAddSource} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" />
            Add
          </Button>
        </div>

        {/* Search */}
        {dataSources.length > 3 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}
      </div>

      {/* Source List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {dataSources.length === 0 ? (
                <>
                  <div className="rounded-full p-3 bg-muted/50 mb-3">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-1">No sources yet</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add your first data source to get started
                  </p>
                  <Button size="sm" onClick={onAddSource} className="gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    Add Source
                  </Button>
                </>
              ) : (
                <>
                  <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No sources match "{searchQuery}"</p>
                </>
              )}
            </div>
          ) : (
            filteredSources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                onClick={() => handleSourceClick(source)}
                onAction={(action) => handleSourceAction(source, action)}
                isSelected={false}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      {dataSources.length > 0 && (
        <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
          <Zap className="h-3 w-3" />
          <span>
            {embeddedCount} embedded / {embeddableSources.length} embeddable
            {dataSources.length !== embeddableSources.length && (
              <> &middot; {dataSources.length} total</>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default SourcesPanel;

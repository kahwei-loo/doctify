/**
 * KBListPanel Component
 *
 * Left sidebar panel for knowledge base selection.
 * Pattern: Based on ProjectPanel.tsx
 *
 * Features:
 * - Search filtering
 * - KB cards with stats
 * - Create KB button
 * - Collapsible sidebar
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Database,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { KnowledgeBase } from '../types';
import { knowledgeBaseApi, isMockMode } from '../services/mockData';
import { KBListSkeleton } from './KBListSkeleton';
import { ErrorState } from './ErrorState';
import { CreateKBDialog } from './CreateKBDialog';

interface KBListPanelProps {
  selectedKbId: string | null;
  onSelectKb: (kbId: string | null) => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * KB Item Component
 */
interface KBItemProps {
  kb: KnowledgeBase;
  isSelected: boolean;
  onSelect: () => void;
}

const KBItem: React.FC<KBItemProps> = ({ kb, isSelected, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex flex-col gap-1.5 px-3 py-2.5 rounded-2xl cursor-pointer transition-all',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/10 text-primary shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Database
            className={cn(
              'h-4 w-4 mt-0.5 shrink-0',
              isSelected ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'text-sm font-medium truncate',
                isSelected ? 'text-primary' : 'text-foreground'
              )}
            >
              {kb.name}
            </h4>
            {kb.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {kb.description}
              </p>
            )}
          </div>
        </div>
        {kb.status === 'processing' && (
          <Loader2 className="h-3 w-3 animate-spin text-blue-500 shrink-0" />
        )}
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground pl-6">
        <span>{kb.data_source_count || 0} sources</span>
        <span className="text-muted-foreground/50">•</span>
        <span>{kb.embedding_count || 0} embeddings</span>
      </div>
    </div>
  );
};

export const KBListPanel: React.FC<KBListPanelProps> = ({
  selectedKbId,
  onSelectKb,
  className,
  collapsed = false,
  onToggleCollapse,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [totalDocCount, setTotalDocCount] = useState<number>(0);

  // Reusable function to load KBs
  const loadKBs = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await knowledgeBaseApi.listKnowledgeBases();
      setKnowledgeBases(response.data);
      // Calculate total document count across all KBs
      const totalDocs = response.data.reduce(
        (sum, kb) => sum + (kb.document_count || 0),
        0
      );
      setTotalDocCount(totalDocs);
    } catch (err) {
      setError('Failed to load knowledge bases');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load KBs on mount
  React.useEffect(() => {
    loadKBs();
  }, [loadKBs]);

  const filteredKBs = useMemo(() => {
    if (!searchQuery.trim()) return knowledgeBases;
    const query = searchQuery.toLowerCase();
    return knowledgeBases.filter(
      (kb) =>
        kb.name.toLowerCase().includes(query) ||
        kb.description?.toLowerCase().includes(query)
    );
  }, [knowledgeBases, searchQuery]);

  const handleCreateKB = () => {
    setShowCreateDialog(true);
  };

  const handleCreateSuccess = (newKb: KnowledgeBase) => {
    // Refresh the KB list
    loadKBs();
    // Optionally select the new KB
    onSelectKb(newKb.id);
  };

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <div
          className={cn(
            'flex flex-col items-center py-4 w-16 h-full',
            'border border-border/60 bg-card/50',
            'rounded-xl shadow-sm',
            'transition-all duration-200',
            className
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="mb-4"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Expand knowledge base panel</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>

          <div className="h-px w-8 bg-border mb-3" />

          {filteredKBs.slice(0, 8).map((kb) => (
            <Tooltip key={kb.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelectKb(kb.id)}
                  className={cn(
                    'mb-2 rounded-lg p-2 transition-colors',
                    selectedKbId === kb.id && 'bg-primary/10 ring-2 ring-primary ring-offset-2'
                  )}
                >
                  <Database
                    className={cn(
                      'h-5 w-5',
                      selectedKbId === kb.id ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex flex-col">
                <span className="font-medium">{kb.name}</span>
                <span className="text-xs text-muted-foreground">
                  {kb.embedding_count || 0} embeddings
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col w-[280px] h-full',
        'border border-border/60 bg-card/50',
        'rounded-xl shadow-sm',
        'transition-all duration-200',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Knowledge Bases</h3>
          {isMockMode && (
            <Badge variant="secondary" className="text-xs">
              Mock
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCreateKB}
            title="Create new knowledge base"
          >
            <Plus className="h-4 w-4" />
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleCollapse}
              title="Collapse panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge bases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* KB List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Loading State */}
        {isLoading && <KBListSkeleton count={3} />}

        {/* Error State */}
        {error && (
          <ErrorState
            type="server"
            message={error}
            onRetry={loadKBs}
            variant="inline"
            className="mx-2"
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredKBs.length === 0 && (
          <div className="text-center py-8">
            <Database className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {searchQuery ? 'No matching knowledge bases' : 'No knowledge bases yet'}
            </p>
            {!searchQuery && (
              <Button
                variant="link"
                size="sm"
                onClick={handleCreateKB}
                className="mt-2"
              >
                Create your first KB
              </Button>
            )}
          </div>
        )}

        {/* Overall View Card (always at top) */}
        {!isLoading && !error && (
          <div className="mb-3">
            <div
              onClick={() => {
                navigate('/knowledge-base');
                onSelectKb(null);
              }}
              className={cn(
                'group flex flex-col gap-1.5 px-3 py-3 rounded-lg cursor-pointer transition-colors',
                'hover:bg-muted/50 border-2',
                !selectedKbId
                  ? 'bg-primary/10 border-primary/20'
                  : 'border-border/50'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'p-1.5 rounded-md',
                      !selectedKbId ? 'bg-primary/20' : 'bg-muted'
                    )}
                  >
                    <BarChart3
                      className={cn(
                        'h-4 w-4',
                        !selectedKbId ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <h4
                    className={cn(
                      'text-sm font-semibold',
                      !selectedKbId ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    Overall View
                  </h4>
                </div>
              </div>

              {/* Total Document Count */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-8">
                <span className="font-medium text-foreground">
                  {totalDocCount.toLocaleString()}
                </span>
                <span>total documents</span>
              </div>
            </div>
          </div>
        )}

        {/* KB Items */}
        <div className="space-y-1">
          {!isLoading &&
            !error &&
            filteredKBs.map((kb) => (
              <KBItem
                key={kb.id}
                kb={kb}
                isSelected={selectedKbId === kb.id}
                onSelect={() => {
                  navigate(`/knowledge-base/${kb.id}?tab=overview`);
                  onSelectKb(kb.id);
                }}
              />
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleCreateKB}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Knowledge Base
        </Button>
      </div>

      {/* Create KB Dialog */}
      <CreateKBDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};

export default KBListPanel;

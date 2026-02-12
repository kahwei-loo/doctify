/**
 * SourceExpandedView Component
 *
 * Expanded detail view for a selected data source.
 * Shows source-specific content + AI chunks — the "what AI sees" view.
 * Renders inside SourcesPanel, replacing the source list.
 */

import React from 'react';
import {
  ArrowLeft,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getSourceTypeConfig, isEditableType } from '../utils/sourceTypeConfig';
import { TextContent } from './source-content/TextContent';
import { QAPairsContent } from './source-content/QAPairsContent';
import { UploadedDocsContent } from './source-content/UploadedDocsContent';
import { WebsiteContent } from './source-content/WebsiteContent';
import { StructuredDataContent } from './source-content/StructuredDataContent';
import { ChunksSection } from './source-content/ChunksSection';
import type { DataSource, Embedding } from '../types';
import type { SourceAction } from './SourcesPanel';

interface SourceExpandedViewProps {
  source: DataSource;
  embeddings: Embedding[];
  knowledgeBaseId: string;
  onBack: () => void;
  onAction: (action: SourceAction) => void;
}

const SourceContentView: React.FC<{ source: DataSource }> = ({ source }) => {
  switch (source.type) {
    case 'text':
      return <TextContent source={source} />;
    case 'qa_pairs':
      return <QAPairsContent source={source} />;
    case 'uploaded_docs':
      return <UploadedDocsContent source={source} />;
    case 'website':
      return <WebsiteContent source={source} />;
    case 'structured_data':
      return <StructuredDataContent source={source} />;
    default:
      return <p className="text-sm text-muted-foreground">Unknown source type</p>;
  }
};

export const SourceExpandedView: React.FC<SourceExpandedViewProps> = ({
  source,
  embeddings,
  knowledgeBaseId,
  onBack,
  onAction,
}) => {
  const config = getSourceTypeConfig(source.type);
  const Icon = config.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-7 gap-1 -ml-1 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Sources
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('flex items-center justify-center h-7 w-7 rounded-md shrink-0', config.bgColor)}>
              <Icon className={cn('h-3.5 w-3.5', config.iconColor)} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{source.name}</h3>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs shrink-0',
              source.type === 'structured_data'
                ? 'text-purple-600 border-purple-200'
                : source.status === 'active'
                  ? 'text-green-600 border-green-200'
                  : source.status === 'syncing'
                    ? 'text-blue-600 border-blue-200'
                    : source.status === 'error'
                      ? 'text-red-600 border-red-200'
                      : ''
            )}
          >
            {source.type === 'structured_data' ? 'Analytics' : source.status}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-2">
          {isEditableType(source.type) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('edit')}
              className="h-7 gap-1 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
          {source.type !== 'structured_data' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('regenerate')}
              className="h-7 gap-1 text-xs"
            >
              <RefreshCw className="h-3 w-3" />
              {source.type === 'website' ? 'Crawl & Embed' : 'Re-embed'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction('delete')}
            className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Section 1: Source-specific content */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Content
            </h4>
            <SourceContentView source={source} />
          </div>

          {/* Section 2: Chunks — what AI sees */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              AI Chunks
            </h4>
            <ChunksSection
              embeddings={embeddings}
              knowledgeBaseId={knowledgeBaseId}
              dataSourceId={source.id}
              source={source}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default SourceExpandedView;

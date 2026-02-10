/**
 * DataSourceList Component
 *
 * Displays list of data sources with enhanced cards showing:
 * - Type-specific content previews
 * - Inline embeddings status
 * - Functional action menu (View, Re-generate, Delete)
 */

import React from 'react';
import {
  FileStack,
  Globe,
  FileText,
  MessageSquare,
  Database,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  MoreVertical,
  Calendar,
  Rows3,
  Columns3,
  Eye,
  Pencil,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { DataSource, DataSourceType, DataSourceStatus } from '../types';
import { DataSourceSkeleton } from './DataSourceSkeleton';

interface DataSourceListProps {
  dataSources: DataSource[];
  onDelete?: (dataSource: DataSource) => void;
  onView?: (dataSource: DataSource) => void;
  onEdit?: (dataSource: DataSource) => void;
  onRegenerate?: (dataSource: DataSource) => void;
  isLoading?: boolean;
  className?: string;
}

const getTypeIcon = (type: DataSourceType) => {
  switch (type) {
    case 'uploaded_docs':
      return <FileStack className="h-4 w-4" />;
    case 'website':
      return <Globe className="h-4 w-4" />;
    case 'text':
      return <FileText className="h-4 w-4" />;
    case 'qa_pairs':
      return <MessageSquare className="h-4 w-4" />;
    case 'structured_data':
      return <Database className="h-4 w-4" />;
  }
};

const getTypeLabel = (type: DataSourceType) => {
  switch (type) {
    case 'uploaded_docs':
      return 'Uploaded Documents';
    case 'website':
      return 'Website Crawler';
    case 'text':
      return 'Text Input';
    case 'qa_pairs':
      return 'Q&A Pairs';
    case 'structured_data':
      return 'Structured Data';
  }
};

const StatusBadge: React.FC<{ status: DataSourceStatus }> = ({ status }) => {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      );
    case 'syncing':
      return (
        <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200 bg-blue-50">
          <Loader2 className="h-3 w-3 animate-spin" />
          Syncing
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      );
    case 'paused':
      return (
        <Badge variant="outline" className="gap-1">
          Paused
        </Badge>
      );
  }
};

/**
 * Embeddings status indicator shown inline on cards
 */
const EmbeddingsIndicator: React.FC<{ count: number; status: DataSourceStatus }> = ({ count, status }) => {
  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Processing...</span>
      </div>
    );
  }

  if (count > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Zap className="h-3 w-3" />
        <span>{count} vector{count !== 1 ? 's' : ''} ready</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-600">
      <AlertCircle className="h-3 w-3" />
      <span>No embeddings</span>
    </div>
  );
};

/**
 * Type-specific content preview
 */
const ContentPreview: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  const { type, config } = dataSource;

  switch (type) {
    case 'qa_pairs': {
      const pairs = config.qa_pairs || [];
      if (pairs.length === 0) return null;
      return (
        <div className="space-y-1.5">
          {pairs.slice(0, 2).map((pair, i) => (
            <div key={pair.id || i} className="border-l-2 border-blue-400/60 pl-2.5">
              <p className="text-xs font-medium text-foreground/80 line-clamp-1">Q: {pair.question}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">A: {pair.answer}</p>
            </div>
          ))}
          {pairs.length > 2 && (
            <p className="text-[11px] text-muted-foreground pl-2.5">+{pairs.length - 2} more pair{pairs.length - 2 !== 1 ? 's' : ''}</p>
          )}
        </div>
      );
    }

    case 'text': {
      const content = config.content || '';
      if (!content) return null;
      return (
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {content.slice(0, 200)}{content.length > 200 ? '...' : ''}
        </p>
      );
    }

    case 'website': {
      const url = config.url || '';
      if (!url) return null;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">{url}</span>
          </div>
          {(config.pages_crawled !== undefined || config.total_pages !== undefined) && (
            <p className="text-[11px] text-muted-foreground">
              {config.pages_crawled || 0} / {config.total_pages || '?'} pages crawled
            </p>
          )}
        </div>
      );
    }

    case 'uploaded_docs': {
      const docIds = config.document_ids || [];
      const count = dataSource.document_count || docIds.length;
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileStack className="h-3 w-3 shrink-0" />
          <span>{count} document{count !== 1 ? 's' : ''} uploaded</span>
        </div>
      );
    }

    case 'structured_data': {
      const fileInfo = config.file_info;
      if (!fileInfo) return null;
      const schema = config.schema_definition;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="h-3 w-3 shrink-0" />
            <span className="truncate">{fileInfo.filename}</span>
          </div>
          {schema?.columns && schema.columns.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Columns: {schema.columns.slice(0, 4).map(c => c.name).join(', ')}
              {schema.columns.length > 4 ? ` +${schema.columns.length - 4}` : ''}
            </p>
          )}
        </div>
      );
    }

    default:
      return null;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface DataSourceCardProps {
  dataSource: DataSource;
  onDelete?: (dataSource: DataSource) => void;
  onView?: (dataSource: DataSource) => void;
  onEdit?: (dataSource: DataSource) => void;
  onRegenerate?: (dataSource: DataSource) => void;
}

const isEditableType = (type: DataSourceType): boolean => {
  return type !== 'uploaded_docs' && type !== 'structured_data';
};

const DataSourceCard: React.FC<DataSourceCardProps> = ({ dataSource, onDelete, onView, onEdit, onRegenerate }) => {
  return (
    <Card className="hover:shadow-md transition-all hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              {getTypeIcon(dataSource.type)}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm truncate">{dataSource.name}</CardTitle>
              <CardDescription className="text-xs">
                {getTypeLabel(dataSource.type)}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <StatusBadge status={dataSource.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(dataSource)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {isEditableType(dataSource.type) && (
                  <DropdownMenuItem onClick={() => onEdit?.(dataSource)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onRegenerate?.(dataSource)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-generate Embeddings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(dataSource)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4 space-y-3">
        {/* Stats */}
        {dataSource.type === 'structured_data' && dataSource.config.file_info ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold flex items-center justify-center gap-1">
                <Rows3 className="h-4 w-4 text-muted-foreground" />
                {dataSource.config.file_info.row_count?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">Rows</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold flex items-center justify-center gap-1">
                <Columns3 className="h-4 w-4 text-muted-foreground" />
                {dataSource.config.file_info.column_count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Columns</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold">{dataSource.document_count || 0}</div>
              <div className="text-xs text-muted-foreground">Documents</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold">{dataSource.embedding_count || 0}</div>
              <div className="text-xs text-muted-foreground">Embeddings</div>
            </div>
          </div>
        )}

        {/* Embeddings Status Indicator */}
        <EmbeddingsIndicator count={dataSource.embedding_count || 0} status={dataSource.status} />

        {/* Content Preview */}
        <ContentPreview dataSource={dataSource} />

        {/* Footer Info */}
        <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t">
          {dataSource.last_synced_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last synced {formatDate(dataSource.last_synced_at)}
            </div>
          )}
          {!dataSource.last_synced_at && dataSource.created_at && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Created {formatDate(dataSource.created_at)}
            </div>
          )}
          {dataSource.error_message && (
            <div className="flex items-start gap-1 text-destructive">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{dataSource.error_message}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyState: React.FC<{ onAddSource?: () => void }> = ({ onAddSource }) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <FileStack className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No Data Sources</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Add your first data source to start building your knowledge base
        </p>
        {onAddSource && (
          <Button onClick={onAddSource}>Add Data Source</Button>
        )}
      </CardContent>
    </Card>
  );
};

export const DataSourceList: React.FC<DataSourceListProps> = ({
  dataSources,
  onDelete,
  onView,
  onEdit,
  onRegenerate,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return <DataSourceSkeleton count={3} className={className} />;
  }

  if (dataSources.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {dataSources.map((dataSource) => (
        <DataSourceCard
          key={dataSource.id}
          dataSource={dataSource}
          onDelete={onDelete}
          onView={onView}
          onEdit={onEdit}
          onRegenerate={onRegenerate}
        />
      ))}
    </div>
  );
};

export default DataSourceList;

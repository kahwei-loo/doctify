/**
 * ViewContentDialog Component
 *
 * Full-screen dialog for viewing complete data source content.
 * Type-specific rendering for all 5 data source types.
 */

import React from 'react';
import {
  FileStack,
  Globe,
  FileText,
  MessageSquare,
  Database,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { DataSource, DataSourceType, DataSourceStatus } from '../types';

interface ViewContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSource: DataSource | null;
  onRegenerate?: (dataSource: DataSource) => void;
}

const getTypeIcon = (type: DataSourceType) => {
  switch (type) {
    case 'uploaded_docs':
      return <FileStack className="h-5 w-5" />;
    case 'website':
      return <Globe className="h-5 w-5" />;
    case 'text':
      return <FileText className="h-5 w-5" />;
    case 'qa_pairs':
      return <MessageSquare className="h-5 w-5" />;
    case 'structured_data':
      return <Database className="h-5 w-5" />;
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

const StatusIndicator: React.FC<{ status: DataSourceStatus }> = ({ status }) => {
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

/** Q&A Pairs full view */
const QAPairsContent: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  const pairs = dataSource.config.qa_pairs || [];

  if (pairs.length === 0) {
    return <p className="text-sm text-muted-foreground">No Q&A pairs configured.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{pairs.length} Q&A Pair{pairs.length !== 1 ? 's' : ''}</h4>
      </div>
      <div className="space-y-3">
        {pairs.map((pair, i) => (
          <div key={pair.id || i} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="shrink-0 mt-0.5">Q</Badge>
              <p className="text-sm font-medium">{pair.question}</p>
            </div>
            <div className="border-t" />
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0 mt-0.5">A</Badge>
              <p className="text-sm text-muted-foreground">{pair.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Text content full view */
const TextContent: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  const content = dataSource.config.content || '';

  if (!content) {
    return <p className="text-sm text-muted-foreground">No text content configured.</p>;
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{content.length.toLocaleString()} characters</h4>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
      <div className="border rounded-lg p-4 bg-muted/30">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
      </div>
    </div>
  );
};

/** Website crawler full view */
const WebsiteContent: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  const { config } = dataSource;
  const url = config.url || '';

  return (
    <div className="space-y-4">
      {url && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium">Target URL</h4>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              {url}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-lg p-3 text-center">
          <div className="text-lg font-bold">{config.pages_crawled || 0}</div>
          <div className="text-xs text-muted-foreground">Pages Crawled</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-lg font-bold">{config.total_pages || '?'}</div>
          <div className="text-xs text-muted-foreground">Total Pages</div>
        </div>
        <div className="border rounded-lg p-3 text-center">
          <div className="text-lg font-bold">{config.max_depth || 1}</div>
          <div className="text-xs text-muted-foreground">Max Depth</div>
        </div>
      </div>

      {(config.include_patterns?.length || config.exclude_patterns?.length) && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium">Crawl Filters</h4>
          {config.include_patterns && config.include_patterns.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-green-600">Include Patterns:</p>
              <div className="flex flex-wrap gap-1.5">
                {config.include_patterns.map((p, i) => (
                  <Badge key={i} variant="outline" className="text-green-600 border-green-200">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {config.exclude_patterns && config.exclude_patterns.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-red-600">Exclude Patterns:</p>
              <div className="flex flex-wrap gap-1.5">
                {config.exclude_patterns.map((p, i) => (
                  <Badge key={i} variant="outline" className="text-red-600 border-red-200">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Uploaded documents full view */
const UploadedDocsContent: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  const docIds = dataSource.config.document_ids || [];
  const count = dataSource.document_count || docIds.length;

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium">Documents</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 text-center">
            <div className="text-lg font-bold">{count}</div>
            <div className="text-xs text-muted-foreground">Total Documents</div>
          </div>
          <div className="border rounded-lg p-3 text-center">
            <div className="text-lg font-bold">{dataSource.embedding_count || 0}</div>
            <div className="text-xs text-muted-foreground">Embeddings</div>
          </div>
        </div>
      </div>

      {docIds.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">Document IDs</h4>
          <div className="space-y-1.5">
            {docIds.map((id, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                <FileText className="h-3 w-3 shrink-0" />
                {id}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** Structured data full view */
const StructuredDataContent: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  const { config } = dataSource;
  const fileInfo = config.file_info;
  const schema = config.schema_definition;

  return (
    <div className="space-y-4">
      {fileInfo && (
        <>
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium">File Information</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{fileInfo.row_count?.toLocaleString() || 0}</div>
                <div className="text-xs text-muted-foreground">Rows</div>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{fileInfo.column_count || 0}</div>
                <div className="text-xs text-muted-foreground">Columns</div>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <div className="text-lg font-bold">{formatBytes(fileInfo.size)}</div>
                <div className="text-xs text-muted-foreground">Size</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4 shrink-0" />
              <span className="font-mono">{fileInfo.filename}</span>
            </div>
          </div>
        </>
      )}

      {schema?.columns && schema.columns.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium">Schema ({schema.columns.length} columns)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Column</th>
                  <th className="text-left py-2 pr-4 font-medium">Type</th>
                  <th className="text-left py-2 pr-4 font-medium">Role</th>
                  <th className="text-left py-2 font-medium">Sample Values</th>
                </tr>
              </thead>
              <tbody>
                {schema.columns.map((col, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{col.name}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs">{col.dtype}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      {col.is_metric && (
                        <Badge variant="secondary" className="text-xs mr-1">Metric</Badge>
                      )}
                      {col.is_dimension && (
                        <Badge variant="secondary" className="text-xs">Dimension</Badge>
                      )}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {col.sample_values?.slice(0, 3).join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

export const ViewContentDialog: React.FC<ViewContentDialogProps> = ({
  open,
  onOpenChange,
  dataSource,
  onRegenerate,
}) => {
  if (!dataSource) return null;

  const renderContent = () => {
    switch (dataSource.type) {
      case 'qa_pairs':
        return <QAPairsContent dataSource={dataSource} />;
      case 'text':
        return <TextContent dataSource={dataSource} />;
      case 'website':
        return <WebsiteContent dataSource={dataSource} />;
      case 'uploaded_docs':
        return <UploadedDocsContent dataSource={dataSource} />;
      case 'structured_data':
        return <StructuredDataContent dataSource={dataSource} />;
      default:
        return <p className="text-sm text-muted-foreground">Unknown data source type.</p>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
              {getTypeIcon(dataSource.type)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="truncate">{dataSource.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-0.5">
                {getTypeLabel(dataSource.type)}
                <StatusIndicator status={dataSource.status} />
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 text-sm py-2">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{dataSource.document_count || 0} documents</span>
          </div>
          <div className={cn(
            'flex items-center gap-1.5',
            (dataSource.embedding_count || 0) > 0 ? 'text-green-600' : 'text-amber-600'
          )}>
            <Zap className="h-3.5 w-3.5" />
            <span>{dataSource.embedding_count || 0} embeddings</span>
          </div>
          {dataSource.created_at && (
            <span className="text-xs text-muted-foreground">
              Created {formatDate(dataSource.created_at)}
            </span>
          )}
        </div>

        <div className="border-t" />

        {/* Error message if any */}
        {dataSource.error_message && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{dataSource.error_message}</span>
          </div>
        )}

        {/* Scrollable content area */}
        <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: 'calc(85vh - 280px)' }}>
          {renderContent()}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {onRegenerate && (
            <Button
              variant="outline"
              onClick={() => onRegenerate(dataSource)}
              className="gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              Re-generate Embeddings
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewContentDialog;

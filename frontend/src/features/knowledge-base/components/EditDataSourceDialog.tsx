/**
 * EditDataSourceDialog Component
 *
 * Dialog for editing an existing data source's name and type-specific content.
 * Supports editing text, Q&A pairs, and website config. Shows read-only views
 * for uploaded_docs and structured_data types.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileStack,
  Globe,
  FileText,
  MessageSquare,
  Database,
  Plus,
  X,
  Loader2,
  Info,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { DataSource, DataSourceConfig, DataSourceType, QAPair } from '../types';

interface EditDataSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSource: DataSource | null;
  onSave: (
    dataSource: DataSource,
    updates: { name?: string; config?: Partial<DataSourceConfig> }
  ) => Promise<void>;
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

/** Text type editor */
const TextEditor: React.FC<{
  content: string;
  onChange: (content: string) => void;
}> = ({ content, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="text-content">Content</Label>
      <Textarea
        id="text-content"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter text content..."
        className="min-h-[200px] resize-y font-mono text-sm"
      />
      <p className="text-xs text-muted-foreground">
        {content.length.toLocaleString()} characters
      </p>
    </div>
  );
};

/** Q&A Pairs editor */
const QAPairsEditor: React.FC<{
  pairs: QAPair[];
  onChange: (pairs: QAPair[]) => void;
}> = ({ pairs, onChange }) => {
  const handleQuestionChange = (index: number, question: string) => {
    const updated = [...pairs];
    updated[index] = { ...updated[index], question };
    onChange(updated);
  };

  const handleAnswerChange = (index: number, answer: string) => {
    const updated = [...pairs];
    updated[index] = { ...updated[index], answer };
    onChange(updated);
  };

  const handleAddPair = () => {
    onChange([
      ...pairs,
      { id: `qa-new-${Date.now()}`, question: '', answer: '' },
    ]);
  };

  const handleRemovePair = (index: number) => {
    const updated = pairs.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Q&A Pairs</Label>
        <Badge variant="secondary" className="text-xs">
          {pairs.length} pair{pairs.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="space-y-3">
        {pairs.map((pair, index) => (
          <div
            key={pair.id || index}
            className="border rounded-lg p-4 space-y-3 relative group"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground shrink-0 mt-2.5">
                #{index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => handleRemovePair(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor={`q-${index}`} className="text-xs">
                  Question
                </Label>
                <Input
                  id={`q-${index}`}
                  value={pair.question}
                  onChange={(e) => handleQuestionChange(index, e.target.value)}
                  placeholder="Enter question..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`a-${index}`} className="text-xs">
                  Answer
                </Label>
                <Textarea
                  id={`a-${index}`}
                  value={pair.answer}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder="Enter answer..."
                  className="min-h-[80px] resize-y"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddPair}
        className="w-full gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Add Q&A Pair
      </Button>
    </div>
  );
};

/** Website type editor */
const WebsiteEditor: React.FC<{
  url: string;
  maxDepth: number;
  onUrlChange: (url: string) => void;
  onMaxDepthChange: (depth: number) => void;
}> = ({ url, maxDepth, onUrlChange, onMaxDepthChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="website-url">URL</Label>
        <Input
          id="website-url"
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="crawl-depth">Crawl Depth</Label>
        <Input
          id="crawl-depth"
          type="number"
          min={1}
          max={5}
          value={maxDepth}
          onChange={(e) => onMaxDepthChange(parseInt(e.target.value) || 1)}
        />
        <p className="text-xs text-muted-foreground">
          Maximum depth for crawling linked pages (1-5)
        </p>
      </div>
    </div>
  );
};

/** Read-only info for uploaded_docs */
const UploadedDocsReadOnly: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  const docIds = dataSource.config.document_ids || [];
  const count = dataSource.document_count || docIds.length;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Uploaded documents cannot be edited. To add more documents, create a new data source.
        </span>
      </div>
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm">
          <FileStack className="h-4 w-4 text-muted-foreground" />
          <span>
            {count} document{count !== 1 ? 's' : ''} uploaded
          </span>
        </div>
        {docIds.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {docIds.map((id, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded"
              >
                <FileText className="h-3 w-3 shrink-0" />
                {id}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/** Read-only info for structured_data */
const StructuredDataReadOnly: React.FC<{ dataSource: DataSource }> = ({ dataSource }) => {
  const fileInfo = dataSource.config.file_info;
  const schema = dataSource.config.schema_definition;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Structured data cannot be edited. To update the data, create a new data source with the updated file.
        </span>
      </div>
      {fileInfo && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{fileInfo.filename}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-sm font-bold">
                {fileInfo.row_count?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-muted-foreground">Rows</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-sm font-bold">{fileInfo.column_count || 0}</div>
              <div className="text-xs text-muted-foreground">Columns</div>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <div className="text-sm font-bold">
                {formatBytes(fileInfo.size)}
              </div>
              <div className="text-xs text-muted-foreground">Size</div>
            </div>
          </div>
        </div>
      )}
      {schema?.columns && schema.columns.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium">
            Schema ({schema.columns.length} columns)
          </h4>
          <div className="text-xs text-muted-foreground">
            {schema.columns.map((c) => c.name).join(', ')}
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

export const EditDataSourceDialog: React.FC<EditDataSourceDialogProps> = ({
  open,
  onOpenChange,
  dataSource,
  onSave,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when dataSource changes
  useEffect(() => {
    if (dataSource) {
      setName(dataSource.name);
      setTextContent(dataSource.config.content || '');
      setQaPairs(
        dataSource.config.qa_pairs
          ? dataSource.config.qa_pairs.map((p) => ({ ...p }))
          : []
      );
      setWebsiteUrl(dataSource.config.url || '');
      setMaxDepth(dataSource.config.max_depth || 1);
    }
  }, [dataSource]);

  // Determine if changes were made
  const hasChanges = useMemo(() => {
    if (!dataSource) return false;

    if (name !== dataSource.name) return true;

    switch (dataSource.type) {
      case 'text':
        return textContent !== (dataSource.config.content || '');
      case 'qa_pairs': {
        const original = dataSource.config.qa_pairs || [];
        if (qaPairs.length !== original.length) return true;
        return qaPairs.some(
          (pair, i) =>
            pair.question !== original[i]?.question ||
            pair.answer !== original[i]?.answer
        );
      }
      case 'website':
        return (
          websiteUrl !== (dataSource.config.url || '') ||
          maxDepth !== (dataSource.config.max_depth || 1)
        );
      case 'uploaded_docs':
      case 'structured_data':
        // Only name can be changed for these types
        return false;
      default:
        return false;
    }
  }, [dataSource, name, textContent, qaPairs, websiteUrl, maxDepth]);

  const handleSave = useCallback(async () => {
    if (!dataSource || !hasChanges) return;

    setIsSaving(true);
    try {
      const updates: { name?: string; config?: Partial<DataSourceConfig> } = {};

      if (name !== dataSource.name) {
        updates.name = name;
      }

      switch (dataSource.type) {
        case 'text':
          if (textContent !== (dataSource.config.content || '')) {
            updates.config = { content: textContent };
          }
          break;
        case 'qa_pairs': {
          const original = dataSource.config.qa_pairs || [];
          const pairsChanged =
            qaPairs.length !== original.length ||
            qaPairs.some(
              (pair, i) =>
                pair.question !== original[i]?.question ||
                pair.answer !== original[i]?.answer
            );
          if (pairsChanged) {
            updates.config = { qa_pairs: qaPairs };
          }
          break;
        }
        case 'website':
          if (
            websiteUrl !== (dataSource.config.url || '') ||
            maxDepth !== (dataSource.config.max_depth || 1)
          ) {
            updates.config = { url: websiteUrl, max_depth: maxDepth };
          }
          break;
      }

      await onSave(dataSource, updates);
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save data source:', err);
    } finally {
      setIsSaving(false);
    }
  }, [dataSource, name, textContent, qaPairs, websiteUrl, maxDepth, hasChanges, onSave, onOpenChange]);

  if (!dataSource) return null;

  const isReadOnly =
    dataSource.type === 'uploaded_docs' || dataSource.type === 'structured_data';

  const renderTypeEditor = () => {
    switch (dataSource.type) {
      case 'text':
        return <TextEditor content={textContent} onChange={setTextContent} />;
      case 'qa_pairs':
        return <QAPairsEditor pairs={qaPairs} onChange={setQaPairs} />;
      case 'website':
        return (
          <WebsiteEditor
            url={websiteUrl}
            maxDepth={maxDepth}
            onUrlChange={setWebsiteUrl}
            onMaxDepthChange={setMaxDepth}
          />
        );
      case 'uploaded_docs':
        return <UploadedDocsReadOnly dataSource={dataSource} />;
      case 'structured_data':
        return <StructuredDataReadOnly dataSource={dataSource} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
              {getTypeIcon(dataSource.type)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle>Edit Data Source</DialogTitle>
              <DialogDescription>{getTypeLabel(dataSource.type)}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea
          className="flex-1 -mx-6 px-6"
          style={{ maxHeight: 'calc(85vh - 200px)' }}
        >
          <div className="space-y-6 py-2">
            {/* Name field - always editable */}
            <div className="space-y-2">
              <Label htmlFor="ds-name">Name</Label>
              <Input
                id="ds-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Data source name"
              />
            </div>

            {/* Type-specific editor */}
            {renderTypeEditor()}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !name.trim()}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditDataSourceDialog;

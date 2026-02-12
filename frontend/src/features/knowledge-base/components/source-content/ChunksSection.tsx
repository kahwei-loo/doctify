/**
 * ChunksSection — shows "what AI actually sees" — the text chunks that were embedded.
 */

import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DataSource, Embedding } from '../../types';

interface ChunksSectionProps {
  embeddings: Embedding[];
  knowledgeBaseId: string;
  dataSourceId: string;
  source?: DataSource;
}

const ChunkItem: React.FC<{ embedding: Embedding; index: number }> = ({
  embedding,
  index,
}) => {
  const [expanded, setExpanded] = useState(false);
  const text = embedding.text_content || '';
  const isLong = text.length > 300;
  const displayText = isLong && !expanded ? text.slice(0, 300) + '...' : text;

  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">
          Chunk #{index + 1}
        </span>
        {embedding.metadata?.token_count && (
          <span className="text-xs text-muted-foreground">
            {embedding.metadata.token_count} tokens
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed whitespace-pre-wrap">{displayText}</p>
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-6 px-2 mt-1 text-xs text-muted-foreground gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </Button>
      )}
    </div>
  );
};

/**
 * Returns a context-aware hint explaining why a data source has no chunks.
 */
function getEmptyStateHint(source?: DataSource): { message: string; detail?: string } {
  if (!source) {
    return { message: 'No chunks yet — content hasn\'t been embedded' };
  }

  switch (source.type) {
    case 'uploaded_docs': {
      const docs = source.config.documents || [];
      const hasOnlyUnsupported = docs.length > 0 && docs.every(
        (d) => d.type.startsWith('image/') || d.type === 'application/octet-stream'
      );
      if (hasOnlyUnsupported) {
        return {
          message: 'Image files cannot be embedded yet',
          detail: 'Only text-based files (.txt, .md, .csv, .json) and digital PDFs with a text layer are supported for embedding. Image and scanned-PDF support (OCR) is planned for a future release.',
        };
      }
      return {
        message: 'No chunks yet — content hasn\'t been embedded',
        detail: 'Click "Re-embed" to generate embeddings. Note: image files and scanned PDFs without a text layer will be skipped.',
      };
    }

    case 'structured_data':
      return {
        message: 'Structured data uses analytics queries instead of text embedding',
        detail: 'This data source is designed for NL-to-SQL analytics. Use the Chat panel to ask questions about this dataset — it queries the data directly rather than through vector search.',
      };

    case 'website': {
      const pagesCrawled = source.config.pages_crawled || 0;
      if (pagesCrawled === 0) {
        return {
          message: 'No pages crawled yet',
          detail: 'The website hasn\'t been crawled. Click "Re-embed" to start crawling and embedding the website content.',
        };
      }
      return { message: 'No chunks yet — content hasn\'t been embedded' };
    }

    default:
      return { message: 'No chunks yet — click "Re-embed" to generate embeddings' };
  }
}

export const ChunksSection: React.FC<ChunksSectionProps> = ({
  embeddings,
  source,
}) => {
  if (embeddings.length === 0) {
    const hint = getEmptyStateHint(source);
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
        <Layers className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1.5" />
        <p className="text-xs text-muted-foreground">
          {hint.message}
        </p>
        {hint.detail && (
          <div className="mt-2 flex items-start gap-1.5 text-left mx-auto max-w-sm">
            <Info className="h-3 w-3 text-muted-foreground/60 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
              {hint.detail}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {embeddings.length} chunk{embeddings.length !== 1 ? 's' : ''}
      </p>

      {embeddings.map((emb, i) => (
        <ChunkItem key={emb.id} embedding={emb} index={i} />
      ))}
    </div>
  );
};

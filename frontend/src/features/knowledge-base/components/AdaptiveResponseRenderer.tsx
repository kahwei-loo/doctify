/**
 * AdaptiveResponseRenderer Component
 *
 * Renders unified query responses adaptively based on intent type:
 * - RAG: Answer text, source citations, groundedness score
 * - Analytics: Chart visualization, SQL query, insights text
 *
 * Part of Unified Knowledge & Insights integration.
 */

import React from 'react';
import {
  FileText,
  BarChart3,
  Code,
  Lightbulb,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChartRenderer } from '@/features/insights/components/ChartRenderer';
import { QueryFeedback } from './QueryFeedback';
import type { UnifiedQueryResponse } from '../types';

interface AdaptiveResponseRendererProps {
  response: UnifiedQueryResponse;
  className?: string;
  compact?: boolean;
}

/**
 * Parse answer text and render source citation references as clickable links.
 * Handles patterns like: (Sources 1, 2, 3), [Source 1, Source 2], (Source 1), etc.
 */
function renderAnswerWithSourceLinks(
  text: string,
  onSourceClick: (index: number) => void
): React.ReactNode {
  // Match (Sources 1, 2, 3), [Source 1, Source 2, Source 3], etc.
  const pattern = /[(\[]Sources?\s+([^)\]]+)[)\]]/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const open = match[0][0];
    const close = open === '(' ? ')' : ']';
    const numbers = match[1].match(/\d+/g)?.map(Number) || [];
    if (numbers.length > 0) {
      parts.push(
        <span key={`src-${match.index}`}>
          {open}
          {numbers.length > 1 ? 'Sources ' : 'Source '}
          {numbers.map((num, i) => (
            <React.Fragment key={num}>
              {i > 0 && ', '}
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                onClick={(e) => { e.stopPropagation(); onSourceClick(num - 1); }}
              >
                {num}
              </button>
            </React.Fragment>
          ))}
          {close}
        </span>
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) return text;
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

/**
 * Intent badge with confidence indicator
 */
const IntentBadge: React.FC<{
  intentType: string;
  confidence: number;
}> = ({ intentType, confidence }) => {
  const isRAG = intentType === 'rag';
  const confidencePercent = (confidence * 100).toFixed(0);

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          'gap-1',
          isRAG
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-indigo-200 bg-indigo-50 text-indigo-700'
        )}
      >
        {isRAG ? (
          <FileText className="h-3 w-3" />
        ) : (
          <BarChart3 className="h-3 w-3" />
        )}
        {isRAG ? 'Document Q&A' : 'Data Analytics'}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {confidencePercent}% confidence
      </span>
    </div>
  );
};

/**
 * RAG Response Section - Answer with sources
 */
const RAGResponseSection: React.FC<{
  response: NonNullable<UnifiedQueryResponse['rag_response']>;
}> = ({ response }) => {
  const [showSources, setShowSources] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState<number | null>(null);
  const sourceCardRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  const handleSourceCitationClick = React.useCallback((sourceIndex: number) => {
    setShowSources(true);
    setHighlightedIndex(sourceIndex);
    setTimeout(() => {
      sourceCardRefs.current[sourceIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(() => setHighlightedIndex(null), 2000);
    }, 150);
  }, []);

  return (
    <div className="space-y-4">
      {/* Answer */}
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <p className="whitespace-pre-wrap leading-relaxed">
          {response.sources && response.sources.length > 0
            ? renderAnswerWithSourceLinks(response.answer, handleSourceCitationClick)
            : response.answer}
        </p>
      </div>

      {/* Groundedness Score */}
      {response.groundedness_score != null && (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Groundedness:</span>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              response.groundedness_score >= 0.8
                ? 'border-green-200 bg-green-50 text-green-700'
                : response.groundedness_score >= 0.6
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                  : 'border-red-200 bg-red-50 text-red-700'
            )}
          >
            {(response.groundedness_score * 100).toFixed(0)}%
          </Badge>
        </div>
      )}

      {/* Sources Toggle */}
      {response.sources && response.sources.length > 0 && (
        <div>
          <button
            onClick={() => setShowSources(!showSources)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSources ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {response.sources.length} source{response.sources.length !== 1 ? 's' : ''}
          </button>

          {showSources && (
            <div className="mt-2 space-y-2">
              {response.sources.map((source, index) => (
                <Card
                  key={index}
                  ref={(el: HTMLDivElement | null) => { sourceCardRefs.current[index] = el; }}
                  className={cn(
                    "border-dashed transition-all duration-300",
                    highlightedIndex === index && "ring-2 ring-blue-400 border-blue-300"
                  )}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs shrink-0">
                            #{index + 1}
                          </Badge>
                          <span className="text-xs font-medium truncate">
                            {source.document_name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {source.chunk_text}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {(source.similarity_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Analytics Response Section - Chart + SQL + Insights
 */
const AnalyticsResponseSection: React.FC<{
  response: NonNullable<UnifiedQueryResponse['analytics_response']>;
}> = ({ response }) => {
  const [showSQL, setShowSQL] = React.useState(false);

  // Build chart config for ChartRenderer
  const chartConfig = response.chart_type
    ? {
        type: response.chart_type as 'bar' | 'line' | 'pie' | 'table' | 'metric_card',
        config: response.chart_config || {},
        data: response.data as Record<string, any>[],
      }
    : null;

  return (
    <div className="space-y-4">
      {/* Chart Visualization */}
      {chartConfig && (
        <div className="rounded-lg border bg-card p-4">
          <ChartRenderer chart={chartConfig} height={280} />
        </div>
      )}

      {/* Data Table (when no chart but has data) */}
      {!chartConfig && response.data && response.data.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <ChartRenderer
            chart={{
              type: 'table',
              config: {},
              data: response.data as Record<string, any>[],
            }}
          />
        </div>
      )}

      {/* Insights Text */}
      {response.insights_text && (
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">{response.insights_text}</p>
        </div>
      )}

      {/* SQL Toggle */}
      {response.sql && (
        <div>
          <button
            onClick={() => setShowSQL(!showSQL)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Code className="h-4 w-4" />
            {showSQL ? 'Hide' : 'Show'} SQL Query
          </button>

          {showSQL && (
            <pre className="mt-2 rounded-lg bg-muted p-3 text-xs font-mono overflow-x-auto">
              <code>{response.sql}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Main AdaptiveResponseRenderer
 */
export const AdaptiveResponseRenderer: React.FC<AdaptiveResponseRendererProps> = ({
  response,
  className,
  compact = false,
}) => {
  const content = (
    <>
      {response.intent_type === 'rag' && response.rag_response ? (
        <RAGResponseSection response={response.rag_response} />
      ) : response.intent_type === 'analytics' && response.analytics_response ? (
        <AnalyticsResponseSection response={response.analytics_response} />
      ) : (
        <p className="text-sm text-muted-foreground">No response data available.</p>
      )}

      {/* Feedback */}
      <div className="border-t pt-2 mt-3">
        <QueryFeedback
          queryId={response.id}
          intentType={response.intent_type === 'analytics' ? 'analytics' : 'rag'}
        />
      </div>
    </>
  );

  if (compact) {
    return (
      <div className={cn('rounded-lg border bg-card', className)}>
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
          <IntentBadge
            intentType={response.intent_type}
            confidence={response.confidence}
          />
          <span className="text-[10px] text-muted-foreground">
            {new Date(response.created_at).toLocaleTimeString()}
          </span>
        </div>
        <div className="px-3 py-2.5 space-y-3">
          {content}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <IntentBadge
            intentType={response.intent_type}
            confidence={response.confidence}
          />
          <span className="text-xs text-muted-foreground">
            {new Date(response.created_at).toLocaleTimeString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  );
};

export default AdaptiveResponseRenderer;

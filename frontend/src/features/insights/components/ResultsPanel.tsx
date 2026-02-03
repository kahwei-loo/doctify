/**
 * ResultsPanel Component
 *
 * Displays query results with AI response, charts, insights, and SQL.
 */

import React, { useState } from 'react';
import {
  Lightbulb,
  Code2,
  Copy,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChartRenderer } from './ChartRenderer';
import type { QueryResponse, QueryHistoryItem, QueryStatus } from '../types';

// Union type for both full response and history items
type DisplayableResult = QueryResponse | QueryHistoryItem;

interface ResultsPanelProps {
  result: DisplayableResult | null;
  isLoading?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  QueryStatus,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  completed: {
    icon: Check,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Completed',
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Processing',
  },
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Pending',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Error',
  },
};

/**
 * Loading State
 */
const LoadingState: React.FC = () => (
  <Card className="w-full">
    <CardContent className="pt-6">
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Analyzing your question...</p>
        <p className="text-xs text-muted-foreground mt-1">
          This may take a few seconds
        </p>
      </div>
    </CardContent>
  </Card>
);

/**
 * Empty State
 */
const EmptyState: React.FC = () => (
  <Card className="w-full">
    <CardContent className="pt-6">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground">
          Ask a question about your data
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Results will appear here
        </p>
      </div>
    </CardContent>
  </Card>
);

/**
 * Error State
 */
const ErrorState: React.FC<{ message?: string }> = ({ message }) => (
  <Card className="w-full border-destructive/50">
    <CardContent className="pt-6">
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="font-medium text-destructive">Something went wrong</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {message || 'Failed to process your query. Please try again.'}
        </p>
      </div>
    </CardContent>
  </Card>
);

/**
 * SQL Code Block with Copy
 */
const SQLCodeBlock: React.FC<{ sql: string }> = ({ sql }) => {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Generated SQL
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="relative mt-2">
          <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm font-mono">
            <code>{sql}</code>
          </pre>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/**
 * Insights List
 */
const InsightsList: React.FC<{ insights: string[] }> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        Key Insights
      </h4>
      <ul className="space-y-2">
        {insights.map((insight, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-xs shrink-0">
              {index + 1}
            </span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  result,
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (!result) {
    return <EmptyState />;
  }

  if (result.status === 'error') {
    const errorMessage = 'error_message' in result ? result.error_message : undefined;
    return <ErrorState message={errorMessage} />;
  }

  const statusConfig = STATUS_CONFIG[result.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Query Results
          </CardTitle>
          <div className="flex items-center gap-2">
            {'execution_time_ms' in result && result.execution_time_ms && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {result.execution_time_ms}ms
              </Badge>
            )}
            <Badge variant="secondary" className={cn(statusConfig.color, statusConfig.bgColor)}>
              <StatusIcon
                className={cn(
                  'h-3 w-3 mr-1',
                  result.status === 'processing' && 'animate-spin'
                )}
              />
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* User Query */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs text-muted-foreground mb-1">Your question:</p>
          <p className="text-sm">{result.user_input}</p>
        </div>

        {/* AI Response Text */}
        {result.response_text && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-sm leading-relaxed">{result.response_text}</p>
          </div>
        )}

        {/* Chart Visualization */}
        {result.response_chart && (
          <div className="border rounded-lg p-4">
            <ChartRenderer chart={result.response_chart} height={300} />
          </div>
        )}

        {/* Insights */}
        {'response_insights' in result && result.response_insights && result.response_insights.length > 0 && (
          <InsightsList insights={result.response_insights} />
        )}

        {/* Generated SQL */}
        {'generated_sql' in result && result.generated_sql && <SQLCodeBlock sql={result.generated_sql} />}
      </CardContent>
    </Card>
  );
};

export default ResultsPanel;

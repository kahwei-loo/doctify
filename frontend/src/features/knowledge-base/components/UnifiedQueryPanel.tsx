/**
 * UnifiedQueryPanel Component
 *
 * Natural language query interface for unified KB queries.
 * Routes queries through the Intent Classifier → Pipeline Router:
 * - RAG queries: streamed answer with sources
 * - Analytics queries: chart + SQL + insights
 *
 * Part of Unified Knowledge & Insights integration.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Send,
  Loader2,
  AlertCircle,
  MessageSquare,
  Trash2,
  RotateCcw,
  SearchX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { AdaptiveResponseRenderer } from './AdaptiveResponseRenderer';
import {
  useUnifiedQueryMutation,
  streamUnifiedQuery,
} from '@/store/api/ragApi';
import type { UnifiedQueryResponse } from '../types';

const QUERY_TIMEOUT_MS = 30_000;

interface UnifiedQueryPanelProps {
  knowledgeBaseId: string;
  className?: string;
  variant?: 'default' | 'panel';
}

interface QueryHistoryItem {
  id: string;
  query: string;
  response: UnifiedQueryResponse | null;
  isStreaming: boolean;
  streamedAnswer: string;
  error?: string;
}

/**
 * Classify an error into a user-friendly message.
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return 'Query timed out. Try a simpler question.';
  }
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Unable to connect. Check your internet connection.';
  }
  if (err instanceof Error) {
    // Server error patterns from streamUnifiedQuery (throws "HTTP 5xx")
    const httpMatch = err.message.match(/HTTP\s+(\d+)/);
    if (httpMatch) {
      const status = parseInt(httpMatch[1], 10);
      if (status >= 500) return 'Server error. Please try again later.';
      if (status === 429) return 'Too many requests. Please wait a moment.';
      if (status >= 400) return 'Request error. Please try rephrasing your question.';
    }
    if (err.message) return err.message;
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Check if a completed response has no meaningful content.
 */
function isEmptyResult(item: QueryHistoryItem): boolean {
  if (item.streamedAnswer) return false;
  if (!item.response) return true;
  const r = item.response;
  if (r.rag_response?.answer) return false;
  if (r.analytics_response?.data && r.analytics_response.data.length > 0) return false;
  if (r.analytics_response?.insights_text) return false;
  return true;
}

export const UnifiedQueryPanel: React.FC<UnifiedQueryPanelProps> = ({
  knowledgeBaseId,
  className,
  variant = 'default',
}) => {
  const isPanel = variant === 'panel';
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [unifiedQuery] = useUnifiedQueryMutation();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  const handleSubmit = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const itemId = `q-${Date.now()}`;
    const newItem: QueryHistoryItem = {
      id: itemId,
      query: trimmedQuery,
      response: null,
      isStreaming: true,
      streamedAnswer: '',
    };

    setHistory((prev) => [...prev, newItem]);
    setQuery('');
    scrollToBottom();

    // Try streaming first, with a 30s timeout
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException('Query timed out', 'TimeoutError'));
    }, QUERY_TIMEOUT_MS);

    try {
      let streamedText = '';
      // Accumulators for building a proper UnifiedQueryResponse after streaming
      let intentType: 'rag' | 'analytics' = 'rag';
      let intentConfidence = 0;
      let streamedSources: Array<{
        chunk_text: string;
        document_id: string;
        document_name: string;
        similarity_score: number;
      }> = [];
      let analyticsData: any = null;
      let doneMetadata: { query_id?: string; created_at?: string; conversation_id?: string } = {};

      await streamUnifiedQuery(
        knowledgeBaseId,
        {
          query: trimmedQuery,
          conversation_id: conversationId,
        },
        (event) => {
          switch (event.type) {
            case 'intent': {
              const intentData = event.data as any;
              if (intentData?.intent_type) intentType = intentData.intent_type;
              if (intentData?.confidence) intentConfidence = intentData.confidence;
              break;
            }
            case 'sources': {
              const sources = event.data as any[];
              if (Array.isArray(sources)) {
                streamedSources = sources;
              }
              break;
            }
            case 'chunk': {
              const text = event.data as string;
              streamedText += text;
              setHistory((prev) =>
                prev.map((item) =>
                  item.id === itemId
                    ? { ...item, streamedAnswer: streamedText }
                    : item
                )
              );
              scrollToBottom();
              break;
            }
            case 'analytics_result': {
              analyticsData = event.data;
              break;
            }
            case 'done': {
              const data = event.data as any;
              if (data) {
                doneMetadata = {
                  query_id: data.query_id,
                  created_at: data.created_at,
                  conversation_id: data.conversation_id,
                };
              }
              break;
            }
            case 'error': {
              const errMsg = (event.data as { message?: string })?.message || 'Query failed';
              setHistory((prev) =>
                prev.map((item) =>
                  item.id === itemId
                    ? { ...item, isStreaming: false, error: errMsg }
                    : item
                )
              );
              break;
            }
          }
        },
        controller.signal
      );

      // Track conversation ID from done metadata
      if (!conversationId && doneMetadata.conversation_id) {
        setConversationId(doneMetadata.conversation_id);
      }

      // Build a proper UnifiedQueryResponse from accumulated streaming data
      const hasRagContent = streamedText.length > 0;
      const hasAnalyticsContent = analyticsData != null;

      if (hasRagContent || hasAnalyticsContent) {
        const builtResponse: UnifiedQueryResponse = {
          id: doneMetadata.query_id || itemId,
          intent_type: hasAnalyticsContent ? 'analytics' : 'rag',
          confidence: intentConfidence || 0.8,
          created_at: doneMetadata.created_at || new Date().toISOString(),
          ...(hasRagContent && {
            rag_response: {
              answer: streamedText,
              sources: streamedSources,
            },
          }),
          ...(hasAnalyticsContent && {
            analytics_response: analyticsData,
          }),
        };

        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, response: builtResponse, isStreaming: false }
              : item
          )
        );
      } else {
        // No meaningful content received
        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, isStreaming: false } : item
          )
        );
      }
    } catch (err: any) {
      // User-initiated abort — silently ignore
      if (err.name === 'AbortError' && !(err instanceof DOMException && err.message === 'Query timed out')) {
        return;
      }

      // Timeout or network error — show differentiated message, skip non-streaming fallback
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, isStreaming: false, error: getErrorMessage(err) }
              : item
          )
        );
        return;
      }

      // Fallback to non-streaming mutation
      try {
        const result = await unifiedQuery({
          kbId: knowledgeBaseId,
          request: {
            query: trimmedQuery,
            conversation_id: conversationId,
            stream: false,
          },
        }).unwrap();

        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, response: result as unknown as UnifiedQueryResponse, isStreaming: false }
              : item
          )
        );
      } catch (fallbackErr: any) {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  isStreaming: false,
                  error: getErrorMessage(fallbackErr),
                }
              : item
          )
        );
      }
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
      scrollToBottom();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClearHistory = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setHistory([]);
    setConversationId(undefined);
  };

  const isLoading = history.some((item) => item.isStreaming);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Clear button — floats top-right when history exists */}
      {history.length > 0 && (
        <div className="flex items-center justify-end shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="gap-1.5 text-muted-foreground h-7 text-xs"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 min-h-0 mb-3" ref={scrollRef}>
        <ScrollArea className="h-full">
          <div className="pr-3">
          {history.length === 0 ? (
            <div className={cn(
              "flex flex-col items-center justify-center text-center h-full",
              isPanel ? "py-8" : "py-16"
            )}>
              <MessageSquare className={cn(
                "text-muted-foreground/30 mb-3",
                isPanel ? "h-10 w-10" : "h-12 w-12"
              )} />
              <h4 className={cn("font-medium mb-1", isPanel ? "text-base" : "text-lg")}>Ask Anything</h4>
              <p className={cn("text-muted-foreground mb-4", isPanel ? "text-xs max-w-[220px]" : "text-sm max-w-md")}>
                Ask questions about your documents or analyze datasets.
              </p>
              <div className={cn(
                "grid gap-2 text-xs text-muted-foreground w-full",
                isPanel ? "grid-cols-1 max-w-[260px]" : "grid-cols-1 sm:grid-cols-2 max-w-md"
              )}>
                <button
                  type="button"
                  className="rounded-lg border border-dashed p-2.5 text-left hover:border-primary/40 hover:bg-muted/50 transition-colors"
                  onClick={() => setQuery('What is the refund policy?')}
                >
                  <span className="font-medium text-blue-600">Q&A:</span>{' '}
                  &ldquo;What is the refund policy?&rdquo;
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-dashed p-2.5 text-left hover:border-primary/40 hover:bg-muted/50 transition-colors"
                  onClick={() => setQuery('Summarize the key findings')}
                >
                  <span className="font-medium text-blue-600">Q&A:</span>{' '}
                  &ldquo;Summarize the key findings&rdquo;
                </button>
              </div>
            </div>
          ) : (
            <div className={cn(isPanel ? "space-y-4" : "space-y-6")}>
              {history.map((item) => (
                <div key={item.id} className={cn(isPanel ? "space-y-2" : "space-y-3")}>
                  {/* User Query */}
                  <div className="flex justify-end">
                    <div className={cn(
                      "bg-primary text-primary-foreground rounded-lg max-w-[85%]",
                      isPanel ? "px-3 py-1.5" : "px-4 py-2"
                    )}>
                      <p className={cn(isPanel ? "text-xs" : "text-sm")}>{item.query}</p>
                    </div>
                  </div>

                  {/* Response */}
                  <div>
                    {item.error ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <span>{item.error}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setQuery(item.query);
                              setHistory((prev) =>
                                prev.filter((h) => h.id !== item.id)
                              );
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : item.isStreaming ? (
                      <div className="space-y-2">
                        {item.streamedAnswer ? (
                          <div className="rounded-lg border bg-card p-4">
                            <p className="text-sm whitespace-pre-wrap">
                              {item.streamedAnswer}
                              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing your query...
                          </div>
                        )}
                      </div>
                    ) : !item.isStreaming && isEmptyResult(item) ? (
                      <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-6 text-center">
                        <SearchX className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          No relevant results found. Try rephrasing your question.
                        </p>
                      </div>
                    ) : item.response ? (
                      <AdaptiveResponseRenderer response={item.response} compact={isPanel} />
                    ) : item.streamedAnswer ? (
                      // Streamed RAG answer without structured response
                      <div className="rounded-lg border bg-card p-4">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {item.streamedAnswer}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </ScrollArea>
      </div>

      {/* Query Input */}
      <div className={cn("border-t shrink-0", isPanel ? "pt-3" : "pt-4")}>
        <div className="flex gap-2">
          <Textarea
            placeholder={isPanel ? "Ask a question..." : "Ask about your documents or data..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={isPanel ? 1 : 2}
            disabled={isLoading}
            className={cn("resize-none", isPanel && "text-sm min-h-[36px]")}
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
            size="icon"
            className={cn("h-auto", isPanel ? "min-h-[36px]" : "min-h-[60px]")}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className={cn("text-muted-foreground mt-1", isPanel ? "text-[10px]" : "text-xs")}>
          Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default UnifiedQueryPanel;

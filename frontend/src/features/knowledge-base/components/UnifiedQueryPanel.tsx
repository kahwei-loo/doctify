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
}) => {
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
      let finalResponse: UnifiedQueryResponse | null = null;
      let streamedText = '';

      await streamUnifiedQuery(
        knowledgeBaseId,
        {
          query: trimmedQuery,
          conversation_id: conversationId,
        },
        (event) => {
          switch (event.type) {
            case 'intent': {
              // Intent classification received
              break;
            }
            case 'sources': {
              // Sources received during RAG streaming
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
              // Analytics result (non-streaming)
              finalResponse = event.data as UnifiedQueryResponse;
              break;
            }
            case 'done': {
              const doneData = event.data as UnifiedQueryResponse;
              if (doneData) {
                finalResponse = doneData;
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

      if (finalResponse) {
        if (!conversationId && (finalResponse as any).conversation_id) {
          setConversationId((finalResponse as any).conversation_id);
        }
        setHistory((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, response: finalResponse, isStreaming: false }
              : item
          )
        );
      } else {
        // Streaming completed without a final response object — build one from streamed text
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium">Unified Query</h3>
          <p className="text-sm text-muted-foreground">
            Ask questions about your documents or analyze your data
          </p>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearHistory}
            className="gap-2 text-muted-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Chat History */}
      <div className="flex-1 min-h-0 mb-4" ref={scrollRef}>
        <ScrollArea className="h-full">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="text-lg font-medium mb-2">Ask Anything</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                Ask questions about your documents (RAG) or analyze structured
                datasets. The system automatically routes your query to the right
                pipeline.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded-lg border border-dashed p-3 text-left">
                  <span className="font-medium text-blue-600">Document Q&A:</span>{' '}
                  &ldquo;What is the refund policy?&rdquo;
                </div>
                <div className="rounded-lg border border-dashed p-3 text-left">
                  <span className="font-medium text-indigo-600">Analytics:</span>{' '}
                  &ldquo;Show monthly revenue trend&rdquo;
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((item) => (
                <div key={item.id} className="space-y-3">
                  {/* User Query */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                      <p className="text-sm">{item.query}</p>
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
                      <AdaptiveResponseRenderer response={item.response} />
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
        </ScrollArea>
      </div>

      {/* Query Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Ask about your documents or data..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            disabled={isLoading}
            className="resize-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim()}
            size="icon"
            className="h-auto min-h-[60px]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default UnifiedQueryPanel;

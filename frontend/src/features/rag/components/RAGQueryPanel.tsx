/**
 * RAG Query Panel Component
 *
 * Interactive panel for asking questions about documents.
 * Phase 11 - RAG Implementation
 * Enhanced: P0.2 search modes, P1.1 reranking, P1.2 streaming
 */

import React, { useState, useRef } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useQueryDocumentsMutation } from '@/store/api/ragApi';
import { streamRAGQuery } from '@/store/api/ragApi';
import type { RAGQueryResponse, SearchMode, StreamEvent, StreamDoneData, RAGSource } from '@/store/api/ragApi';

interface RAGQueryPanelProps {
  conversationId?: string;
  onQueryComplete?: (response: RAGQueryResponse) => void;
  onStreamingToken?: (token: string) => void;
  onStreamingSources?: (sources: RAGSource[]) => void;
  onStreamingDone?: (data: StreamDoneData) => void;
}

export function RAGQueryPanel({
  conversationId,
  onQueryComplete,
  onStreamingToken,
  onStreamingSources,
  onStreamingDone,
}: RAGQueryPanelProps) {
  const [question, setQuestion] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid');
  const [useReranking, setUseReranking] = useState(false);
  const [useStreaming, setUseStreaming] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [queryDocuments, { isLoading, error }] = useQueryDocumentsMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const requestBody = {
      question,
      search_mode: searchMode,
      use_reranking: useReranking,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    };

    if (useStreaming) {
      // Streaming mode
      setIsStreaming(true);
      setStreamError(null);
      abortRef.current = new AbortController();

      try {
        await streamRAGQuery(
          requestBody,
          (event: StreamEvent) => {
            switch (event.type) {
              case 'sources':
                onStreamingSources?.(event.data as RAGSource[]);
                break;
              case 'token':
                onStreamingToken?.(event.data as string);
                break;
              case 'done':
                onStreamingDone?.(event.data as StreamDoneData);
                break;
              case 'error':
                setStreamError(event.data as string);
                break;
            }
          },
          abortRef.current.signal,
        );
        setQuestion('');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setStreamError((err as Error).message || 'Streaming failed');
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    } else {
      // Non-streaming mode (original)
      try {
        const response = await queryDocuments(requestBody).unwrap();
        onQueryComplete?.(response);
        setQuestion('');
      } catch (err) {
        console.error('RAG query failed:', err);
      }
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const isBusy = isLoading || isStreaming;
  const displayError = streamError || (error
    ? (error && typeof error === 'object' && 'data' in error
        ? ((error as { data?: { detail?: string } }).data?.detail || 'Failed to process query')
        : 'Failed to process query')
    : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="h-5 w-5" />
          Ask a Question
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="min-h-[100px]"
            disabled={isBusy}
          />

          {/* Search Options */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex-1 max-w-[180px] space-y-2">
              <Label htmlFor="search-mode">Search Mode</Label>
              <Select
                value={searchMode}
                onValueChange={(v) => setSearchMode(v as SearchMode)}
                disabled={isBusy}
              >
                <SelectTrigger id="search-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">Hybrid (Recommended)</SelectItem>
                  <SelectItem value="semantic">Semantic Only</SelectItem>
                  <SelectItem value="keyword">Keyword Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                id="reranking"
                checked={useReranking}
                onCheckedChange={setUseReranking}
                disabled={isBusy}
              />
              <Label htmlFor="reranking" className="text-sm cursor-pointer">
                Reranking
              </Label>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                id="streaming"
                checked={useStreaming}
                onCheckedChange={setUseStreaming}
                disabled={isBusy}
              />
              <Label htmlFor="streaming" className="text-sm cursor-pointer">
                Stream
              </Label>
            </div>
          </div>

          {displayError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{displayError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isBusy || !question.trim()}
              className="flex-1"
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isStreaming ? 'Streaming...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Ask Question
                </>
              )}
            </Button>
            {isStreaming && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

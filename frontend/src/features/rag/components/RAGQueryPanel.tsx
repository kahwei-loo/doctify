/**
 * RAG Query Panel Component
 *
 * Interactive panel for asking questions about documents.
 * Phase 11 - RAG Implementation
 */

import React, { useState } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQueryDocumentsMutation } from '@/store/api/ragApi';
import type { RAGQueryResponse } from '@/store/api/ragApi';

interface RAGQueryPanelProps {
  onQueryComplete?: (response: RAGQueryResponse) => void;
}

export function RAGQueryPanel({ onQueryComplete }: RAGQueryPanelProps) {
  const [question, setQuestion] = useState('');
  const [queryDocuments, { isLoading, error }] = useQueryDocumentsMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) return;

    try {
      const response = await queryDocuments({ question }).unwrap();
      onQueryComplete?.(response);
      setQuestion(''); // Clear input after successful query
    } catch (err) {
      // Error handled by RTK Query
      console.error('RAG query failed:', err);
    }
  };

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
            disabled={isLoading}
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {'data' in error && error.data
                  ? (error.data as { detail?: string }).detail || 'Failed to process query'
                  : 'Failed to process query'}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Ask Question
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

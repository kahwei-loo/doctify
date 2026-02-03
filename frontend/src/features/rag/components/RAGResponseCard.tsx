/**
 * RAG Response Card Component
 *
 * Displays RAG query response with sources and feedback options.
 * Phase 11 - RAG Implementation
 */

import React, { useState } from 'react';
import { FileText, ThumbsUp, ThumbsDown, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSubmitRAGFeedbackMutation } from '@/store/api/ragApi';
import type { RAGQueryResponse, RAGSource } from '@/store/api/ragApi';
import { formatConfidence, formatSimilarity, formatQueryDate } from '@/store/api/ragApi';

interface RAGResponseCardProps {
  response: RAGQueryResponse;
}

export function RAGResponseCard({ response }: RAGResponseCardProps) {
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [submitFeedback] = useSubmitRAGFeedbackMutation();
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const handleFeedback = async (rating: number) => {
    try {
      await submitFeedback({
        queryId: response.id,
        feedback: { rating }
      }).unwrap();
      setFeedbackGiven(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const getConfidenceBadgeVariant = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Answer</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getConfidenceBadgeVariant(response.confidence_score)} className="text-xs">
              {formatConfidence(response.confidence_score)} confidence
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {response.model_used}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {response.tokens_used} tokens
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatQueryDate(response.created_at)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Your question:</p>
          <p className="text-sm font-medium">{response.question}</p>
        </div>

        {/* Answer */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap">{response.answer}</p>
        </div>

        {/* Sources */}
        {response.sources && response.sources.length > 0 && (
          <Collapsible open={isSourcesOpen} onOpenChange={setIsSourcesOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                {isSourcesOpen ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide Sources ({response.sources.length})
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    View Sources ({response.sources.length})
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2">
              {response.sources.map((source: RAGSource, index: number) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{source.document_name}</span>
                      {source.document_title && (
                        <span className="text-xs text-muted-foreground">
                          ({source.document_title})
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatSimilarity(source.similarity_score)} match
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                    {source.chunk_text}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Chunk {source.chunk_index + 1}
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => {
                        // Navigate to document detail
                        window.location.href = `/documents/${source.document_id}`;
                      }}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      View Document
                    </Button>
                  </div>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Context Used */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{response.context_used} chunks used for context</span>
        </div>

        {/* Feedback */}
        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">Was this helpful?</span>
          <div className="flex items-center gap-2">
            <Button
              variant={feedbackGiven ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleFeedback(5)}
              disabled={feedbackGiven}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant={feedbackGiven ? "secondary" : "outline"}
              size="sm"
              onClick={() => handleFeedback(1)}
              disabled={feedbackGiven}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

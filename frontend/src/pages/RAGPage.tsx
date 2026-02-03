/**
 * RAG Page
 *
 * Main page for RAG (Retrieval Augmented Generation) document Q&A.
 * Phase 11 - RAG Implementation
 */

import React, { useState } from 'react';
import { MessageSquare, History, TrendingUp, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RAGQueryPanel } from '@/features/rag/components/RAGQueryPanel';
import { RAGResponseCard } from '@/features/rag/components/RAGResponseCard';
import {
  NoQuestionsState,
  NoHistoryState,
  NoStatsState,
} from '@/features/rag/components/EmptyStates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetRAGHistoryQuery, useGetRAGStatsQuery } from '@/store/api/ragApi';
import type { RAGQueryResponse } from '@/store/api/ragApi';
import { formatConfidence } from '@/store/api/ragApi';

export default function RAGPage() {
  const [responses, setResponses] = useState<RAGQueryResponse[]>([]);
  const { data: history, isLoading: historyLoading } = useGetRAGHistoryQuery({ limit: 50 });
  const { data: stats, isLoading: statsLoading } = useGetRAGStatsQuery();

  const handleQueryComplete = (response: RAGQueryResponse) => {
    setResponses((prev) => [response, ...prev]);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          Document Q&A
        </h1>
        <p className="text-muted-foreground mt-2">
          Ask questions about your processed documents and get AI-powered answers with source citations.
        </p>
      </div>

      <Tabs defaultValue="query" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="query">
            <MessageSquare className="mr-2 h-4 w-4" />
            Ask Questions
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="stats">
            <TrendingUp className="mr-2 h-4 w-4" />
            Statistics
          </TabsTrigger>
        </TabsList>

        {/* Query Tab */}
        <TabsContent value="query" className="space-y-6">
          <RAGQueryPanel onQueryComplete={handleQueryComplete} />

          {/* Current Session Responses */}
          {responses.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Responses</h2>
              {responses.map((response) => (
                <RAGResponseCard key={response.id} response={response} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {responses.length === 0 && <NoQuestionsState />}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {historyLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : history && history.items.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Query History</h2>
                <p className="text-sm text-muted-foreground">
                  Total: {history.total} queries
                </p>
              </div>
              {history.items.map((item) => (
                <RAGResponseCard
                  key={item.id}
                  response={{
                    ...item,
                    answer: item.answer || 'No answer recorded',
                    sources: item.sources || [],
                    model_used: item.model_used || 'Unknown',
                    tokens_used: item.tokens_used || 0,
                    confidence_score: item.confidence_score || 0,
                    context_used: 0,
                  }}
                />
              ))}
            </>
          ) : (
            <NoHistoryState />
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          {statsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : stats ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_queries}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Documents Indexed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_documents_indexed}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.total_chunks} chunks total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Average Confidence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatConfidence(stats.average_confidence)}
                  </div>
                </CardContent>
              </Card>

              {stats.average_rating !== null && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(stats.average_rating ?? 0).toFixed(1)} / 5.0
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.queries_with_feedback} queries rated
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Feedback Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.total_queries > 0
                      ? ((stats.queries_with_feedback / stats.total_queries) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.queries_with_feedback} of {stats.total_queries} queries
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_chunks}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available for semantic search
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <NoStatsState />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

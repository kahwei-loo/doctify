/**
 * RAG Page
 *
 * Main page for RAG (Retrieval Augmented Generation) document Q&A.
 * Phase 11 - RAG Implementation
 * Enhanced: P1.3 Conversational RAG with sidebar
 */

import React, { useState, useCallback } from "react";
import {
  MessageSquare,
  History,
  TrendingUp,
  Loader2,
  Plus,
  Trash2,
  MessagesSquare,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RAGQueryPanel } from "@/features/rag/components/RAGQueryPanel";
import { RAGResponseCard } from "@/features/rag/components/RAGResponseCard";
import {
  NoQuestionsState,
  NoHistoryState,
  NoStatsState,
} from "@/features/rag/components/EmptyStates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useGetRAGHistoryQuery,
  useGetRAGStatsQuery,
  useGetConversationsQuery,
  useCreateConversationMutation,
  useDeleteConversationMutation,
  useGetConversationQuery,
  useGetEvaluationsQuery,
  useTriggerEvaluationMutation,
} from "@/store/api/ragApi";
import type { RAGQueryResponse, RAGSource, StreamDoneData } from "@/store/api/ragApi";
import { formatConfidence, formatQueryDate } from "@/store/api/ragApi";
import { Badge } from "@/components/ui/badge";

export default function RAGPage() {
  const [responses, setResponses] = useState<RAGQueryResponse[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [streamingSources, setStreamingSources] = useState<RAGSource[]>([]);

  const { data: history, isLoading: historyLoading } = useGetRAGHistoryQuery({ limit: 50 });
  const { data: stats, isLoading: statsLoading } = useGetRAGStatsQuery();
  const { data: evaluations, isLoading: evaluationsLoading } = useGetEvaluationsQuery({ limit: 5 });
  const [triggerEvaluation, { isLoading: evaluationRunning }] = useTriggerEvaluationMutation();
  const { data: conversations, isLoading: conversationsLoading } = useGetConversationsQuery({
    limit: 50,
  });
  const { data: activeConversation } = useGetConversationQuery(activeConversationId!, {
    skip: !activeConversationId,
  });
  const [createConversation, { isLoading: isCreating }] = useCreateConversationMutation();
  const [deleteConversation] = useDeleteConversationMutation();

  const handleQueryComplete = (response: RAGQueryResponse) => {
    setResponses((prev) => [response, ...prev]);
    setStreamingAnswer("");
    setStreamingSources([]);
  };

  const handleStreamingToken = useCallback((token: string) => {
    setStreamingAnswer((prev) => prev + token);
  }, []);

  const handleStreamingSources = useCallback((sources: RAGSource[]) => {
    setStreamingSources(sources);
  }, []);

  const handleStreamingDone = useCallback(
    (data: StreamDoneData) => {
      // Build a synthetic response from streaming data
      const response: RAGQueryResponse = {
        id: crypto.randomUUID(),
        question: "",
        answer: data.answer,
        sources: streamingSources,
        model_used: data.model_used,
        tokens_used: data.tokens_used,
        confidence_score: data.confidence_score,
        context_used: data.context_used,
        created_at: new Date().toISOString(),
      };
      setResponses((prev) => [response, ...prev]);
      setStreamingAnswer("");
      setStreamingSources([]);
    },
    [streamingSources]
  );

  const handleNewConversation = async () => {
    try {
      const conv = await createConversation({}).unwrap();
      setActiveConversationId(conv.id);
      setResponses([]);
      setStreamingAnswer("");
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    setResponses([]);
    setStreamingAnswer("");
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id).unwrap();
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setResponses([]);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleExitConversation = () => {
    setActiveConversationId(null);
    setResponses([]);
    setStreamingAnswer("");
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          Document Q&A
        </h1>
        <p className="text-muted-foreground mt-2">
          Ask questions about your processed documents and get AI-powered answers with source
          citations.
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
        <TabsContent value="query" className="space-y-0">
          <div className="flex gap-6">
            {/* Conversation Sidebar */}
            <div className="w-64 shrink-0">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Conversations</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleNewConversation}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Single-query mode button */}
                  <button
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors border-b ${
                      !activeConversationId ? "bg-muted font-medium" : ""
                    }`}
                    onClick={handleExitConversation}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Single Query</span>
                    </div>
                  </button>

                  <ScrollArea className="h-[400px]">
                    {conversationsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : conversations && conversations.items.length > 0 ? (
                      conversations.items.map((conv) => (
                        <button
                          key={conv.id}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors border-b group ${
                            activeConversationId === conv.id ? "bg-muted font-medium" : ""
                          }`}
                          onClick={() => handleSelectConversation(conv.id)}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <MessagesSquare className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{conv.title}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatQueryDate(conv.updated_at)}
                          </p>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <MessagesSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          No conversations yet. Click + to start one.
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Main Query Area */}
            <div className="flex-1 space-y-6">
              {activeConversationId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessagesSquare className="h-4 w-4" />
                  <span>Conversation: {activeConversation?.title || "Loading..."}</span>
                </div>
              )}

              <RAGQueryPanel
                conversationId={activeConversationId ?? undefined}
                onQueryComplete={handleQueryComplete}
                onStreamingToken={handleStreamingToken}
                onStreamingSources={handleStreamingSources}
                onStreamingDone={handleStreamingDone}
              />

              {/* Streaming preview */}
              {streamingAnswer && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <p className="whitespace-pre-wrap">
                        {streamingAnswer}
                        <span className="animate-pulse">|</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Conversation history (from server) */}
              {activeConversationId &&
                activeConversation?.queries &&
                activeConversation.queries.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-medium text-muted-foreground">
                      Conversation History
                    </h2>
                    {activeConversation.queries.map((item) => (
                      <RAGResponseCard
                        key={item.id}
                        response={{
                          ...item,
                          answer: item.answer || "No answer recorded",
                          sources: item.sources || [],
                          model_used: item.model_used || "Unknown",
                          tokens_used: item.tokens_used || 0,
                          confidence_score: item.confidence_score || 0,
                          context_used: 0,
                        }}
                      />
                    ))}
                  </div>
                )}

              {/* Current session responses */}
              {responses.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Responses</h2>
                  {responses.map((response) => (
                    <RAGResponseCard key={response.id} response={response} />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {responses.length === 0 && !activeConversationId && !streamingAnswer && (
                <NoQuestionsState />
              )}
            </div>
          </div>
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
                <p className="text-sm text-muted-foreground">Total: {history.total} queries</p>
              </div>
              {history.items.map((item) => (
                <RAGResponseCard
                  key={item.id}
                  response={{
                    ...item,
                    answer: item.answer || "No answer recorded",
                    sources: item.sources || [],
                    model_used: item.model_used || "Unknown",
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
                      : 0}
                    %
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

          {/* Quality Evaluation Section (P3.2) */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Quality Evaluation</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerEvaluation({ sample_size: 20 })}
                  disabled={evaluationRunning}
                >
                  {evaluationRunning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <TrendingUp className="mr-2 h-4 w-4" />
                  )}
                  Run Evaluation
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Evaluates RAG quality across faithfulness, relevancy, precision, and recall.
              </p>
            </CardHeader>
            <CardContent>
              {evaluationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : evaluations && evaluations.items.length > 0 ? (
                <div className="space-y-4">
                  {/* Latest evaluation metrics */}
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-bold">
                        {(evaluations.items[0].faithfulness * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Faithfulness</p>
                      <Badge
                        variant={
                          evaluations.items[0].faithfulness >= 0.8
                            ? "default"
                            : evaluations.items[0].faithfulness >= 0.6
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs mt-1"
                      >
                        {evaluations.items[0].faithfulness >= 0.8
                          ? "Good"
                          : evaluations.items[0].faithfulness >= 0.6
                            ? "Fair"
                            : "Low"}
                      </Badge>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-bold">
                        {(evaluations.items[0].answer_relevancy * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Relevancy</p>
                      <Badge
                        variant={
                          evaluations.items[0].answer_relevancy >= 0.8
                            ? "default"
                            : evaluations.items[0].answer_relevancy >= 0.6
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs mt-1"
                      >
                        {evaluations.items[0].answer_relevancy >= 0.8
                          ? "Good"
                          : evaluations.items[0].answer_relevancy >= 0.6
                            ? "Fair"
                            : "Low"}
                      </Badge>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-bold">
                        {(evaluations.items[0].context_precision * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Precision</p>
                      <Badge
                        variant={
                          evaluations.items[0].context_precision >= 0.8
                            ? "default"
                            : evaluations.items[0].context_precision >= 0.6
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs mt-1"
                      >
                        {evaluations.items[0].context_precision >= 0.8
                          ? "Good"
                          : evaluations.items[0].context_precision >= 0.6
                            ? "Fair"
                            : "Low"}
                      </Badge>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-lg font-bold">
                        {(evaluations.items[0].context_recall * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Recall</p>
                      <Badge
                        variant={
                          evaluations.items[0].context_recall >= 0.8
                            ? "default"
                            : evaluations.items[0].context_recall >= 0.6
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-xs mt-1"
                      >
                        {evaluations.items[0].context_recall >= 0.8
                          ? "Good"
                          : evaluations.items[0].context_recall >= 0.6
                            ? "Fair"
                            : "Low"}
                      </Badge>
                    </div>
                  </div>

                  {/* Evaluation history */}
                  {evaluations.items.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Previous Evaluations
                      </p>
                      {evaluations.items.slice(1).map((evaluation) => (
                        <div
                          key={evaluation.id}
                          className="flex items-center justify-between text-xs border rounded-lg p-2"
                        >
                          <span className="text-muted-foreground">
                            {formatQueryDate(evaluation.created_at)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span>F: {(evaluation.faithfulness * 100).toFixed(0)}%</span>
                            <span>R: {(evaluation.answer_relevancy * 100).toFixed(0)}%</span>
                            <span>P: {(evaluation.context_precision * 100).toFixed(0)}%</span>
                            <span>C: {(evaluation.context_recall * 100).toFixed(0)}%</span>
                            <Badge variant="outline" className="text-xs">
                              {evaluation.sample_size} queries
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Last evaluated: {formatQueryDate(evaluations.items[0].created_at)} (
                    {evaluations.items[0].sample_size} queries sampled)
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No evaluations yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Run Evaluation" to assess RAG quality on your recent queries.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

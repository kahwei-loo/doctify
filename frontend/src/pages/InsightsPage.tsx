/**
 * InsightsPage
 *
 * Main page for NL-to-Insight feature.
 * Allows users to upload datasets and query them using natural language.
 */

import React, { useState, useCallback } from "react";
import { Lightbulb, Plus, PanelLeftClose, PanelLeft, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DatasetUploader,
  DatasetList,
  QueryInput,
  ResultsPanel,
  ConversationHistory,
} from "@/features/insights/components";
import {
  useCreateConversationMutation,
  useSendQueryMutation,
  useGetConversationsQuery,
} from "@/store/api/insightsApi";
import type {
  Dataset,
  QueryResponse,
  QueryHistoryItem,
  Conversation,
} from "@/features/insights/types";

// Type for display - can be full response or history item
type DisplayableQueryResult = QueryResponse | QueryHistoryItem;

const InsightsPage: React.FC = () => {
  // State
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [currentResult, setCurrentResult] = useState<DisplayableQueryResult | null>(null);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // API hooks
  const [createConversation] = useCreateConversationMutation();
  const [sendQuery, { isLoading: isQueryLoading }] = useSendQueryMutation();

  // Fetch conversations for selected dataset
  const { data: conversationsResponse, refetch: refetchConversations } = useGetConversationsQuery(
    { datasetId: selectedDataset?.id || "" },
    { skip: !selectedDataset }
  );

  const conversations = conversationsResponse?.conversations || [];

  // Handle dataset selection
  const handleSelectDataset = useCallback(async (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setCurrentResult(null);
    setSelectedQueryId(null);

    // Check if there's an existing conversation for this dataset
    // If so, use it; otherwise, create a new one on first query
    setActiveConversation(null);
  }, []);

  // Handle dataset upload success
  const handleUploadSuccess = useCallback((_datasetId: string) => {
    setIsUploadDialogOpen(false);
    toast.success("Dataset uploaded successfully");
  }, []);

  // Handle dataset upload error
  const handleUploadError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  // Handle query submission
  const handleSubmitQuery = useCallback(
    async (query: string, language: string) => {
      if (!selectedDataset) {
        toast.error("Please select a dataset first");
        return;
      }

      try {
        let conversationId = activeConversation?.id;

        // Create a new conversation if one doesn't exist
        if (!conversationId) {
          const newConversation = await createConversation({
            dataset_id: selectedDataset.id,
            title: query.slice(0, 50) + (query.length > 50 ? "..." : ""),
          }).unwrap();
          conversationId = newConversation.id;
          setActiveConversation(newConversation);
          refetchConversations();
        }

        // Send the query
        const result = await sendQuery({
          conversationId,
          request: { message: query, language },
        }).unwrap();

        setCurrentResult(result);
        setSelectedQueryId(result.id);
      } catch (error: any) {
        const errorMessage = error?.data?.detail || "Failed to process query";
        toast.error(errorMessage);
      }
    },
    [selectedDataset, activeConversation, createConversation, sendQuery, refetchConversations]
  );

  // Handle selecting a query from history
  const handleSelectQuery = useCallback((query: QueryHistoryItem) => {
    setCurrentResult(query);
    setSelectedQueryId(query.id);
  }, []);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation);
    setCurrentResult(null);
    setSelectedQueryId(null);
  }, []);

  return (
    <div className="flex h-[calc(100vh-112px)]">
      {/* Left Panel - Dataset List */}
      <div
        className={cn(
          "border-r bg-muted/30 transition-all duration-300 flex flex-col",
          isPanelCollapsed ? "w-0 overflow-hidden" : "w-72"
        )}
      >
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <h2 className="font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Data Insights
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setIsPanelCollapsed(true)}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload Button */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Upload Dataset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Dataset</DialogTitle>
                <DialogDescription>
                  Upload a CSV, XLSX, or JSON file to analyze with natural language queries.
                </DialogDescription>
              </DialogHeader>
              <DatasetUploader onSuccess={handleUploadSuccess} onError={handleUploadError} />
            </DialogContent>
          </Dialog>

          {/* Dataset List */}
          <DatasetList
            selectedDatasetId={selectedDataset?.id}
            onSelectDataset={handleSelectDataset}
          />

          {/* Conversations for Selected Dataset */}
          {selectedDataset && conversations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      "hover:bg-muted",
                      activeConversation?.id === conversation.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <p className="truncate font-medium">
                      {conversation.title || "Untitled Conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {isPanelCollapsed && (
              <Button variant="ghost" size="icon" onClick={() => setIsPanelCollapsed(false)}>
                <PanelLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold">
                {selectedDataset ? selectedDataset.name : "Data Insights"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedDataset
                  ? `${selectedDataset.row_count?.toLocaleString() || "?"} rows • ${selectedDataset.schema_definition.columns.length} columns`
                  : "Select a dataset to start querying"}
              </p>
            </div>
          </div>
          {selectedDataset && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveConversation(null);
                setCurrentResult(null);
                setSelectedQueryId(null);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Conversation
            </Button>
          )}
        </div>

        {/* Content Area with Query History Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Query/Results Area */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {selectedDataset ? (
              <>
                {/* Query Input */}
                <div className="shrink-0 mb-4">
                  <QueryInput
                    onSubmit={handleSubmitQuery}
                    isLoading={isQueryLoading}
                    disabled={selectedDataset.status !== "ready"}
                    placeholder={
                      selectedDataset.status === "ready"
                        ? `Ask a question about ${selectedDataset.name}...`
                        : "Dataset is being processed..."
                    }
                  />
                </div>

                {/* Results Panel */}
                <div className="flex-1 overflow-y-auto">
                  <ResultsPanel result={currentResult} isLoading={isQueryLoading} />
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center">
                <Card className="max-w-md w-full">
                  <CardHeader className="text-center">
                    <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-4">
                      <Lightbulb className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>Welcome to Data Insights</CardTitle>
                    <CardDescription>
                      Upload a dataset and ask questions in natural language to discover insights.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-2">Get started:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Upload a CSV, XLSX, or JSON dataset</li>
                        <li>Wait for processing to complete</li>
                        <li>Ask questions like &quot;What is the total revenue by month?&quot;</li>
                      </ol>
                    </div>
                    <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Your First Dataset
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Upload Dataset</DialogTitle>
                          <DialogDescription>
                            Upload a CSV, XLSX, or JSON file to analyze with natural language
                            queries.
                          </DialogDescription>
                        </DialogHeader>
                        <DatasetUploader
                          onSuccess={handleUploadSuccess}
                          onError={handleUploadError}
                        />
                      </DialogContent>
                    </Dialog>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Query History Sidebar */}
          {selectedDataset && activeConversation && (
            <div className="w-72 border-l shrink-0 hidden lg:block">
              <ConversationHistory
                conversationId={activeConversation.id}
                selectedQueryId={selectedQueryId}
                onSelectQuery={handleSelectQuery}
                className="h-full border-0 rounded-none"
              />
            </div>
          )}
        </div>

        {/* Mobile Query History Tabs */}
        {selectedDataset && activeConversation && (
          <div className="lg:hidden border-t">
            <Tabs defaultValue="results" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b h-10 px-4">
                <TabsTrigger value="results" className="text-xs">
                  Results
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs">
                  History
                </TabsTrigger>
              </TabsList>
              <TabsContent value="history" className="m-0 max-h-64 overflow-y-auto">
                <ConversationHistory
                  conversationId={activeConversation.id}
                  selectedQueryId={selectedQueryId}
                  onSelectQuery={handleSelectQuery}
                  className="border-0 rounded-none"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsPage;

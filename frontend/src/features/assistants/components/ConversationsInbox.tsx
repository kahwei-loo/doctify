/**
 * ConversationsInbox Component (L3 Navigation)
 *
 * Intercom-style split layout with resizable panels.
 * Left pane: ConversationsList (conversation items + filters)
 * Right pane: ConversationChat (message history + input)
 *
 * Features real-time updates via WebSocket connection.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  MessageSquare,
  ArrowLeft,
  Wifi,
  WifiOff,
  Sparkles,
  Settings,
  Code,
  BarChart3,
  Circle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { useGetConversationsQuery } from '@/store/api/conversationsApi';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConversationsList } from './ConversationsList';
import { ConversationChat } from './ConversationChat';
import { NoConversationsState, NoMessagesState } from './EmptyStates';
import { useAssistantWebSocket, type WebSocketEventUnion } from '../hooks';
import { WidgetEmbedDialog } from './WidgetEmbedDialog';
import { TestAssistantDialog } from './TestAssistantDialog';
import { AssistantAnalyticsDialog } from './AssistantAnalyticsDialog';
import type { Assistant, Conversation } from '../types';
import { cn } from '@/lib/utils';

interface AssistantHeaderProps {
  assistant: Assistant;
  conversationsCount: number;
  onTest?: () => void;
  onEdit?: () => void;
  onGetWidget?: () => void;
  onViewAnalytics?: () => void;
}

const AssistantHeader: React.FC<AssistantHeaderProps> = ({
  assistant,
  conversationsCount,
  onTest,
  onEdit,
  onGetWidget,
  onViewAnalytics,
}) => {
  return (
    <div className="border-b bg-background px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Assistant Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base truncate">{assistant.name}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Circle
              className={cn(
                'h-2 w-2 fill-current',
                assistant.is_active ? 'text-green-500' : 'text-gray-400'
              )}
            />
            <span>{assistant.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Right: Stats and Actions */}
        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground mr-2">
            <div className="flex items-center gap-1">
              <span className="font-medium">{assistant.model_config.model}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{conversationsCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            className="hidden sm:flex"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="hidden md:flex"
          >
            <Settings className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onGetWidget}
            className="hidden lg:flex"
          >
            <Code className="h-4 w-4 mr-1" />
            Widget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAnalytics}
            className="hidden xl:flex"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ConversationsInboxProps {
  assistant: Assistant;
  onEditAssistant?: (assistant: Assistant) => void;
  className?: string;
}

export const ConversationsInbox: React.FC<ConversationsInboxProps> = ({
  assistant,
  onEditAssistant,
  className,
}) => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);

  // Fetch conversations for the selected assistant (poll every 10s for real-time updates)
  const { data: response, refetch, isLoading, isError } = useGetConversationsQuery(
    { filters: { assistant_id: assistant.assistant_id } },
    { pollingInterval: 10000 },
  );
  const conversations = response?.data || [];

  // WebSocket event handler - refetch conversations on updates
  const handleWebSocketEvent = useCallback(
    (event: WebSocketEventUnion) => {
      if (
        event.type === 'conversation.created' ||
        event.type === 'conversation.updated'
      ) {
        // Refetch conversation list to get latest data
        refetch();
      }
    },
    [refetch]
  );

  // Connect to WebSocket for real-time assistant updates
  const { isConnected: wsConnected } = useAssistantWebSocket({
    assistantId: assistant.assistant_id,
    onEvent: handleWebSocketEvent,
    enabled: true,
  });

  // Find the selected conversation object
  const selectedConversation = conversations.find(
    (c) => c.conversation_id === selectedConversationId
  );

  // Handle responsive layout
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string | null) => {
    setSelectedConversationId(conversationId);
    if (conversationId && isMobileView) {
      setShowChatOnMobile(true);
    }
  };

  // Handle back button on mobile
  const handleBackToList = () => {
    setShowChatOnMobile(false);
  };

  // Auto-select first conversation if none selected and conversations exist
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].conversation_id);
    }
  }, [conversations, selectedConversationId]);

  // Header action handlers
  const handleTest = () => {
    setTestDialogOpen(true);
  };

  const handleEdit = () => {
    if (onEditAssistant) {
      onEditAssistant(assistant);
    }
  };

  const handleGetWidget = () => {
    setWidgetDialogOpen(true);
  };

  const handleViewAnalytics = () => {
    setAnalyticsDialogOpen(true);
  };

  // Loading state
  if (isLoading && conversations.length === 0) {
    return (
      <div className={cn('flex-1 flex flex-col h-full', className)}>
        <AssistantHeader
          assistant={assistant}
          conversationsCount={0}
          onTest={handleTest}
          onEdit={handleEdit}
          onGetWidget={handleGetWidget}
          onViewAnalytics={handleViewAnalytics}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError && conversations.length === 0) {
    return (
      <div className={cn('flex-1 flex flex-col h-full', className)}>
        <AssistantHeader
          assistant={assistant}
          conversationsCount={0}
          onTest={handleTest}
          onEdit={handleEdit}
          onGetWidget={handleGetWidget}
          onViewAnalytics={handleViewAnalytics}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="rounded-full bg-destructive/10 p-4 mx-auto w-fit mb-4">
              <RefreshCw className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Failed to Load Conversations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Could not fetch conversations. Please check your connection and try again.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>

        {/* Dialogs still available in error state */}
        <TestAssistantDialog
          open={testDialogOpen}
          onClose={() => setTestDialogOpen(false)}
          assistant={assistant}
          onMessageSent={refetch}
        />
      </div>
    );
  }

  // Empty state: No conversations at all (only when query succeeded)
  if (!isLoading && !isError && conversations.length === 0) {
    return (
      <div className={cn('flex-1 flex flex-col h-full', className)}>
        {/* Assistant Header */}
        <AssistantHeader
          assistant={assistant}
          conversationsCount={0}
          onTest={handleTest}
          onEdit={handleEdit}
          onGetWidget={handleGetWidget}
          onViewAnalytics={handleViewAnalytics}
        />

        {/* Enhanced Empty State */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="rounded-full bg-muted p-4 mx-auto w-fit mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Conversations Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {assistant.name} hasn't received any conversations yet.
              Get started by testing the assistant or embedding it on your website.
            </p>

            {/* Action Cards */}
            <div className="grid gap-3">
              <Card
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={handleTest}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">Test This Assistant</p>
                    <p className="text-xs text-muted-foreground">
                      Create a test conversation to try it out
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={handleGetWidget}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-blue-500/10 p-2">
                    <Code className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">Get Widget Code</p>
                    <p className="text-xs text-muted-foreground">
                      Embed chat widget on your website
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Widget Embed Code Dialog */}
        <WidgetEmbedDialog
          open={widgetDialogOpen}
          onClose={() => setWidgetDialogOpen(false)}
          assistant={assistant}
        />

        {/* Test Assistant Dialog */}
        <TestAssistantDialog
          open={testDialogOpen}
          onClose={() => setTestDialogOpen(false)}
          assistant={assistant}
          onMessageSent={refetch}
        />

        {/* Analytics Dialog */}
        <AssistantAnalyticsDialog
          open={analyticsDialogOpen}
          onClose={() => setAnalyticsDialogOpen(false)}
          assistant={assistant}
        />
      </div>
    );
  }

  // Mobile Layout: Stack views with navigation
  if (isMobileView) {
    return (
      <div className={cn('flex-1 flex flex-col h-full', className)}>
        {/* Assistant Header */}
        <AssistantHeader
          assistant={assistant}
          conversationsCount={conversations.length}
          onTest={handleTest}
          onEdit={handleEdit}
          onGetWidget={handleGetWidget}
          onViewAnalytics={handleViewAnalytics}
        />

        {showChatOnMobile && selectedConversation ? (
          <div className="flex-1 flex flex-col">
            <div className="p-2 border-b bg-background">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to conversations
              </Button>
            </div>
            <ConversationChat
              conversation={selectedConversation}
              className="flex-1"
            />
          </div>
        ) : (
          <ConversationsList
            assistantId={assistant.assistant_id}
            assistantName={assistant.name}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            className="flex-1"
          />
        )}

        {/* Widget Embed Code Dialog */}
        <WidgetEmbedDialog
          open={widgetDialogOpen}
          onClose={() => setWidgetDialogOpen(false)}
          assistant={assistant}
        />

        {/* Test Assistant Dialog */}
        <TestAssistantDialog
          open={testDialogOpen}
          onClose={() => setTestDialogOpen(false)}
          assistant={assistant}
          onMessageSent={refetch}
        />

        {/* Analytics Dialog */}
        <AssistantAnalyticsDialog
          open={analyticsDialogOpen}
          onClose={() => setAnalyticsDialogOpen(false)}
          assistant={assistant}
        />
      </div>
    );
  }

  // Desktop Layout: Resizable split panels
  return (
    <div className={cn('flex-1 flex flex-col h-full', className)}>
      {/* Assistant Header */}
      <AssistantHeader
        assistant={assistant}
        conversationsCount={conversations.length}
        onTest={handleTest}
        onEdit={handleEdit}
        onGetWidget={handleGetWidget}
        onViewAnalytics={handleViewAnalytics}
      />

      {/* Conversations Split View */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel: Conversations List - prioritize list visibility */}
        <ResizablePanel
          defaultSize={50}
          minSize={35}
          maxSize={85}
          className="border-r"
        >
          <ConversationsList
            assistantId={assistant.assistant_id}
            assistantName={assistant.name}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </ResizablePanel>

        {/* Resize Handle */}
        <ResizableHandle withHandle />

        {/* Right Panel: Conversation Chat - allow narrower width, chat doesn't need much space */}
        <ResizablePanel defaultSize={50} minSize={15} maxSize={65}>
          {selectedConversation ? (
            <ConversationChat conversation={selectedConversation} />
          ) : (
            <div className="flex-1 flex items-center justify-center h-full">
              <NoMessagesState />
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Widget Embed Code Dialog */}
      <WidgetEmbedDialog
        open={widgetDialogOpen}
        onClose={() => setWidgetDialogOpen(false)}
        assistant={assistant}
      />

      {/* Test Assistant Dialog */}
      <TestAssistantDialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        assistant={assistant}
        onMessageSent={refetch}
      />

      {/* Analytics Dialog */}
      <AssistantAnalyticsDialog
        open={analyticsDialogOpen}
        onClose={() => setAnalyticsDialogOpen(false)}
        assistant={assistant}
      />
    </div>
  );
};

export default ConversationsInbox;

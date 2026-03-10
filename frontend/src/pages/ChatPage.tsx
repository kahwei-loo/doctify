/**
 * ChatPage
 *
 * Main page for chat assistant with conversation management.
 * Phase 13 - Chatbot Implementation
 */

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatWindow } from "@/features/chat/components/ChatWindow";
import {
  useCreateConversationMutation,
  useGetConversationsQuery,
  useGetConversationMessagesQuery,
} from "@/store/api/chatApi";

export default function ChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const { data: rawConversations } = useGetConversationsQuery({ limit: 50 });
  const conversations = Array.isArray(rawConversations) ? rawConversations : [];
  const [createConversation] = useCreateConversationMutation();

  const { data: messages = [] } = useGetConversationMessagesQuery(
    { conversationId: selectedConversationId! },
    { skip: !selectedConversationId }
  );

  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation({
        title: `Chat ${new Date().toLocaleString()}`,
      }).unwrap();
      setSelectedConversationId(newConv.id);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  // Effect 1: Auto-select first conversation when available
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [selectedConversationId, conversations]);

  // Effect 2: Create initial conversation only once on mount
  const hasCreatedInitial = useRef(false);
  useEffect(() => {
    if (!hasCreatedInitial.current && conversations.length === 0) {
      hasCreatedInitial.current = true;
      handleNewConversation();
    }
  }, []); // Run only once on mount

  return (
    <div className="container mx-auto p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Chat Assistant
          </h1>
          <p className="text-muted-foreground mt-2">Have a conversation with your documents</p>
        </div>
        <Button onClick={handleNewConversation}>
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Conversation List */}
        <div className="col-span-3 border rounded-lg p-4 overflow-y-auto">
          <h3 className="font-semibold mb-3">Conversations</h3>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors",
                  "hover:bg-muted",
                  selectedConversationId === conv.id && "bg-primary/10 border-primary"
                )}
              >
                <p className="text-sm font-medium truncate">{conv.title || "New Conversation"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(conv.updated_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Window */}
        <div className="col-span-9">
          {selectedConversationId ? (
            <ChatWindow conversationId={selectedConversationId} initialMessages={messages} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                Select or create a conversation to start chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

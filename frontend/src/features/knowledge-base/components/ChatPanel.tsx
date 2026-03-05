/**
 * ChatPanel Component
 *
 * Right panel in the split layout wrapping UnifiedQueryPanel.
 * Always visible alongside sources — never hidden behind tabs.
 */

import React from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedQueryPanel } from "./UnifiedQueryPanel";

interface ChatPanelProps {
  knowledgeBaseId: string;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ knowledgeBaseId, className }) => {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Panel Header — matches SourcesPanel header style */}
      <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Chat</h2>
        </div>
      </div>

      {/* Query Panel — fills remaining height */}
      <div className="flex-1 min-h-0 px-4 pt-3 pb-4">
        <UnifiedQueryPanel knowledgeBaseId={knowledgeBaseId} variant="panel" />
      </div>
    </div>
  );
};

export default ChatPanel;

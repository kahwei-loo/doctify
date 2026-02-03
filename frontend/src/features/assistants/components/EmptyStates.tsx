/**
 * Empty States Components
 *
 * Reusable empty state displays for various scenarios in the Assistants feature.
 */

import React from 'react';
import { MessageSquare, Users, Inbox, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
        {action && (
          <Button onClick={action.onClick} size="lg">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Specific empty state variants

export const NoAssistantsState: React.FC<{ onCreateAssistant: () => void }> = ({
  onCreateAssistant,
}) => {
  return (
    <EmptyState
      icon={Sparkles}
      title="No AI Assistants Yet"
      description="Create your first AI assistant to start handling customer conversations automatically. Choose from different AI models and customize the behavior."
      action={{
        label: 'Create Your First Assistant',
        onClick: onCreateAssistant,
      }}
    />
  );
};

export const NoActiveAssistantsState: React.FC = () => {
  return (
    <EmptyState
      icon={Users}
      title="No Active Assistants"
      description="All your assistants are currently inactive. Activate an assistant to start receiving conversations."
    />
  );
};

export const NoConversationsState: React.FC<{ assistantName?: string }> = ({
  assistantName,
}) => {
  return (
    <EmptyState
      icon={Inbox}
      title="No Conversations Yet"
      description={
        assistantName
          ? `${assistantName} hasn't received any conversations yet. Share your public chat widget to start receiving messages.`
          : 'Select an assistant to view its conversations.'
      }
    />
  );
};

export const NoMessagesState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No Messages</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Select a conversation to view its message history.
      </p>
    </div>
  );
};

export const ConversationResolvedState: React.FC<{ onReopen: () => void }> = ({ onReopen }) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-6 text-center bg-muted/30 rounded-lg border border-dashed">
      <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3 mb-3">
        <Inbox className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
      <h4 className="text-sm font-semibold mb-1">Conversation Resolved</h4>
      <p className="text-xs text-muted-foreground mb-4">
        This conversation has been marked as resolved.
      </p>
      <Button variant="outline" size="sm" onClick={onReopen}>
        Reopen Conversation
      </Button>
    </div>
  );
};

export const FilterNoResultsState: React.FC<{ onClearFilters: () => void }> = ({
  onClearFilters,
}) => {
  return (
    <EmptyState
      icon={Inbox}
      title="No Results Found"
      description="No conversations match your current filters. Try adjusting your search or filter criteria."
      action={{
        label: 'Clear Filters',
        onClick: onClearFilters,
      }}
    />
  );
};

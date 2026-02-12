/**
 * Assistants Components Index
 *
 * Barrel export for all assistants feature components.
 */

export { AssistantsPanel } from './AssistantsPanel';
export {
  EmptyState,
  NoAssistantsState,
  NoActiveAssistantsState,
  NoConversationsState,
  NoMessagesState,
  ConversationResolvedState,
  FilterNoResultsState,
} from './EmptyStates';
export { AssistantFormModal } from './AssistantFormModal';
export { DeleteAssistantDialog } from './DeleteAssistantDialog';

// Day 5-7: Conversations Inbox Components
export { ConversationsInbox } from './ConversationsInbox';
export { ConversationsList } from './ConversationsList';
export { ConversationChat } from './ConversationChat';

// Day 8: Public Chat Widget
export { PublicChatWidget } from './PublicChatWidget';

// Day 9-10: Error and Loading States
export { ErrorState, InlineError } from './ErrorState';
export {
  AssistantsPanelSkeleton,
  AssistantCardSkeleton,
  ConversationsListSkeleton,
  ConversationItemSkeleton,
  ConversationChatSkeleton,
  MessageBubbleSkeleton,
  PublicChatWidgetSkeleton,
  InlineLoading,
  FullPageLoading,
} from './LoadingStates';

// Week 7: Confirmation Dialogs
export { DeleteConversationDialog } from './DeleteConversationDialog';

// P1: Action Dialogs
export { WidgetEmbedDialog } from './WidgetEmbedDialog';

/**
 * RAG Feature Empty States
 *
 * Reusable empty state displays for various scenarios in the RAG feature.
 */

import React from "react";
import { MessageSquare, History, TrendingUp, Search } from "lucide-react";
import { EmptyState } from "@/shared/components/common/EmptyState";

/**
 * Empty state for when no questions have been asked in the current session
 */
export const NoQuestionsState: React.FC = () => {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No questions yet"
      description="Ask a question about your documents above to get started. Your answers will appear here with source citations."
    />
  );
};

/**
 * Empty state for when there's no query history
 */
export const NoHistoryState: React.FC = () => {
  return (
    <EmptyState
      icon={History}
      title="No history yet"
      description="Your query history will appear here once you start asking questions. Previous Q&A sessions are saved for your reference."
    />
  );
};

/**
 * Empty state for when no statistics are available
 */
export const NoStatsState: React.FC = () => {
  return (
    <EmptyState
      icon={TrendingUp}
      title="No statistics available"
      description="Statistics will appear once you start using the RAG system. Track your usage, document coverage, and answer quality here."
    />
  );
};

/**
 * Empty state for when no search results are found
 */
export const NoSearchResultsState: React.FC<{
  onClearSearch?: () => void;
}> = ({ onClearSearch }) => {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="No queries match your search. Try adjusting your search terms or filters."
      action={
        onClearSearch
          ? {
              label: "Clear Search",
              onClick: onClearSearch,
              variant: "outline",
            }
          : undefined
      }
    />
  );
};

/**
 * Empty state for when no documents are indexed for RAG
 */
export const NoIndexedDocumentsState: React.FC<{
  onNavigateToDocuments?: () => void;
}> = ({ onNavigateToDocuments }) => {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No documents indexed"
      description="You need to process and index documents before you can ask questions. Upload documents and generate embeddings to get started."
      action={
        onNavigateToDocuments
          ? {
              label: "Go to Documents",
              onClick: onNavigateToDocuments,
            }
          : undefined
      }
    />
  );
};

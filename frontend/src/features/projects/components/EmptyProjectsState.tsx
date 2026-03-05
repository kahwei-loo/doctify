/**
 * EmptyProjectsState Component
 *
 * Empty state displayed when no projects exist or match filters.
 * Provides clear CTAs based on context.
 */

import React from "react";
import { FolderKanban, Plus, Archive, Search } from "lucide-react";
import { EmptyState } from "@/shared/components/common/EmptyState";

interface EmptyProjectsStateProps {
  /** Called when user clicks create project button */
  onCreateProject?: () => void;
  /** Whether there's an active search query */
  hasSearchQuery?: boolean;
  /** Current filter option */
  filterOption?: "all" | "active" | "archived";
  /** Called when user clicks to clear search */
  onClearSearch?: () => void;
  /** Additional class names */
  className?: string;
}

export const EmptyProjectsState: React.FC<EmptyProjectsStateProps> = ({
  onCreateProject,
  hasSearchQuery = false,
  filterOption = "active",
  onClearSearch,
  className,
}) => {
  // Search results empty state
  if (hasSearchQuery) {
    return (
      <EmptyState
        icon={Search}
        title="No projects found"
        description="No projects match your search. Try adjusting your search terms or filter settings."
        action={
          onClearSearch
            ? {
                label: "Clear Search",
                onClick: onClearSearch,
                variant: "outline",
              }
            : undefined
        }
        className={className}
      />
    );
  }

  // Archived filter empty state
  if (filterOption === "archived") {
    return (
      <EmptyState
        icon={Archive}
        title="No archived projects"
        description="You don't have any archived projects. Projects you archive will appear here."
        className={className}
      />
    );
  }

  // Default empty state (no projects)
  return (
    <EmptyState
      icon={FolderKanban}
      title="No projects yet"
      description="Create your first project to organize documents and configure AI extraction settings. Projects help you keep related documents together."
      action={
        onCreateProject
          ? {
              label: "Create Your First Project",
              onClick: onCreateProject,
              icon: Plus,
            }
          : undefined
      }
      tip="Projects let you configure custom extraction fields and processing rules"
      className={className}
    />
  );
};

export default EmptyProjectsState;

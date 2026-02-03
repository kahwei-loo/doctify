/**
 * ProjectPanelItem Component
 *
 * Individual project item in the project panel sidebar.
 * Features:
 * - Color-coded avatar based on project name
 * - Two-line display (name + document count)
 * - Settings dropdown menu
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, MoreVertical, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { ProjectAvatar } from '@/components/ui/project-avatar';

interface ProjectPanelItemProps {
  projectId: string;
  name: string;
  description?: string | null;
  isSelected: boolean;
  documentCount?: number;
  onSelect: (projectId: string) => void;
  /** Callback when settings is clicked (optional - defaults to navigation) */
  onOpenSettings?: (projectId: string) => void;
}

export const ProjectPanelItem: React.FC<ProjectPanelItemProps> = ({
  projectId,
  name,
  description,
  isSelected,
  documentCount,
  onSelect,
  onOpenSettings,
}) => {
  const navigate = useNavigate();

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenSettings) {
      onOpenSettings(projectId);
    } else {
      navigate(`/projects/${projectId}`);
    }
  };

  return (
    <div
      onClick={() => onSelect(projectId)}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all',
        isSelected
          ? 'bg-primary/10 text-primary shadow-sm'
          : 'hover:bg-muted/50 text-foreground'
      )}
    >
      {/* Project Avatar */}
      <ProjectAvatar
        name={name}
        size="md"
        selected={isSelected}
        className="flex-shrink-0"
      />

      {/* Project Info - Two Line Layout */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold truncate',
          isSelected && 'text-primary'
        )}>
          {name}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {documentCount !== undefined && (
            <span className="tabular-nums">
              {documentCount} {documentCount === 1 ? 'document' : 'documents'}
            </span>
          )}
          {description && documentCount !== undefined && (
            <span className="text-muted-foreground/50">•</span>
          )}
          {description && (
            <span className="truncate">{description}</span>
          )}
        </div>
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
              isSelected && 'opacity-100'
            )}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Project options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSettingsClick}>
            <Settings className="mr-2 h-4 w-4" />
            Project Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default ProjectPanelItem;

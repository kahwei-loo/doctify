/**
 * ProjectPanel Component (Enhanced)
 *
 * Left sidebar panel for project selection within the Documents module.
 * This is module-specific navigation, not global sidebar.
 *
 * Features:
 * - Smooth expand/collapse animation (framer-motion)
 * - Color-coded project avatars with badges
 * - Rich project metadata (doc count, type, status)
 * - Improved visual hierarchy
 * - Document count badges in collapsed state
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useGetProjectsQuery } from '@/store/api/projectsApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProjectPanelSearch } from './ProjectPanelSearch';
import { ProjectPanelItem } from './ProjectPanelItem';
import { ProjectAvatar } from '@/components/ui/project-avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProjectPanelProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Callback when settings is clicked for a project */
  onOpenSettings?: (projectId: string) => void;
}

export const ProjectPanel: React.FC<ProjectPanelProps> = ({
  selectedProjectId,
  onSelectProject,
  className,
  collapsed = false,
  onToggleCollapse,
  onOpenSettings,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: projectsData, isLoading, error } = useGetProjectsQuery({
    includeArchived: false,
  });

  const projects = projectsData?.data || [];

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  const handleCreateProject = () => {
    navigate('/projects');
  };

  const handleSelectAll = () => {
    onSelectProject(null);
  };

  // Calculate total document count for "All Projects"
  const totalDocumentCount = useMemo(() => {
    return projects.reduce((sum, project) => sum + (project.document_count || 0), 0);
  }, [projects]);

  return (
    <TooltipProvider delayDuration={0}>
      {collapsed ? (
        <motion.div
          initial={false}
          animate={{ width: 64 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className={cn(
            'flex flex-col items-center py-4 h-full',
            'border border-border/60 bg-card/50',
            'rounded-xl shadow-sm',
            className
          )}
        >
          {/* Expand Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="mb-4 h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Expand project panel</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>

          {/* All Projects Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="relative mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSelectAll}
                  className={cn(
                    'h-10 w-10',
                    selectedProjectId === null && 'bg-primary/10 text-primary'
                  )}
                >
                  <FolderOpen className="h-5 w-5" />
                </Button>
                {/* Document Count Badge */}
                {totalDocumentCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-semibold">
                    {totalDocumentCount > 99 ? '99+' : totalDocumentCount}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="flex flex-col">
                <span className="font-medium">All Projects</span>
                <span className="text-xs text-muted-foreground">
                  {totalDocumentCount} {totalDocumentCount === 1 ? 'document' : 'documents'}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>

          <div className="h-px w-8 bg-border mb-3" />

          {/* Project Avatars with Badges */}
          <div className="flex flex-col items-center gap-2 w-full px-2">
            {filteredProjects.slice(0, 8).map((project) => (
              <Tooltip key={project.project_id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <button
                      onClick={() => onSelectProject(project.project_id)}
                      className={cn(
                        'rounded-full transition-all hover:scale-110',
                        selectedProjectId === project.project_id && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      )}
                    >
                      <ProjectAvatar
                        name={project.name}
                        size="md"
                        selected={selectedProjectId === project.project_id}
                      />
                    </button>
                    {/* Document Count Badge */}
                    {project.document_count !== undefined && project.document_count > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-[1.125rem] h-4.5 px-1 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-semibold shadow-sm">
                        {project.document_count > 99 ? '99+' : project.document_count}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="flex flex-col">
                    <span className="font-medium">{project.name}</span>
                    {project.document_count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {project.document_count} {project.document_count === 1 ? 'document' : 'documents'}
                      </span>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* More Projects Indicator */}
          {filteredProjects.length > 8 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground mt-2"
                  onClick={onToggleCollapse}
                >
                  <span className="text-xs font-medium">
                    +{filteredProjects.length - 8}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {filteredProjects.length - 8} more {filteredProjects.length - 8 === 1 ? 'project' : 'projects'}
              </TooltipContent>
            </Tooltip>
          )}
        </motion.div>
      ) : (
        <motion.div
      initial={false}
      animate={{ width: 280 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'flex flex-col h-full',
        'border border-border/60 bg-card/50',
        'rounded-xl shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-foreground">PROJECTS</h3>
          {projects.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {projects.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCreateProject}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create new project</TooltipContent>
          </Tooltip>
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onToggleCollapse}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Collapse sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <ProjectPanelSearch value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-y-auto">
        {/* All Projects Option - Visually separated */}
        <div className="px-2 pt-2 pb-3 border-b">
          <div
            onClick={handleSelectAll}
            className={cn(
              'flex items-center justify-between px-3 py-2.5 rounded-2xl cursor-pointer transition-all',
              selectedProjectId === null
                ? 'bg-primary/10 text-primary shadow-sm'
                : 'hover:bg-muted/50 text-foreground'
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                selectedProjectId === null
                  ? 'bg-primary/20'
                  : 'bg-muted'
              )}>
                <FolderOpen
                  className={cn(
                    'h-4 w-4',
                    selectedProjectId === null ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">All Projects</span>
                <span className="text-xs text-muted-foreground">
                  {totalDocumentCount} {totalDocumentCount === 1 ? 'document' : 'documents'}
                </span>
              </div>
            </div>
            {selectedProjectId === null && (
              <Badge variant="default" className="h-5 px-2 text-xs font-medium">
                Active
              </Badge>
            )}
          </div>
        </div>

        {/* MY PROJECTS Section Header */}
        <div className="px-4 py-2 mt-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            My Projects
          </p>
        </div>

        <div className="px-2 pb-2 space-y-1">

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">Failed to load projects</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                Try again
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredProjects.length === 0 && (
            <div className="text-center py-8 px-4">
              <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                {searchQuery ? 'No matching projects' : 'No projects yet'}
              </p>
              {!searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleCreateProject}
                  className="mt-2"
                >
                  Create your first project
                </Button>
              )}
            </div>
          )}

          {/* Project Items */}
          <AnimatePresence>
            {!isLoading &&
              !error &&
              filteredProjects.map((project, index) => (
                <motion.div
                  key={project.project_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <ProjectPanelItem
                    projectId={project.project_id}
                    name={project.name}
                    description={project.description}
                    documentCount={project.document_count}
                    isSelected={selectedProjectId === project.project_id}
                    onSelect={onSelectProject}
                    onOpenSettings={onOpenSettings}
                  />
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t bg-card/80">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start hover:bg-primary/5"
          onClick={handleCreateProject}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>
        </motion.div>
      )}
    </TooltipProvider>
  );
};

export default ProjectPanel;

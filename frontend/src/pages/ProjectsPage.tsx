/**
 * ProjectsPage
 *
 * Redesigned projects page with statistics dashboard, project cards,
 * and configuration modal.
 *
 * Features:
 * - Aggregate statistics display
 * - Processing status chart
 * - Token usage by project chart
 * - Enhanced project cards with statistics
 * - Create/Edit/Delete/Configure projects
 * - Search and filter projects
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  Loader2,
  LayoutGrid,
  List,
  RefreshCw,
  Settings,
  Archive,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useGetProjectsQuery,
  useGetAggregateStatsQuery,
  useGetProjectStatisticsQuery,
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useUpdateExtractionConfigMutation,
  type Project,
} from '@/store/api/projectsApi';
import {
  ProjectStats,
  EnhancedProjectCard,
  EnhancedProjectCardSkeleton,
  ProcessingChart,
  TokenUsageChart,
  ProjectConfigModal,
  EmptyProjectsState,
  DeleteProjectDialog,
  type ProjectStatsData,
} from '@/features/projects';
import type { ExtractionConfig, ProjectConfig } from '@/features/projects';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';
type FilterOption = 'all' | 'active' | 'archived';

/**
 * Wrapper component that fetches project statistics and renders EnhancedProjectCard
 */
const ProjectCardWithStats: React.FC<{
  project: Project;
  onConfigure: (project: Project) => void;
  onDelete: (project: Project) => void;
}> = ({ project, onConfigure, onDelete }) => {
  const navigate = useNavigate();

  // Fetch project statistics
  const { data: statsData, isLoading: statsLoading } = useGetProjectStatisticsQuery(
    project.project_id
  );

  return (
    <EnhancedProjectCard
      project={project}
      statistics={statsData?.data || null}
      statisticsLoading={statsLoading}
      onClick={() => navigate(`/documents?project=${project.project_id}`)}
      onConfigure={onConfigure}
      onDelete={onDelete}
    />
  );
};

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterOption, setFilterOption] = useState<FilterOption>('active');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [configProject, setConfigProject] = useState<Project | null>(null);
  const [deleteDialogProject, setDeleteDialogProject] = useState<Project | null>(null);

  // RTK Query hooks
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    isError: isProjectsError,
    refetch: refetchProjects,
  } = useGetProjectsQuery({
    includeArchived: filterOption === 'archived' || filterOption === 'all',
  });

  const {
    data: statsData,
    isLoading: isLoadingStats,
    isError: isStatsError,
  } = useGetAggregateStatsQuery();

  const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();
  const [updateExtractionConfig, { isLoading: isUpdatingConfig }] =
    useUpdateExtractionConfigMutation();

  // Derived data
  const projects = projectsData?.data ?? [];

  const filteredProjects = useMemo(() => {
    let result = projects;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (project) =>
          project.name.toLowerCase().includes(query) ||
          (project.description?.toLowerCase().includes(query) ?? false)
      );
    }

    // Apply archived filter
    if (filterOption === 'active') {
      result = result.filter((project) => !project.is_archived);
    } else if (filterOption === 'archived') {
      result = result.filter((project) => project.is_archived);
    }

    return result;
  }, [projects, searchQuery, filterOption]);

  // Transform stats data for components
  const projectStatsData: ProjectStatsData | null = useMemo(() => {
    if (!statsData?.data) return null;

    const { data } = statsData;
    return {
      totalDocuments: data.total_documents,
      successRate: data.success_rate,
      totalTokens: data.total_tokens,
      estimatedCost: data.estimated_cost,
      statusBreakdown: data.status_breakdown,
      tokenByProject: data.token_by_project.map((item) => ({
        projectId: item.project_id,
        projectName: item.project_name,
        tokens: item.tokens,
      })),
    };
  }, [statsData]);

  // Handlers
  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      const result = await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      }).unwrap();

      toast.success('Project created successfully');
      setIsCreateDialogOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');

      // Navigate to the new project's documents
      navigate(`/documents?project=${result.data.project_id}`);
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string } };
      toast.error(err.data?.detail || 'Failed to create project');
    }
  }, [newProjectName, newProjectDescription, createProject, navigate]);

  const handleDeleteProject = useCallback((project: Project) => {
    setDeleteDialogProject(project);
  }, []);

  const handleConfirmDelete = useCallback(
    async () => {
      if (!deleteDialogProject) return;

      try {
        await deleteProject({ projectId: deleteDialogProject.project_id }).unwrap();
        toast.success('Project deleted');
        setDeleteDialogProject(null);
      } catch (error: unknown) {
        const err = error as { data?: { detail?: string } };
        toast.error(err.data?.detail || 'Failed to delete project');
      }
    },
    [deleteProject, deleteDialogProject]
  );

  const handleConfigureProject = useCallback((project: Project) => {
    setConfigProject(project);
  }, []);

  const handleSaveConfig = useCallback(
    async (projectId: string, config: ProjectConfig | ExtractionConfig) => {
      try {
        await updateExtractionConfig({
          projectId,
          extractionConfig: config as unknown as Record<string, unknown>,
        }).unwrap();
        toast.success('Configuration saved');
        setConfigProject(null);
      } catch (error: unknown) {
        const err = error as { data?: { detail?: string } };
        toast.error(err.data?.detail || 'Failed to save configuration');
        throw error;
      }
    },
    [updateExtractionConfig]
  );

  const handleRefresh = useCallback(() => {
    refetchProjects();
  }, [refetchProjects]);

  // Error state
  if (isProjectsError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-destructive">Failed to load projects</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Organize your documents and configure extraction settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <div className="space-y-4">
        <ProjectStats
          data={projectStatsData}
          isLoading={isLoadingStats}
          error={isStatsError ? 'Failed to load statistics' : null}
        />

        {/* Charts Row */}
        {projectStatsData && projectStatsData.totalDocuments > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <ProcessingChart
              data={projectStatsData.statusBreakdown}
              isLoading={isLoadingStats}
            />
            <TokenUsageChart
              data={projectStatsData.tokenByProject}
              isLoading={isLoadingStats}
            />
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* View Mode Toggle */}
            <Tabs
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
              className="w-auto"
            >
              <TabsList>
                <TabsTrigger value="grid" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Grid</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">List</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {filterOption === 'all' && 'All'}
                  {filterOption === 'active' && 'Active'}
                  {filterOption === 'archived' && 'Archived'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filterOption === 'all'}
                  onCheckedChange={() => setFilterOption('all')}
                >
                  All Projects
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filterOption === 'active'}
                  onCheckedChange={() => setFilterOption('active')}
                >
                  Active Only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filterOption === 'archived'}
                  onCheckedChange={() => setFilterOption('archived')}
                >
                  Archived Only
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid/List */}
      {isLoadingProjects ? (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid'
              ? 'md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          )}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <EnhancedProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <EmptyProjectsState
          onCreateProject={() => setIsCreateDialogOpen(true)}
          hasSearchQuery={!!searchQuery}
          filterOption={filterOption}
          onClearSearch={() => setSearchQuery('')}
        />
      ) : (
        <div
          className={cn(
            'grid gap-4',
            viewMode === 'grid'
              ? 'md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          )}
        >
          {filteredProjects.map((project) => (
            <ProjectCardWithStats
              key={project.project_id}
              project={project}
              onConfigure={handleConfigureProject}
              onDelete={handleDeleteProject}
            />
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to organize your documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="Enter project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description (optional)</Label>
              <Textarea
                id="projectDescription"
                placeholder="Enter project description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Configuration Modal */}
      <ProjectConfigModal
        open={!!configProject}
        onOpenChange={(open) => !open && setConfigProject(null)}
        project={configProject}
        onSave={handleSaveConfig}
        isLoading={isUpdatingConfig}
      />

      {/* Delete Project Dialog */}
      {deleteDialogProject && (
        <DeleteProjectDialog
          project={deleteDialogProject}
          open={!!deleteDialogProject}
          onOpenChange={(open) => !open && setDeleteDialogProject(null)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default ProjectsPage;

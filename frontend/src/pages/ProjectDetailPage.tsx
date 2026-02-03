/**
 * ProjectDetailPage
 *
 * Displays project details with tabs for Overview, Documents, and Settings.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  FileText,
  Upload,
  Settings,
  Trash2,
  Loader2,
  Edit2,
  Save,
  X,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useGetProjectQuery,
  useGetProjectStatisticsQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '@/store/api/projectsApi';
import { ProjectSettingsTab, DeleteProjectDialog } from '@/features/projects/components';
import type { ExtractionConfig } from '@/features/projects/types';

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get active tab from URL or default to 'overview'
  const activeTab = searchParams.get('tab') || 'overview';

  // RTK Query hooks
  const {
    data: projectData,
    isLoading,
    isError,
    refetch,
  } = useGetProjectQuery(projectId!, { skip: !projectId });

  const {
    data: statisticsData,
    isLoading: isLoadingStats,
  } = useGetProjectStatisticsQuery(projectId!, { skip: !projectId });

  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const project = projectData?.data;
  const statistics = statisticsData?.data;

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Initialize edit form when project loads
  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || '');
    }
  }, [project]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      await updateProject({
        projectId: projectId!,
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      }).unwrap();

      toast.success('Project updated');
      setIsEditing(false);
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string } };
      toast.error(err.data?.detail || 'Failed to update project');
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteProject({ projectId: projectId! }).unwrap();
      toast.success('Project deleted');
      setShowDeleteDialog(false);
      navigate('/projects');
    } catch (error: unknown) {
      const err = error as { data?: { detail?: string } };
      toast.error(err.data?.detail || 'Failed to delete project');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || '');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="text-center py-12">
        <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-medium">Project not found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The project you're looking for doesn't exist or has been deleted.
        </p>
        <div className="flex gap-2 justify-center mt-4">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button onClick={() => navigate('/projects')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold h-auto py-1"
                placeholder="Project name"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <p className="text-muted-foreground mt-1">
                {project.description || 'No description'}
              </p>
            </>
          )}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={isUpdating}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit Description */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Input
                id="editDescription"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Project description"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        statistics?.total_documents ?? 0
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Size</p>
                    <p className="text-sm font-medium">
                      {isLoadingStats ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        formatBytes(statistics?.total_size_bytes ?? 0)
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <BarChart3 className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">{formatDate(project.created_at)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <FolderKanban className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-sm font-medium">{formatDate(project.updated_at)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <Settings className="h-6 w-6 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Document Status Breakdown */}
          {statistics && Object.keys(statistics.status_counts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Document Status</CardTitle>
                <CardDescription>Breakdown of documents by processing status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {Object.entries(statistics.status_counts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common actions for this project</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={() => navigate(`/documents?project_id=${projectId}`)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Documents
              </Button>
              <Button variant="outline" onClick={() => handleTabChange('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configure Extraction
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Documents in this project</CardDescription>
              </div>
              <Button onClick={() => navigate(`/documents?project_id=${projectId}`)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </CardHeader>
            <CardContent>
              {(statistics?.total_documents ?? 0) === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No documents yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Upload documents to this project to get started.
                  </p>
                  <Button className="mt-4" onClick={() => navigate(`/documents?project_id=${projectId}`)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {statistics?.total_documents} documents in this project.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate(`/documents?project_id=${projectId}`)}
                  >
                    View All Documents
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <ProjectSettingsTab
            projectId={projectId!}
            initialConfig={project.extraction_config as ExtractionConfig | undefined}
          />
        </TabsContent>
      </Tabs>

      {/* Delete Project Dialog */}
      <DeleteProjectDialog
        project={{
          project_id: project.project_id,
          name: project.name,
          document_count: statistics?.total_documents,
        }}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default ProjectDetailPage;

/**
 * TemplatesPage
 *
 * Template management page with CRUD operations.
 *
 * Features:
 * - View all templates (card grid layout)
 * - Create new templates
 * - Edit existing templates
 * - Delete templates
 * - Search and filter templates
 * - Template preview
 */

import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Copy,
  Star,
  Users,
  Lock,
  Globe,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetTemplatesQuery,
  useDeleteTemplateMutation,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  type TemplateListItem,
  type Template,
  type CreateTemplateRequest,
  type UpdateTemplateRequest,
  VALID_DOCUMENT_TYPES,
} from "@/store/api/templatesApi";
import { TemplateFormModal } from "@/features/templates/components";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type VisibilityFilter = "all" | "mine" | "public";

/**
 * Format document type for display
 */
const formatDocumentType = (type: string | null): string => {
  if (!type) return "Custom";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Visibility icon component
 */
const VisibilityIcon: React.FC<{ visibility: string }> = ({ visibility }) => {
  switch (visibility) {
    case "public":
      return <Globe className="h-4 w-4 text-green-500" />;
    case "organization":
      return <Users className="h-4 w-4 text-blue-500" />;
    default:
      return <Lock className="h-4 w-4 text-muted-foreground" />;
  }
};

/**
 * Template card component
 */
interface TemplateCardProps {
  template: TemplateListItem;
  onEdit: (template: TemplateListItem) => void;
  onDelete: (template: TemplateListItem) => void;
  onDuplicate: (template: TemplateListItem) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onEdit, onDelete, onDuplicate }) => {
  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <CardTitle className="text-lg truncate">{template.name}</CardTitle>
              <VisibilityIcon visibility={template.visibility} />
            </div>
            <CardDescription className="line-clamp-2">
              {template.description || "No description"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2">
            {template.document_type && (
              <Badge variant="secondary" className="text-xs">
                {formatDocumentType(template.document_type)}
              </Badge>
            )}
            {template.category && (
              <Badge variant="outline" className="text-xs">
                {template.category}
              </Badge>
            )}
          </div>

          {/* Statistics */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {template.average_rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                <span>{template.average_rating.toFixed(1)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span>{template.usage_count} uses</span>
            </div>
          </div>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="outline" size="sm" onClick={() => onEdit(template)} className="flex-1">
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDuplicate(template)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(template)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Template card skeleton
 */
const TemplateCardSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="pb-3">
      <div className="space-y-2">
        <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Empty state component
 */
const EmptyTemplatesState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="bg-primary/10 p-6 rounded-full mb-6">
      <FileText className="h-12 w-12 text-primary" />
    </div>
    <h3 className="text-2xl font-semibold mb-2">No templates yet</h3>
    <p className="text-muted-foreground mb-6 max-w-md">
      Create your first template to standardize document extraction across projects.
    </p>
    <Button onClick={onCreate} size="lg" className="gap-2">
      <Plus className="h-5 w-5" />
      Create First Template
    </Button>
  </div>
);

/**
 * Delete confirmation dialog
 */
interface DeleteTemplateDialogProps {
  open: boolean;
  template: TemplateListItem | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteTemplateDialog: React.FC<DeleteTemplateDialogProps> = ({
  open,
  template,
  isDeleting,
  onConfirm,
  onCancel,
}) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{template?.name}"? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            "Delete Template"
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

/**
 * Main TemplatesPage component
 */
const TemplatesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, _setPage] = useState(1);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<TemplateListItem | null>(null);

  // Form modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<Template | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Fetch templates
  const {
    data: templatesResponse,
    isLoading,
    isFetching,
    refetch,
  } = useGetTemplatesQuery({
    visibility: visibilityFilter === "all" ? undefined : visibilityFilter,
    document_type: documentTypeFilter === "all" ? undefined : documentTypeFilter,
    search: searchQuery || undefined,
    page,
    page_size: 50,
  });

  // Template mutations
  const [deleteTemplate, { isLoading: isDeleting }] = useDeleteTemplateMutation();
  const [createTemplate, { isLoading: isCreating }] = useCreateTemplateMutation();
  const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();

  // Filter templates by search locally (for instant feedback)
  const filteredTemplates = useMemo(() => {
    const templates = templatesResponse?.data || [];
    if (!searchQuery) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query)
    );
  }, [templatesResponse?.data, searchQuery]);

  // Handlers
  const handleCreate = () => {
    setTemplateToEdit(null);
    setIsDuplicating(false);
    setFormModalOpen(true);
  };

  const handleEdit = (template: TemplateListItem) => {
    // Convert TemplateListItem to Template for editing
    setTemplateToEdit(template as Template);
    setIsDuplicating(false);
    setFormModalOpen(true);
  };

  const handleDelete = (template: TemplateListItem) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate(templateToDelete.id).unwrap();
      toast.success("Template deleted successfully");
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast.error("Failed to delete template");
      console.error("Delete error:", error);
    }
  };

  const handleDuplicate = (template: TemplateListItem) => {
    // Convert TemplateListItem to Template and open in duplicate mode
    setTemplateToEdit({
      ...(template as Template),
      name: `${template.name} (Copy)`,
    });
    setIsDuplicating(true);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (data: CreateTemplateRequest | UpdateTemplateRequest) => {
    try {
      if (templateToEdit && !isDuplicating) {
        // Edit mode
        await updateTemplate({
          id: templateToEdit.id,
          updates: data as UpdateTemplateRequest,
        }).unwrap();
        toast.success("Template updated successfully");
      } else {
        // Create mode (including duplicate)
        await createTemplate(data as CreateTemplateRequest).unwrap();
        toast.success(
          isDuplicating ? "Template duplicated successfully" : "Template created successfully"
        );
      }
      setFormModalOpen(false);
      setTemplateToEdit(null);
      setIsDuplicating(false);
    } catch (error) {
      toast.error("Failed to save template");
      console.error("Save error:", error);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success("Templates refreshed");
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage extraction configuration templates for your projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-5 w-5" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Visibility filter */}
        <Tabs
          value={visibilityFilter}
          onValueChange={(v) => setVisibilityFilter(v as VisibilityFilter)}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">My Templates</TabsTrigger>
            <TabsTrigger value="public">Public</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Document type filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {documentTypeFilter === "all" ? "All Types" : formatDocumentType(documentTypeFilter)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Document Type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={documentTypeFilter === "all"}
              onCheckedChange={() => setDocumentTypeFilter("all")}
            >
              All Types
            </DropdownMenuCheckboxItem>
            {VALID_DOCUMENT_TYPES.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={documentTypeFilter === type}
                onCheckedChange={() => setDocumentTypeFilter(type)}
              >
                {formatDocumentType(type)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View mode toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="grid">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Templates grid/list */}
      {isLoading ? (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        searchQuery || visibilityFilter !== "all" || documentTypeFilter !== "all" ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">No templates match your filters</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <EmptyTemplatesState onCreate={handleCreate} />
        )
      ) : (
        <>
          <div
            className={cn(
              "grid gap-4",
              viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}
          >
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>

          {/* Pagination info */}
          {templatesResponse && (
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              Showing {filteredTemplates.length} of {templatesResponse.total} templates
            </div>
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      <DeleteTemplateDialog
        open={deleteDialogOpen}
        template={templateToDelete}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }}
      />

      {/* Create/Edit template form modal */}
      <TemplateFormModal
        open={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setTemplateToEdit(null);
          setIsDuplicating(false);
        }}
        onSubmit={handleFormSubmit}
        template={templateToEdit}
        isSubmitting={isCreating || isUpdating}
      />
    </div>
  );
};

export default TemplatesPage;

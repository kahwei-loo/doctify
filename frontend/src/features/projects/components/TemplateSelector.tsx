/**
 * TemplateSelector Component
 *
 * A searchable, filterable template selector for applying extraction
 * configurations to projects.
 *
 * Features:
 * - Search templates by name/description
 * - Filter by document type and visibility
 * - Preview template configuration
 * - Apply template to project
 */

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  FileText,
  Star,
  Users,
  Lock,
  Globe,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetTemplatesQuery,
  useApplyTemplateMutation,
  type TemplateListItem,
  VALID_DOCUMENT_TYPES,
} from "@/store/api/templatesApi";

interface TemplateSelectorProps {
  /** Whether the selector is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Project ID to apply template to */
  projectId: string;
  /** Callback after template is applied */
  onTemplateApplied?: () => void;
}

/**
 * Format document type for display
 */
const formatDocumentType = (type: string | null): string => {
  if (!type) return "Custom";
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Get visibility icon
 */
const VisibilityIcon: React.FC<{ visibility: string }> = ({ visibility }) => {
  switch (visibility) {
    case "public":
      return <Globe className="h-3.5 w-3.5 text-green-500" />;
    case "organization":
      return <Users className="h-3.5 w-3.5 text-blue-500" />;
    default:
      return <Lock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

/**
 * Template card component
 */
interface TemplateCardProps {
  template: TemplateListItem;
  isSelected: boolean;
  onClick: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border transition-all duration-200",
        "hover:border-primary/50 hover:shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        isSelected && "border-primary bg-primary/5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{template.name}</h4>
            <VisibilityIcon visibility={template.visibility} />
          </div>

          {template.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {template.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-3">
            {template.document_type && (
              <Badge variant="secondary" className="text-xs">
                {formatDocumentType(template.document_type)}
              </Badge>
            )}

            {template.average_rating > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{template.average_rating.toFixed(1)}</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{template.usage_count} uses</span>
            </div>
          </div>

          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
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
        </div>

        <div className="flex-shrink-0">
          {isSelected ? (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>
    </button>
  );
};

/**
 * Loading skeleton for template cards
 */
const TemplateCardSkeleton: React.FC = () => (
  <div className="p-4 rounded-lg border">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
  </div>
);

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onOpenChange,
  projectId,
  onTemplateApplied,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Fetch templates
  const { data: templatesResponse, isLoading } = useGetTemplatesQuery(
    {
      visibility: visibilityFilter === "all" ? undefined : (visibilityFilter as "mine" | "public"),
      document_type: documentTypeFilter === "all" ? undefined : documentTypeFilter,
      search: searchQuery || undefined,
      page_size: 50,
    },
    { skip: !open }
  );

  // Apply template mutation
  const [applyTemplate, { isLoading: isApplying }] = useApplyTemplateMutation();

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    const templates = templatesResponse?.data || [];
    if (!searchQuery) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query)
    );
  }, [templatesResponse?.data, searchQuery]);

  // Handle apply
  const handleApply = async () => {
    if (!selectedTemplateId) return;

    try {
      await applyTemplate({
        templateId: selectedTemplateId,
        projectId,
      }).unwrap();

      onTemplateApplied?.();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by RTK Query
      console.error("Failed to apply template:", error);
    }
  };

  // Reset state when closing
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSearchQuery("");
      setDocumentTypeFilter("all");
      setVisibilityFilter("all");
      setSelectedTemplateId(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Select Template
          </DialogTitle>
          <DialogDescription>
            Choose a template to apply to your project. This will set up the extraction
            configuration with predefined fields and settings.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Document Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {VALID_DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {formatDocumentType(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="mine">My Templates</SelectItem>
              <SelectItem value="public">Public</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 py-2">
            {isLoading ? (
              <>
                <TemplateCardSkeleton />
                <TemplateCardSkeleton />
                <TemplateCardSkeleton />
              </>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {searchQuery ? "No templates match your search" : "No templates available"}
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {searchQuery
                    ? "Try a different search term"
                    : "Create your first template to get started"}
                </p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} available
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={!selectedTemplateId || isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Template"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelector;

/**
 * EnhancedProjectCard Component
 *
 * A rich project card displaying project info, statistics, and actions.
 * Used in the Projects page grid/list view.
 *
 * Features:
 * - Project avatar with color based on name
 * - Document count and status breakdown
 * - Quick actions (edit, delete, configure)
 * - Hover effects and animations
 * - Loading skeleton state
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  MoreVertical,
  Settings,
  Trash2,
  Edit3,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Archive,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectAvatar } from '@/components/ui/project-avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Project, ProjectStatistics } from '@/store/api/projectsApi';

interface EnhancedProjectCardProps {
  /** Project data */
  project: Project;
  /** Project statistics (optional) */
  statistics?: ProjectStatistics | null;
  /** Whether statistics are loading */
  statisticsLoading?: boolean;
  /** Click handler for the card */
  onClick?: () => void;
  /** Handler for edit action */
  onEdit?: (project: Project) => void;
  /** Handler for delete action */
  onDelete?: (project: Project) => void;
  /** Handler for configure action */
  onConfigure?: (project: Project) => void;
  /** Handler for archive action */
  onArchive?: (project: Project) => void;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Format date to relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Format file size
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

/**
 * Statistics display component
 * Memoized to prevent unnecessary re-renders when parent re-renders
 */
const StatisticsDisplay: React.FC<{
  statistics: ProjectStatistics | null | undefined;
  isLoading?: boolean;
}> = React.memo(({ statistics, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>No documents</span>
      </div>
    );
  }

  const { status_counts = {}, total_documents, total_size_bytes } = statistics;
  const completed = status_counts.completed || 0;
  const processing = status_counts.processing || 0;
  const failed = status_counts.failed || 0;
  const pending = status_counts.pending || 0;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="font-medium">{total_documents}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total documents: {total_documents}</p>
            <p>Total size: {formatFileSize(total_size_bytes)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="flex items-center gap-2">
        {completed > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  {completed}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{completed} completed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {processing > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {processing}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{processing} processing</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {pending > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <Clock className="h-3 w-3" />
                  {pending}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pending} pending</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {failed > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 bg-red-500/10 text-red-600 border-red-500/20">
                  <XCircle className="h-3 w-3" />
                  {failed}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{failed} failed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
});

StatisticsDisplay.displayName = 'StatisticsDisplay';

/**
 * Loading skeleton component
 */
export const EnhancedProjectCardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <Card className={cn('animate-pulse', className)}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        <div className="h-12 w-12 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-2/3 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
        <div className="h-8 w-8 bg-muted rounded" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-5 w-12 bg-muted rounded-full" />
        </div>
      </CardContent>
      <CardFooter className="pt-3">
        <div className="h-4 w-24 bg-muted rounded" />
      </CardFooter>
    </Card>
  );
};

/**
 * Memoized EnhancedProjectCard to prevent unnecessary re-renders
 * Only re-renders when project data, statistics, or handlers change
 */
export const EnhancedProjectCard: React.FC<EnhancedProjectCardProps> = React.memo(({
  project,
  statistics,
  statisticsLoading = false,
  onClick,
  onEdit,
  onDelete,
  onConfigure,
  onArchive,
  isSelected = false,
  className,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/documents?project=${project.project_id}`);
    }
  };

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(project.project_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasExtractionConfig = useMemo(() => {
    return project.extraction_config && Object.keys(project.extraction_config).length > 0;
  }, [project.extraction_config]);

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/20',
        isSelected && 'ring-2 ring-primary ring-offset-2',
        project.is_archived && 'opacity-60',
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
        <ProjectAvatar
          name={project.name}
          size="lg"
          className="flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            {project.is_archived && (
              <Badge variant="secondary" className="gap-1">
                <Archive className="h-3 w-3" />
                Archived
              </Badge>
            )}
          </div>
          {project.description && (
            <CardDescription className="line-clamp-2 mt-1">
              {project.description}
            </CardDescription>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              navigate(`/documents?project=${project.project_id}`);
            }}>
              <FolderOpen className="mr-2 h-4 w-4" />
              View Documents
            </DropdownMenuItem>

            {onConfigure && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onConfigure(project);
              }}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </DropdownMenuItem>
            )}

            {onEdit && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={handleCopyId}>
              {copied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              Copy ID
            </DropdownMenuItem>

            {onArchive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onArchive(project);
                }}>
                  <Archive className="mr-2 h-4 w-4" />
                  {project.is_archived ? 'Restore' : 'Archive'}
                </DropdownMenuItem>
              </>
            )}

            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        <StatisticsDisplay
          statistics={statistics}
          isLoading={statisticsLoading}
        />

        {hasExtractionConfig && (
          <div className="mt-3">
            <Badge variant="outline" className="gap-1">
              <Settings className="h-3 w-3" />
              Custom Schema
            </Badge>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>Updated {formatRelativeTime(project.updated_at)}</span>
        </div>
      </CardFooter>
    </Card>
  );
});

EnhancedProjectCard.displayName = 'EnhancedProjectCard';

export default EnhancedProjectCard;

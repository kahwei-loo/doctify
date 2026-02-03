/**
 * ProjectSettingsDrawer Component
 *
 * A slide-out drawer for editing project settings within the Documents page.
 * Uses Sheet component for smooth right-side slide animation.
 * Reuses ProjectSettingsTab content for consistency.
 */

import React from 'react';
import { Settings, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ProjectSettingsTab } from '@/features/projects/components/ProjectSettingsTab';
import type { Project } from '@/store/api/projectsApi';
import type { ExtractionConfig } from '@/features/projects/types';

interface ProjectSettingsDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The project to configure */
  project: Project | null;
}

export const ProjectSettingsDrawer: React.FC<ProjectSettingsDrawerProps> = ({
  open,
  onOpenChange,
  project,
}) => {
  const navigate = useNavigate();

  if (!project) {
    return null;
  }

  // Parse extraction config from project
  const extractionConfig: ExtractionConfig | null = project.extraction_config
    ? (project.extraction_config as unknown as ExtractionConfig)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Project Settings
          </SheetTitle>
          <SheetDescription>
            Configure extraction schema and processing settings for{' '}
            <span className="font-medium text-foreground">{project.name}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="py-6">
          <ProjectSettingsTab
            projectId={project.project_id}
            initialConfig={extractionConfig}
          />
        </div>

        {/* Footer with link to full project page */}
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-muted-foreground hover:text-foreground"
            onClick={() => {
              onOpenChange(false);
              navigate(`/projects/${project.project_id}`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open full project details
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProjectSettingsDrawer;

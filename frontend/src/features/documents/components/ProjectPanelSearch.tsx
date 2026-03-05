/**
 * ProjectPanelSearch Component
 *
 * Search input for filtering projects in the project panel.
 */

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectPanelSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const ProjectPanelSearch: React.FC<ProjectPanelSearchProps> = ({
  value,
  onChange,
  className,
}) => {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search projects..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8 h-9 text-sm"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={() => onChange("")}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  );
};

export default ProjectPanelSearch;

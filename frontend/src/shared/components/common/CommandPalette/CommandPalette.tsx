/**
 * CommandPalette Component
 *
 * Global search and quick actions interface accessible via Cmd+K / Ctrl+K.
 * Provides fast navigation to documents, projects, knowledge bases, and assistants.
 *
 * Week 7 Task 2.1: Global Search (Command+K)
 *
 * NOTE: Requires cmdk package to be installed:
 * npm install cmdk
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  FolderKanban,
  Plus,
  Upload,
  Settings,
  Search,
  Clock,
  Loader2,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useGetProjectsQuery } from "@/store/api/projectsApi";
import { useGetDocumentsQuery } from "@/store/api/documentsApi";

export type SearchResultType = "document" | "project" | "kb" | "assistant" | "action";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  /** Custom class name */
  className?: string;
}

/**
 * Custom hook for global keyboard shortcut
 */
const useCommandK = (callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [callback]);
};

/**
 * Recent items stored in localStorage
 */
const RECENT_KEY = "commandPalette_recent";
const MAX_RECENT = 5;

const getRecentItems = (): string[] => {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentItem = (id: string) => {
  try {
    const recent = getRecentItems().filter((item) => item !== id);
    recent.unshift(id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore localStorage errors
  }
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ className }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Toggle with Cmd+K / Ctrl+K
  useCommandK(() => setOpen((prev) => !prev));

  // Fetch data
  const { data: projectsData, isLoading: isLoadingProjects } = useGetProjectsQuery(
    {},
    { skip: !open }
  );
  const { data: documentsData, isLoading: isLoadingDocuments } = useGetDocumentsQuery(
    { pagination: { page: 1, per_page: 50 } },
    { skip: !open }
  );

  const projects = projectsData?.data ?? [];
  const documents = documentsData?.data ?? [];
  const isLoading = isLoadingProjects || isLoadingDocuments;

  // Handle result selection
  const handleSelect = useCallback((result: SearchResult) => {
    addRecentItem(result.id);
    result.action();
    setOpen(false);
    setSearch("");
  }, []);

  // Quick actions
  const quickActions: SearchResult[] = useMemo(
    () => [
      {
        id: "action-new-project",
        type: "action",
        title: "Create New Project",
        subtitle: "Start a new document collection",
        icon: <Plus className="h-4 w-4" />,
        action: () => navigate("/projects?create=true"),
        keywords: ["new", "create", "project", "add"],
      },
      {
        id: "action-upload",
        type: "action",
        title: "Upload Document",
        subtitle: "Upload files for processing",
        icon: <Upload className="h-4 w-4" />,
        action: () => navigate("/documents?upload=true"),
        keywords: ["upload", "document", "file", "add"],
      },
      {
        id: "action-settings",
        type: "action",
        title: "Settings",
        subtitle: "Manage your account",
        icon: <Settings className="h-4 w-4" />,
        action: () => navigate("/settings"),
        keywords: ["settings", "preferences", "account", "config"],
      },
    ],
    [navigate]
  );

  // Project results
  const projectResults: SearchResult[] = useMemo(
    () =>
      projects.map((project) => ({
        id: `project-${project.project_id}`,
        type: "project" as const,
        title: project.name,
        subtitle: project.description || "No description",
        icon: <FolderKanban className="h-4 w-4" />,
        action: () => navigate(`/documents?project=${project.project_id}`),
        keywords: [project.name.toLowerCase(), project.description?.toLowerCase() || ""],
      })),
    [projects, navigate]
  );

  // Document results
  const documentResults: SearchResult[] = useMemo(
    () =>
      documents.map((doc) => ({
        id: `document-${doc.document_id}`,
        type: "document" as const,
        title: doc.filename,
        subtitle: doc.project_name || "No project",
        icon: <FileText className="h-4 w-4" />,
        action: () => navigate(`/documents/${doc.document_id}`),
        keywords: [doc.filename.toLowerCase(), doc.project_name?.toLowerCase() || ""],
      })),
    [documents, navigate]
  );

  // Filter results based on search
  const filteredActions = useMemo(() => {
    if (!search) return quickActions;
    const query = search.toLowerCase();
    return quickActions.filter(
      (action) =>
        action.title.toLowerCase().includes(query) ||
        action.subtitle?.toLowerCase().includes(query) ||
        action.keywords?.some((k) => k.includes(query))
    );
  }, [quickActions, search]);

  const filteredProjects = useMemo(() => {
    if (!search) return projectResults.slice(0, 5);
    const query = search.toLowerCase();
    return projectResults.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        project.subtitle?.toLowerCase().includes(query)
    );
  }, [projectResults, search]);

  const filteredDocuments = useMemo(() => {
    if (!search) return documentResults.slice(0, 5);
    const query = search.toLowerCase();
    return documentResults.filter(
      (doc) =>
        doc.title.toLowerCase().includes(query) || doc.subtitle?.toLowerCase().includes(query)
    );
  }, [documentResults, search]);

  // Recent items
  const recentItems = useMemo(() => {
    const recentIds = getRecentItems();
    const allResults = [...projectResults, ...documentResults];
    return recentIds
      .map((id) => allResults.find((r) => r.id === id))
      .filter(Boolean) as SearchResult[];
  }, [projectResults, documentResults]);

  const hasResults =
    filteredActions.length > 0 || filteredProjects.length > 0 || filteredDocuments.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search documents, projects, or type a command..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className={className}>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : !hasResults ? (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <p>No results found for "{search}"</p>
              <p className="text-xs text-muted-foreground">
                Try searching for documents, projects, or actions
              </p>
            </div>
          </CommandEmpty>
        ) : (
          <>
            {/* Recent Items */}
            {!search && recentItems.length > 0 && (
              <>
                <CommandGroup heading="Recent">
                  {recentItems.map((item) => (
                    <CommandItem key={item.id} value={item.id} onSelect={() => handleSelect(item)}>
                      <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{item.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {item.subtitle}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Quick Actions */}
            {filteredActions.length > 0 && (
              <>
                <CommandGroup heading="Quick Actions">
                  {filteredActions.map((action) => (
                    <CommandItem
                      key={action.id}
                      value={action.id}
                      onSelect={() => handleSelect(action)}
                    >
                      {action.icon}
                      <span className="ml-2">{action.title}</span>
                      {action.subtitle && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {action.subtitle}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Projects */}
            {filteredProjects.length > 0 && (
              <>
                <CommandGroup heading="Projects">
                  {filteredProjects.map((project) => (
                    <CommandItem
                      key={project.id}
                      value={project.id}
                      onSelect={() => handleSelect(project)}
                    >
                      {project.icon}
                      <span className="ml-2">{project.title}</span>
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {project.subtitle}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Documents */}
            {filteredDocuments.length > 0 && (
              <CommandGroup heading="Documents">
                {filteredDocuments.map((doc) => (
                  <CommandItem key={doc.id} value={doc.id} onSelect={() => handleSelect(doc)}>
                    {doc.icon}
                    <span className="ml-2 truncate">{doc.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground truncate">
                      {doc.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>

      {/* Footer with keyboard hints */}
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ↑↓
            </kbd>{" "}
            Navigate
          </span>
          <span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ↵
            </kbd>{" "}
            Select
          </span>
          <span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>{" "}
            Close
          </span>
        </div>
        <div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>{" "}
          to open
        </div>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;

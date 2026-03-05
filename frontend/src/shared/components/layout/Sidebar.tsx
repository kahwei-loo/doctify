import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  Bot,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Database,
  Layout,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const selectedKey = location.pathname.split("/")[1] || "dashboard";

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      key: "documents",
      icon: <FileText className="h-5 w-5" />,
      label: "Documents",
      path: "/documents",
    },
    {
      key: "knowledge-base",
      icon: <Database className="h-5 w-5" />,
      label: "Knowledge Base",
      path: "/knowledge-base",
    },
    {
      key: "chat",
      icon: <MessagesSquare className="h-5 w-5" />,
      label: "Chat",
      path: "/chat",
    },
    {
      key: "assistants",
      icon: <Bot className="h-5 w-5" />,
      label: "AI Assistants",
      path: "/assistants",
    },
    {
      key: "templates",
      icon: <Layout className="h-5 w-5" />,
      label: "Templates",
      path: "/templates",
    },
    {
      key: "settings",
      icon: <Settings className="h-5 w-5" />,
      label: "Settings",
      path: "/settings",
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-40",
          "bg-card border-r border-border shadow-sm",
          "flex flex-col",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo Header with Toggle */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-border",
            "transition-all duration-300",
            collapsed ? "justify-center px-2" : "px-4 justify-between"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "" : "gap-3")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            {!collapsed && (
              <span className="text-lg font-semibold text-foreground truncate">Doctify</span>
            )}
          </div>
          {/* Toggle button in header */}
          {!collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  aria-label="Collapse sidebar"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <div className="px-3 py-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  aria-label="Expand sidebar"
                  className="w-full h-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <ChevronsRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className={cn("flex-1 px-3 space-y-1 overflow-y-auto", collapsed ? "py-2" : "py-4")}
        >
          {navItems.map((item) => {
            const isActive = selectedKey === item.key;
            const linkContent = (
              <Link
                key={item.key}
                to={item.path}
                aria-label={collapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 transition-transform duration-200",
                    !isActive && "group-hover:scale-110"
                  )}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.key}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;

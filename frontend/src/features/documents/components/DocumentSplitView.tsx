/**
 * DocumentSplitView Component
 *
 * Resizable split view layout for document detail page.
 * Left panel: Document preview (PDF/image)
 * Right panel: Extracted data and structured view
 *
 * Features:
 * - Resizable panels with drag handle
 * - Collapsible panels
 * - Responsive layout (stacks on mobile)
 * - Persistent panel sizes via localStorage
 */

import React, { useState, useEffect } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DocumentSplitViewProps {
  /** Content for the left panel (document preview) */
  leftPanel: React.ReactNode;
  /** Content for the right panel (extracted data) */
  rightPanel: React.ReactNode;
  /** Title for the left panel */
  leftTitle?: string;
  /** Title for the right panel */
  rightTitle?: string;
  /** Default size of the left panel (percentage) */
  defaultLeftSize?: number;
  /** Minimum size of each panel (percentage) */
  minSize?: number;
  /** Key for persisting panel sizes in localStorage */
  storageKey?: string;
  /** Custom class name */
  className?: string;
  /** Direction of the panels */
  direction?: 'horizontal' | 'vertical';
  /** Show panel headers with titles and collapse buttons */
  showPanelHeaders?: boolean;
  /** Callback when panel size changes */
  onPanelResize?: (leftSize: number) => void;
}

// ResizeHandle component removed - using Shadcn ResizableHandle instead

export const DocumentSplitView: React.FC<DocumentSplitViewProps> = ({
  leftPanel,
  rightPanel,
  leftTitle = 'Document Preview',
  rightTitle = 'Extracted Data',
  defaultLeftSize = 40,
  minSize = 20,
  storageKey = 'document-split-view',
  className,
  direction = 'horizontal',
  showPanelHeaders = false,
  onPanelResize,
}) => {
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Panel collapse handlers
  const handleCollapseLeft = () => {
    setIsLeftCollapsed(!isLeftCollapsed);
    if (isRightCollapsed) setIsRightCollapsed(false);
  };

  const handleCollapseRight = () => {
    setIsRightCollapsed(!isRightCollapsed);
    if (isLeftCollapsed) setIsLeftCollapsed(false);
  };

  // Calculate panel sizes based on collapse state
  const leftSize = isLeftCollapsed ? 0 : isRightCollapsed ? 100 : defaultLeftSize;
  const rightSize = isRightCollapsed ? 0 : isLeftCollapsed ? 100 : 100 - defaultLeftSize;

  // Mobile layout - stacked vertically
  if (isMobile) {
    return (
      <div className={cn('flex flex-col gap-4', className)}>
        {/* Left panel (preview) */}
        <div className="flex-1 min-h-[40vh] border rounded-lg overflow-hidden bg-card">
          {showPanelHeaders && (
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <span className="text-sm font-medium">{leftTitle}</span>
            </div>
          )}
          <div className="h-full overflow-auto">{leftPanel}</div>
        </div>

        {/* Right panel (data) */}
        <div className="flex-1 min-h-[40vh] border rounded-lg overflow-hidden bg-card">
          {showPanelHeaders && (
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <span className="text-sm font-medium">{rightTitle}</span>
            </div>
          )}
          <div className="h-full overflow-auto">{rightPanel}</div>
        </div>
      </div>
    );
  }

  // Desktop layout - resizable panels
  return (
    <TooltipProvider>
      <div className={cn('h-full', className)}>
        <ResizablePanelGroup
          direction={direction}
          className="h-full"
        >
          {/* Left Panel */}
          <ResizablePanel
            id="left-panel"
            defaultSize={leftSize}
            minSize={isLeftCollapsed ? 0 : minSize}
            collapsible
            collapsedSize={0}
            onResize={(size) => {
              console.log('🔄 Panel Resize:', {
                rawSize: size,
                sizeType: typeof size,
                sizeKeys: typeof size === 'object' ? Object.keys(size) : 'N/A',
                sizeValues: typeof size === 'object' ? Object.values(size) : 'N/A',
                stringified: JSON.stringify(size),
                isLeftCollapsed,
                isRightCollapsed,
                hasCallback: !!onPanelResize,
              });
              if (onPanelResize && !isLeftCollapsed && !isRightCollapsed) {
                // ResizablePanel passes size as object with asPercentage property
                const numericSize = typeof size === 'number' ? size : (
                  // Extract asPercentage from the size object
                  typeof size === 'object' && size !== null
                    ? (size as any).asPercentage || (size as any).percentage || Number(size)
                    : Number(size)
                );
                console.log('✅ Calling onPanelResize with:', numericSize);
                onPanelResize(numericSize);
              }
            }}
            className={cn(
              'transition-all duration-200'
            )}
          >
            <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
              {/* Panel header - Optional */}
              {showPanelHeaders && (
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <span className="text-sm font-medium">{leftTitle}</span>
                  {!isLeftCollapsed && (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCollapseLeft}
                          >
                            <PanelLeftClose className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          Collapse panel
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {isLeftCollapsed && (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCollapseLeft}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          Expand panel
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              )}
              {/* Panel content */}
              <div className="flex-1 overflow-auto">{leftPanel}</div>
            </div>
          </ResizablePanel>

          {/* Resize Handle - Always render as direct child of Group */}
          <ResizableHandle withHandle />

          {/* Right Panel */}
          <ResizablePanel
            id="right-panel"
            defaultSize={rightSize}
            minSize={isRightCollapsed ? 0 : minSize}
            collapsible
            collapsedSize={0}
            className={cn(
              'transition-all duration-200'
            )}
          >
            <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
              {/* Panel header - Optional */}
              {showPanelHeaders && (
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                  <span className="text-sm font-medium">{rightTitle}</span>
                  {!isRightCollapsed && (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCollapseRight}
                          >
                            <PanelRightClose className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          Collapse panel
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {isRightCollapsed && (
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={handleCollapseRight}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          Expand panel
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              )}
              {/* Panel content */}
              <div className="flex-1 overflow-auto">{rightPanel}</div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  );
};

// Named export is at line 59

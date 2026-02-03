import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/shared/components/layout/Sidebar';
import Header from '@/shared/components/layout/Header';
import { CommandPalette } from '@/shared/components/common/CommandPalette';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH_EXPANDED = 240;
const SIDEBAR_WIDTH_COLLAPSED = 68;
const HEADER_HEIGHT = 64;

const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((collapsed) => !collapsed);

  const currentSidebarWidth = sidebarCollapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Global Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette />

      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      {/* Header */}
      <Header sidebarWidth={currentSidebarWidth} />

      {/* Main content area */}
      <main
        className={cn(
          'transition-all duration-300 ease-in-out',
          'min-h-screen bg-background'
        )}
        style={{
          marginLeft: currentSidebarWidth,
          paddingTop: HEADER_HEIGHT,
        }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;

/**
 * Knowledge Base Page - Route Controller
 *
 * Routes between Overall View and Detail View based on URL parameters.
 * - /knowledge-base (no kbId) → OverallViewPage
 * - /knowledge-base/{id} (with kbId) → KBSplitLayout (Sources + Chat side-by-side)
 */

import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  KBListPanel,
  OverallViewPage,
  KBSplitLayout,
} from '@/features/knowledge-base/components';
import { useAppSelector } from '@/store';
import { selectIsDemoMode } from '@/store/slices/demoSlice';

const HEADER_HEIGHT = 64;
const DEMO_BANNER_HEIGHT = 48;

const KnowledgeBasePage: React.FC = () => {
  const { kbId } = useParams<{ kbId?: string }>();
  const isDemoMode = useAppSelector(selectIsDemoMode);

  // UI State
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(kbId || null);

  // Handler for KB selection from panel
  const handleSelectKb = useCallback((selectedId: string | null) => {
    setSelectedKbId(selectedId);
    // Navigation is handled by the components themselves
  }, []);

  // Determine which view to render
  const renderView = () => {
    if (!kbId) {
      // No kbId in URL → Show Overall View
      return <OverallViewPage />;
    }

    // kbId in URL → Show Detail View
    return <KBSplitLayout kbId={kbId} />;
  };

  return (
    <div
      className="flex -m-6 overflow-hidden"
      style={{ height: `calc(100vh - ${isDemoMode ? HEADER_HEIGHT + DEMO_BANNER_HEIGHT : HEADER_HEIGHT}px)` }}
    >
      {/* L2 Panel: Knowledge Base List (always visible) */}
      <KBListPanel
        selectedKbId={kbId || null}
        onSelectKb={handleSelectKb}
        collapsed={isPanelCollapsed}
        onToggleCollapse={() => setIsPanelCollapsed(!isPanelCollapsed)}
      />

      {/* L3 Content: Overall View or Detail View based on route */}
      {renderView()}
    </div>
  );
};

export default KnowledgeBasePage;

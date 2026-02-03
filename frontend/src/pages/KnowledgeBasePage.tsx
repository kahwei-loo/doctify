/**
 * Knowledge Base Page - Route Controller
 *
 * Routes between Overall View and Detail View based on URL parameters.
 * - /knowledge-base (no kbId) → OverallViewPage
 * - /knowledge-base/{id} (with kbId) → KBDetailPage
 *
 * Pattern: Two-view architecture with context-aware routing
 */

import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  KBListPanel,
  OverallViewPage,
  KBDetailPage,
} from '@/features/knowledge-base/components';

const KnowledgeBasePage: React.FC = () => {
  const { kbId } = useParams<{ kbId?: string }>();

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
    return <KBDetailPage kbId={kbId} />;
  };

  return (
    <div className="flex h-full">
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

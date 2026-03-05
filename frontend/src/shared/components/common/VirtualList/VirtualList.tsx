/**
 * VirtualList Component
 *
 * Efficient virtualized list for large datasets.
 * Only renders visible items to improve performance.
 *
 * Week 7 Task 3.1.4: Virtual Scrolling
 *
 * @example
 * <VirtualList
 *   items={documents}
 *   itemHeight={64}
 *   renderItem={(doc, index) => <DocumentRow document={doc} />}
 *   containerHeight={400}
 * />
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Height of each item in pixels */
  itemHeight: number;
  /** Height of the container in pixels (or 'auto' for parent height) */
  containerHeight: number | "auto";
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Number of items to render above/below visible area */
  overscan?: number;
  /** Optional key extractor function */
  getItemKey?: (item: T, index: number) => string | number;
  /** Optional className for container */
  className?: string;
  /** Optional className for the scrollable wrapper */
  wrapperClassName?: string;
  /** Called when scrolling near the end (for infinite scroll) */
  onEndReached?: () => void;
  /** Threshold for onEndReached (in pixels from bottom) */
  endReachedThreshold?: number;
  /** Loading state for infinite scroll */
  isLoading?: boolean;
  /** Loading component to show at the bottom */
  loadingComponent?: React.ReactNode;
  /** Empty state component */
  emptyComponent?: React.ReactNode;
}

interface VirtualListState {
  scrollTop: number;
  containerHeight: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  getItemKey,
  className,
  wrapperClassName,
  onEndReached,
  endReachedThreshold = 200,
  isLoading = false,
  loadingComponent,
  emptyComponent,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<VirtualListState>({
    scrollTop: 0,
    containerHeight: typeof containerHeight === "number" ? containerHeight : 0,
  });

  // Update container height if using 'auto'
  useEffect(() => {
    if (containerHeight === "auto" && containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setState((prev) => ({
            ...prev,
            containerHeight: entry.contentRect.height,
          }));
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    } else if (typeof containerHeight === "number") {
      setState((prev) => ({
        ...prev,
        containerHeight,
      }));
    }
  }, [containerHeight]);

  // Calculate visible range
  const {
    startIndex,
    endIndex: _endIndex,
    visibleItems,
  } = useMemo(() => {
    const effectiveHeight = state.containerHeight;

    if (effectiveHeight === 0 || items.length === 0) {
      return { startIndex: 0, endIndex: 0, visibleItems: [] };
    }

    // Calculate visible range with overscan
    const start = Math.max(0, Math.floor(state.scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(effectiveHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items.slice(start, end),
    };
  }, [items, itemHeight, state.scrollTop, state.containerHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

      setState((prev) => ({
        ...prev,
        scrollTop,
      }));

      // Check if we're near the end for infinite scroll
      if (onEndReached && !isLoading) {
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        if (distanceFromBottom < endReachedThreshold) {
          onEndReached();
        }
      }
    },
    [onEndReached, isLoading, endReachedThreshold]
  );

  // Total content height
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = startIndex * itemHeight;

  // Default key extractor
  const keyExtractor = getItemKey || ((_, index) => index);

  // Empty state
  if (items.length === 0 && !isLoading) {
    return emptyComponent ? <>{emptyComponent}</> : null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", wrapperClassName)}
      style={{
        height: typeof containerHeight === "number" ? containerHeight : "100%",
      }}
      onScroll={handleScroll}
    >
      {/* Spacer div to create scrollbar */}
      <div
        style={{
          height: totalHeight,
          position: "relative",
        }}
      >
        {/* Visible items container */}
        <div
          className={className}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item, localIndex) => {
            const globalIndex = startIndex + localIndex;
            return (
              <div key={keyExtractor(item, globalIndex)} style={{ height: itemHeight }}>
                {renderItem(item, globalIndex)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading indicator for infinite scroll */}
      {isLoading && loadingComponent && (
        <div className="flex items-center justify-center py-4">{loadingComponent}</div>
      )}
    </div>
  );
}

/**
 * Hook for virtual list scroll position persistence
 */
export function useVirtualListScroll(key: string) {
  const [scrollTop, setScrollTop] = useState(() => {
    const saved = sessionStorage.getItem(`virtual-list-scroll-${key}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  const saveScroll = useCallback(
    (position: number) => {
      setScrollTop(position);
      sessionStorage.setItem(`virtual-list-scroll-${key}`, position.toString());
    },
    [key]
  );

  const clearScroll = useCallback(() => {
    setScrollTop(0);
    sessionStorage.removeItem(`virtual-list-scroll-${key}`);
  }, [key]);

  return { scrollTop, saveScroll, clearScroll };
}

/**
 * Simple virtualized list for fixed-height items
 */
export function SimpleVirtualList<T>({
  items,
  itemHeight,
  maxHeight,
  renderItem,
  className,
  emptyMessage = "No items",
}: {
  items: T[];
  itemHeight: number;
  maxHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // If list is small enough, don't virtualize
  if (items.length * itemHeight <= maxHeight) {
    return (
      <div className={className}>
        {items.map((item, index) => (
          <div key={index} style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <VirtualList
      items={items}
      itemHeight={itemHeight}
      containerHeight={maxHeight}
      renderItem={renderItem}
      className={className}
    />
  );
}

export default VirtualList;

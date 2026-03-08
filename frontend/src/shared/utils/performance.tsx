/**
 * Performance Utilities
 *
 * Utilities and helpers for optimizing React component performance.
 */

import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";

/**
 * Deep comparison for React.memo
 * Use with React.memo second argument for complex props comparison
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual((a as any)[key], (b as any)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Shallow comparison for React.memo
 * More performant than deep equal for simple props
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || (a as any)[key] !== (b as any)[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Hook for debounced callback
 * Useful for expensive operations triggered by user input
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Hook for throttled callback
 * Limits function execution frequency
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRan = useRef<number>(Date.now());

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();

      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      }
    },
    [callback, delay]
  );
}

/**
 * Hook for measuring component render performance
 * Logs render time in development mode
 */
export function useRenderPerformance(componentName: string): void {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;

    if (import.meta.env.DEV) {
      console.log(`[Performance] ${componentName} render #${renderCount.current}: ${renderTime}ms`);
    }

    startTime.current = Date.now();
  });
}

/**
 * Hook for detecting expensive renders
 * Warns when render time exceeds threshold
 */
export function useRenderWarning(componentName: string, threshold = 16): void {
  const startTime = useRef(Date.now());

  useEffect(() => {
    const endTime = Date.now();
    const renderTime = endTime - startTime.current;

    if (renderTime > threshold && import.meta.env.DEV) {
      console.warn(
        `[Performance Warning] ${componentName} took ${renderTime}ms to render (threshold: ${threshold}ms)`
      );
    }

    startTime.current = Date.now();
  });
}

/**
 * Memoized expensive calculation
 * Use instead of useMemo for very expensive operations
 */
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  computationName?: string
): T {
  return useMemo(() => {
    const startTime = performance.now();
    const result = factory();
    const endTime = performance.now();

    if (import.meta.env.DEV && computationName) {
      console.log(`[Memo] ${computationName}: ${(endTime - startTime).toFixed(2)}ms`);
    }

    return result;
  }, deps);
}

/**
 * Hook for lazy initialization
 * Useful for expensive initial state calculations
 */
export function useLazyRef<T>(initializer: () => T): React.MutableRefObject<T> {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = initializer();
  }

  return ref as React.MutableRefObject<T>;
}

/**
 * Hook for intersection observer
 * Enables lazy loading and visibility tracking
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private static metrics: Map<string, number[]> = new Map();

  static record(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(duration);
  }

  static getAverage(name: string): number {
    const durations = this.metrics.get(name) || [];
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  static getP95(name: string): number {
    const durations = this.metrics.get(name) || [];
    if (durations.length === 0) return 0;
    const sorted = [...durations].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }

  static report(): void {
    if (!import.meta.env.DEV) return;

    console.group("[Performance Report]");
    this.metrics.forEach((durations, name) => {
      console.log(`${name}:`, {
        count: durations.length,
        avg: this.getAverage(name).toFixed(2) + "ms",
        p95: this.getP95(name).toFixed(2) + "ms",
        min: Math.min(...durations).toFixed(2) + "ms",
        max: Math.max(...durations).toFixed(2) + "ms",
      });
    });
    console.groupEnd();
  }

  static clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }
}

/**
 * HOC for performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const displayName = componentName || Component.displayName || Component.name || "Component";

  const WrappedComponent: React.FC<P> = (props) => {
    useRenderPerformance(displayName);
    useRenderWarning(displayName);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${displayName})`;

  return WrappedComponent;
}

/**
 * Utility to measure async operation performance
 */
export async function measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    PerformanceMetrics.record(name, duration);

    if (import.meta.env.DEV) {
      console.log(`[Async Operation] ${name}: ${duration.toFixed(2)}ms`);
    }

    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (import.meta.env.DEV) {
      console.error(`[Async Operation Failed] ${name}: ${duration.toFixed(2)}ms`, error);
    }

    throw error;
  }
}

/**
 * Utility to batch state updates
 * Useful for reducing render count
 */
export function useBatchedUpdates<T>(): [T | undefined, (updates: Partial<T>) => void] {
  const [state, setState] = useState<T | undefined>(undefined);
  const pendingUpdates = useRef<Partial<T>[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdates.current.push(updates);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState((prev) => {
        const merged = pendingUpdates.current.reduce(
          (acc, update) => ({ ...acc, ...update }),
          prev || ({} as T)
        );
        pendingUpdates.current = [];
        return merged as T;
      });
    }, 16); // ~1 frame at 60fps
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, scheduleUpdate];
}

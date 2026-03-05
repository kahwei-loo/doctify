/**
 * useUnsavedChangesWarning Hook
 *
 * Warns users before leaving a page with unsaved changes.
 * Uses browser's beforeunload event and optionally integrates with React Router.
 *
 * Week 7 Task 1.4.4: Unsaved Changes Warning Hook
 *
 * @example
 * const { setHasUnsavedChanges } = useUnsavedChangesWarning({
 *   enabled: true,
 *   message: 'You have unsaved changes. Are you sure you want to leave?',
 * });
 *
 * // When form is dirty
 * setHasUnsavedChanges(true);
 *
 * // When form is saved
 * setHasUnsavedChanges(false);
 */

import { useEffect, useState, useCallback } from "react";
import { useBlocker } from "react-router-dom";

interface UseUnsavedChangesWarningOptions {
  /** Whether the warning is enabled */
  enabled?: boolean;
  /** Custom warning message (only shown in some browsers) */
  message?: string;
  /** Initial state of unsaved changes */
  initialHasChanges?: boolean;
}

interface UseUnsavedChangesWarningReturn {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Set whether there are unsaved changes */
  setHasUnsavedChanges: (value: boolean) => void;
  /** Reset the unsaved changes state */
  resetUnsavedChanges: () => void;
  /** Blocker state from React Router (if navigation is blocked) */
  blocker: ReturnType<typeof useBlocker>;
}

const DEFAULT_MESSAGE = "You have unsaved changes. Are you sure you want to leave?";

export function useUnsavedChangesWarning({
  enabled = true,
  message = DEFAULT_MESSAGE,
  initialHasChanges = false,
}: UseUnsavedChangesWarningOptions = {}): UseUnsavedChangesWarningReturn {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(initialHasChanges);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      enabled && hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser close/refresh with beforeunload
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages, but this is still required
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, hasUnsavedChanges, message]);

  // Reset function
  const resetUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    resetUnsavedChanges,
    blocker,
  };
}

/**
 * Simple version without React Router integration
 * Use this when you only need the beforeunload warning
 */
export function useBeforeUnloadWarning(
  hasUnsavedChanges: boolean,
  message: string = DEFAULT_MESSAGE
): void {
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, message]);
}

export default useUnsavedChangesWarning;

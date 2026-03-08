/**
 * useDemoMode Hook
 *
 * Custom hook for demo mode state management and feature restrictions
 */

import { useAppDispatch, useAppSelector } from "@/store";
import {
  enterDemoMode,
  exitDemoMode,
  selectIsDemoMode,
  selectDemoEnteredAt,
} from "@/store/slices/demoSlice";

// Features that are restricted in demo mode
const RESTRICTED_FEATURES = [
  "upload",
  "delete",
  "edit",
  "create",
  "settings",
  "api_keys",
  "billing",
  "team",
  "export",
] as const;

type RestrictedFeature = (typeof RESTRICTED_FEATURES)[number];

export const useDemoMode = () => {
  const dispatch = useAppDispatch();
  const isDemoMode = useAppSelector(selectIsDemoMode);
  const enteredAt = useAppSelector(selectDemoEnteredAt);

  /**
   * Enter demo mode
   */
  const enterDemo = () => {
    dispatch(enterDemoMode());
  };

  /**
   * Exit demo mode
   */
  const exitDemo = () => {
    dispatch(exitDemoMode());
  };

  /**
   * Check if a feature is restricted in demo mode
   */
  const isRestricted = (feature: RestrictedFeature): boolean => {
    return isDemoMode && RESTRICTED_FEATURES.includes(feature);
  };

  /**
   * Get restriction message for a feature
   */
  const getRestrictionMessage = (feature: RestrictedFeature): string => {
    const messages: Record<RestrictedFeature, string> = {
      upload: "File uploads are disabled in demo mode. Sign up to upload documents.",
      delete: "Delete operations are disabled in demo mode.",
      edit: "Editing is disabled in demo mode.",
      create: "Creating new items is disabled in demo mode.",
      settings: "Settings are read-only in demo mode.",
      api_keys: "API key management is disabled in demo mode.",
      billing: "Billing settings are disabled in demo mode.",
      team: "Team management is disabled in demo mode.",
      export: "Data export is disabled in demo mode. Sign up to export your data.",
    };

    return messages[feature] || "This feature is disabled in demo mode.";
  };

  /**
   * Calculate how long the user has been in demo mode
   */
  const getDemoSessionDuration = (): number | null => {
    if (!enteredAt) return null;
    const entered = new Date(enteredAt);
    const now = new Date();
    return Math.floor((now.getTime() - entered.getTime()) / 1000); // seconds
  };

  return {
    isDemoMode,
    enteredAt,
    enterDemo,
    exitDemo,
    isRestricted,
    getRestrictionMessage,
    getDemoSessionDuration,
    restrictedFeatures: RESTRICTED_FEATURES,
  };
};

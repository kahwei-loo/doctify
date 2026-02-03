/**
 * UI Selectors
 *
 * Memoized selectors for UI state with reselect.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectUIState = (state: RootState) => state.ui;

// Memoized selectors
export const selectTheme = createSelector([selectUIState], (ui) => ui.theme);

export const selectSidebarOpen = createSelector([selectUIState], (ui) => ui.sidebarOpen);

export const selectModals = createSelector([selectUIState], (ui) => ui.modals);

export const selectToasts = createSelector([selectUIState], (ui) => ui.toasts);

export const selectIsGlobalLoading = createSelector(
  [selectUIState],
  (ui) => ui.isGlobalLoading
);

// Derived selectors
export const selectIsModalOpen = (modalId: string) =>
  createSelector([selectModals], (modals) => modals[modalId]?.isOpen || false);

export const selectModalData = (modalId: string) =>
  createSelector([selectModals], (modals) => modals[modalId]?.data);

export const selectLatestToast = createSelector([selectToasts], (toasts) =>
  toasts.length > 0 ? toasts[toasts.length - 1] : null
);

export const selectToastsCount = createSelector([selectToasts], (toasts) => toasts.length);

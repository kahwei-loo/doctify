/**
 * Auth Selectors
 *
 * Memoized selectors for auth state with reselect.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectAuthState = (state: RootState) => state.auth;

// Memoized selectors
export const selectUser = createSelector([selectAuthState], (auth) => auth.user);

export const selectTokens = createSelector([selectAuthState], (auth) => auth.tokens);

export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
);

export const selectAuthLoading = createSelector([selectAuthState], (auth) => auth.isLoading);

export const selectAuthError = createSelector([selectAuthState], (auth) => auth.error);

// Derived selectors
export const selectIsVerified = createSelector(
  [selectUser],
  (user) => user?.is_verified || false
);

export const selectIsActive = createSelector([selectUser], (user) => user?.is_active || false);

export const selectIsSuperuser = createSelector(
  [selectUser],
  (user) => user?.is_superuser || false
);

export const selectUserEmail = createSelector([selectUser], (user) => user?.email || '');

export const selectUserFullName = createSelector([selectUser], (user) => user?.full_name || '');

export const selectAccessToken = createSelector(
  [selectTokens],
  (tokens) => tokens?.access_token || null
);

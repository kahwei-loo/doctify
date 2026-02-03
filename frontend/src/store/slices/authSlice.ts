/**
 * Auth Slice
 *
 * Redux slice for authentication state management.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, AuthTokens } from '../../features/auth/types';
import { authApi } from '../api/authApi';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
      state.error = null;

      // Persist tokens to localStorage
      localStorage.setItem('access_token', action.payload.tokens.access_token);
      localStorage.setItem('refresh_token', action.payload.tokens.refresh_token);
    },

    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;

      // Clear localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },

    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Handle login
    builder
      .addMatcher(authApi.endpoints.login.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data.user;
        state.tokens = {
          access_token: action.payload.data.access_token,
          refresh_token: action.payload.data.refresh_token,
          token_type: action.payload.data.token_type,
        };
        state.isAuthenticated = true;

        // Persist tokens
        localStorage.setItem('access_token', action.payload.data.access_token);
        localStorage.setItem('refresh_token', action.payload.data.refresh_token);
      })
      .addMatcher(authApi.endpoints.login.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as any)?.data?.detail || 'Login failed';
      });

    // Handle register
    builder
      .addMatcher(authApi.endpoints.register.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(authApi.endpoints.register.matchFulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.data.user;
        state.tokens = {
          access_token: action.payload.data.access_token,
          refresh_token: action.payload.data.refresh_token,
          token_type: action.payload.data.token_type,
        };
        state.isAuthenticated = true;

        // Persist tokens
        localStorage.setItem('access_token', action.payload.data.access_token);
        localStorage.setItem('refresh_token', action.payload.data.refresh_token);
      })
      .addMatcher(authApi.endpoints.register.matchRejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as any)?.data?.detail || 'Registration failed';
      });

    // Handle logout
    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
      state.error = null;

      // Clear localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    });

    // Handle getCurrentUser
    builder
      .addMatcher(authApi.endpoints.getCurrentUser.matchFulfilled, (state, action) => {
        state.user = action.payload.data;
        state.isAuthenticated = true;
      })
      .addMatcher(authApi.endpoints.getCurrentUser.matchRejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.tokens = null;

        // Clear localStorage on auth failure
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      });

    // Handle updateProfile
    builder.addMatcher(authApi.endpoints.updateProfile.matchFulfilled, (state, action) => {
      state.user = action.payload.data;
    });
  },
});

export const { setCredentials, logout, updateUser, setError, clearError } = authSlice.actions;
export default authSlice.reducer;

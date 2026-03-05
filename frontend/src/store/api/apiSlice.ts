/**
 * RTK Query API Slice
 *
 * Base API configuration with automatic caching and request deduplication.
 */

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../index";
import { createDemoApiWrapper } from "./demoApiWrapper";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Base query with automatic token injection
 */
const baseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api/v1`,
  prepareHeaders: (headers, { getState }) => {
    // Get token from state or localStorage
    const state = getState() as RootState;
    const stateToken = state.auth.tokens?.access_token;
    const localToken = localStorage.getItem("access_token");
    const token = stateToken || localToken;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

/**
 * Base query with automatic token refresh
 */
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  // If 401 Unauthorized, attempt token refresh
  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState;
    const refreshToken = state.auth.tokens?.refresh_token || localStorage.getItem("refresh_token");

    if (refreshToken) {
      // Try to refresh token
      const refreshResult = await baseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
          body: { refresh_token: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const { access_token, refresh_token } = (refreshResult.data as any).data;

        // Store new tokens
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);

        // Retry original request with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }
  }

  return result;
};

/**
 * Main API slice with tag-based cache invalidation
 *
 * Performance optimizations:
 * - keepUnusedDataFor: Cache data for 5 minutes after component unmounts
 * - refetchOnMountOrArgChange: Only refetch if data is stale (30 seconds)
 * - refetchOnReconnect: Automatically refetch when reconnecting
 *
 * Demo mode integration:
 * - Wraps baseQuery with demo API interceptor
 * - Returns mock data when demo mode is active
 */
export const api = createApi({
  reducerPath: "api",
  baseQuery: createDemoApiWrapper(baseQueryWithReauth),
  tagTypes: [
    "Documents",
    "Projects",
    "User",
    "ApiKeys",
    "Dashboard",
    "Settings",
    "Templates",
    "EditHistory",
    "Datasets",
    "Conversations",
    "Queries",
    "RAGHistory",
    "RAGStats",
    "RAGConversations",
    "RAGEvaluations",
    "UnifiedQuery",
    "ChatConversations",
    "ChatMessages",
    "Assistants",
    "AssistantStats",
    "AssistantConversations",
    "ConversationMessages",
    "PublicMessages",
    "AIModelSettings",
  ],
  // Keep unused data in cache for 5 minutes (300 seconds)
  keepUnusedDataFor: 300,
  // Refetch data if stale for more than 30 seconds on mount
  refetchOnMountOrArgChange: 30,
  // Refetch when network reconnects
  refetchOnReconnect: true,
  endpoints: () => ({}),
});

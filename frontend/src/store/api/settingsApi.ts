/**
 * Settings API Endpoints
 *
 * RTK Query endpoints for user settings management.
 */

import { api } from "./apiSlice";

// Types for settings data
export interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notifications_email: boolean;
  notifications_push: boolean;
  display_density: "compact" | "comfortable" | "spacious";
  date_format: string;
  timezone: string;
}

export interface SettingsUpdate {
  theme?: "light" | "dark" | "system";
  language?: string;
  notifications_email?: boolean;
  notifications_push?: boolean;
  display_density?: "compact" | "comfortable" | "spacious";
  date_format?: string;
  timezone?: string;
}

// Response wrapper
export interface SettingsResponse {
  success: boolean;
  data: UserSettings;
}

// Valid values for settings
export const VALID_THEMES = ["light", "dark", "system"] as const;
export const VALID_LANGUAGES = [
  "en",
  "zh-CN",
  "ms",
  "es",
  "fr",
  "de",
  "ja",
  "ko",
  "pt",
  "it",
  "ru",
] as const;
export const VALID_DENSITIES = ["compact", "comfortable", "spacious"] as const;
export const VALID_DATE_FORMATS = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "DD-MM-YYYY"] as const;

export const settingsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Query: Get user settings
    getSettings: builder.query<SettingsResponse, void>({
      query: () => "/settings",
      providesTags: ["Settings"],
      // Keep settings cached for the session
      keepUnusedDataFor: 3600,
    }),

    // Mutation: Update user settings (partial update)
    updateSettings: builder.mutation<SettingsResponse, SettingsUpdate>({
      query: (updates) => ({
        url: "/settings",
        method: "PATCH",
        body: updates,
      }),
      // Optimistic update
      async onQueryStarted(updates, { dispatch, queryFulfilled }) {
        // Optimistically update the cache
        const patchResult = dispatch(
          settingsApi.util.updateQueryData("getSettings", undefined, (draft) => {
            if (draft.data) {
              Object.assign(draft.data, updates);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          // Revert on error
          patchResult.undo();
        }
      },
      invalidatesTags: ["Settings"],
    }),
  }),
});

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi;

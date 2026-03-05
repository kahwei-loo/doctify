/**
 * Auth API Endpoints
 *
 * RTK Query endpoints for authentication operations.
 */

import { api } from "./apiSlice";
import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  PasswordChangeData,
  PasswordResetRequestData,
  PasswordResetConfirmData,
  ApiKey,
  ApiKeyCreateData,
  ApiKeyResponse,
} from "../../features/auth/types";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Mutation: Register
    register: builder.mutation<AuthResponse, RegisterData>({
      query: (data) => ({
        url: "/auth/register",
        method: "POST",
        body: data,
      }),
    }),

    // Mutation: Login
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User"],
    }),

    // Mutation: Logout
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),

    // Query: Get current user
    getCurrentUser: builder.query<{ success: boolean; data: User }, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),

    // Mutation: Update profile
    updateProfile: builder.mutation<
      { success: boolean; data: User; message: string },
      { full_name?: string; preferences?: Record<string, any> }
    >({
      query: (data) => ({
        url: "/auth/me",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    // Mutation: Change password
    changePassword: builder.mutation<{ success: boolean; message: string }, PasswordChangeData>({
      query: (data) => ({
        url: "/auth/change-password",
        method: "POST",
        body: data,
      }),
    }),

    // Mutation: Request password reset
    requestPasswordReset: builder.mutation<
      { success: boolean; message: string },
      PasswordResetRequestData
    >({
      query: (data) => ({
        url: "/auth/password-reset/request",
        method: "POST",
        body: data,
      }),
    }),

    // Mutation: Confirm password reset
    confirmPasswordReset: builder.mutation<
      { success: boolean; message: string },
      PasswordResetConfirmData
    >({
      query: (data) => ({
        url: "/auth/password-reset/confirm",
        method: "POST",
        body: data,
      }),
    }),

    // Mutation: Verify email
    verifyEmail: builder.mutation<{ success: boolean; message: string }, { token: string }>({
      query: ({ token }) => ({
        url: "/auth/verify-email",
        method: "POST",
        body: { token },
      }),
      invalidatesTags: ["User"],
    }),

    // Query: List API keys
    listApiKeys: builder.query<
      { success: boolean; data: { api_keys: ApiKey[]; total: number }; message?: string },
      { includeRevoked?: boolean }
    >({
      query: ({ includeRevoked = false }) => ({
        url: "/auth/api-keys",
        params: { include_revoked: includeRevoked },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.api_keys.map(({ api_key_id }) => ({
                type: "ApiKeys" as const,
                id: api_key_id,
              })),
              { type: "ApiKeys", id: "LIST" },
            ]
          : [{ type: "ApiKeys", id: "LIST" }],
    }),

    // Mutation: Create API key
    createApiKey: builder.mutation<ApiKeyResponse, ApiKeyCreateData>({
      query: (data) => ({
        url: "/auth/api-keys",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "ApiKeys", id: "LIST" }],
    }),

    // Mutation: Revoke API key
    revokeApiKey: builder.mutation<void, string>({
      query: (keyId) => ({
        url: `/auth/api-keys/${keyId}/revoke`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, keyId) => [
        { type: "ApiKeys", id: keyId },
        { type: "ApiKeys", id: "LIST" },
      ],
    }),

    // Mutation: Rotate API key
    rotateApiKey: builder.mutation<ApiKeyResponse, string>({
      query: (keyId) => ({
        url: `/auth/api-keys/${keyId}/rotate`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, keyId) => [
        { type: "ApiKeys", id: keyId },
        { type: "ApiKeys", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
  useVerifyEmailMutation,
  useListApiKeysQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
  useRotateApiKeyMutation,
} = authApi;

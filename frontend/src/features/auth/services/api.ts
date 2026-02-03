/**
 * Authentication API Service
 *
 * Handles all authentication-related API calls including login, register,
 * password management, and API key operations.
 */

import axios from 'axios';
import { apiClient } from '@/services/api/client';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  PasswordChangeData,
  PasswordResetRequestData,
  PasswordResetConfirmData,
  ApiKey,
  ApiKeyCreateData,
  ApiKeyResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const AUTH_BASE_URL = `${API_BASE_URL}/api/v1/auth`;
const AUTH_BASE_PATH = '/auth';

// =============================================================================
// Authentication API
// =============================================================================

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${AUTH_BASE_URL}/register`, data);
    return response.data;
  },

  /**
   * Login user with email and password
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${AUTH_BASE_URL}/login`, credentials);
    return response.data;
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${AUTH_BASE_URL}/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Logout user (client-side token removal)
   */
  logout: async (): Promise<void> => {
    await apiClient.post(`${AUTH_BASE_PATH}/logout`);
    // Clear tokens from storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<{ success: boolean; data: User }> => {
    const response = await apiClient.get(`${AUTH_BASE_PATH}/me`);
    return response.data;
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: {
    full_name?: string;
    preferences?: Record<string, any>;
  }): Promise<{ success: boolean; data: User; message: string }> => {
    const response = await apiClient.put(`${AUTH_BASE_PATH}/me`, data);
    return response.data;
  },
};

// =============================================================================
// Password Management API
// =============================================================================

export const passwordApi = {
  /**
   * Change user password (requires authentication)
   */
  changePassword: async (data: PasswordChangeData): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`${AUTH_BASE_PATH}/password/change`, data);
    return response.data;
  },

  /**
   * Request password reset (send reset token to email)
   */
  requestReset: async (data: PasswordResetRequestData): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${AUTH_BASE_URL}/password/reset/request`, data);
    return response.data;
  },

  /**
   * Confirm password reset with token
   */
  confirmReset: async (data: PasswordResetConfirmData): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${AUTH_BASE_URL}/password/reset/confirm`, data);
    return response.data;
  },
};

// =============================================================================
// Email Verification API
// =============================================================================

export const emailApi = {
  /**
   * Verify email address with token
   */
  verifyEmail: async (verificationToken: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${AUTH_BASE_URL}/verify-email`, {
      verification_token: verificationToken,
    });
    return response.data;
  },
};

// =============================================================================
// API Key Management API
// =============================================================================

export const apiKeyApi = {
  /**
   * Create a new API key (requires authentication)
   */
  create: async (data: ApiKeyCreateData): Promise<{ success: boolean; data: ApiKeyResponse; message: string }> => {
    const response = await apiClient.post(`${AUTH_BASE_PATH}/api-keys`, data);
    return response.data;
  },

  /**
   * List user's API keys (requires authentication)
   */
  list: async (includeRevoked = false): Promise<{ success: boolean; data: { api_keys: ApiKey[]; total: number } }> => {
    const response = await apiClient.get(`${AUTH_BASE_PATH}/api-keys`, {
      params: { include_revoked: includeRevoked },
    });
    return response.data;
  },

  /**
   * Revoke an API key (requires authentication)
   */
  revoke: async (keyId: string): Promise<void> => {
    await apiClient.delete(`${AUTH_BASE_PATH}/api-keys/${keyId}`);
  },

  /**
   * Rotate an API key (revoke old, create new) (requires authentication)
   */
  rotate: async (keyId: string): Promise<{ success: boolean; data: ApiKeyResponse; message: string }> => {
    const response = await apiClient.post(`${AUTH_BASE_PATH}/api-keys/${keyId}/rotate`);
    return response.data;
  },
};

// =============================================================================
// Token Storage Utilities
// =============================================================================

export const tokenStorage = {
  /**
   * Save authentication tokens to localStorage
   */
  saveTokens: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },

  /**
   * Get access token from localStorage
   */
  getAccessToken: (): string | null => {
    return localStorage.getItem('access_token');
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem('refresh_token');
  },

  /**
   * Clear all tokens from localStorage
   */
  clearTokens: (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  /**
   * Check if user is authenticated (has valid access token)
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },
};

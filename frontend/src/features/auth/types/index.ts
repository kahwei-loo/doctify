/**
 * Authentication Types
 *
 * Type definitions for authentication features including user, tokens, and auth states.
 */

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  created_at: string;
  preferences?: Record<string, any>;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
    token_type: string;
  };
  message?: string;
  timestamp: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

export interface PasswordResetRequestData {
  email: string;
}

export interface PasswordResetConfirmData {
  reset_token: string;
  new_password: string;
}

export interface ApiKey {
  api_key_id: string;
  name: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  is_revoked: boolean;
}

export interface ApiKeyCreateData {
  name: string;
  expires_in_days?: number;
}

export interface ApiKeyResponse {
  api_key: string; // Only shown once
  api_key_id: string;
  name: string;
  created_at: string;
  expires_at: string | null;
}

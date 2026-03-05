/**
 * Auth Feature Module
 *
 * Exports all authentication-related functionality including types, services,
 * hooks, and components.
 */

// Types
export type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthState,
  PasswordChangeData,
  PasswordResetRequestData,
  PasswordResetConfirmData,
  ApiKey,
  ApiKeyCreateData,
  ApiKeyResponse,
} from "./types";

// Services
export { authApi, passwordApi, emailApi, apiKeyApi, tokenStorage } from "./services/api";

// Hooks
export { useAuth } from "./hooks/useAuth";
export { usePassword } from "./hooks/usePassword";

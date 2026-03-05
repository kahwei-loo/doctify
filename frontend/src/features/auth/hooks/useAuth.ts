/**
 * useAuth Hook
 *
 * Custom hook for authentication operations including login, register, logout,
 * and user profile management.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, tokenStorage } from "../services/api";
import type { LoginCredentials, RegisterData, User } from "../types";

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { full_name?: string; preferences?: Record<string, any> }) => Promise<void>;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = tokenStorage.isAuthenticated();

  /**
   * Login user with credentials
   */
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authApi.login(credentials);

        // Save tokens
        tokenStorage.saveTokens(response.data.access_token, response.data.refresh_token);

        // Set user
        setUser(response.data.user);

        // Navigate to dashboard
        navigate("/dashboard");
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || "Login failed. Please try again.";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  /**
   * Register new user
   */
  const register = useCallback(
    async (data: RegisterData) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authApi.register(data);

        // Save tokens
        tokenStorage.saveTokens(response.data.access_token, response.data.refresh_token);

        // Set user
        setUser(response.data.user);

        // Navigate to dashboard
        navigate("/dashboard");
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || "Registration failed. Please try again.";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [navigate]
  );

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authApi.logout();
      setUser(null);
      navigate("/login");
    } catch (err: any) {
      // Clear tokens even if API call fails
      tokenStorage.clearTokens();
      setUser(null);
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  /**
   * Refresh current user data
   */
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated) {
      setUser(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.getCurrentUser();
      setUser(response.data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || "Failed to fetch user data.";
      setError(errorMessage);

      // If unauthorized, clear auth and redirect to login
      if (err.response?.status === 401) {
        tokenStorage.clearTokens();
        setUser(null);
        navigate("/login");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, navigate]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(
    async (data: { full_name?: string; preferences?: Record<string, any> }) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authApi.updateProfile(data);
        setUser(response.data);
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || "Failed to update profile.";
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    clearError,
  };
};

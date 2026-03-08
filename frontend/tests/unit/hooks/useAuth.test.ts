/**
 * Unit Tests for useAuth Hook
 *
 * Tests authentication, token management, and user state
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { authApi, tokenStorage } from "@/features/auth/services/api";

// Mock dependencies
vi.mock("@/features/auth/services/api", () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    updateProfile: vi.fn(),
  },
  tokenStorage: {
    saveTokens: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    clearTokens: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

const mockAuthApi = vi.mocked(authApi);
const mockTokenStorage = vi.mocked(tokenStorage);

describe("useAuth Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockTokenStorage.isAuthenticated.mockReturnValue(false);
  });

  describe("Initial State", () => {
    it("initializes with no user when not authenticated", () => {
      mockTokenStorage.isAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("shows isAuthenticated as true when token exists", () => {
      mockTokenStorage.isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("Login", () => {
    it("logs in user successfully", async () => {
      const mockUser = {
        user_id: "user-1",
        email: "test@example.com",
        full_name: "Test User",
      };

      const mockResponse = {
        success: true,
        data: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          user: mockUser,
        },
      };

      mockAuthApi.login.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({
          email: "test@example.com",
          password: "password123",
        });
      });

      expect(mockAuthApi.login).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockTokenStorage.saveTokens).toHaveBeenCalledWith("access-token", "refresh-token");
      expect(result.current.user).toEqual(mockUser);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("sets loading state during login", async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockAuthApi.login.mockReturnValue(pendingPromise as any);

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login({
          email: "test@example.com",
          password: "password",
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          success: true,
          data: {
            access_token: "token",
            refresh_token: "refresh",
            user: { user_id: "1", email: "test@example.com" },
          },
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("handles login error", async () => {
      mockAuthApi.login.mockRejectedValue({
        response: { data: { detail: "Invalid credentials" } },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login({
            email: "test@example.com",
            password: "wrong-password",
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Invalid credentials");
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it("uses default error message when detail is missing", async () => {
      mockAuthApi.login.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login({
            email: "test@example.com",
            password: "password",
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Login failed. Please try again.");
      });
    });
  });

  describe("Register", () => {
    it("registers user successfully", async () => {
      const mockUser = {
        user_id: "new-user",
        email: "new@example.com",
        full_name: "New User",
      };

      const mockResponse = {
        success: true,
        data: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          user: mockUser,
        },
      };

      mockAuthApi.register.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register({
          email: "new@example.com",
          password: "password123",
          full_name: "New User",
        });
      });

      expect(mockAuthApi.register).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        full_name: "New User",
      });
      expect(mockTokenStorage.saveTokens).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("handles registration error", async () => {
      mockAuthApi.register.mockRejectedValue({
        response: { data: { detail: "Email already exists" } },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.register({
            email: "existing@example.com",
            password: "password",
            full_name: "User",
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Email already exists");
      });
    });
  });

  describe("Logout", () => {
    it("logs out user successfully", async () => {
      mockAuthApi.logout.mockResolvedValue(undefined);
      mockTokenStorage.isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthApi.logout).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });

    it("clears tokens and redirects even if logout API fails", async () => {
      mockAuthApi.logout.mockRejectedValue(new Error("API error"));
      mockTokenStorage.isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  describe("Refresh User", () => {
    it("fetches current user when authenticated", async () => {
      const mockUser = {
        user_id: "user-1",
        email: "test@example.com",
        full_name: "Test User",
      };

      mockTokenStorage.isAuthenticated.mockReturnValue(true);
      mockAuthApi.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockAuthApi.getCurrentUser).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
    });

    it("does not fetch user when not authenticated", async () => {
      mockTokenStorage.isAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockAuthApi.getCurrentUser).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it("handles 401 error by clearing tokens and redirecting", async () => {
      mockTokenStorage.isAuthenticated.mockReturnValue(true);
      mockAuthApi.getCurrentUser.mockRejectedValue({
        response: { status: 401, data: { detail: "Token expired" } },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(mockTokenStorage.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  describe("Update Profile", () => {
    it("updates user profile successfully", async () => {
      const updatedUser = {
        user_id: "user-1",
        email: "test@example.com",
        full_name: "Updated Name",
      };

      mockAuthApi.updateProfile.mockResolvedValue({
        success: true,
        data: updatedUser,
        message: "Profile updated",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.updateProfile({ full_name: "Updated Name" });
      });

      expect(mockAuthApi.updateProfile).toHaveBeenCalledWith({
        full_name: "Updated Name",
      });
      expect(result.current.user).toEqual(updatedUser);
    });

    it("handles update profile error", async () => {
      mockAuthApi.updateProfile.mockRejectedValue({
        response: { data: { detail: "Update failed" } },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.updateProfile({ full_name: "New Name" });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Update failed");
      });
    });
  });

  describe("Clear Error", () => {
    it("clears error state", async () => {
      mockAuthApi.login.mockRejectedValue({
        response: { data: { detail: "Error" } },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login({
            email: "test@example.com",
            password: "password",
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Error");
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});

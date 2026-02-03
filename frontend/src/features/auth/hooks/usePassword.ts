/**
 * usePassword Hook
 *
 * Custom hook for password management operations including change password
 * and password reset workflows.
 */

import { useState, useCallback } from 'react';
import { passwordApi } from '../services/api';
import type { PasswordChangeData, PasswordResetRequestData, PasswordResetConfirmData } from '../types';

interface UsePasswordReturn {
  isLoading: boolean;
  error: string | null;
  success: string | null;
  changePassword: (data: PasswordChangeData) => Promise<void>;
  requestPasswordReset: (data: PasswordResetRequestData) => Promise<void>;
  confirmPasswordReset: (data: PasswordResetConfirmData) => Promise<void>;
  clearMessages: () => void;
}

export const usePassword = (): UsePasswordReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Change user password
   */
  const changePassword = useCallback(async (data: PasswordChangeData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await passwordApi.changePassword(data);
      setSuccess(response.message || 'Password changed successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to change password';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Request password reset email
   */
  const requestPasswordReset = useCallback(async (data: PasswordResetRequestData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await passwordApi.requestReset(data);
      setSuccess(response.message || 'Password reset email sent');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to request password reset';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Confirm password reset with token
   */
  const confirmPasswordReset = useCallback(async (data: PasswordResetConfirmData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await passwordApi.confirmReset(data);
      setSuccess(response.message || 'Password reset successfully');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to reset password';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear success and error messages
   */
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    isLoading,
    error,
    success,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    clearMessages,
  };
};

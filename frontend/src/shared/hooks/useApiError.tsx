/**
 * useApiError Hook
 *
 * Provides consistent error handling for API calls throughout the application.
 * Integrates with react-hot-toast for notifications and handles common error types.
 *
 * @example
 * const { handleError, getErrorMessage, getErrorType } = useApiError();
 *
 * try {
 *   await apiCall();
 * } catch (error) {
 *   handleError(error, {
 *     showToast: true,
 *     retryFn: () => apiCall(),
 *   });
 * }
 */

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import type { ErrorType } from '@/shared/components/common/ErrorState';

// Common API error shape
interface ApiErrorResponse {
  data?: {
    detail?: string;
    message?: string;
    error?: string;
  };
  status?: number;
  statusText?: string;
}

interface FetchError extends Error {
  response?: ApiErrorResponse;
  status?: number;
}

interface HandleErrorOptions {
  /** Whether to show a toast notification (default: true) */
  showToast?: boolean;
  /** Custom error message to display */
  customMessage?: string;
  /** Function to retry the failed operation */
  retryFn?: () => void | Promise<void>;
  /** Duration for toast in ms (default: 4000) */
  toastDuration?: number;
  /** Callback after error is handled */
  onError?: (errorType: ErrorType, message: string) => void;
}

interface UseApiErrorReturn {
  /** Handle an error with optional toast notification */
  handleError: (error: unknown, options?: HandleErrorOptions) => void;
  /** Extract a user-friendly message from an error */
  getErrorMessage: (error: unknown) => string;
  /** Determine the error type from an error */
  getErrorType: (error: unknown) => ErrorType;
  /** Check if an error is a network error */
  isNetworkError: (error: unknown) => boolean;
  /** Check if an error is an auth error */
  isAuthError: (error: unknown) => boolean;
}

/**
 * Extracts the HTTP status code from various error formats
 */
function getStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const err = error as FetchError & ApiErrorResponse;

  // RTK Query error format
  if (typeof err.status === 'number') return err.status;

  // Fetch/Axios error format
  if (err.response?.status) return err.response.status;

  return undefined;
}

/**
 * Extracts a user-friendly message from various error formats
 */
function extractMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred';

  if (typeof error === 'string') return error;

  if (error instanceof Error) {
    // Network error (no response)
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    return error.message;
  }

  if (typeof error === 'object') {
    const err = error as ApiErrorResponse & FetchError;

    // RTK Query error format
    if (err.data?.detail) return err.data.detail;
    if (err.data?.message) return err.data.message;
    if (err.data?.error) return err.data.error;

    // Fetch/Axios response
    if (err.response?.data?.detail) return err.response.data.detail;
    if (err.response?.data?.message) return err.response.data.message;

    // Status text fallback
    if (err.statusText) return err.statusText;
  }

  return 'An unexpected error occurred';
}

/**
 * Maps error to ErrorType based on status code and error characteristics
 */
function mapErrorType(error: unknown): ErrorType {
  const status = getStatusCode(error);

  if (!status) {
    // No status = network error
    if (error instanceof Error) {
      if (
        error.message === 'Failed to fetch' ||
        error.name === 'TypeError' ||
        error.message.toLowerCase().includes('network')
      ) {
        return 'network';
      }
      if (error.message.toLowerCase().includes('timeout')) {
        return 'timeout';
      }
    }
    return 'unknown';
  }

  // Map HTTP status codes to error types
  switch (status) {
    case 401:
    case 403:
      return 'unauthorized';
    case 404:
      return 'not-found';
    case 408:
    case 504:
      return 'timeout';
    case 500:
    case 502:
    case 503:
      return 'server';
    default:
      return 'unknown';
  }
}

export function useApiError(): UseApiErrorReturn {
  const getErrorMessage = useCallback((error: unknown): string => {
    return extractMessage(error);
  }, []);

  const getErrorType = useCallback((error: unknown): ErrorType => {
    return mapErrorType(error);
  }, []);

  const isNetworkError = useCallback((error: unknown): boolean => {
    return mapErrorType(error) === 'network';
  }, []);

  const isAuthError = useCallback((error: unknown): boolean => {
    const status = getStatusCode(error);
    return status === 401 || status === 403;
  }, []);

  const handleError = useCallback(
    (error: unknown, options: HandleErrorOptions = {}) => {
      const {
        showToast = true,
        customMessage,
        retryFn,
        toastDuration = 4000,
        onError,
      } = options;

      const message = customMessage || extractMessage(error);
      const errorType = mapErrorType(error);

      // Log error for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('[API Error]', {
          type: errorType,
          message,
          error,
        });
      }

      // Show toast notification
      if (showToast) {
        if (retryFn) {
          // Toast with retry action
          toast.error(
            (t) => (
              <div className="flex items-center gap-3">
                <span>{message}</span>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    retryFn();
                  }}
                  className="text-xs underline text-destructive-foreground hover:no-underline"
                >
                  Retry
                </button>
              </div>
            ),
            {
              duration: toastDuration,
            }
          );
        } else {
          toast.error(message, {
            duration: toastDuration,
          });
        }
      }

      // Call optional error callback
      if (onError) {
        onError(errorType, message);
      }
    },
    []
  );

  return {
    handleError,
    getErrorMessage,
    getErrorType,
    isNetworkError,
    isAuthError,
  };
}

export default useApiError;

/**
 * API Client
 *
 * Unified Axios instance with interceptors for authentication,
 * error handling, and request/response transformation.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Create Axios instance with base configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - Add authentication token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Attempt to refresh token
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: new_refresh_token } = response.data.data;

          // Store new tokens
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', new_refresh_token);

          // Update authorization header
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }

          // Retry original request
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed - clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token - redirect to login
        window.location.href = '/login';
      }
    }

    // Handle other errors
    if (import.meta.env.DEV) {
      console.error('[API Error]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Patterns that indicate sensitive internal error messages
 * These should not be shown to users
 */
const SENSITIVE_ERROR_PATTERNS = [
  /sql/i,
  /database/i,
  /connection/i,
  /password/i,
  /secret/i,
  /token/i,
  /internal server error/i,
  /stack trace/i,
  /traceback/i,
  /exception/i,
  /\.py/i, // Python file references
  /line \d+/i, // Line number references
];

/**
 * Sanitize error message to remove sensitive information
 */
const sanitizeErrorMessage = (message: string): string => {
  if (SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return 'An error occurred. Please try again later.';
  }
  return message;
};

/**
 * Helper function to extract error message from API error
 * Sanitizes sensitive information before returning to user
 */
export const getErrorMessage = (error: any): string => {
  let message = 'An unexpected error occurred';

  if (error.response?.data?.detail) {
    // FastAPI error format
    if (typeof error.response.data.detail === 'string') {
      message = error.response.data.detail;
    } else if (Array.isArray(error.response.data.detail)) {
      message = error.response.data.detail.map((err: any) => err.msg).join(', ');
    }
  } else if (error.response?.data?.message) {
    message = error.response.data.message;
  } else if (error.message) {
    message = error.message;
  }

  return sanitizeErrorMessage(message);
};

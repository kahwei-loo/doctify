/**
 * API Client
 *
 * Unified Axios instance with interceptors for authentication,
 * error handling, and request/response transformation.
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { DEMO_KNOWLEDGE_BASES } from '@/features/demo/mockData';

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
 * Request interceptor - Add authentication token and handle demo mode
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Check demo mode - intercept and return mock data
    const demoMode = localStorage.getItem('demo_mode');
    const isDemoMode = demoMode === 'true';

    if (isDemoMode) {
      const url = config.url || '';

      // Intercept Knowledge Base requests with mock data
      if (url.includes('/knowledge-bases')) {
        console.log('[Demo API] Intercepting KB request:', url);

        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

        // Return mock data
        if (url === '/knowledge-bases/stats' || url.endsWith('/stats')) {
          const mockResponse = {
            data: {
              total_knowledge_bases: 2,
              total_data_sources: 5,
              total_embeddings: 15000,
              total_queries: 150,
            },
            config,
            status: 200,
            statusText: 'OK',
            headers: {},
          };
          // Cancel the request and return mock response
          return Promise.reject({
            config,
            response: mockResponse,
            isAxiosError: true,
            toJSON: () => ({}),
            name: 'DEMO_MODE_MOCK',
            message: 'Demo mode mock response',
          });
        }

        if (url === '/knowledge-bases' || url.endsWith('/knowledge-bases')) {
          const mockResponse = {
            data: {
              items: DEMO_KNOWLEDGE_BASES,
              total: DEMO_KNOWLEDGE_BASES.length,
            },
            config,
            status: 200,
            statusText: 'OK',
            headers: {},
          };
          return Promise.reject({
            config,
            response: mockResponse,
            isAxiosError: true,
            toJSON: () => ({}),
            name: 'DEMO_MODE_MOCK',
            message: 'Demo mode mock response',
          });
        }
      }

      // Handle file preview/download requests with a placeholder blob
      if (url.match(/\/documents\/[\w-]+\/file\/(preview|download)/)) {
        console.log('[Demo API] Returning placeholder blob for file request:', url);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560">
          <rect width="400" height="560" fill="#f8f9fa" rx="8"/>
          <rect x="40" y="40" width="320" height="40" fill="#e9ecef" rx="4"/>
          <rect x="40" y="100" width="280" height="12" fill="#dee2e6" rx="2"/>
          <rect x="40" y="124" width="320" height="12" fill="#dee2e6" rx="2"/>
          <rect x="40" y="148" width="240" height="12" fill="#dee2e6" rx="2"/>
          <rect x="40" y="184" width="320" height="12" fill="#dee2e6" rx="2"/>
          <rect x="40" y="208" width="300" height="12" fill="#dee2e6" rx="2"/>
          <rect x="40" y="232" width="260" height="12" fill="#dee2e6" rx="2"/>
          <text x="200" y="340" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#868e96">Demo Mode Preview</text>
          <text x="200" y="365" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#adb5bd">Original file not available</text>
        </svg>`;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        return Promise.reject({
          config,
          response: { data: blob, config, status: 200, statusText: 'OK', headers: {} },
          isAxiosError: true,
          toJSON: () => ({}),
          name: 'DEMO_MODE_MOCK',
          message: 'Demo mode file preview placeholder',
        });
      }

      // Block all other direct apiClient requests from reaching the backend in demo mode
      // This prevents 401 errors that would trigger login redirects
      console.log('[Demo API] Blocking direct apiClient request:', url);
      return Promise.reject({
        config,
        response: { data: null, config, status: 200, statusText: 'OK', headers: {} },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'DEMO_MODE_BLOCKED',
        message: 'Request blocked in demo mode',
      });
    }

    // Get token from localStorage
    const token = localStorage.getItem('access_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // When sending FormData, remove Content-Type so axios auto-sets
    // multipart/form-data with the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
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
  async (error: AxiosError | any) => {
    // Handle demo mode mock responses
    if ((error.name === 'DEMO_MODE_MOCK' || error.name === 'DEMO_MODE_BLOCKED') && error.response) {
      console.log('[Demo API] Returning mock/blocked response');
      return error.response;
    }

    // In demo mode, never redirect to login on 401
    const isDemoMode = localStorage.getItem('demo_mode') === 'true';
    if (isDemoMode && error.response?.status === 401) {
      return Promise.reject(error);
    }

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

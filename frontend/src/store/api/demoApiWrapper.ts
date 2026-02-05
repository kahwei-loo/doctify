/**
 * Demo API Wrapper for RTK Query
 * Intercepts API calls when demo mode is active and returns mock data
 */

import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { RootState } from '../index';
import { mockApiHandler } from '../../features/demo/utils/mockApiHandler';

/**
 * Wraps a base query to intercept requests in demo mode
 */
export const createDemoApiWrapper = <T extends BaseQueryFn>(
  baseQuery: T
): BaseQueryFn => {
  return async (args, api, extraOptions) => {
    // Check if demo mode is active
    const state = api.getState() as RootState;
    const isDemoMode = state.demo?.isActive || false;

    if (isDemoMode) {
      console.log('[Demo Mode] Intercepting API call:', args);

      try {
        // Extract endpoint URL
        const endpoint = typeof args === 'string' ? args : args.url;

        // Call mock handler
        const mockResponse = await mockApiHandler(endpoint, args);

        // Return in RTK Query format
        if (mockResponse.error) {
          return {
            error: {
              status: mockResponse.error.status,
              data: {
                message: mockResponse.error.message,
              },
            },
          };
        }

        return {
          data: mockResponse.data,
        };
      } catch (error) {
        console.error('[Demo Mode] Mock handler error:', error);
        return {
          error: {
            status: 500,
            data: {
              message: 'Demo mode error: ' + (error as Error).message,
            },
          },
        };
      }
    }

    // Not in demo mode, use real base query
    return baseQuery(args, api, extraOptions);
  };
};

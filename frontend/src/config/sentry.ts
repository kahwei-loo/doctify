/**
 * Sentry Error Tracking Configuration
 *
 * Initializes Sentry for error tracking and performance monitoring.
 * Only active when VITE_SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/react';

/**
 * Check if Sentry is configured and should be enabled
 */
export const isSentryEnabled = (): boolean => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  return Boolean(dsn && dsn.length > 0);
};

/**
 * Initialize Sentry with application configuration
 */
export const initSentry = (): void => {
  if (!isSentryEnabled()) {
    console.info('[Sentry] Disabled - No DSN configured');
    return;
  }

  const environment = import.meta.env.VITE_APP_ENV || 'development';
  const release = `doctify-frontend@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`;
  const enablePerformance = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment,
    release,

    // Performance Monitoring
    integrations: enablePerformance
      ? [Sentry.browserTracingIntegration(), Sentry.replayIntegration()]
      : [],

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // Adjust in production to a lower rate (e.g., 0.1 for 10%)
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: environment === 'production' ? 1.0 : 0,

    // Only send errors in non-development environments by default
    enabled: environment !== 'development' || import.meta.env.VITE_DEBUG === 'true',

    // Filter out certain errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Filter out network errors that users can't control
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return null;
      }

      // Filter out cancelled requests
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }

      return event;
    },

    // Additional options
    maxBreadcrumbs: 50,
    attachStacktrace: true,
  });

  console.info(`[Sentry] Initialized for ${environment} environment`);
};

/**
 * Capture an exception manually
 */
export const captureException = (
  error: Error,
  context?: Record<string, unknown>
): string | undefined => {
  if (!isSentryEnabled()) {
    console.error('[Sentry] Error captured (disabled):', error, context);
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Capture a message manually
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): string | undefined => {
  if (!isSentryEnabled()) {
    console.log(`[Sentry] Message captured (disabled): [${level}] ${message}`, context);
    return undefined;
  }

  return Sentry.captureMessage(message, {
    level,
    extra: context,
  });
};

/**
 * Set user context for error tracking
 */
export const setUser = (user: { id: string; email?: string; username?: string } | null): void => {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.setUser(user);
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb): void => {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
};

/**
 * Set extra context data
 */
export const setContext = (name: string, context: Record<string, unknown> | null): void => {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.setContext(name, context);
};

/**
 * Set a tag for filtering
 */
export const setTag = (key: string, value: string): void => {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.setTag(key, value);
};

export { Sentry };

/**
 * Main Application Component
 *
 * Root component that sets up routing and global providers.
 * Includes global error boundary to prevent white screen crashes.
 */

import React from "react";
import { Toaster } from "react-hot-toast";
import { AppRouter } from "./app/Router";
import { ErrorBoundary } from "./shared/components/common/ErrorBoundary";

const App: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log error to console in development
        console.error("Application Error:", error);
        console.error("Error Info:", errorInfo);
        // TODO: In production, send to error tracking service (e.g., Sentry)
      }}
    >
      <Toaster position="top-right" />
      <AppRouter />
    </ErrorBoundary>
  );
};

export default App;

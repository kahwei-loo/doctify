/**
 * Application Entry Point
 *
 * Main entry point for the Doctify frontend application.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import { ReduxProvider } from "./store/Provider";
import { ThemeProvider } from "./shared/providers/ThemeProvider";
import { initSentry } from "./config/sentry";
import App from "./App";
import "./index.css";

// Initialize Sentry before React renders
initSentry();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReduxProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ReduxProvider>
  </React.StrictMode>
);

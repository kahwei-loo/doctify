/**
 * Vitest Configuration
 *
 * Comprehensive test configuration for React components with Testing Library.
 * Provides jsdom environment, path aliases, coverage reporting, and proper test setup.
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/shared/components"),
      "@features": path.resolve(__dirname, "./src/features"),
      "@hooks": path.resolve(__dirname, "./src/shared/hooks"),
      "@utils": path.resolve(__dirname, "./src/shared/utils"),
      "@types": path.resolve(__dirname, "./src/shared/types"),
      "@services": path.resolve(__dirname, "./src/services"),
      "@store": path.resolve(__dirname, "./src/store"),
      "@config": path.resolve(__dirname, "./src/config"),
    },
  },

  test: {
    // Test environment
    environment: "jsdom",

    // Setup files to run before each test file
    setupFiles: ["./tests/setup.ts"],

    // Global test timeout (10 seconds)
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Include/exclude patterns
    include: ["tests/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules",
      "dist",
      "e2e/**/*",
      "tests/e2e/**/*",
      "**/*.e2e.{test,spec}.{ts,tsx}",
    ],

    // Enable globals (describe, it, expect, etc.)
    globals: true,

    // CSS handling
    css: {
      include: [/\.module\.(css|scss)$/],
    },

    // Reporter configuration
    reporters: ["verbose"],

    // Coverage configuration
    coverage: {
      // Coverage provider
      provider: "v8",

      // Coverage reporters
      reporter: ["text", "text-summary", "json", "html", "lcov"],

      // Coverage output directory
      reportsDirectory: "./coverage",

      // Include patterns for coverage
      include: ["src/**/*.{ts,tsx}"],

      // Exclude patterns from coverage
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/**/__mocks__/**",
        "src/**/__tests__/**",
        "src/**/types/**",
        "src/**/constants/**",
        "node_modules/**",
      ],

      // Coverage thresholds (target: 70%)
      thresholds: {
        global: {
          branches: 60,
          functions: 60,
          lines: 70,
          statements: 70,
        },
      },

      // Show all files in coverage report (even uncovered)
      all: true,

      // Clean coverage folder before running tests
      clean: true,
    },

    // Watch configuration — disabled in CI so the process exits after tests complete
    watch: !process.env.CI,
    watchExclude: ["node_modules", "dist"],

    // Thread configuration for performance
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    // Snapshot serialization
    snapshotSerializers: [],

    // Retry failed tests once
    retry: 1,

    // Bail on first failure (useful for CI)
    bail: process.env.CI ? 1 : 0,

    // Sequence configuration
    sequence: {
      shuffle: false, // Don't shuffle tests for deterministic results
    },

    // TypeScript configuration
    typecheck: {
      enabled: false, // Type checking is done separately with tsc
    },

    // Server configuration for browser-like testing
    server: {
      deps: {
        // Inline modules that need transformation
        inline: ["@testing-library/react"],
      },
    },
  },
});

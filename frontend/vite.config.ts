/**
 * Vite Configuration
 *
 * Optimized build configuration with code splitting, compression, and performance tuning.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // Gzip compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240, // Only compress files larger than 10kb
      algorithm: "gzip",
      ext: ".gz",
    }),

    // Brotli compression
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: "brotliCompress",
      ext: ".br",
    }),

    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE === "true" &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "dist/stats.html",
      }),
  ].filter(Boolean),

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

  build: {
    // Target modern browsers
    target: "es2015",

    // Output directory
    outDir: "dist",

    // Generate sourcemaps for production debugging
    sourcemap: process.env.SOURCE_MAP === "true",

    // Minification
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ["console.log", "console.info", "console.debug"],
      },
      format: {
        comments: false, // Remove all comments
      },
    },

    // Chunk size warnings
    chunkSizeWarningLimit: 500, // Warn on chunks larger than 500kb

    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting strategy
        manualChunks: (id) => {
          // Vendor chunks - React ecosystem
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }

          // Vendor chunks - Redux ecosystem
          if (
            id.includes("node_modules/@reduxjs") ||
            id.includes("node_modules/redux") ||
            id.includes("node_modules/react-redux")
          ) {
            return "vendor-redux";
          }

          // Vendor chunks - Router
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }

          // Vendor chunks - UI libraries
          if (
            id.includes("node_modules/@mui") ||
            id.includes("node_modules/@emotion") ||
            id.includes("node_modules/framer-motion")
          ) {
            return "vendor-ui";
          }

          // Vendor chunks - Utilities
          if (
            id.includes("node_modules/axios") ||
            id.includes("node_modules/lodash") ||
            id.includes("node_modules/date-fns")
          ) {
            return "vendor-utils";
          }

          // Vendor chunks - Charts (if used)
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/chart.js") ||
            id.includes("node_modules/d3")
          ) {
            return "vendor-charts";
          }

          // All other node_modules
          if (id.includes("node_modules")) {
            return "vendor-other";
          }

          // Feature-based code splitting
          if (id.includes("/src/features/auth/")) {
            return "feature-auth";
          }
          if (id.includes("/src/features/documents/")) {
            return "feature-documents";
          }
          if (id.includes("/src/features/projects/")) {
            return "feature-projects";
          }
          if (id.includes("/src/features/dashboard/")) {
            return "feature-dashboard";
          }

          // Shared components
          if (id.includes("/src/shared/components/")) {
            return "shared-components";
          }

          // Store and services
          if (id.includes("/src/store/")) {
            return "app-store";
          }
          if (id.includes("/src/services/")) {
            return "app-services";
          }
        },

        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return "assets/images/[name]-[hash][extname]";
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return "assets/fonts/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },

        // Chunk file naming
        chunkFileNames: "js/[name]-[hash].js",

        // Entry file naming
        entryFileNames: "js/[name]-[hash].js",
      },
    },

    // CSS code splitting
    cssCodeSplit: true,

    // Asset inline limit (10kb)
    assetsInlineLimit: 10240,

    // Report compressed size
    reportCompressedSize: true,
  },

  server: {
    port: 3000,
    host: true,

    // Proxy API requests to backend
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:50080",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: process.env.VITE_WS_BASE_URL || "ws://localhost:50080",
        ws: true,
        changeOrigin: true,
      },
    },

    // CORS
    cors: true,

    // Open browser on start
    open: false,

    // HMR
    hmr: {
      overlay: true,
    },
  },

  preview: {
    port: 3000,
    host: true,

    // Proxy configuration for preview server
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:50080",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: process.env.VITE_WS_BASE_URL || "ws://localhost:50080",
        ws: true,
        changeOrigin: true,
      },
    },
  },

  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server start
    include: ["react", "react-dom", "react-router-dom", "@reduxjs/toolkit", "react-redux", "axios"],

    // Exclude large dependencies from pre-bundling
    exclude: [],
  },

  // Esbuild options for faster builds
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },

  // CSS options
  css: {
    modules: {
      localsConvention: "camelCase",
      scopeBehaviour: "local",
      generateScopedName: "[name]__[local]___[hash:base64:5]",
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables.scss";',
      },
    },
    devSourcemap: true,
  },
});

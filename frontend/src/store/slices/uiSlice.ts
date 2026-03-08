/**
 * UI Slice
 *
 * Redux slice for global UI state management (modals, toasts, theme, etc.).
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
  duration?: number;
}

interface Modal {
  id: string;
  isOpen: boolean;
  data?: any;
}

interface UIState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  modals: Record<string, Modal>;
  toasts: Toast[];
  isGlobalLoading: boolean;
}

const initialState: UIState = {
  theme: (localStorage.getItem("theme") as "light" | "dark") || "light",
  sidebarOpen: true,
  modals: {},
  toasts: [],
  isGlobalLoading: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Theme
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
      localStorage.setItem("theme", action.payload);
    },

    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("theme", state.theme);
    },

    // Sidebar
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    // Modals
    openModal: (state, action: PayloadAction<{ id: string; data?: any }>) => {
      state.modals[action.payload.id] = {
        id: action.payload.id,
        isOpen: true,
        data: action.payload.data,
      };
    },

    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false;
      }
    },

    removeModal: (state, action: PayloadAction<string>) => {
      delete state.modals[action.payload];
    },

    // Toasts
    addToast: (state, action: PayloadAction<Omit<Toast, "id">>) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      state.toasts.push({
        id,
        ...action.payload,
        duration: action.payload.duration || 5000,
      });
    },

    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },

    clearToasts: (state) => {
      state.toasts = [];
    },

    // Global Loading
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isGlobalLoading = action.payload;
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setSidebarOpen,
  toggleSidebar,
  openModal,
  closeModal,
  removeModal,
  addToast,
  removeToast,
  clearToasts,
  setGlobalLoading,
} = uiSlice.actions;

export default uiSlice.reducer;

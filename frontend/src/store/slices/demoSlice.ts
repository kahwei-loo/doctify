import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface DemoState {
  isActive: boolean;
  enteredAt: string | null;
}

const DEMO_MODE_KEY = 'demo_mode';
const DEMO_ENTERED_AT_KEY = 'demo_entered_at';

// Load initial state from localStorage
const loadDemoStateFromStorage = (): DemoState => {
  try {
    const isActive = localStorage.getItem(DEMO_MODE_KEY) === 'true';
    const enteredAt = localStorage.getItem(DEMO_ENTERED_AT_KEY);
    return {
      isActive,
      enteredAt: isActive ? enteredAt : null,
    };
  } catch (error) {
    console.warn('[Demo] Failed to load state from localStorage:', error);
    return {
      isActive: false,
      enteredAt: null,
    };
  }
};

const initialState: DemoState = loadDemoStateFromStorage();

const demoSlice = createSlice({
  name: 'demo',
  initialState,
  reducers: {
    enterDemoMode: (state) => {
      state.isActive = true;
      state.enteredAt = new Date().toISOString();

      // Sync to localStorage
      try {
        localStorage.setItem(DEMO_MODE_KEY, 'true');
        localStorage.setItem(DEMO_ENTERED_AT_KEY, state.enteredAt);
      } catch (error) {
        console.warn('[Demo] Failed to save state to localStorage:', error);
      }
    },
    exitDemoMode: (state) => {
      state.isActive = false;
      state.enteredAt = null;

      // Clear localStorage
      try {
        localStorage.removeItem(DEMO_MODE_KEY);
        localStorage.removeItem(DEMO_ENTERED_AT_KEY);
        localStorage.removeItem('doctify_onboarding_completed');
      } catch (error) {
        console.warn('[Demo] Failed to clear localStorage:', error);
      }
    },
  },
});

export const { enterDemoMode, exitDemoMode } = demoSlice.actions;

// Selectors
export const selectIsDemoMode = (state: RootState) => state.demo.isActive;
export const selectDemoEnteredAt = (state: RootState) => state.demo.enteredAt;

export default demoSlice.reducer;

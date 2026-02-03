/**
 * Theme Provider
 *
 * Provides theme context for the application with support for:
 * - Light mode
 * - Dark mode
 * - System preference (auto)
 *
 * Syncs theme preference with backend settings.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '@/store/api/settingsApi';

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Local storage key for theme (fallback when not logged in)
const THEME_STORAGE_KEY = 'doctify-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(resolvedTheme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolvedTheme);
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
}) => {
  // Fetch settings from backend (if logged in)
  const { data: settingsResponse, isLoading: isLoadingSettings } = useGetSettingsQuery(undefined, {
    // Skip if not logged in (no token)
    skip: !localStorage.getItem('access_token'),
  });

  const [updateSettings] = useUpdateSettingsMutation();

  // Get initial theme from backend or localStorage
  const getInitialTheme = (): Theme => {
    // If we have backend settings, use them
    if (settingsResponse?.data?.theme) {
      return settingsResponse.data.theme as Theme;
    }
    // Otherwise check localStorage
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as Theme;
    }
    return defaultTheme;
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Calculate resolved theme
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (theme === 'system') {
      return systemTheme;
    }
    return theme;
  }, [theme, systemTheme]);

  // Sync theme from backend settings when they load
  useEffect(() => {
    if (settingsResponse?.data?.theme) {
      const backendTheme = settingsResponse.data.theme as Theme;
      if (backendTheme !== theme) {
        setThemeState(backendTheme);
      }
    }
  }, [settingsResponse?.data?.theme]);

  // Apply theme to DOM whenever resolvedTheme changes
  useEffect(() => {
    applyThemeToDOM(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Set theme function
  const setTheme = useCallback(
    async (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);

      // If logged in, sync to backend
      if (localStorage.getItem('access_token')) {
        try {
          await updateSettings({ theme: newTheme });
        } catch (error) {
          console.error('Failed to sync theme to backend:', error);
        }
      }
    },
    [updateSettings]
  );

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      isLoading: isLoadingSettings,
    }),
    [theme, resolvedTheme, setTheme, isLoadingSettings]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to get only the resolved theme (useful for components that don't need full context)
 */
export function useResolvedTheme(): ResolvedTheme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme;
}

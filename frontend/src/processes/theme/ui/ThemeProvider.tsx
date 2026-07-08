'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { THEME_COLOR, THEME_STORAGE_KEY, ThemeMode, getNextTheme, isThemeMode } from '../model/theme';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const DEFAULT_THEME: ThemeMode = 'light';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : null;
  } catch {
    return null;
  }
}

function getInitialTheme(): ThemeMode {
  return getStoredTheme() ?? getSystemTheme();
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[theme];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME);
  const [hydrated, setHydrated] = useState(false);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Storage can be unavailable in private browsing or locked-down webviews.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const nextTheme = getNextTheme(currentTheme);

      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Storage can be unavailable in private browsing or locked-down webviews.
      }

      return nextTheme;
    });
  }, []);

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setThemeState(initialTheme);
    setHydrated(true);
    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(theme);
  }, [hydrated, theme]);

  useEffect(() => {
    if (!hydrated) return;
    if (getStoredTheme()) return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      if (getStoredTheme()) return;
      setThemeState(event.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [hydrated]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return value;
}

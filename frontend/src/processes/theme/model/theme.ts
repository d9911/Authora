export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'authora-theme';

export const THEME_COLOR: Record<ThemeMode, string> = {
  light: '#f5f4f8',
  dark: '#0f0d16',
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function getNextTheme(theme: ThemeMode): ThemeMode {
  return theme === 'dark' ? 'light' : 'dark';
}

'use client';

import { ThemeToggle } from '@/shared/ui';
import { useTheme } from './ThemeProvider';

export function ThemeHeaderToggle() {
  const { theme, toggleTheme } = useTheme();

  return <ThemeToggle theme={theme} onClick={toggleTheme} />;
}

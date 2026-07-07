import { ButtonHTMLAttributes } from 'react';
import styles from './ThemeToggle.module.scss';

type ThemeToggleMode = 'light' | 'dark';

interface ThemeToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  theme: ThemeToggleMode;
  label?: string;
}

export function ThemeToggle({ theme, label = 'Theme', className, ...rest }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      aria-pressed={isDark}
      className={`${styles.toggle} ${isDark ? styles.dark : styles.light} ${className || ''}`}
      {...rest}
    >
      <span className={styles.icon} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.moon} />
      </span>
      <span className={styles.copy}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{isDark ? 'Dark' : 'Light'}</span>
      </span>
    </button>
  );
}

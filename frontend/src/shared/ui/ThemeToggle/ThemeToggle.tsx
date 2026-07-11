'use client';

import { ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ThemeToggle.module.scss';

type ThemeToggleMode = 'light' | 'dark';

interface ThemeToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  theme: ThemeToggleMode;
  label?: string;
}

export function ThemeToggle({ theme, label, className, ...rest }: ThemeToggleProps) {
  const { t } = useTranslation('common');
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      aria-label={t(isDark ? 'theme.switchToLight' : 'theme.switchToDark')}
      aria-pressed={isDark}
      className={`${styles.toggle} ${isDark ? styles.dark : styles.light} ${className || ''}`}
      {...rest}
    >
      <span className={styles.icon} aria-hidden="true">
        <span className={styles.sun} />
        <span className={styles.moon} />
      </span>
      <span className={styles.copy}>
        <span className={styles.label}>{label ?? t('theme.label')}</span>
        <span className={styles.value}>
          {t(isDark ? 'theme.dark' : 'theme.light')}
        </span>
      </span>
    </button>
  );
}

'use client';

import { ButtonHTMLAttributes } from 'react';
import styles from './ButtonMain.module.scss';

interface ButtonMainProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  fullWidth?: boolean;
  loading?: boolean;
  size?: 'default' | 'small';
}

/**
 * Authora button. Primary is the iris pill with a soft aura on hover —
 * the only place the accent fills a surface, keeping it the page's focal action.
 */
export function ButtonMain({
  variant = 'primary',
  fullWidth,
  loading,
  disabled,
  size = 'default',
  children,
  className,
  ...rest
}: ButtonMainProps) {
  const classes = [
    styles.button,
    styles[`button-${variant}`],
    fullWidth && styles['button-full'],
    size === 'small' && styles['button-small'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button {...rest} disabled={disabled || loading} className={classes}>
      {loading ? 'Working…' : children}
    </button>
  );
}

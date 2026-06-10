'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonMainProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'on-dark';
  fullWidth?: boolean;
  loading?: boolean;
}

/**
 * Pill-shaped button (rounded.full) — a MongoDB brand signature.
 * Primary = bright green with deep-navy text.
 */
const palette: Record<string, { bg: string; color: string; border: string }> = {
  primary: { bg: 'var(--brand-green)', color: 'var(--on-primary)', border: 'transparent' },
  'on-dark': { bg: 'var(--brand-green)', color: 'var(--on-primary)', border: 'transparent' },
  secondary: { bg: 'transparent', color: 'var(--ink)', border: 'var(--hairline-strong)' },
  ghost: { bg: 'transparent', color: 'var(--ink)', border: 'transparent' },
  danger: { bg: 'var(--danger)', color: '#fff', border: 'transparent' },
};

export function ButtonMain({
  variant = 'primary',
  fullWidth,
  loading,
  disabled,
  children,
  style,
  ...rest
}: ButtonMainProps) {
  const c = palette[variant];
  const isGhost = variant === 'ghost';
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: isGhost ? 'var(--r-md)' : 'var(--r-full)',
        padding: isGhost ? '8px 12px' : '10px 22px',
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.3,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'opacity 0.15s ease, background 0.15s ease',
        ...style,
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonMainProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'on-dark';
  fullWidth?: boolean;
  loading?: boolean;
}

/**
 * Authora button. Primary is the iris pill with a soft aura on hover —
 * the only place the accent fills a surface, keeping it the page's focal action.
 */
const palette: Record<string, { bg: string; color: string; border: string }> = {
  primary: { bg: 'var(--iris)', color: '#fff', border: 'transparent' },
  'on-dark': { bg: 'var(--iris)', color: '#fff', border: 'transparent' },
  secondary: { bg: 'transparent', color: 'var(--ink)', border: 'var(--line)' },
  ghost: { bg: 'transparent', color: 'var(--ink)', border: 'transparent' },
  danger: { bg: 'var(--alert)', color: '#fff', border: 'transparent' },
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
        borderRadius: 'var(--r-pill)',
        padding: isGhost ? '9px 14px' : '11px 22px',
        fontFamily: 'var(--font-display)',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1.3,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.55 : 1,
        width: fullWidth ? '100%' : undefined,
        boxShadow: variant === 'primary' ? '0 10px 24px -12px rgba(91,75,255,0.7)' : 'none',
        transition: 'opacity 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease',
        ...style,
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(1px)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
      }}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

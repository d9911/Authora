'use client';

import { ButtonHTMLAttributes } from 'react';

interface ButtonMainProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  fullWidth?: boolean;
  loading?: boolean;
}

const palette = {
  primary: { bg: 'var(--color-primary)', color: '#fff', border: 'transparent' },
  ghost: { bg: 'transparent', color: 'var(--color-text)', border: 'var(--color-border)' },
  danger: { bg: 'var(--color-danger)', color: '#fff', border: 'transparent' },
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
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: 'var(--radius)',
        padding: '10px 16px',
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'opacity 0.15s ease',
        ...style,
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

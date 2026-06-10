'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputMainProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const InputMain = forwardRef<HTMLInputElement, InputMainProps>(function InputMain(
  { label, id, style, ...rest },
  ref,
) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      {label && (
        <span
          style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 13,
            color: 'var(--color-text-muted)',
          }}
        >
          {label}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        {...rest}
        style={{
          width: '100%',
          background: 'var(--color-surface-2)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)',
          padding: '10px 12px',
          fontSize: 15,
          outline: 'none',
          ...style,
        }}
      />
    </label>
  );
});

'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';

interface InputMainProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const InputMain = forwardRef<HTMLInputElement, InputMainProps>(function InputMain(
  { label, id, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      {label && (
        <span
          style={{
            display: 'block',
            marginBottom: 6,
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--slate)',
          }}
        >
          {label}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          width: '100%',
          height: 44,
          background: 'var(--canvas)',
          color: 'var(--ink)',
          border: focused
            ? '2px solid var(--brand-green-dark)'
            : '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-md)',
          padding: focused ? '0 11px' : '0 12px',
          fontSize: 16,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          ...style,
        }}
      />
    </label>
  );
});

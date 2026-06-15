'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';

interface InputMainProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Render the field value in mono — for credential data (codes, tokens, IDs). */
  mono?: boolean;
}

export const InputMain = forwardRef<HTMLInputElement, InputMainProps>(function InputMain(
  { label, id, style, mono, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      {label && (
        <span
          style={{
            display: 'block',
            marginBottom: 7,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--mist)',
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
          height: 46,
          background: 'var(--paper)',
          color: 'var(--ink)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r)',
          padding: '0 13px',
          fontSize: 15,
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
          letterSpacing: mono ? '0.04em' : undefined,
          outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(91,75,255,0.18)' : 'none',
          borderColor: focused ? 'var(--iris)' : 'var(--line)',
          transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
          ...style,
        }}
      />
    </label>
  );
});

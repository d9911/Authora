'use client';

import { InputHTMLAttributes, useId, useState } from 'react';
import styles from './PasswordInput.module.scss';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string | null;
  showAriaLabel?: string;
  hideAriaLabel?: string;
}

export function PasswordInput({
  label,
  id,
  error,
  className,
  showAriaLabel = 'Показать пароль',
  hideAriaLabel = 'Скрыть пароль',
  ...rest
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles['password-field']}>
      {label && (
        <label className={styles['password-label']} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className={styles['password-control']}>
        <input
          id={inputId}
          {...rest}
          className={`${styles['password-input']} ${className || ''}`}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : rest['aria-invalid']}
          aria-describedby={error ? errorId : rest['aria-describedby']}
        />
        <button
          className={styles['password-toggle']}
          type="button"
          aria-label={visible ? hideAriaLabel : showAriaLabel}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && (
        <p id={errorId} className={styles['field-error']}>
          {error}
        </p>
      )}
    </div>
  );
}

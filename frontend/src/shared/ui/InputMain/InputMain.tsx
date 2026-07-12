// Денис: файл создан или изменён по запросу пользователя.

'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styles from './InputMain.module.scss';

interface InputMainProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  requiredLabel?: ReactNode;
  optionalLabel?: ReactNode;
  /** Render the field value in mono — for credential data (codes, tokens, IDs). */
  mono?: boolean;
}

export const InputMain = forwardRef<HTMLInputElement, InputMainProps>(function InputMain(
  {
    label,
    id,
    className,
    mono,
    hint,
    error,
    requiredLabel,
    optionalLabel,
    required,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [
    rest['aria-describedby'],
    hint ? hintId : undefined,
    error ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={styles['input-wrapper']}>
      {label ? (
        <label className={styles['input-label']} htmlFor={inputId}>
          <span>{label}</span>
          {required && requiredLabel ? (
            <span className={styles['field-meta']}>{requiredLabel}</span>
          ) : null}
          {!required && optionalLabel ? (
            <span className={styles['field-meta']}>{optionalLabel}</span>
          ) : null}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        {...rest}
        required={required}
        aria-invalid={error ? true : rest['aria-invalid']}
        aria-describedby={describedBy}
        className={`${styles['input-field']} ${mono ? styles.mono : ''} ${className || ''}`}
      />
      {hint ? (
        <p id={hintId} className={styles['field-hint']}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles['field-error']} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

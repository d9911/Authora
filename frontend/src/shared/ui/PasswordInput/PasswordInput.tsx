// Денис: файл создан или изменён по запросу пользователя.

'use client';

import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './PasswordInput.module.scss';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string | null;
  showAriaLabel?: string;
  hideAriaLabel?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  {
    label,
    id,
    error,
    className,
    showAriaLabel,
    hideAriaLabel,
    ...rest
  },
  ref,
) {
  const { t } = useTranslation('common');
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const describedBy = [rest['aria-describedby'], error ? errorId : null]
    .filter(Boolean)
    .join(' ') || undefined;
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
          ref={ref}
          id={inputId}
          {...rest}
          className={`${styles['password-input']} ${className || ''}`}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : rest['aria-invalid']}
          aria-describedby={describedBy}
        />
        <button
          className={styles['password-toggle']}
          type="button"
          disabled={rest.disabled}
          aria-label={
            visible
              ? (hideAriaLabel ?? t('password.hide'))
              : (showAriaLabel ?? t('password.show'))
          }
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? t('password.hide') : t('password.show')}
        </button>
      </div>
      {error && (
        <p id={errorId} className={styles['field-error']} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

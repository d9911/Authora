'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import styles from './InputMain.module.scss';

interface InputMainProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Render the field value in mono — for credential data (codes, tokens, IDs). */
  mono?: boolean;
}

export const InputMain = forwardRef<HTMLInputElement, InputMainProps>(function InputMain(
  { label, id, className, mono, ...rest },
  ref,
) {
  return (
    <label className={styles['input-wrapper']}>
      {label && <span className={styles['input-label']}>{label}</span>}
      <input
        ref={ref}
        id={id}
        {...rest}
        className={`${styles['input-field']} ${mono ? styles.mono : ''} ${className || ''}`}
      />
    </label>
  );
});

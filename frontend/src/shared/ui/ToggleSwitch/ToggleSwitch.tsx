'use client';

import { InputHTMLAttributes } from 'react';
import styles from './ToggleSwitch.module.scss';

interface ToggleSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
}

export function ToggleSwitch({ label, hint, className, ...rest }: ToggleSwitchProps) {
  return (
    <label className={`${styles.wrapper} ${className || ''}`}>
      <span className={styles.copy}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      <input className={styles.input} type="checkbox" {...rest} />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </label>
  );
}

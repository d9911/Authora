'use client';

import { CSSProperties, InputHTMLAttributes } from 'react';
import styles from './RangeControl.module.scss';

interface RangeControlProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  value: number;
  suffix?: string;
}

export function RangeControl({
  label,
  value,
  suffix,
  min = 0,
  max = 100,
  className,
  ...rest
}: RangeControlProps) {
  const numericMin = Number(min);
  const numericMax = Number(max);
  const progress = ((value - numericMin) / (numericMax - numericMin || 1)) * 100;

  return (
    <label className={`${styles.wrapper} ${className || ''}`}>
      <span className={styles.header}>
        <span>{label}</span>
        <span className={styles.value}>
          {value}
          {suffix || ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        className={styles.input}
        style={{ '--range-progress': `${progress}%` } as CSSProperties}
        {...rest}
      />
    </label>
  );
}

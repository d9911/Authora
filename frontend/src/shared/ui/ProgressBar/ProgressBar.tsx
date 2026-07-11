'use client';

import { HTMLAttributes } from 'react';
import { formatPercent, useCurrentLocale } from '@/shared/i18n';
import styles from './ProgressBar.module.scss';

interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue,
  className,
  ...rest
}: ProgressBarProps) {
  const locale = useCurrentLocale();
  const safeMax = max || 1;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const formattedPercent = formatPercent(percent / 100, locale, {
    maximumFractionDigits: 0,
  });

  return (
    <div className={`${styles.wrapper} ${className || ''}`} {...rest}>
      {(label || showValue) && (
        <div className={styles.header}>
          {label && <span>{label}</span>}
          {showValue && <span>{formattedPercent}</span>}
        </div>
      )}
      <div
        className={styles.track}
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LoaderMain.module.scss';

interface LoaderMainProps {
  label?: string;
  fullscreen?: boolean;
}

export function LoaderMain({ label, fullscreen = false }: LoaderMainProps) {
  const { t } = useTranslation('common');
  const instanceId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = `loader-gradient-${instanceId}`;
  const glowId = `loader-glow-${instanceId}`;
  const resolvedLabel = label ?? t('status.loading');

  return (
    <div
      className={`${styles.loader} ${fullscreen ? styles.fullscreen : styles.compact}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className={styles.aura} aria-hidden="true" />
      <svg
        viewBox="0 0 200 200"
        className={styles.graphic}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--halo)" />
            <stop offset="100%" stopColor="var(--iris)" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          className={styles.outerGlow}
          cx="100"
          cy="100"
          r="85"
          fill="none"
          stroke="var(--halo)"
          strokeWidth="4"
        />
        <circle
          className={styles.outerRing}
          cx="100"
          cy="100"
          r="68"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray="180 360"
          filter={`url(#${glowId})`}
        />
        <circle
          className={styles.innerRing}
          cx="100"
          cy="100"
          r="48"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="120 300"
        />
        <circle
          className={styles.core}
          cx="100"
          cy="100"
          r="6"
          fill="var(--loader-core)"
        />
      </svg>

      <span className={styles.label}>{resolvedLabel}</span>
    </div>
  );
}

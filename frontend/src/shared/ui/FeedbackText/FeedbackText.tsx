// Денис: файл создан или изменён по запросу пользователя.

import type { HTMLAttributes } from 'react';
import styles from './FeedbackText.module.scss';

interface FeedbackTextProps extends HTMLAttributes<HTMLParagraphElement> {
  tone: 'error' | 'success' | 'warning' | 'muted';
}

export function FeedbackText({ tone, className, children, ...rest }: FeedbackTextProps) {
  const politeStatus = tone === 'success' || tone === 'warning';
  const role = rest.role ?? (tone === 'error' ? 'alert' : politeStatus ? 'status' : undefined);
  const ariaLive =
    rest['aria-live'] ?? (tone === 'error' ? 'assertive' : politeStatus ? 'polite' : undefined);

  return (
    <p
      {...rest}
      className={`${styles.feedback} ${styles[tone]} ${className || ''}`}
      role={role}
      aria-live={ariaLive}
    >
      {children}
    </p>
  );
}

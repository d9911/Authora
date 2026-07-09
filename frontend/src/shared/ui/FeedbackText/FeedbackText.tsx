import { HTMLAttributes } from 'react';
import styles from './FeedbackText.module.scss';

interface FeedbackTextProps extends HTMLAttributes<HTMLParagraphElement> {
  tone: 'error' | 'success' | 'muted';
}

export function FeedbackText({ tone, className, children, ...rest }: FeedbackTextProps) {
  return (
    <p
      {...rest}
      className={`${styles.feedback} ${styles[tone]} ${className || ''}`}
      role={tone === 'error' ? 'alert' : rest.role}
    >
      {children}
    </p>
  );
}

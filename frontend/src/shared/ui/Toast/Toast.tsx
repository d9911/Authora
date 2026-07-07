import { ReactNode } from 'react';
import styles from './Toast.module.scss';

type ToastTone = 'neutral' | 'success' | 'danger';

interface ToastProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: ToastTone;
  className?: string;
}

export function Toast({
  open,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: ToastProps) {
  return (
    <div
      className={[
        styles.toast,
        styles[`tone-${tone}`],
        open && styles.open,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      aria-hidden={!open}
    >
      <div className={styles.copy}>
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}

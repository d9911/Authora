// Денис: файл создан или изменён по запросу пользователя.

'use client';

import type { ReactNode } from 'react';
import styles from './Toast.module.scss';

type ToastTone = 'neutral' | 'success' | 'warning' | 'danger';

interface ToastBaseProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  tone?: ToastTone;
  className?: string;
}

type ToastProps = ToastBaseProps &
  (
    | { closeLabel?: undefined; onClose?: undefined }
    | { closeLabel: string; onClose: () => void }
  );

export function Toast({
  open,
  title,
  description,
  action,
  tone = 'neutral',
  className,
  closeLabel,
  onClose,
}: ToastProps) {
  if (!open) return null;

  const role = tone === 'danger' ? 'alert' : 'status';

  return (
    <div
      className={[
        styles.toast,
        styles[`tone-${tone}`],
        styles.open,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role={role}
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
    >
      <div className={styles.copy}>
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
      {onClose ? (
        <button className={styles.close} type="button" aria-label={closeLabel} onClick={onClose}>
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}

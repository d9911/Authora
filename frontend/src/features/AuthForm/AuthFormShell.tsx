'use client';

import { FormHTMLAttributes, ReactNode } from 'react';
import styles from './AuthForm.module.scss';

interface AuthFormShellProps extends FormHTMLAttributes<HTMLFormElement> {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthFormShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  className,
  ...formProps
}: AuthFormShellProps) {
  return (
    <div className={styles['auth-wrapper']}>
      <form {...formProps} className={`${styles['auth-card']} ${className || ''}`}>
        <div className={styles['auth-header']}>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 className={styles['auth-title']}>{title}</h2>
          {subtitle && <p className={styles['auth-subtitle']}>{subtitle}</p>}
        </div>
        <div className={styles['auth-form']}>{children}</div>
        {footer}
      </form>
    </div>
  );
}

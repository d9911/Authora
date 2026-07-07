import { HTMLAttributes, ReactNode } from 'react';
import styles from './Badge.module.scss';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'danger' | 'warning';
type BadgeVariant = 'soft' | 'outline' | 'solid';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: BadgeTone;
  variant?: BadgeVariant;
}

export function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  className,
  ...rest
}: BadgeProps) {
  const classes = [styles.badge, styles[`tone-${tone}`], styles[`variant-${variant}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}

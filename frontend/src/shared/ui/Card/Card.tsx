'use client';

import { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.scss';

type CardTone = 'plain' | 'glass' | 'dark' | 'accent';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  tone?: CardTone;
  selected?: boolean;
  interactive?: boolean;
}

export function Card({
  title,
  description,
  eyebrow,
  footer,
  children,
  tone = 'plain',
  selected,
  interactive,
  className,
  ...rest
}: CardProps) {
  const classes = [
    styles.card,
    styles[`tone-${tone}`],
    selected && styles.selected,
    interactive && styles.interactive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-selected={selected ? 'true' : undefined} {...rest}>
      {(eyebrow || title || description) && (
        <div className={styles.header}>
          {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
          {title && <h3 className={styles.title}>{title}</h3>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      )}
      {children && <div className={styles.body}>{children}</div>}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}

import { HTMLAttributes, ReactNode } from 'react';
import styles from './SectionHeader.module.scss';

interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: 'start' | 'center';
  actions?: ReactNode;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'start',
  actions,
  className,
  ...rest
}: SectionHeaderProps) {
  const classes = [styles.header, styles[`align-${align}`], className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      <div className={styles.copy}>
        {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
        <h2 className={styles.title}>{title}</h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

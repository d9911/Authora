import { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './IconButton.module.scss';

type IconButtonVariant = 'plain' | 'glass' | 'dark' | 'accent';
type IconButtonSize = 'small' | 'default' | 'large';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

export function IconButton({
  icon,
  label,
  variant = 'plain',
  size = 'default',
  className,
  ...rest
}: IconButtonProps) {
  const classes = [
    styles.button,
    styles[`variant-${variant}`],
    styles[`size-${size}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" aria-label={label} title={label} className={classes} {...rest}>
      {icon}
    </button>
  );
}

// Денис: файл создан или изменён по запросу пользователя.

'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import styles from './ButtonMain.module.scss';

interface ButtonMainOwnProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  fullWidth?: boolean;
  loading?: boolean;
  size?: 'default' | 'small';
  children?: ReactNode;
  className?: string;
}

type ButtonMainButtonProps = ButtonMainOwnProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never;
  };

type ButtonMainLinkProps = ButtonMainOwnProps &
  Omit<ComponentProps<typeof Link>, 'children' | 'className'> & {
    disabled?: boolean;
  };

type ButtonMainProps = ButtonMainButtonProps | ButtonMainLinkProps;

function isLinkAction(props: ButtonMainProps): props is ButtonMainLinkProps {
  return props.href !== undefined;
}

/**
 * Authora button. Primary is the iris pill with a soft aura on hover —
 * the only place the accent fills a surface, keeping it the page's focal action.
 */
export function ButtonMain(props: ButtonMainProps) {
  const {
    variant = 'primary',
    fullWidth,
    loading = false,
    size = 'default',
    children,
    className,
  } = props;
  const classes = [
    styles.button,
    styles[`button-${variant}`],
    fullWidth && styles['button-full'],
    size === 'small' && styles['button-small'],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={styles.label}>{children}</span>
    </>
  );

  if (isLinkAction(props)) {
    const {
      href,
      variant: _variant,
      fullWidth: _fullWidth,
      loading: _loading,
      size: _size,
      children: _children,
      className: _className,
      disabled,
      onClick,
      tabIndex,
      ...linkProps
    } = props;
    const explicitlyDisabled =
      linkProps['aria-disabled'] === true || linkProps['aria-disabled'] === 'true';
    const inactive = Boolean(disabled || loading || explicitlyDisabled);

    if (inactive) {
      return (
        <span
          className={classes}
          role="link"
          aria-label={linkProps['aria-label']}
          aria-labelledby={linkProps['aria-labelledby']}
          aria-describedby={linkProps['aria-describedby']}
          aria-busy={loading || undefined}
          aria-disabled="true"
        >
          {content}
        </span>
      );
    }

    return (
      <Link
        {...linkProps}
        href={href}
        className={classes}
        aria-busy={loading || undefined}
        tabIndex={tabIndex}
        onClick={(event) => {
          onClick?.(event);
        }}
      >
        {content}
      </Link>
    );
  }

  const {
    variant: _variant,
    fullWidth: _fullWidth,
    loading: _loading,
    size: _size,
    children: _children,
    className: _className,
    disabled,
    ...buttonProps
  } = props;

  return (
    <button
      {...buttonProps}
      disabled={disabled || loading}
      className={classes}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}

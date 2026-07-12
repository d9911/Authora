// Денис: файл создан или изменён по запросу пользователя.

'use client';

import { type HTMLAttributes, type ReactNode, useState } from 'react';
import styles from './Avatar.module.scss';

export type AvatarSize = 'small' | 'default' | 'large';

export interface AvatarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  src?: string | null;
  alt: string;
  fallback: ReactNode;
  size?: AvatarSize;
  decorative?: boolean;
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'default',
  decorative = false,
  className,
  ...rest
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src && failedSrc !== src);
  const classes = [styles.avatar, styles[`size-${size}`], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      {...rest}
      className={classes}
      aria-hidden={decorative ? true : rest['aria-hidden']}
      data-state={showImage ? 'image' : 'fallback'}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.image}
          src={src ?? undefined}
          alt={decorative ? '' : alt}
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : (
        <span
          className={styles.fallback}
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : alt}
        >
          {fallback}
        </span>
      )}
    </div>
  );
}

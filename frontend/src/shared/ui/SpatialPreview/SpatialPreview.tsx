import { HTMLAttributes } from 'react';
import styles from './SpatialPreview.module.scss';

interface SpatialPreviewProps extends HTMLAttributes<HTMLDivElement> {
  density?: 'calm' | 'rich';
  active?: boolean;
}

export function SpatialPreview({
  density = 'rich',
  active = true,
  className,
  ...rest
}: SpatialPreviewProps) {
  return (
    <div
      className={[
        styles.scene,
        styles[`density-${density}`],
        active && styles.active,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden="true"
      {...rest}
    >
      <span className={styles.orbit} />
      <span className={styles.core} />
      <span className={styles.panelOne} />
      <span className={styles.panelTwo} />
      <span className={styles.panelThree} />
      <span className={styles.nodeOne} />
      <span className={styles.nodeTwo} />
    </div>
  );
}

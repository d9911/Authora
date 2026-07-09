import Link from 'next/link';
import styles from './LocationLists.module.scss';

export interface LocationListItem {
  id: string;
  href: string;
  title: string;
  code?: string | null;
  description?: string;
}

interface LocationListProps {
  items: LocationListItem[];
  emptyTitle?: string;
  emptyMessage: string;
}

export function LocationList({ items, emptyTitle, emptyMessage }: LocationListProps) {
  if (!items.length) {
    return (
      <div className={styles['list-empty']}>
        {emptyTitle && <h3>{emptyTitle}</h3>}
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles['list-container']}>
      <div className={styles['list-grid']}>
        {items.map((item) => (
          <Link key={item.id} href={item.href} className={styles['list-item']}>
            <div className={styles['list-item-header']}>
              <h4 className={styles['list-item-title']}>{item.title}</h4>
            </div>
            {item.code !== undefined && (
              <span className={styles['list-item-code']}>{item.code ?? '—'}</span>
            )}
            {item.description && (
              <p className={styles['list-item-description']}>{item.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Region } from '@/shared/types';
import styles from '../LocationLists/LocationLists.module.scss';

export function RegionList({ regions }: { regions: Region[] }) {
  if (!regions.length) {
    return (
      <div className={styles['list-empty']}>
        <p>No regions.</p>
      </div>
    );
  }
  return (
    <div className={styles['list-container']}>
      <div className={styles['list-grid']}>
        {regions.map((r) => (
          <Link key={r.id} href={`/region/${r.id}`} className={styles['list-item']}>
            <div className={styles['list-item-header']}>
              <h4 className={styles['list-item-title']}>{r.name}</h4>
            </div>
            <p className={styles['list-item-description']}>view cities →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

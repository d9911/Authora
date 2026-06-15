import Link from 'next/link';
import { City } from '@/shared/types';
import styles from '../LocationLists/LocationLists.module.scss';

export function CityList({ cities }: { cities: City[] }) {
  if (!cities.length) {
    return (
      <div className={styles['list-empty']}>
        <p>No cities.</p>
      </div>
    );
  }
  return (
    <div className={styles['list-container']}>
      <div className={styles['list-grid']}>
        {cities.map((c) => (
          <Link key={c.id} href={`/city/${c.id}`} className={styles['list-item']}>
            <div className={styles['list-item-header']}>
              <h4 className={styles['list-item-title']}>{c.name}</h4>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

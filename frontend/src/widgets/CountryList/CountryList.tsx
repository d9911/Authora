import Link from 'next/link';
import { Country } from '@/shared/types';
import styles from '../LocationLists/LocationLists.module.scss';

export function CountryList({ countries }: { countries: Country[] }) {
  if (!countries.length) {
    return (
      <div className={styles['list-empty']}>
        <h3>No countries yet</h3>
        <p>Seed the backend to populate the atlas.</p>
      </div>
    );
  }
  return (
    <div className={`${styles['list-container']}`}>
      <div className={styles['list-grid']}>
        {countries.map((c) => (
          <Link key={c.id} href={`/country/${c.id}`} className={styles['list-item']}>
            <div className={styles['list-item-header']}>
              <h4 className={styles['list-item-title']}>{c.name}</h4>
            </div>
            <span className={styles['list-item-code']}>{c.code ?? '—'}</span>
            <p className={styles['list-item-description']}>view regions →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from 'next/link';
import { City } from '@/shared/types';

export function CityList({ cities }: { cities: City[] }) {
  if (!cities.length) return <p className="muted">No cities.</p>;
  return (
    <div className="grid grid-3">
      {cities.map((c) => (
        <Link key={c.id} href={`/city/${c.id}`} style={{ textDecoration: 'none' }}>
          <div className="card card-hover" style={{ height: '100%' }}>
            <h4 style={{ margin: 0, color: 'var(--ink)' }}>{c.name}</h4>
          </div>
        </Link>
      ))}
    </div>
  );
}

import Link from 'next/link';
import { City } from '@/shared/types';

export function CityList({ cities }: { cities: City[] }) {
  if (!cities.length) return <p className="muted">No cities.</p>;
  return (
    <div className="grid grid-3">
      {cities.map((c) => (
        <Link key={c.id} href={`/city/${c.id}`} style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer' }}>
            <h3 style={{ margin: 0 }}>{c.name}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}

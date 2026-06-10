import Link from 'next/link';
import { Country } from '@/shared/types';

export function CountryList({ countries }: { countries: Country[] }) {
  if (!countries.length) {
    return <p className="muted">No countries found. Did you run the backend seed?</p>;
  }
  return (
    <div className="grid grid-3">
      {countries.map((c) => (
        <Link key={c.id} href={`/country/${c.id}`} style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer' }}>
            <h3 style={{ marginBottom: 4 }}>{c.name}</h3>
            <span className="muted">{c.code ?? '—'}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

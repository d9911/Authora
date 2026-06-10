import Link from 'next/link';
import { Country } from '@/shared/types';

// Category-accent palette — the only place saturated color appears beyond brand green.
const tagColors = [
  'var(--accent-purple)',
  'var(--accent-orange)',
  'var(--accent-blue)',
  'var(--brand-green-mid)',
  'var(--accent-pink)',
];

export function CountryList({ countries }: { countries: Country[] }) {
  if (!countries.length) {
    return <p className="muted">No countries found. Did you run the backend seed?</p>;
  }
  return (
    <div className="grid grid-3">
      {countries.map((c, i) => (
        <Link key={c.id} href={`/country/${c.id}`} style={{ textDecoration: 'none' }}>
          <div className="card card-hover" style={{ height: '100%' }}>
            <span
              style={{
                display: 'inline-block',
                background: tagColors[i % tagColors.length],
                color: 'var(--on-dark)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1,
                textTransform: 'uppercase',
                borderRadius: 'var(--r-xs)',
                padding: '2px 8px',
                marginBottom: 12,
              }}
            >
              {c.code ?? 'Country'}
            </span>
            <h4 style={{ margin: 0, color: 'var(--ink)' }}>{c.name}</h4>
            <span
              style={{
                display: 'inline-block',
                marginTop: 12,
                color: 'var(--brand-green-dark)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Explore →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

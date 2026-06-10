import Link from 'next/link';
import { Region } from '@/shared/types';

export function RegionList({ regions }: { regions: Region[] }) {
  if (!regions.length) return <p className="muted">No regions.</p>;
  return (
    <div className="grid grid-3">
      {regions.map((r) => (
        <Link key={r.id} href={`/region/${r.id}`} style={{ textDecoration: 'none' }}>
          <div className="card card-hover" style={{ height: '100%' }}>
            <h4 style={{ margin: 0, color: 'var(--ink)' }}>{r.name}</h4>
            <span
              style={{
                display: 'inline-block',
                marginTop: 12,
                color: 'var(--brand-green-dark)',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              View cities →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

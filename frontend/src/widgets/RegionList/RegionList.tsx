import Link from 'next/link';
import { Region } from '@/shared/types';

export function RegionList({ regions }: { regions: Region[] }) {
  if (!regions.length) return <p className="muted">No regions.</p>;
  return (
    <div className="grid grid-3">
      {regions.map((r) => (
        <Link key={r.id} href={`/region/${r.id}`} style={{ textDecoration: 'none' }}>
          <div className="card card-link" style={{ height: '100%' }}>
            <h4 style={{ margin: 0 }}>{r.name}</h4>
            <span
              className="mono"
              style={{ display: 'block', marginTop: 14, fontSize: 12, color: 'var(--mist)' }}
            >
              view cities →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

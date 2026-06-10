import Link from 'next/link';
import { Region } from '@/shared/types';

export function RegionList({ regions }: { regions: Region[] }) {
  if (!regions.length) return <p className="muted">No regions.</p>;
  return (
    <div className="grid grid-3">
      {regions.map((r) => (
        <Link key={r.id} href={`/region/${r.id}`} style={{ textDecoration: 'none' }}>
          <div className="card" style={{ cursor: 'pointer' }}>
            <h3 style={{ margin: 0 }}>{r.name}</h3>
          </div>
        </Link>
      ))}
    </div>
  );
}

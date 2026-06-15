import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverGql } from '@/shared/api/serverGraphql';
import { City } from '@/shared/types';

export const dynamic = 'force-dynamic';

async function getCity(id: string): Promise<City | null> {
  try {
    const data = await serverGql<{ city: City | null }>(
      `query City($id: ID!) { city(id: $id) { id name countryId regionId } }`,
      { id },
    );
    return data.city;
  } catch {
    return null;
  }
}

export default async function CityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const city = await getCity(id);
  if (!city) notFound();

  return (
    <div>
      {city.regionId && (
        <Link href={`/region/${city.regionId}`} className="muted">
          ← Back to region
        </Link>
      )}
      <span className="eyebrow">City</span>
      <h1 style={{ marginTop: 10 }}>{city.name}</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 18px' }}>
          <dt className="mono" style={{ fontSize: 12, color: 'var(--mist)' }}>city_id</dt>
          <dd className="mono" style={{ margin: 0, fontSize: 12 }}>{city.id}</dd>
          {city.countryId && (
            <>
              <dt className="mono" style={{ fontSize: 12, color: 'var(--mist)' }}>country_id</dt>
              <dd className="mono" style={{ margin: 0, fontSize: 12 }}>{city.countryId}</dd>
            </>
          )}
          {city.regionId && (
            <>
              <dt className="mono" style={{ fontSize: 12, color: 'var(--mist)' }}>region_id</dt>
              <dd className="mono" style={{ margin: 0, fontSize: 12 }}>{city.regionId}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}

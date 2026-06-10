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
      <h1 style={{ marginTop: 8 }}>{city.name}</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <p className="muted">City ID: {city.id}</p>
        {city.countryId && <p className="muted">Country: {city.countryId}</p>}
        {city.regionId && <p className="muted">Region: {city.regionId}</p>}
      </div>
    </div>
  );
}

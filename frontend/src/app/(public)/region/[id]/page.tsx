import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverGql } from '@/shared/api/serverGraphql';
import { Region } from '@/shared/types';
import { CityList } from '@/widgets/CityList/CityList';

export const dynamic = 'force-dynamic';

async function getRegion(id: string): Promise<Region | null> {
  try {
    const data = await serverGql<{ region: Region | null }>(
      `query Region($id: ID!) {
        region(id: $id) {
          id name countryId
          cities { id name regionId }
        }
      }`,
      { id },
    );
    return data.region;
  } catch {
    return null;
  }
}

export default async function RegionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const region = await getRegion(id);
  if (!region) notFound();

  return (
    <div>
      <Link href={`/country/${region.countryId}`} className="muted">
        ← Back to country
      </Link>
      <h1 style={{ marginTop: 8 }}>{region.name}</h1>
      <h2 style={{ marginTop: 24 }}>Cities</h2>
      <CityList cities={region.cities ?? []} />
    </div>
  );
}

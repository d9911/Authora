import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverGql } from '@/shared/api/serverGraphql';
import { Country } from '@/shared/types';
import { RegionList } from '@/widgets/RegionList/RegionList';

export const dynamic = 'force-dynamic';

async function getCountry(id: string): Promise<Country | null> {
  try {
    const data = await serverGql<{ country: Country | null }>(
      `query Country($id: ID!) {
        country(id: $id) {
          id name code
          regions { id name countryId }
        }
      }`,
      { id },
    );
    return data.country;
  } catch {
    return null;
  }
}

export default async function CountryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const country = await getCountry(id);
  if (!country) notFound();

  return (
    <div>
      <Link href="/country" className="muted">
        ← All countries
      </Link>
      <h1 style={{ marginTop: 8 }}>
        {country.name} {country.code && <span className="muted">({country.code})</span>}
      </h1>
      <h2 style={{ marginTop: 24 }}>Regions</h2>
      <RegionList regions={country.regions ?? []} />
    </div>
  );
}

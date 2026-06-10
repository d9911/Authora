import { serverGql } from '@/shared/api/serverGraphql';
import { Country } from '@/shared/types';
import { CountryList } from '@/widgets/CountryList/CountryList';

export const metadata = { title: 'Countries' };
export const dynamic = 'force-dynamic';

async function getCountries(): Promise<Country[]> {
  try {
    const data = await serverGql<{ countries: Country[] }>(
      `query { countries { id name code } }`,
    );
    return data.countries;
  } catch {
    return [];
  }
}

export default async function CountriesPage() {
  const countries = await getCountries();
  return (
    <div>
      <h1>Countries</h1>
      <CountryList countries={countries} />
    </div>
  );
}

import { gqlRequest } from '@/shared/api/graphqlClient';
import { City, Country, Region } from '@/shared/types';

export async function fetchCountries(): Promise<Country[]> {
  const data = await gqlRequest<{ countries: Country[] }>(
    `query Countries { countries { id name code } }`,
  );
  return data.countries;
}

export async function fetchCountryById(id: string): Promise<Country | null> {
  const data = await gqlRequest<{ country: Country | null }>(
    `query Country($id: ID!) {
      country(id: $id) {
        id name code
        regions { id name countryId }
        cities { id name }
      }
    }`,
    { id },
  );
  return data.country;
}

export async function fetchRegionById(id: string): Promise<Region | null> {
  const data = await gqlRequest<{ region: Region | null }>(
    `query Region($id: ID!) {
      region(id: $id) {
        id name countryId
        cities { id name regionId }
      }
    }`,
    { id },
  );
  return data.region;
}

export async function fetchCityById(id: string): Promise<City | null> {
  const data = await gqlRequest<{ city: City | null }>(
    `query City($id: ID!) {
      city(id: $id) { id name countryId regionId }
    }`,
    { id },
  );
  return data.city;
}

import { Country } from '@/shared/types';
import { ROUTES } from '@/shared/lib/routes';
import { LocationList } from '@/widgets/LocationLists/LocationList';

export function CountryList({ countries }: { countries: Country[] }) {
  return (
    <LocationList
      items={countries.map((country) => ({
        id: country.id,
        href: ROUTES.country(country.id),
        title: country.name,
        code: country.code,
        description: 'view regions →',
      }))}
      emptyTitle="No countries yet"
      emptyMessage="Seed the backend to populate the atlas."
    />
  );
}

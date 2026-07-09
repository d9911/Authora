import { City } from '@/shared/types';
import { ROUTES } from '@/shared/lib/routes';
import { LocationList } from '@/widgets/LocationLists/LocationList';

export function CityList({ cities }: { cities: City[] }) {
  return (
    <LocationList
      items={cities.map((city) => ({
        id: city.id,
        href: ROUTES.city(city.id),
        title: city.name,
      }))}
      emptyMessage="No cities."
    />
  );
}

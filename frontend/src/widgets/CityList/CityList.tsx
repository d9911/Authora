import { City } from '@/shared/types';
import { type SupportedLocale } from '@/shared/i18n/config';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { LocationList } from '@/widgets/LocationLists/LocationList';

interface CityListProps {
  cities: City[];
  locale: SupportedLocale;
  emptyMessage: string;
}

export function CityList({ cities, locale, emptyMessage }: CityListProps) {
  const routes = getLocalizedRoutes(locale);

  return (
    <LocationList
      items={cities.map((city) => ({
        id: city.id,
        href: routes.city(city.id),
        title: city.name,
      }))}
      emptyMessage={emptyMessage}
    />
  );
}

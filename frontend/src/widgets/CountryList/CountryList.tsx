import { Country } from '@/shared/types';
import { type SupportedLocale } from '@/shared/i18n/config';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { LocationList } from '@/widgets/LocationLists/LocationList';

interface CountryListProps {
  countries: Country[];
  locale: SupportedLocale;
  viewRegionsLabel: string;
  emptyTitle: string;
  emptyMessage: string;
}

export function CountryList({
  countries,
  locale,
  viewRegionsLabel,
  emptyTitle,
  emptyMessage,
}: CountryListProps) {
  const routes = getLocalizedRoutes(locale);

  return (
    <LocationList
      items={countries.map((country) => ({
        id: country.id,
        href: routes.country(country.id),
        title: country.name,
        code: country.code,
        description: viewRegionsLabel,
      }))}
      emptyTitle={emptyTitle}
      emptyMessage={emptyMessage}
    />
  );
}

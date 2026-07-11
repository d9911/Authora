import { Region } from '@/shared/types';
import { type SupportedLocale } from '@/shared/i18n/config';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { LocationList } from '@/widgets/LocationLists/LocationList';

interface RegionListProps {
  regions: Region[];
  locale: SupportedLocale;
  viewCitiesLabel: string;
  emptyMessage: string;
}

export function RegionList({
  regions,
  locale,
  viewCitiesLabel,
  emptyMessage,
}: RegionListProps) {
  const routes = getLocalizedRoutes(locale);

  return (
    <LocationList
      items={regions.map((region) => ({
        id: region.id,
        href: routes.region(region.id),
        title: region.name,
        description: viewCitiesLabel,
      }))}
      emptyMessage={emptyMessage}
    />
  );
}

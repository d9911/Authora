import { Region } from '@/shared/types';
import { ROUTES } from '@/shared/lib/routes';
import { LocationList } from '@/widgets/LocationLists/LocationList';

export function RegionList({ regions }: { regions: Region[] }) {
  return (
    <LocationList
      items={regions.map((region) => ({
        id: region.id,
        href: ROUTES.region(region.id),
        title: region.name,
        description: 'view cities →',
      }))}
      emptyMessage="No regions."
    />
  );
}

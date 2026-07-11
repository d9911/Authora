import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverGql } from '@/shared/api/serverGraphql';
import { getServerTranslation } from '@/shared/i18n/server';
import { buildLocalizedMetadata } from '@/shared/i18n/metadata';
import { isSupportedLocale } from '@/shared/i18n/config';
import { Region } from '@/shared/types';
import { CityList } from '@/widgets/CityList/CityList';
import { getLocalizedRoutes, ROUTES } from '@/shared/lib/routes';

export const dynamic = 'force-dynamic';
type RegionPageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isSupportedLocale(locale)) return {};
  const { t } = await getServerTranslation(locale, 'locations');
  return buildLocalizedMetadata({
    locale,
    pathname: ROUTES.region(id),
    title: t('metadata.region.title'),
  });
}

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

export default async function RegionPage({
  params,
}: RegionPageProps) {
  const { locale, id } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const { t } = await getServerTranslation(locale, 'locations');
  const routes = getLocalizedRoutes(locale);
  const region = await getRegion(id);
  if (!region) notFound();

  return (
    <div>
      <Link href={routes.country(region.countryId)} className="muted">
        <span aria-hidden="true">←{' '}</span>
        {t('region.back')}
      </Link>
      <h1 style={{ marginTop: 8 }}>{region.name}</h1>
      <h2 style={{ marginTop: 24 }}>{t('region.cities')}</h2>
      <CityList
        cities={region.cities ?? []}
        locale={locale}
        emptyMessage={t('region.emptyCities')}
      />
    </div>
  );
}

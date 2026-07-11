import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverGql } from '@/shared/api/serverGraphql';
import { getServerTranslation } from '@/shared/i18n/server';
import { buildLocalizedMetadata } from '@/shared/i18n/metadata';
import { isSupportedLocale } from '@/shared/i18n/config';
import { Country } from '@/shared/types';
import { RegionList } from '@/widgets/RegionList/RegionList';
import { getLocalizedRoutes, ROUTES } from '@/shared/lib/routes';

export const dynamic = 'force-dynamic';
type CountryPageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isSupportedLocale(locale)) return {};
  const { t } = await getServerTranslation(locale, 'locations');
  return buildLocalizedMetadata({
    locale,
    pathname: ROUTES.country(id),
    title: t('metadata.country.title'),
  });
}

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

export default async function CountryPage({
  params,
}: CountryPageProps) {
  const { locale, id } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const { t } = await getServerTranslation(locale, 'locations');
  const routes = getLocalizedRoutes(locale);
  const country = await getCountry(id);
  if (!country) notFound();

  return (
    <div>
      <Link href={routes.countries} className="muted">
        <span aria-hidden="true">←{' '}</span>
        {t('country.all')}
      </Link>
      <h1 style={{ marginTop: 8 }}>
        {country.name} {country.code && <span className="muted">({country.code})</span>}
      </h1>
      <h2 style={{ marginTop: 24 }}>{t('country.regions')}</h2>
      <RegionList
        regions={country.regions ?? []}
        locale={locale}
        viewCitiesLabel={t('region.viewCities')}
        emptyMessage={t('country.emptyRegions')}
      />
    </div>
  );
}

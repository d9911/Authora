import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { serverGql } from '@/shared/api/serverGraphql';
import { getServerTranslation } from '@/shared/i18n/server';
import { buildLocalizedMetadata } from '@/shared/i18n/metadata';
import { isSupportedLocale } from '@/shared/i18n/config';
import { City } from '@/shared/types';
import { getLocalizedRoutes, ROUTES } from '@/shared/lib/routes';

export const dynamic = 'force-dynamic';
type CityPageProps = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isSupportedLocale(locale)) return {};
  const { t } = await getServerTranslation(locale, 'locations');
  return buildLocalizedMetadata({
    locale,
    pathname: ROUTES.city(id),
    title: t('metadata.city.title'),
  });
}

async function getCity(id: string): Promise<City | null> {
  try {
    const data = await serverGql<{ city: City | null }>(
      `query City($id: ID!) { city(id: $id) { id name countryId regionId } }`,
      { id },
    );
    return data.city;
  } catch {
    return null;
  }
}

export default async function CityPage({
  params,
}: CityPageProps) {
  const { locale, id } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const { t } = await getServerTranslation(locale, 'locations');
  const routes = getLocalizedRoutes(locale);
  const city = await getCity(id);
  if (!city) notFound();

  return (
    <div>
      {city.regionId && (
        <Link href={routes.region(city.regionId)} className="muted">
          <span aria-hidden="true">←{' '}</span>
          {t('city.back')}
        </Link>
      )}
      <span className="eyebrow">{t('city.eyebrow')}</span>
      <h1 style={{ marginTop: 10 }}>{city.name}</h1>
      <div className="card" style={{ maxWidth: 420 }}>
        <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 18px' }}>
          <dt className="mono" style={{ fontSize: 12, color: 'var(--mist)' }}>city_id</dt>
          <dd className="mono" style={{ margin: 0, fontSize: 12 }}>{city.id}</dd>
          {city.countryId && (
            <>
              <dt className="mono" style={{ fontSize: 12, color: 'var(--mist)' }}>country_id</dt>
              <dd className="mono" style={{ margin: 0, fontSize: 12 }}>{city.countryId}</dd>
            </>
          )}
          {city.regionId && (
            <>
              <dt className="mono" style={{ fontSize: 12, color: 'var(--mist)' }}>region_id</dt>
              <dd className="mono" style={{ margin: 0, fontSize: 12 }}>{city.regionId}</dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}

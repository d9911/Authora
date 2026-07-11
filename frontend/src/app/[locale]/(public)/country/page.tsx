import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverGql } from '@/shared/api/serverGraphql';
import { getServerTranslation } from '@/shared/i18n/server';
import { buildLocalizedMetadata } from '@/shared/i18n/metadata';
import { isSupportedLocale } from '@/shared/i18n/config';
import { ROUTES } from '@/shared/lib/routes';
import { Country } from '@/shared/types';
import { CountryList } from '@/widgets/CountryList/CountryList';

export const dynamic = 'force-dynamic';
type CountriesPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: CountriesPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const { t } = await getServerTranslation(locale, 'locations');
  return buildLocalizedMetadata({
    locale,
    pathname: ROUTES.countries,
    title: t('metadata.countries.title'),
  });
}

async function getCountries(): Promise<Country[]> {
  try {
    const data = await serverGql<{ countries: Country[] }>(
      `query { countries { id name code } }`,
    );
    return data.countries;
  } catch {
    return [];
  }
}

export default async function CountriesPage({ params }: CountriesPageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  const { t } = await getServerTranslation(locale, 'locations');
  const countries = await getCountries();
  return (
    <div>
      <h1>{t('countries.title')}</h1>
      <CountryList
        countries={countries}
        locale={locale}
        viewRegionsLabel={t('countries.viewRegions')}
        emptyTitle={t('countries.emptyTitle')}
        emptyMessage={t('countries.emptyMessage')}
      />
    </div>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { config } from '@/shared/config';
import { getServerTranslation } from '@/shared/i18n/server';
import { buildLocalizedMetadata } from '@/shared/i18n/metadata';
import { isSupportedLocale } from '@/shared/i18n/config';
import { ROUTES } from '@/shared/lib/routes';

type AboutPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const { t } = await getServerTranslation(locale, 'common');
  return buildLocalizedMetadata({
    locale,
    pathname: ROUTES.about,
    title: t('metadata.about.title'),
    description: t('about.description'),
  });
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const { t } = await getServerTranslation(locale, 'common');

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h1>{t('about.title', { appName: config.appName })}</h1>
      <p>{t('about.description')}</p>
      <p className="muted">{t('about.stack')}</p>
    </div>
  );
}

import type { Metadata } from 'next';
import { UiKitPage } from '@/widgets/page-blocks/UiKitPage';
import { isSupportedLocale } from '@/shared/i18n/config';
import { getServerTranslation } from '@/shared/i18n/server';
import { buildLocalizedMetadata } from '@/shared/i18n/metadata';
import { ROUTES } from '@/shared/lib/routes';
import { notFound } from 'next/navigation';

type PublicUiPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PublicUiPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return {};
  const { t } = await getServerTranslation(locale, 'ui');
  return buildLocalizedMetadata({
    locale,
    pathname: ROUTES.ui,
    title: t('metadata.title'),
  });
}

export default async function PublicUiPage({
  params,
}: PublicUiPageProps) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();

  return <UiKitPage locale={locale} />;
}

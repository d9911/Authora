import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ConfirmEmailForm } from '@/features/ConfirmEmailForm/ConfirmEmailForm';
import { LoaderMain } from '@/shared/ui';
import { getServerTranslation } from '@/shared/i18n/server';
import { isSupportedLocale } from '@/shared/i18n/config';
import { buildLocalizedMetadata } from '@/shared/i18n/metadata';
import { ROUTES } from '@/shared/lib/routes';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const { t } = await getServerTranslation(locale, 'auth');
  return buildLocalizedMetadata({
    locale,
    pathname: ROUTES.confirmEmail,
    title: t('confirmEmail.title'),
    index: false,
  });
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<LoaderMain />}>
      <ConfirmEmailForm />
    </Suspense>
  );
}

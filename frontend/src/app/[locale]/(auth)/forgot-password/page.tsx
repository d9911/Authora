import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PasswordResetForm } from '@/features/PasswordResetForm/PasswordResetForm';
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
    pathname: ROUTES.forgotPassword,
    title: t('passwordRecovery.request.title'),
    index: false,
  });
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoaderMain />}>
      <PasswordResetForm mode="request" />
    </Suspense>
  );
}

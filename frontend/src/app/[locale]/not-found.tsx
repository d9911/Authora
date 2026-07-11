'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getLocalizedRoutes } from '@/shared/lib/routes';
import { i18nConfig, normalizeLocale } from '@/shared/i18n/config';

export default function NotFound() {
  const { t } = useTranslation('common');
  const params = useParams<{ locale?: string }>();
  const locale = normalizeLocale(params.locale) ?? i18nConfig.defaultLocale;
  const routes = getLocalizedRoutes(locale);

  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <h1>{t('notFound.title')}</h1>
      <p className="muted">{t('notFound.description')}</p>
      <Link href={routes.home}>{t('notFound.home')}</Link>
    </div>
  );
}

'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  getLocaleMetadata,
  i18nConfig,
  replaceLocaleInUrl,
  type SupportedLocale,
} from '@/shared/i18n/config';
import { useCurrentLocale } from '@/shared/i18n';
import { SelectMain } from '@/shared/ui';

const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function LanguageSwitcher() {
  const { t } = useTranslation('common');
  const locale = useCurrentLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onChange = (nextLocale: SupportedLocale | null) => {
    if (!nextLocale || nextLocale === locale) return;

    const currentUrl = `${pathname}${window.location.search}${window.location.hash}`;
    const nextUrl = replaceLocaleInUrl(currentUrl, nextLocale);

    document.cookie = `${i18nConfig.localeCookieName}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    startTransition(() => router.replace(nextUrl, { scroll: false }));
  };

  return (
    <SelectMain
      label={t('languageSwitcher.label')}
      ariaLabel={t('languageSwitcher.ariaLabel')}
      value={locale}
      options={i18nConfig.supportedLocales.map((supportedLocale) => ({
        value: supportedLocale,
        label: getLocaleMetadata(supportedLocale).label,
      }))}
      disabled={pending}
      variant="compact"
      onChange={onChange}
    />
  );
}

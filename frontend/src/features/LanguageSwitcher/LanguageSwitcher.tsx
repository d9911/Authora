'use client';

import { ChangeEvent, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  getLocaleMetadata,
  i18nConfig,
  replaceLocaleInUrl,
  type SupportedLocale,
} from '@/shared/i18n/config';
import { useCurrentLocale } from '@/shared/i18n';
import styles from './LanguageSwitcher.module.scss';

const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function LanguageSwitcher() {
  const { t } = useTranslation('common');
  const locale = useCurrentLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as SupportedLocale;
    if (nextLocale === locale) return;

    const currentUrl = `${pathname}${window.location.search}${window.location.hash}`;
    const nextUrl = replaceLocaleInUrl(currentUrl, nextLocale);

    document.cookie = `${i18nConfig.localeCookieName}=${encodeURIComponent(nextLocale)}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    startTransition(() => router.replace(nextUrl, { scroll: false }));
  };

  return (
    <label className={styles.switcher}>
      <span className={styles.label}>{t('languageSwitcher.label')}</span>
      <select
        className={styles.select}
        value={locale}
        onChange={onChange}
        disabled={pending}
        aria-label={t('languageSwitcher.ariaLabel')}
      >
        {i18nConfig.supportedLocales.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {getLocaleMetadata(supportedLocale).label}
          </option>
        ))}
      </select>
    </label>
  );
}

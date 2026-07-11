import {
  i18nConfig,
  localizePath,
  type SupportedLocale,
} from './config';
import type { Metadata } from 'next';

export const productionOrigin = 'https://www.auth.d9911';

function absoluteLocalizedUrl(pathname: string, locale: SupportedLocale): string {
  const localizedPath = localizePath(pathname, locale);
  return new URL(localizedPath, productionOrigin).toString();
}

export function getLocalizedAlternates(pathname: string, locale: SupportedLocale) {
  const languages = Object.fromEntries(
    i18nConfig.supportedLocales.map((supportedLocale) => [
      supportedLocale,
      absoluteLocalizedUrl(pathname, supportedLocale),
    ]),
  ) as Record<string, string>;

  languages['x-default'] = absoluteLocalizedUrl(pathname, i18nConfig.defaultLocale);

  return {
    canonical: absoluteLocalizedUrl(pathname, locale),
    languages,
  };
}

type LocalizedMetadataInput = {
  locale: SupportedLocale;
  pathname: string;
  title: string;
  description?: string;
  index?: boolean;
};

export function buildLocalizedMetadata({
  locale,
  pathname,
  title,
  description,
  index = true,
}: LocalizedMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: getLocalizedAlternates(pathname, locale),
    robots: index ? undefined : { index: false, follow: false },
  };
}

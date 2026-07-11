import type { InitOptions, Resource } from 'i18next';
import {
  i18nConfig,
  type I18nNamespace,
  type SupportedLocale,
} from './config';

function getProductionMissingText(
  locale: SupportedLocale,
  resources?: Resource,
): string {
  const commonResource = resources?.[locale]?.common as
    | { status?: { unavailable?: unknown } }
    | undefined;
  const fallbackResource = resources?.[i18nConfig.defaultLocale]?.common as
    | { status?: { unavailable?: unknown } }
    | undefined;
  const value =
    commonResource?.status?.unavailable ??
    fallbackResource?.status?.unavailable;

  return typeof value === 'string' ? value : 'Translation unavailable';
}

export function getI18nOptions(
  locale: SupportedLocale,
  resources?: Resource,
): InitOptions {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    lng: locale,
    fallbackLng: i18nConfig.defaultLocale,
    supportedLngs: [...i18nConfig.supportedLocales],
    ns: [...i18nConfig.namespaces],
    defaultNS: 'common' satisfies I18nNamespace,
    resources,
    load: 'currentOnly',
    initAsync: false,
    returnNull: false,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
    saveMissing: isDevelopment,
    missingKeyHandler: isDevelopment
      ? (languages, namespace, key) => {
          console.warn(
            `[i18n] Missing key "${namespace}:${key}" for ${languages.join(', ')}`,
          );
        }
      : undefined,
    parseMissingKeyHandler: isProduction
      ? () => getProductionMissingText(locale, resources)
      : undefined,
  };
}

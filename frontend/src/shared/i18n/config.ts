export const i18nConfig = {
  defaultLocale: 'ru',
  supportedLocales: ['ru', 'en'],
  namespaces: ['common', 'auth', 'profile', 'locations', 'ui', 'validation', 'errors'],
  localeCookieName: 'authora_locale',
} as const;

export type SupportedLocale = (typeof i18nConfig.supportedLocales)[number];
export type I18nNamespace = (typeof i18nConfig.namespaces)[number];

export type LocaleMetadata = {
  label: string;
  dir: 'ltr' | 'rtl';
};

const localeMetadataOverrides: Partial<Record<SupportedLocale, LocaleMetadata>> = {
  ru: { label: 'Русский', dir: 'ltr' },
  en: { label: 'English', dir: 'ltr' },
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === 'string' &&
    (i18nConfig.supportedLocales as readonly string[]).includes(value)
  );
}

export function normalizeLocale(value: unknown): SupportedLocale | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase().replaceAll('_', '-');
  if (isSupportedLocale(normalized)) return normalized;

  const [language] = normalized.split('-');
  return isSupportedLocale(language) ? language : null;
}

export function getLocaleMetadata(locale: SupportedLocale): LocaleMetadata {
  return localeMetadataOverrides[locale] ?? {
    label: locale.toLocaleUpperCase(locale),
    dir: 'ltr',
  };
}

export function getLocaleFromPathname(pathname: string): SupportedLocale | null {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  return isSupportedLocale(firstSegment) ? firstSegment : null;
}

export function stripLocaleFromPathname(pathname: string): string {
  const url = new URL(pathname, 'https://authora.local');
  const locale = getLocaleFromPathname(url.pathname);

  if (!locale) {
    const unlocalizedPathname = url.pathname || '/';
    return unlocalizedPathname.length > 1 && unlocalizedPathname.endsWith('/')
      ? unlocalizedPathname.slice(0, -1)
      : unlocalizedPathname;
  }

  const stripped = url.pathname.slice(`/${locale}`.length);
  if (stripped === '' || stripped === '/') return '/';
  return stripped.endsWith('/') ? stripped.slice(0, -1) : stripped;
}

export function localizePath(value: string, locale: SupportedLocale): string {
  const url = new URL(value, 'https://authora.local');
  const pathname = stripLocaleFromPathname(url.pathname);
  const localizedPathname = pathname === '/' ? `/${locale}/` : `/${locale}${pathname}`;
  return `${localizedPathname}${url.search}${url.hash}`;
}

export function replaceLocaleInUrl(value: string, locale: SupportedLocale): string {
  return localizePath(value, locale);
}

export function preserveUrlHash(value: string, hash: string): string {
  if (!hash || hash === '#') return value;

  const url = new URL(value, 'https://authora.local');
  if (!url.hash) url.hash = hash.startsWith('#') ? hash : `#${hash}`;
  return `${url.pathname}${url.search}${url.hash}`;
}

type PreferredLocaleInput = {
  storedLocale?: string | null;
  acceptLanguage?: string | null;
};

export function detectPreferredLocale({
  storedLocale,
  acceptLanguage,
}: PreferredLocaleInput): SupportedLocale {
  const stored = normalizeLocale(storedLocale);
  if (stored) return stored;

  const browserLocales = (acceptLanguage ?? '')
    .split(',')
    .map((entry, index) => {
      const [locale, ...parameters] = entry.trim().split(';');
      const qualityParameter = parameters.find((parameter) =>
        /^q=/i.test(parameter.trim()),
      );
      const parsedQuality = qualityParameter
        ? Number(qualityParameter.trim().slice(2))
        : 1;
      const quality =
        Number.isFinite(parsedQuality) && parsedQuality > 0 && parsedQuality <= 1
          ? parsedQuality
          : 0;

      return {
        index,
        locale,
        quality,
      };
    })
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const candidate of browserLocales) {
    if (candidate.quality <= 0) continue;
    const normalized = normalizeLocale(candidate.locale);
    if (normalized) return normalized;
  }

  return i18nConfig.defaultLocale;
}

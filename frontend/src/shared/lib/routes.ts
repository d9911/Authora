import {
  localizePath,
  preserveUrlHash,
  type SupportedLocale,
} from '@/shared/i18n/config';

const APP_ORIGIN = 'http://authora.local';

export const ROUTES = {
  home: '/',
  countries: '/country',
  about: '/about',
  ui: '/ui',
  profileEdit: '/profile/edit',
  signIn: '/sign-in',
  signUp: '/sign-up',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  confirmEmail: '/confirm-email',
  logout: '/logout',
  oauthComplete: '/oauth/complete',
  telegramOpening: '/oauth/telegram/opening',
  country: (id: string) => `/country/${id}`,
  region: (id: string) => `/region/${id}`,
  city: (id: string) => `/city/${id}`,
} as const;

/**
 * Locale-aware view of the existing route registry. Keeping the base registry
 * unprefixed lets server/API code reason about logical paths while UI callers
 * can derive every public URL from one locale value.
 */
export function getLocalizedRoutes(locale: SupportedLocale) {
  return {
    home: localizePath(ROUTES.home, locale),
    countries: localizePath(ROUTES.countries, locale),
    about: localizePath(ROUTES.about, locale),
    ui: localizePath(ROUTES.ui, locale),
    profileEdit: localizePath(ROUTES.profileEdit, locale),
    signIn: localizePath(ROUTES.signIn, locale),
    signUp: localizePath(ROUTES.signUp, locale),
    forgotPassword: localizePath(ROUTES.forgotPassword, locale),
    resetPassword: localizePath(ROUTES.resetPassword, locale),
    confirmEmail: localizePath(ROUTES.confirmEmail, locale),
    logout: localizePath(ROUTES.logout, locale),
    oauthComplete: localizePath(ROUTES.oauthComplete, locale),
    telegramOpening: localizePath(ROUTES.telegramOpening, locale),
    country: (id: string) => localizePath(ROUTES.country(id), locale),
    region: (id: string) => localizePath(ROUTES.region(id), locale),
    city: (id: string) => localizePath(ROUTES.city(id), locale),
  } as const;
}

export type LocalizedRoutes = ReturnType<typeof getLocalizedRoutes>;

const knownRouteRootSegments = new Set(
  Object.values(ROUTES)
    .map((route) => (typeof route === 'function' ? route('__route_param__') : route))
    .map((route) => route.split('/').filter(Boolean)[0])
    .filter((segment): segment is string => Boolean(segment)),
);

export function isKnownAppPath(pathname: string): boolean {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  return firstSegment === undefined || knownRouteRootSegments.has(firstSegment);
}

export function optionalNextPath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null;

  try {
    const url = new URL(value, APP_ORIGIN);
    if (url.origin !== APP_ORIGIN) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function safeNextPath(
  value: string | null,
  fallback: string = ROUTES.profileEdit,
): string {
  return optionalNextPath(value) ?? fallback;
}

/**
 * Restores a fragment inherited from a protected-route redirect only when the
 * URL contains a validated explicit destination. A fragment on a directly
 * opened sign-in page must not leak into the fallback destination.
 */
export function getPostAuthRedirectPath(
  value: string | null,
  fallback: string,
  inheritedHash: string,
): string {
  const explicitNextPath = optionalNextPath(value);
  return explicitNextPath
    ? preserveUrlHash(explicitNextPath, inheritedHash)
    : fallback;
}

import { NextRequest, NextResponse } from 'next/server';
import { config as appConfig } from '@/shared/config';
import {
  detectPreferredLocale,
  getLocaleFromPathname,
  i18nConfig,
  localizePath,
  stripLocaleFromPathname,
  type SupportedLocale,
} from '@/shared/i18n/config';
import {
  getLocalizedRoutes,
  isKnownAppPath,
  ROUTES,
} from '@/shared/lib/routes';

/**
 * URL locale and route protection owner.
 *
 *  - API and static traffic bypass locale routing (private APIs keep auth protection)
 *  - routes without a locale redirect using cookie -> Accept-Language -> default locale
 *  - unsupported locale-like prefixes canonicalize to a supported locale
 *  - page auth redirects retain the locale and the complete attempted URL
 */
const PRIVATE_PREFIXES = ['/profile'];
const AUTH_PAGES: string[] = [ROUTES.signIn, ROUTES.signUp];
const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const LOCALE_LIKE_SEGMENT = /^[a-z]{2}(?:-[a-z]{2})?$/i;

function hasPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function hasAuthCookies(req: NextRequest): boolean {
  const hasAccess = Boolean(req.cookies.get(appConfig.cookies.accessToken)?.value);
  const hasRefresh = Boolean(req.cookies.get(appConfig.cookies.refreshToken)?.value);
  return hasAccess || hasRefresh;
}

function persistLocale(
  response: NextResponse,
  req: NextRequest,
  locale: SupportedLocale,
): NextResponse {
  if (req.cookies.get(i18nConfig.localeCookieName)?.value !== locale) {
    response.cookies.set(i18nConfig.localeCookieName, locale, {
      maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
      path: '/',
      sameSite: 'lax',
      secure: req.nextUrl.protocol === 'https:',
    });
  }

  return response;
}

function preferredLocale(req: NextRequest): SupportedLocale {
  return detectPreferredLocale({
    storedLocale: req.cookies.get(i18nConfig.localeCookieName)?.value,
    acceptLanguage: req.headers.get('accept-language'),
  });
}

function stripUnsupportedLocalePrefix(pathname: string): string | null {
  const [firstSegment] = pathname.split('/').filter(Boolean);
  if (
    !firstSegment ||
    !LOCALE_LIKE_SEGMENT.test(firstSegment) ||
    isKnownAppPath(pathname)
  ) {
    return null;
  }

  const stripped = pathname.slice(`/${firstSegment}`.length);
  return stripped === '' || stripped === '/' ? '/' : stripped;
}

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isAuthed = hasAuthCookies(req);

  // Private APIs are deliberately unlocalized and preserve their JSON contract.
  if (hasPathPrefix(pathname, '/api/private')) {
    if (!isAuthed) {
      return NextResponse.json(
        { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }

    return NextResponse.next();
  }

  const locale = getLocaleFromPathname(pathname);

  if (!locale) {
    const nextLocale = preferredLocale(req);
    const url = new URL(req.url);
    const unsupportedLocalePath = stripUnsupportedLocalePrefix(pathname);
    const unlocalizedPathname = unsupportedLocalePath ?? pathname;
    const logicalPathname =
      unlocalizedPathname === '/login' ? ROUTES.signIn : unlocalizedPathname;
    url.pathname = localizePath(logicalPathname, nextLocale);

    return persistLocale(NextResponse.redirect(url), req, nextLocale);
  }

  const localizedRoutes = getLocalizedRoutes(locale);
  const logicalPathname = stripLocaleFromPathname(pathname);
  const canonicalPathname =
    logicalPathname === '/'
      ? `/${locale}/`
      : pathname.endsWith('/')
        ? pathname.slice(0, -1)
        : pathname;

  if (canonicalPathname !== pathname) {
    const url = new URL(req.url);
    url.pathname = canonicalPathname;
    return persistLocale(NextResponse.redirect(url), req, locale);
  }

  // Legacy alias: /:locale/login -> /:locale/sign-in (preserve query string).
  if (logicalPathname === '/login') {
    const url = new URL(req.url);
    url.pathname = localizedRoutes.signIn;
    return persistLocale(NextResponse.redirect(url), req, locale);
  }

  // Protect private pages while retaining locale, query, and attempted route.
  if (PRIVATE_PREFIXES.some((prefix) => hasPathPrefix(logicalPathname, prefix)) && !isAuthed) {
    const url = new URL(req.url);
    url.pathname = localizedRoutes.signIn;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return persistLocale(NextResponse.redirect(url), req, locale);
  }

  // Keep authenticated users away from auth pages without changing locale.
  if (AUTH_PAGES.includes(logicalPathname) && isAuthed) {
    const url = new URL(req.url);
    url.pathname = localizedRoutes.profileEdit;
    url.search = '';
    return persistLocale(NextResponse.redirect(url), req, locale);
  }

  return persistLocale(NextResponse.next(), req, locale);
}

export const config = {
  matcher: [
    '/api/private/:path*',
    '/((?!api(?:/|$)|_next(?:/|$)|favicon\\.ico$|icon\\.svg$|manifest\\.json$|sw\\.js$|offline\\.html$|robots\\.txt$|sitemap(?:[^/]*)?\\.xml$|health(?:/|$)|webhooks?(?:/|$)|.*\\.[^/]+$).*)',
  ],
};

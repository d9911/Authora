import { NextRequest, NextResponse } from 'next/server';
import { config as appConfig } from '@/shared/config';
import { ROUTES } from '@/shared/lib/routes';

/**
 * Route protection (plan §14). Auth state is derived from the httpOnly
 * access-token cookie set by the proxy.
 *
 *  - /login                 -> permanent redirect to /sign-in (legacy alias)
 *  - /profile/**            -> require auth, else redirect to /sign-in?next=...
 *  - /sign-in, /sign-up     -> if already authed, redirect to /profile/edit
 *  - /api/private/**        -> require auth (401 JSON if missing)
 */
const PRIVATE_PREFIXES = ['/profile'];
const AUTH_PAGES: string[] = [ROUTES.signIn, ROUTES.signUp];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Legacy alias: /login -> /sign-in (preserve query string).
  if (pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.signIn;
    return NextResponse.redirect(url);
  }

  const hasAccess = Boolean(req.cookies.get(appConfig.cookies.accessToken)?.value);
  const hasRefresh = Boolean(req.cookies.get(appConfig.cookies.refreshToken)?.value);
  const isAuthed = hasAccess || hasRefresh;

  // Protect private API routes.
  if (pathname.startsWith('/api/private') && !isAuthed) {
    return NextResponse.json(
      { message: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  // Protect private pages.
  if (PRIVATE_PREFIXES.some((p) => pathname.startsWith(p)) && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.signIn;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Keep authenticated users away from auth pages.
  if (AUTH_PAGES.includes(pathname) && isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.profileEdit;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile/:path*', '/login', '/sign-in', '/sign-up', '/api/private/:path*'],
};

import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/shared/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function backendGithubCallbackUrl(search: string): string {
  const url = new URL('/api/auth/github/callback', config.backendInternalUrl);
  url.search = search;
  return url.toString();
}

function appendSetCookie(from: Response, to: NextResponse): void {
  const setCookie = from.headers.get('set-cookie');
  if (setCookie) {
    to.headers.append('set-cookie', setCookie);
  }
}

export async function GET(req: NextRequest) {
  let upstream: Response;
  try {
    const url = new URL(req.url);
    upstream = await fetch(backendGithubCallbackUrl(url.search), {
      method: 'GET',
      headers: {
        ...(req.headers.get('cookie') ? { cookie: req.headers.get('cookie') as string } : {}),
      },
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return NextResponse.redirect(new URL('/sign-in?error=github_backend_unreachable', req.url));
  }

  const location = upstream.headers.get('location');
  if (location && upstream.status >= 300 && upstream.status < 400) {
    const res = NextResponse.redirect(location, upstream.status);
    appendSetCookie(upstream, res);
    return res;
  }

  const res = NextResponse.redirect(new URL('/sign-in?error=github_failed', req.url));
  appendSetCookie(upstream, res);
  return res;
}

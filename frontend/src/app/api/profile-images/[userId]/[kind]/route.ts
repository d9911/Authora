import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/shared/config';

type RouteContext = {
  params: Promise<{ userId: string; kind: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId, kind } = await context.params;
  const upstreamUrl = `${config.backendInternalUrl}/api/profile-images/${encodeURIComponent(
    userId,
  )}/${encodeURIComponent(kind)}`;

  const upstream = await fetch(upstreamUrl, {
    headers: {
      ...(req.headers.get('if-none-match')
        ? { 'if-none-match': req.headers.get('if-none-match') as string }
        : {}),
    },
    cache: 'no-store',
  });

  const headers = new Headers();
  for (const key of ['content-type', 'content-length', 'etag', 'cache-control']) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }

  if (upstream.status === 304) {
    return new NextResponse(null, { status: 304, headers });
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { message: 'Profile image not found', code: 'NOT_FOUND' },
      { status: upstream.status },
    );
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

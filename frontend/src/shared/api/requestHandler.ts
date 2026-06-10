import { NextRequest, NextResponse } from 'next/server';
import { config } from '../config';

/**
 * Server-side GraphQL proxy.
 *
 * Why a proxy (plan §13):
 *  - hides the backend URL from the browser;
 *  - stores JWTs in httpOnly cookies (tokens never reach client JS);
 *  - injects `Authorization: Bearer <access>` on every request;
 *  - injects the httpOnly refresh token into refresh/logout operations;
 *  - centralizes error handling and cookie lifecycle.
 */

interface GraphQLBody {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: process.env.NODE_ENV === 'production',
};

function isOperation(query: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(query);
}

export async function proxyRequest(req: NextRequest): Promise<NextResponse> {
  let body: GraphQLBody;
  try {
    body = (await req.json()) as GraphQLBody;
  } catch {
    return NextResponse.json(
      { errors: [{ message: 'Invalid JSON body', extensions: { code: 'VALIDATION' } }] },
      { status: 400 },
    );
  }

  const accessToken = req.cookies.get(config.cookies.accessToken)?.value;
  const refreshToken = req.cookies.get(config.cookies.refreshToken)?.value;
  const query = body.query ?? '';
  const variables = { ...(body.variables ?? {}) } as Record<string, unknown>;

  // Inject the httpOnly refresh token into operations that need it,
  // since the browser never holds it.
  if (isOperation(query, 'refreshToken')) {
    const input = (variables.input as Record<string, unknown>) ?? {};
    variables.input = { ...input, refreshToken: refreshToken ?? '' };
  }
  if (isOperation(query, 'logout') && refreshToken && variables.refreshToken === undefined) {
    variables.refreshToken = refreshToken;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${config.backendInternalUrl}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ query, variables, operationName: body.operationName }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        errors: [
          { message: 'Backend is unreachable', extensions: { code: 'BACKEND_UNREACHABLE' } },
        ],
      },
      { status: 502 },
    );
  }

  const json = (await upstream.json()) as {
    data?: Record<string, unknown>;
    errors?: unknown;
  };

  const res = NextResponse.json(json, { status: upstream.status });

  // Persist tokens returned by auth mutations into httpOnly cookies and
  // strip them from the body so they never reach the client.
  const data = json.data ?? {};
  for (const key of ['signUp', 'signIn', 'signInTwoFactor', 'refreshToken']) {
    const payload = data[key] as
      | { accessToken?: string; refreshToken?: string }
      | undefined;
    if (payload?.accessToken) {
      res.cookies.set(config.cookies.accessToken, payload.accessToken, {
        ...COOKIE_BASE,
        maxAge: 60 * 60, // 1h safety cap; refreshed via refresh flow
      });
      delete (payload as Record<string, unknown>).accessToken;
    }
    if (payload?.refreshToken) {
      res.cookies.set(config.cookies.refreshToken, payload.refreshToken, {
        ...COOKIE_BASE,
        maxAge: 60 * 60 * 24 * 30, // 30d
      });
      delete (payload as Record<string, unknown>).refreshToken;
    }
  }

  // Clear cookies on logout.
  if (isOperation(query, 'logout') && data.logout === true) {
    res.cookies.set(config.cookies.accessToken, '', { ...COOKIE_BASE, maxAge: 0 });
    res.cookies.set(config.cookies.refreshToken, '', { ...COOKIE_BASE, maxAge: 0 });
  }

  return res;
}

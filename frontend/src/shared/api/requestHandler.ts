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

// Matches an actual top-level mutation CALL like `refreshToken(input: ...)`,
// NOT a field of the same name inside a selection set (e.g. `signUp { refreshToken }`).
function callsMutation(query: string, name: string): boolean {
  return new RegExp(`\\b${name}\\s*\\(`).test(query);
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

  // Inject the httpOnly refresh token into the refreshToken mutation only.
  // We match the mutation CALL `refreshToken(...)`, never the field selection
  // `refreshToken` that appears inside signUp/signIn payloads.
  if (callsMutation(query, 'refreshToken')) {
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

  // IMPORTANT: mutate the body (strip tokens) BEFORE building NextResponse.json,
  // because NextResponse.json serializes the object immediately — later mutations
  // would not affect the already-serialized body.
  let setAccess: string | null = null;
  let setRefresh: string | null = null;

  const data = json.data ?? {};

  // Auth payloads can be top-level (signIn, oauthExchange, …) or nested
  // (telegramBotPoll.auth). Collect all candidate payloads and strip tokens.
  const candidates: Array<{ accessToken?: string; refreshToken?: string } | undefined> = [
    data.signUp,
    data.signIn,
    data.signInTwoFactor,
    data.refreshToken,
    data.oauthExchange,
    (data.telegramBotPoll as { auth?: { accessToken?: string; refreshToken?: string } } | undefined)
      ?.auth,
  ] as Array<{ accessToken?: string; refreshToken?: string } | undefined>;

  for (const payload of candidates) {
    if (!payload) continue;
    if (payload.accessToken) {
      setAccess = payload.accessToken;
      delete (payload as Record<string, unknown>).accessToken;
    }
    if (payload.refreshToken) {
      setRefresh = payload.refreshToken;
      delete (payload as Record<string, unknown>).refreshToken;
    }
  }

  const clearCookies = isOperation(query, 'logout') && data.logout === true;

  // Now serialize the (token-stripped) body.
  const res = NextResponse.json(json, { status: upstream.status });

  // Persist tokens as httpOnly cookies (never exposed to client JS).
  if (setAccess) {
    res.cookies.set(config.cookies.accessToken, setAccess, {
      ...COOKIE_BASE,
      maxAge: 60 * 60, // 1h safety cap; refreshed via refresh flow
    });
  }
  if (setRefresh) {
    res.cookies.set(config.cookies.refreshToken, setRefresh, {
      ...COOKIE_BASE,
      maxAge: 60 * 60 * 24 * 30, // 30d
    });
  }

  // Clear cookies on logout.
  if (clearCookies) {
    res.cookies.set(config.cookies.accessToken, '', { ...COOKIE_BASE, maxAge: 0 });
    res.cookies.set(config.cookies.refreshToken, '', { ...COOKIE_BASE, maxAge: 0 });
  }

  return res;
}

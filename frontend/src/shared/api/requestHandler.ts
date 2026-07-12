import { NextRequest, NextResponse } from 'next/server';
import { config } from '../config';
import {
  blockRefreshForLogout,
  refreshTokenKey,
  runRefreshSingleFlight,
} from './serverRefreshCoordinator';

/**
 * Server-side GraphQL proxy.
 *
 * Why a proxy (plan §13):
 *  - hides the backend URL from the browser;
 *  - stores JWTs in httpOnly cookies (tokens never reach client JS);
 *  - injects `Authorization: Bearer <access>` on every request;
 *  - PROACTIVELY mints a new access token from the refresh token when the
 *    access cookie is missing/expired, so a valid session never breaks;
 *  - injects the httpOnly refresh token into refresh/logout operations;
 *  - centralizes error handling and cookie lifecycle.
 */

interface GraphQLBody {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
}

interface TokenPair {
  accessToken?: string;
  refreshToken?: string;
}

// `secure` cookies are dropped by browsers over plain HTTP (e.g. http://localhost),
// which silently breaks the session in production builds served without TLS.
// Only mark cookies Secure when actually behind HTTPS, controllable via COOKIE_SECURE.
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: COOKIE_SECURE,
};
const ACCESS_MAX_AGE = 60 * 60; // 1h
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30d
const RECOVERY_MAX_AGE = 15 * 60; // 15m
const RECOVERY_COOKIE_BASE = {
  ...COOKIE_BASE,
  sameSite: 'strict' as const,
  path: '/api/graphql',
};

function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(config.cookies.accessToken, '', { ...COOKIE_BASE, maxAge: 0 });
  response.cookies.set(config.cookies.refreshToken, '', { ...COOKIE_BASE, maxAge: 0 });
}

const SESSION_INDEPENDENT_OPERATIONS = [
  'requestPasswordReset',
  'exchangePasswordResetToken',
  'completePasswordReset',
  'resetPassword',
  'telegramRecoveryStart',
  'telegramRecoveryPoll',
] as const;

function isOperation(query: string, name: string): boolean {
  return new RegExp(`\\b${name}\\b`).test(query);
}

// Matches an actual top-level mutation CALL like `refreshToken(input: ...)`,
// NOT a field of the same name inside a selection set (e.g. `signUp { refreshToken }`).
function callsMutation(query: string, name: string): boolean {
  return new RegExp(`\\b${name}\\s*\\(`).test(query);
}

const SERVER_REFRESH = /* GraphQL */ `
  mutation ProxyRefresh($input: RefreshTokenInput!) {
    refreshToken(input: $input) { accessToken refreshToken }
  }
`;

/**
 * Exchange a refresh token for a fresh access/refresh pair by calling the
 * backend directly. Returns the new pair, or null if the refresh token is
 * invalid/expired/revoked (caller should treat the user as logged out).
 */
async function serverRefresh(refreshToken: string): Promise<TokenPair | null> {
  try {
    const res = await fetch(`${config.backendInternalUrl}/graphql`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: SERVER_REFRESH, variables: { input: { refreshToken } } }),
      cache: 'no-store',
    });
    const json = (await res.json()) as {
      data?: { refreshToken?: TokenPair };
      errors?: unknown;
    };
    const pair = json.data?.refreshToken;
    if (!pair?.accessToken) return null;
    return pair;
  } catch {
    return null;
  }
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

  let accessToken = req.cookies.get(config.cookies.accessToken)?.value;
  let refreshToken = req.cookies.get(config.cookies.refreshToken)?.value;
  const recoveryToken = req.cookies.get(config.cookies.recoveryToken)?.value;
  const query = body.query ?? '';
  const variables = { ...(body.variables ?? {}) } as Record<string, unknown>;

  // Cookies to (re)write on the response, e.g. after a proactive refresh.
  let setAccess: string | null = null;
  let setRefresh: string | null = null;

  const isRefreshCall = callsMutation(query, 'refreshToken');
  const logoutRequested = isOperation(query, 'logout');
  let logoutRefreshToken = refreshToken;
  if (logoutRequested && refreshToken) {
    logoutRefreshToken =
      (await blockRefreshForLogout(refreshTokenKey(refreshToken))) ?? refreshToken;
  }
  const isSessionIndependent = SESSION_INDEPENDENT_OPERATIONS.some((operation) =>
    isOperation(query, operation),
  );

  // PROACTIVE REFRESH: no access token but we have a refresh token → mint a new
  // access token before forwarding, so the request is authenticated. Skip when
  // the request itself is the refresh mutation (handled below) or logout.
  if (
    !accessToken &&
    refreshToken &&
    !isRefreshCall &&
    !logoutRequested &&
    !isSessionIndependent
  ) {
    const refreshTokenToRotate = refreshToken;
    const pair = await runRefreshSingleFlight(
      refreshTokenKey(refreshTokenToRotate),
      () => serverRefresh(refreshTokenToRotate),
    );
    if (pair) {
      accessToken = pair.accessToken;
      setAccess = pair.accessToken ?? null;
      if (pair.refreshToken) {
        refreshToken = pair.refreshToken;
        setRefresh = pair.refreshToken;
      }
    } else {
      // Refresh token invalid/expired → clear cookies and force logout
      const res = NextResponse.json(
        { errors: [{ message: 'INVALID_TOKEN', extensions: { code: 'INVALID_TOKEN' } }] },
        { status: 401 }
      );
      clearAuthCookies(res);
      return res;
    }
  }

  // Inject the httpOnly refresh token into the refreshToken mutation. The
  // GraphQL variable bound to `input:` may be named anything (`$input`, `$i`).
  if (isRefreshCall) {
    const varName = refreshInputVarName(query) ?? 'input';
    const existing = (variables[varName] as Record<string, unknown>) ?? {};
    variables[varName] = { ...existing, refreshToken: refreshToken ?? '' };
  }
  if (logoutRequested && logoutRefreshToken && variables.refreshToken === undefined) {
    variables.refreshToken = logoutRefreshToken;
  }
  if (callsMutation(query, 'completePasswordReset')) {
    const varName = inputVarName(query, 'completePasswordReset') ?? 'input';
    const existing = (variables[varName] as Record<string, unknown>) ?? {};
    variables[varName] = { ...existing, recoveryToken: recoveryToken ?? '' };
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${config.backendInternalUrl}/graphql`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(accessToken && !isSessionIndependent
          ? { authorization: `Bearer ${accessToken}` }
          : {}),
      },
      body: JSON.stringify({ query, variables, operationName: body.operationName }),
      cache: 'no-store',
    });
  } catch {
    const res = NextResponse.json(
      {
        errors: [
          { message: 'Backend is unreachable', extensions: { code: 'BACKEND_UNREACHABLE' } },
        ],
      },
      { status: 502 },
    );
    if (logoutRequested) clearAuthCookies(res);
    return res;
  }

  const json = (await upstream.json()) as {
    data?: Record<string, unknown>;
    errors?: unknown;
  };

  // Strip any tokens returned by auth mutations (top-level or nested) and turn
  // them into cookies. Mutate BEFORE NextResponse.json (which serializes now).
  const data = json.data ?? {};
  const candidates: Array<TokenPair | undefined> = [
    data.signUp as TokenPair,
    data.signIn as TokenPair,
    data.signInTwoFactor as TokenPair,
    data.refreshToken as TokenPair,
    data.oauthExchange as TokenPair,
    data.completePasswordReset as TokenPair,
    (data.telegramBotPoll as { auth?: TokenPair } | undefined)?.auth,
  ];
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

  let setRecovery: string | null = null;
  const recoveryCandidates = [
    data.exchangePasswordResetToken as { recoveryToken?: string } | undefined,
    (data.telegramRecoveryPoll as { recovery?: { recoveryToken?: string } } | undefined)?.recovery,
  ];
  for (const payload of recoveryCandidates) {
    if (!payload?.recoveryToken) continue;
    setRecovery = payload.recoveryToken;
    delete payload.recoveryToken;
  }

  const passwordResetCompleted =
    (isOperation(query, 'completePasswordReset') &&
      (data.completePasswordReset as { success?: boolean } | undefined)?.success === true) ||
    (isOperation(query, 'resetPassword') && data.resetPassword === true);
  const resetChannel = (
    data.completePasswordReset as { channel?: 'email' | 'telegram' } | undefined
  )?.channel;
  const shouldClearAuthCookies =
    logoutRequested ||
    (passwordResetCompleted && resetChannel !== 'telegram');
  const recoveryInvalid = (
    json.errors as Array<{ extensions?: { code?: string } }> | undefined
  )?.some((error) =>
    ['RECOVERY_TOKEN_INVALID', 'RECOVERY_TOKEN_EXPIRED'].includes(
      error.extensions?.code ?? '',
    ),
  );

  const res = NextResponse.json(json, { status: upstream.status });

  if (setAccess) {
    res.cookies.set(config.cookies.accessToken, setAccess, { ...COOKIE_BASE, maxAge: ACCESS_MAX_AGE });
  }
  if (setRefresh) {
    res.cookies.set(config.cookies.refreshToken, setRefresh, {
      ...COOKIE_BASE,
      maxAge: REFRESH_MAX_AGE,
    });
  }
  if (setRecovery) {
    res.cookies.set(config.cookies.recoveryToken, setRecovery, {
      ...RECOVERY_COOKIE_BASE,
      maxAge: RECOVERY_MAX_AGE,
    });
  }
  if (shouldClearAuthCookies) {
    clearAuthCookies(res);
  }
  if (passwordResetCompleted || recoveryInvalid) {
    res.cookies.set(config.cookies.recoveryToken, '', {
      ...RECOVERY_COOKIE_BASE,
      maxAge: 0,
    });
  }

  return res;
}

// Extracts the variable bound to `input:` in `refreshToken(input: $xxx)`.
function refreshInputVarName(query: string): string | null {
  const m = query.match(/refreshToken\s*\(\s*input\s*:\s*\$(\w+)/);
  return m ? m[1] : null;
}

function inputVarName(query: string, mutationName: string): string | null {
  const match = query.match(
    new RegExp(`${mutationName}\\s*\\(\\s*input\\s*:\\s*\\$(\\w+)`),
  );
  return match ? match[1] : null;
}

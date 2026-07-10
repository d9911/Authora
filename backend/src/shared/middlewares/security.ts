import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Lightweight security middlewares (no external deps).
 *  - securityHeaders: sensible hardening headers (helmet-lite)
 *  - rateLimit:       fixed-window in-memory limiter (per IP + key)
 *  - authRateLimit:   stricter limiter for credential endpoints (brute force)
 *
 * The in-memory store is fine for a single instance; behind multiple replicas
 * use a shared store (Redis). Window state is best-effort and self-cleaning.
 */

export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()',
    );
    // Conservative CSP for the JSON API surface (the UI is served by the frontend).
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.removeHeader('X-Powered-By');
    next();
  };
}

interface Bucket {
  count: number;
  resetAt: number;
}

function createLimiter(opts: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
  key?: (req: Request) => string;
}) {
  const store = new Map<string, Bucket>();

  // periodic cleanup to bound memory
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
  }, opts.windowMs).unref?.();
  void timer;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${opts.keyPrefix}:${opts.key?.(req) ?? ip}`;
    const now = Date.now();
    let bucket = store.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, bucket);
    }
    bucket.count++;

    const remaining = Math.max(0, opts.max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > opts.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({
        message: opts.message ?? 'Too many requests, please slow down',
        code: 'RATE_LIMITED',
      });
      return;
    }
    next();
  };
}

/** General API limiter (generous). */
export function rateLimit() {
  return createLimiter({
    windowMs: 60_000,
    max: Number(process.env.RATE_LIMIT_MAX ?? 300),
    keyPrefix: 'api',
  });
}

/**
 * Strict limiter applied to credential / sensitive GraphQL operations.
 * Detects the operation from the request body to throttle only auth attempts.
 */
const SENSITIVE_OPS = [
  'signIn',
  'signInTwoFactor',
  'signUp',
  'requestPasswordReset',
  'exchangePasswordResetToken',
  'completePasswordReset',
  'resetPassword',
  'telegramRecoveryStart',
  'telegramRecoveryPoll',
  'requestEmailChange',
  'confirmEmailChange',
  'confirmEmailCode',
  'resendEmailCode',
  'confirmTwoFactor',
];

export function authRateLimit() {
  const limiter = createLimiter({
    windowMs: 60_000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
    keyPrefix: 'auth',
    message: 'Too many authentication attempts, please try again later',
  });
  const identifierLimiter = createLimiter({
    windowMs: 60_000,
    max: Number(process.env.AUTH_IDENTIFIER_RATE_LIMIT_MAX ?? 5),
    keyPrefix: 'auth-identifier',
    message: 'Too many authentication attempts for this account, please try again later',
    key: (req) => recoveryIdentifierHash(req) ?? 'anonymous',
  });

  return (req: Request, res: Response, next: NextFunction) => {
    // Only throttle POST /graphql requests that call a sensitive mutation.
    const body = (req as Request & { body?: { query?: string } }).body;
    const query = body?.query ?? '';
    const isSensitive = SENSITIVE_OPS.some((op) =>
      new RegExp(`\\b${op}\\b\\s*(?:\\(|\\{)`).test(query),
    );
    if (!isSensitive) return next();
    if (recoveryIdentifierHash(req)) {
      return identifierLimiter(req, res, () => limiter(req, res, next));
    }
    return limiter(req, res, next);
  };
}

function recoveryIdentifierHash(req: Request): string | null {
  const body = (req as Request & {
    body?: { variables?: Record<string, unknown> };
  }).body;
  const variables = body?.variables;
  const direct = variables?.email;
  const nested = Object.values(variables ?? {}).find(
    (value): value is Record<string, unknown> =>
      Boolean(value) && typeof value === 'object' && !Array.isArray(value) &&
      typeof (value as Record<string, unknown>).email === 'string',
  );
  const candidate = direct ?? nested?.email;
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  return crypto.createHash('sha256').update(candidate.trim().toLowerCase()).digest('hex');
}

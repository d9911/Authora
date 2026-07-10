import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError, ErrorCodes } from '../../core/errors/AppError';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  authVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  } as SignOptions);
}

export interface RefreshTokenPayload {
  sub: string;
  authVersion: number;
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  // jti makes every refresh token unique even within the same second,
  // so token rotation never produces a colliding hash.
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpires,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
  } catch {
    throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid or expired access token', 401);
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const payload = jwt.verify(token, env.jwt.refreshSecret) as Partial<RefreshTokenPayload> & {
      sub: string;
    };
    return { sub: payload.sub, authVersion: Number(payload.authVersion ?? 0) };
  } catch {
    throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid or expired refresh token', 401);
  }
}

/** Resolve refresh token expiry as an absolute Date for DB storage. */
export function refreshTokenExpiryDate(): Date {
  const decoded = jwt.decode(
    signRefreshToken({ sub: 'probe', authVersion: 0 }),
  ) as { exp?: number } | null;
  if (decoded?.exp) return new Date(decoded.exp * 1000);
  // Fallback: 30 days
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

/* --------------------------- OAuth helper tokens --------------------------- */

type OAuthPurpose = 'oauth_handoff' | 'oauth_link';

/**
 * Short-lived, purpose-scoped token used by the OAuth flows:
 *  - 'oauth_handoff': issued after a successful OAuth login; the frontend
 *    exchanges it for real session cookies (solves the cross-origin problem).
 *  - 'oauth_link': issued to an authenticated user; carried through the OAuth
 *    redirect so the callback knows which account to link the provider to.
 */
export function signOAuthToken(userId: string, purpose: OAuthPurpose, expiresIn = '10m'): string {
  return jwt.sign({ sub: userId, purpose }, env.jwt.accessSecret, { expiresIn } as SignOptions);
}

export function verifyOAuthToken(token: string, purpose: OAuthPurpose): { sub: string } {
  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as { sub: string; purpose?: string };
    if (decoded.purpose !== purpose) {
      throw new AppError(ErrorCodes.INVALID_TOKEN, 'Wrong token purpose', 401);
    }
    return { sub: decoded.sub };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid or expired OAuth token', 401);
  }
}

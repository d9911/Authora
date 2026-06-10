import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError, ErrorCodes } from '../../core/errors/AppError';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpires,
  } as SignOptions);
}

export function signRefreshToken(payload: { sub: string }): string {
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

export function verifyRefreshToken(token: string): { sub: string } {
  try {
    return jwt.verify(token, env.jwt.refreshSecret) as { sub: string };
  } catch {
    throw new AppError(ErrorCodes.INVALID_TOKEN, 'Invalid or expired refresh token', 401);
  }
}

/** Resolve refresh token expiry as an absolute Date for DB storage. */
export function refreshTokenExpiryDate(): Date {
  const decoded = jwt.decode(
    signRefreshToken({ sub: 'probe' }),
  ) as { exp?: number } | null;
  if (decoded?.exp) return new Date(decoded.exp * 1000);
  // Fallback: 30 days
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

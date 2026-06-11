import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Stable hash for storing tokens (refresh / email) at rest. */
export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Cryptographically-random numeric code, e.g. "048213" (default 6 digits). */
export function randomNumericCode(digits = 6): string {
  const max = 10 ** digits;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(digits, '0');
}

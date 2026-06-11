import crypto from 'crypto';
import { env } from '../../../config/env';

export interface TelegramLoginData {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: string;
  hash?: string;
  [key: string]: string | undefined;
}

/**
 * Verifies the signature of a Telegram Login Widget payload (plan §8/§22).
 * Never trust a raw telegramId from the client — the hash must match an HMAC
 * computed with the bot token, and the auth_date must be recent.
 */
export class TelegramAuthService {
  isConfigured(): boolean {
    return Boolean(env.telegram.botToken);
  }

  verify(data: TelegramLoginData, maxAgeSec = 86400): boolean {
    if (!env.telegram.botToken || !data.hash) return false;

    const { hash, ...fields } = data;
    const checkString = Object.keys(fields)
      .filter((k) => fields[k] !== undefined)
      .sort()
      .map((k) => `${k}=${fields[k]}`)
      .join('\n');

    const secretKey = crypto.createHash('sha256').update(env.telegram.botToken).digest();
    const computed = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

    // constant-time comparison
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    // freshness check
    const authDate = Number(data.auth_date ?? 0);
    if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return false;

    return true;
  }
}

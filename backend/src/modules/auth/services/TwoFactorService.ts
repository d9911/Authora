import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';

const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const RECOVERY_CODE_COUNT = 8;
const RECOVERY_CODE_LENGTH = 12;

export interface TwoFactorSetup {
  secret: string; // base32 secret (store on the user)
  otpauthUrl: string;
  qrDataUrl: string; // data:image/png;base64,... for <img src>
}

/**
 * 2FA helper around speakeasy + qrcode.
 * The secret is generated at setup, stored on the user, and the QR is only
 * shown once during enrollment. Verification uses a small time window.
 */
export class TwoFactorService {
  async generate(accountLabel: string, issuer = 'FullstackApp'): Promise<TwoFactorSetup> {
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${accountLabel})`,
      issuer,
    });
    const otpauthUrl = secret.otpauth_url ?? '';
    const qrDataUrl = otpauthUrl ? await qrcode.toDataURL(otpauthUrl) : '';
    return { secret: secret.base32, otpauthUrl, qrDataUrl };
  }

  verify(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }

  generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
    return Array.from({ length: count }, () => {
      const value = Array.from({ length: RECOVERY_CODE_LENGTH }, () =>
        RECOVERY_CODE_ALPHABET[crypto.randomInt(0, RECOVERY_CODE_ALPHABET.length)],
      ).join('');
      return value.match(/.{1,4}/g)?.join('-') ?? value;
    });
  }
}

export function normalizeTwoFactorRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, '');
}

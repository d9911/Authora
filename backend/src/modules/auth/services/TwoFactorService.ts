import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

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
  async generate(accountLabel: string, issuer = 'Authora'): Promise<TwoFactorSetup> {
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
}
